window.legoBluetooth = {
    device: null,
    client: null,
    writeChar: null,
    notifyChar: null,
    
    _pending: {},   
    _writeQueue: [],
    _isWriting: false,

    yaw: 0, // Exposes the gyro data to Python

    SERVICE_UUID: '0000fd02-0000-1000-8000-00805f9b34fb',
    WRITE_UUID:   '0000fd02-0001-1000-8000-00805f9b34fb',
    NOTIFY_UUID:  '0000fd02-0002-1000-8000-00805f9b34fb',

    INFO_REQUEST: 0,
    INFO_RESPONSE: 1,
    MOTOR_RUN_COMMAND: 122,
    MOTOR_RUN_RESULT: 123,
    MOTOR_RUN_FOR_DEGREES_COMMAND: 124,
    MOTOR_RUN_FOR_DEGREES_RESULT: 125,
    MOTOR_STOP_COMMAND: 138,
    MOTOR_STOP_RESULT: 139,
    MOTOR_SET_SPEED_COMMAND: 140,
    MOTOR_SET_SPEED_RESULT: 141,

    MOTOR_BITS_LEFT: 1,
    MOTOR_BITS_RIGHT: 2,
    MOTOR_BITS_BOTH: 3,

    DIRECTION_CLOCKWISE: 0,
    DIRECTION_COUNTERCLOCKWISE: 1,
    DIRECTION_SHORTEST: 2,
    DIRECTION_LONGEST: 3,

    STATUS_LABEL: {0: "COMPLETED", 1: "INTERRUPTED", 2: "NACK"},

    connectHub: async function() {
        try {
            console.log("Requesting Web Bluetooth Connection...");

            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.SERVICE_UUID] }]
            });

            this.client = await this.device.gatt.connect();
            await new Promise(resolve => setTimeout(resolve, 500));

            const service = await this.client.getPrimaryService(this.SERVICE_UUID);
            this.writeChar = await service.getCharacteristic(this.WRITE_UUID);
            this.notifyChar = await service.getCharacteristic(this.NOTIFY_UUID);

            await this.notifyChar.startNotifications();
            this.notifyChar.addEventListener('characteristicvaluechanged', (event) => {
                this._handleNotification(new Uint8Array(event.target.value.buffer));
            });

            console.log("Sending InfoRequest handshake...");
            const infoResponse = await this._sendAndWait(
                new Uint8Array([this.INFO_REQUEST]), this.INFO_RESPONSE
            );
            
            return this.device.name || "DOUBLE MOTOR";

        } catch (error) {
            console.error("Web Bluetooth Error: ", error);
            return false;
        }
    },

    _handleNotification: function(bytes) {
        const msgType = bytes[0];
        const payload = bytes.slice(1);

        // --- IMU DATA SNIFFER ---
        // Continuous sensor streams broadcast without a pending promise queue.
        if (!this._pending[msgType] || this._pending[msgType].length === 0) {
            
            // TODO: Uncomment the line below. Open your F12 Console and physically twist the motor.
            // Look for which msgType floods the console when it moves.
            console.log(`Background Stream [Type ${msgType}]:`, payload);
            
            // Once you find the exact message ID (e.g., ID 100), you can parse it like this:
            // if (msgType === 100) {
            //     const dataView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
            //     this.yaw = dataView.getInt16(0, true); 
            // }
        }

        const queue = this._pending[msgType];
        if (queue && queue.length > 0) {
            const resolve = queue.shift();
            resolve(payload);
        }
    },

    _processWriteQueue: async function() {
        if (this._isWriting || this._writeQueue.length === 0) return;
        this._isWriting = true;
        const task = this._writeQueue.shift();
        
        try {
            await this.writeChar.writeValueWithoutResponse(task.bytes);
            await new Promise(r => setTimeout(r, 30)); 
            task.resolve();
        } catch (e) {
            task.reject(e);
        }
        
        this._isWriting = false;
        this._processWriteQueue();
    },

    _safeWrite: function(bytes) {
        return new Promise((resolve, reject) => {
            this._writeQueue.push({ bytes, resolve, reject });
            this._processWriteQueue();
        });
    },

    _sendAndWait: function(bytes, expectedResultType, timeoutMs = 4000, blocking = true) {
        return new Promise(async (resolve, reject) => {
            if (!this._pending[expectedResultType]) this._pending[expectedResultType] = [];
            
            let timer;
            if (blocking) {
                timer = setTimeout(() => reject(new Error(`Timed out waiting for result type ${expectedResultType}`)), timeoutMs);
                this._pending[expectedResultType].push((payload) => {
                    clearTimeout(timer);
                    resolve(payload);
                });
            }
            
            try {
                await this._safeWrite(bytes);
                if (!blocking) resolve(null); 
            } catch (error) {
                if (timer) clearTimeout(timer);
                reject(error);
            }
        });
    },

    _buildSetSpeed: function(bitMask, speed) {
        return new Uint8Array([this.MOTOR_SET_SPEED_COMMAND, bitMask, speed & 0xFF]);
    },

    _buildRunForDegrees: function(bitMask, degrees, direction) {
        return new Uint8Array([
            this.MOTOR_RUN_FOR_DEGREES_COMMAND,
            bitMask,
            degrees & 0xFF, (degrees >> 8) & 0xFF, (degrees >> 16) & 0xFF, (degrees >> 24) & 0xFF,
            direction
        ]);
    },

    _buildRun: function(bitMask, direction) {
        return new Uint8Array([this.MOTOR_RUN_COMMAND, bitMask, direction]);
    },

    _buildStop: function(bitMask) {
        return new Uint8Array([this.MOTOR_STOP_COMMAND, bitMask]);
    },

    _concat: function(...arrays) {
        const total = arrays.reduce((sum, a) => sum + a.length, 0);
        const out = new Uint8Array(total);
        let offset = 0;
        for (const a of arrays) { out.set(a, offset); offset += a.length; }
        return out;
    },

    runMotorForDegrees: async function(bitMask, speedPercent, direction, degrees, blocking = true) {
        const combined = this._concat(
            this._buildSetSpeed(bitMask, speedPercent),
            this._buildRunForDegrees(bitMask, degrees, direction)
        );
        return this._sendAndWait(combined, this.MOTOR_RUN_FOR_DEGREES_RESULT, 4000, blocking);
    },

    runMotorContinuous: async function(bitMask, speedPercent, direction) {
        const combined = this._concat(
            this._buildSetSpeed(bitMask, speedPercent),
            this._buildRun(bitMask, direction)
        );
        // We use blocking=False here so it acts as a fire-and-forget command, 
        // allowing the Python `while` loop to take over monitoring.
        return this._sendAndWait(combined, this.MOTOR_RUN_RESULT, 4000, false);
    },

    stopMotor: async function(bitMask) {
        // We use blocking=False here to prevent the stop command from crashing if the radio drops the ack
        return this._sendAndWait(this._buildStop(bitMask), this.MOTOR_STOP_RESULT, 4000, false);
    }
};