window.legoBluetooth = {
    device: null,
    client: null,
    writeChar: null,
    notifyChar: null,
    _pending: {},   // resultId -> [resolve, ...] FIFO queues

    // Confirmed via chrome://bluetooth-internals against the real hardware.
    SERVICE_UUID: '0000fd02-0000-1000-8000-00805f9b34fb',
    WRITE_UUID:   '0000fd02-0001-1000-8000-00805f9b34fb',
    NOTIFY_UUID:  '0000fd02-0002-1000-8000-00805f9b34fb',

    // Message type IDs, ported from legoeducation/rpc_message.py.
    // Every *_RESULT id is simply *_COMMAND id + 1.
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

            // THE FIX: Removed 'acceptAllDevices: true' and explicitly filtered the ping
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
            const rpcMajor = infoResponse[0], rpcMinor = infoResponse[1];
            const rpcBuild = infoResponse[2] | (infoResponse[3] << 8);
            console.log(`Handshake complete. Device RPC version: ${rpcMajor}.${rpcMinor}.${rpcBuild}`);

            return true;

        } catch (error) {
            console.error("Web Bluetooth Error: ", error);
            return false;
        }
    },

    _handleNotification: function(bytes) {
        const msgType = bytes[0];
        const payload = bytes.slice(1);

        const queue = this._pending[msgType];
        if (queue && queue.length > 0) {
            const resolve = queue.shift();
            resolve(payload);
        }

        // Log motor command results for visibility, regardless of whether
        // something is actively awaiting them.
        if (msgType === this.MOTOR_SET_SPEED_RESULT ||
            msgType === this.MOTOR_RUN_FOR_DEGREES_RESULT ||
            msgType === this.MOTOR_RUN_RESULT ||
            msgType === this.MOTOR_STOP_RESULT) {
            const bitMask = payload[0];
            const status = payload[1];
            console.log(`Result for msgType ${msgType}: motor bitmask ${bitMask}, ` +
                        `status ${this.STATUS_LABEL[status] || status}`);
        }
    },

    _sendAndWait: function(bytes, expectedResultType, timeoutMs = 4000) {
        return new Promise(async (resolve, reject) => {
            if (!this._pending[expectedResultType]) this._pending[expectedResultType] = [];
            const timer = setTimeout(() => reject(new Error(`Timed out waiting for result type ${expectedResultType}`)), timeoutMs);
            this._pending[expectedResultType].push((payload) => {
                clearTimeout(timer);
                resolve(payload);
            });
            try {
                await this.writeChar.writeValueWithoutResponse(bytes);
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    },

    // --- Message builders (mirror rpc_message.py exactly: header byte, no length prefix) ---

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

    // --- Public motor commands. speed is 0-100 (magnitude only); use `direction` for rotation sense. ---

    runMotorForDegrees: async function(bitMask, speedPercent, direction, degrees) {
        // Real client sends SetSpeed + RunForDegrees concatenated into ONE write.
        const combined = this._concat(
            this._buildSetSpeed(bitMask, speedPercent),
            this._buildRunForDegrees(bitMask, degrees, direction)
        );
        return this._sendAndWait(combined, this.MOTOR_RUN_FOR_DEGREES_RESULT);
    },

    runMotorContinuous: async function(bitMask, speedPercent, direction) {
        const combined = this._concat(
            this._buildSetSpeed(bitMask, speedPercent),
            this._buildRun(bitMask, direction)
        );
        return this._sendAndWait(combined, this.MOTOR_RUN_RESULT);
    },

    stopMotor: async function(bitMask) {
        return this._sendAndWait(this._buildStop(bitMask), this.MOTOR_STOP_RESULT);
    }
};