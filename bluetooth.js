window.legoBluetooth = {
    device: null,
    client: null,
    writeChar: null,
    notifyChar: null,
    _pending: {},   // resultType -> [resolve, ...] FIFO queues

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
    DEVICE_NOTIFICATION_REQUEST: 40,
    DEVICE_NOTIFICATION_RESPONSE: 41,
    DEVICE_NOTIFICATION: 60,

    // Sub-notification type IDs multiplexed inside a DEVICE_NOTIFICATION (60) payload,
    // and the byte-length of each sub-notification's fixed-format body (excludes the
    // 1-byte sub-notification type header itself).
    SUB_NOTIFICATION_SIZES: { 0: 2, 1: 20, 3: 3, 4: 1, 10: 12, 12: 12, 15: 6, 16: 1 },
    IMU_DEVICE_NOTIFICATION: 1,

    MOTOR_BITS_LEFT: 1,
    MOTOR_BITS_RIGHT: 2,
    MOTOR_BITS_BOTH: 3,

    DIRECTION_CLOCKWISE: 0,
    DIRECTION_COUNTERCLOCKWISE: 1,
    DIRECTION_SHORTEST: 2,
    DIRECTION_LONGEST: 3,

    STATUS_LABEL: {0: "COMPLETED", 1: "INTERRUPTED", 2: "NACK"},

    // IMU state, updated live from DEVICE_NOTIFICATION telemetry once enabled.
    _rawYawTenthDeg: null,
    zeroAngle: null,

    // Full raw IMU reading (all fields straight off the wire, no scaling applied
    // except where noted). orientation/yawFace are raw enums; yaw/pitch/roll and
    // the gyro axes are in tenths-of-a-degree (and tenths-of-a-degree/sec for the
    // gyro) by inference from cyber.py's own `yaw/10` convention -- LEGO doesn't
    // document the gyro/accel scale in the package itself, so treat the "per
    // second" framing as a well-supported guess rather than a confirmed spec.
    imu: {
        orientation: null, yawFace: null,
        yaw: null, pitch: null, roll: null,
        accelX: null, accelY: null, accelZ: null,
        gyroX: null, gyroY: null, gyroZ: null,
    },

    // Per-motor telemetry, keyed by bitmask (1=left, 2=right), from MOTOR_NOTIFICATION.
    motorTelemetry: {},


    connectHub: async function() {
        try {
            console.log("Requesting Web Bluetooth Connection...");

            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [this.SERVICE_UUID]
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

            // Mandatory handshake -- the device won't reliably act on motor
            // commands until this InfoRequest/InfoResponse exchange happens.
            console.log("Sending InfoRequest handshake...");
            const infoResponse = await this._sendAndWait(
                new Uint8Array([this.INFO_REQUEST]), this.INFO_RESPONSE
            );
            const rpcMajor = infoResponse[0], rpcMinor = infoResponse[1];
            const rpcBuild = infoResponse[2] | (infoResponse[3] << 8);
            console.log(`Handshake complete. Device RPC version: ${rpcMajor}.${rpcMinor}.${rpcBuild}`);

            // Turn on periodic telemetry (IMU yaw, etc.) so angle-feedback turning works.
            await this.enableTelemetry(50);

            // THE FIX: Returns the hardware name to Python so the footer updates!
            return this.device.name || "DOUBLE MOTOR";

        } catch (error) {
            console.error("Web Bluetooth Error: ", error);
            return false;
        }
    },

    enableTelemetry: async function(delayMs = 50) {
        const req = new Uint8Array([this.DEVICE_NOTIFICATION_REQUEST, delayMs & 0xFF, (delayMs >> 8) & 0xFF]);
        await this._sendAndWait(req, this.DEVICE_NOTIFICATION_RESPONSE);
        // Wait briefly for the first telemetry packet so zeroAngle can be calibrated.
        const start = Date.now();
        while (this._rawYawTenthDeg === null && Date.now() - start < 2000) {
            await new Promise(r => setTimeout(r, 20));
        }
        if (this._rawYawTenthDeg !== null) {
            this.zeroAngle = this._rawYawTenthDeg / 10.0;
            console.log(`IMU telemetry live. Zeroed starting angle at ${this.zeroAngle.toFixed(1)}deg.`);
        } else {
            console.warn("No IMU telemetry received -- angle-feedback turning will not be available.");
        }
    },

    // Mirrors cyber.py's normalize_angle() exactly.
    normalizeAngle: function(angle) {
        if (angle > 180) return angle - 360;
        if (angle < -180) return angle + 360;
        return angle;
    },

    // Mirrors cyber.py's get_angle() exactly (same quirky double-flip transform),
    // so existing turn-angle settings behave the same way they used to.
    getAngle: function() {
        if (this._rawYawTenthDeg === null || this.zeroAngle === null) return null;
        let angle = (this._rawYawTenthDeg / 10.0) - this.zeroAngle;
        if (angle > 0) angle = angle - 360;
        angle = (angle + 180) * -1;
        if (angle < 0) angle = angle + 180;
        else if (angle > 0) angle = angle - 180;
        return Math.round(angle * 10) / 10;
    },

    // Returns {x, y, z} gyro rates. `raw` gives the untouched int16 sensor units;
    // `degPerSec` applies the /10 scaling inferred from cyber.py's yaw convention --
    // verify against a known steady rotation if you need this to be exact.
    getGyro: function() {
        return {
            raw: { x: this.imu.gyroX, y: this.imu.gyroY, z: this.imu.gyroZ },
            degPerSec: {
                x: this.imu.gyroX === null ? null : this.imu.gyroX / 10.0,
                y: this.imu.gyroY === null ? null : this.imu.gyroY / 10.0,
                z: this.imu.gyroZ === null ? null : this.imu.gyroZ / 10.0,
            }
        };
    },

    // Full IMU snapshot (yaw/pitch/roll/accel/gyro), raw units.
    getImuSnapshot: function() {
        return { ...this.imu };
    },

    // Live speed for one motor (bitMask: MOTOR_BITS_LEFT / MOTOR_BITS_RIGHT).
    // Returns null until at least one MOTOR_NOTIFICATION has arrived for that motor.
    getMotorSpeed: function(bitMask) {
        const t = this.motorTelemetry[bitMask];
        return t ? t.speed : null;
    },

    // Full per-motor telemetry (motorState, absolutePosition, power, speed, position, gesture).
    getMotorTelemetry: function(bitMask) {
        return this.motorTelemetry[bitMask] || null;
    },

    _handleNotification: function(bytes) {
        const msgType = bytes[0];
        const payload = bytes.slice(1);

        if (msgType === this.DEVICE_NOTIFICATION) {
            this._parseDeviceNotification(payload);
            return;
        }

        const queue = this._pending[msgType];
        if (queue && queue.length > 0) {
            const resolve = queue.shift();
            resolve(payload);
        }

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

    _parseDeviceNotification: function(payload) {
        if (payload.length < 2) return;
        let dataLen = payload[0] | (payload[1] << 8);
        let data = payload.slice(2, 2 + dataLen);

        while (data.length > 0) {
            const subType = data[0];
            const size = this.SUB_NOTIFICATION_SIZES[subType];
            if (size === undefined) break; // unknown sub-type; stop walking safely

            if (subType === this.IMU_DEVICE_NOTIFICATION) {
                // FormatString "<BBhhhhhhhhh": orientation(B) yawFace(B) yaw(h) pitch(h) roll(h)
                // accelX(h) accelY(h) accelZ(h) gyroX(h) gyroY(h) gyroZ(h)
                const view = new DataView(data.buffer, data.byteOffset + 1, size);
                this._rawYawTenthDeg = view.getInt16(2, true);
                this.imu.orientation = view.getUint8(0);
                this.imu.yawFace = view.getUint8(1);
                this.imu.yaw = view.getInt16(2, true);
                this.imu.pitch = view.getInt16(4, true);
                this.imu.roll = view.getInt16(6, true);
                this.imu.accelX = view.getInt16(8, true);
                this.imu.accelY = view.getInt16(10, true);
                this.imu.accelZ = view.getInt16(12, true);
                this.imu.gyroX = view.getInt16(14, true);
                this.imu.gyroY = view.getInt16(16, true);
                this.imu.gyroZ = view.getInt16(18, true);
            } else if (subType === 10 /* MOTOR_NOTIFICATION */) {
                // FormatString "<BBHhblb": motorBitMask(B) motorState(B) absolutePosition(H)
                // power(h) speed(b) position(l) gesture(b)
                const view = new DataView(data.buffer, data.byteOffset + 1, size);
                const bitMask = view.getUint8(0);
                this.motorTelemetry[bitMask] = {
                    motorState: view.getUint8(1),
                    absolutePosition: view.getUint16(2, true),
                    power: view.getInt16(4, true),
                    speed: view.getInt8(6),
                    position: view.getInt32(7, true),
                    gesture: view.getInt8(11),
                    updatedAt: Date.now(),
                };
            }

            data = data.slice(1 + size);
        }
    },

    _sendAndWait: function(bytes, expectedResultType, timeoutMs = 4000) {
        const waiter = this._waitForResult(expectedResultType, timeoutMs);
        return this._rawWrite(bytes).then(() => waiter).catch((err) => { throw err; });
    },

    _waitForResult: function(expectedResultType, timeoutMs = 4000) {
        return new Promise((resolve, reject) => {
            if (!this._pending[expectedResultType]) this._pending[expectedResultType] = [];
            const timer = setTimeout(
                () => reject(new Error(`Timed out waiting for result type ${expectedResultType}`)),
                timeoutMs
            );
            this._pending[expectedResultType].push((payload) => {
                clearTimeout(timer);
                resolve(payload);
            });
        });
    },

    _rawWrite: async function(bytes) {
        await this.writeChar.writeValueWithoutResponse(bytes);
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

    // Single-motor helper (used for turning, where only one side is active on a fault, etc).
    runMotorForDegrees: async function(bitMask, speedPercent, direction, degrees) {
        const combined = this._concat(
            this._buildSetSpeed(bitMask, speedPercent),
            this._buildRunForDegrees(bitMask, degrees, direction)
        );
        return this._sendAndWait(combined, this.MOTOR_RUN_FOR_DEGREES_RESULT);
    },

    // Batches N motors' SetSpeed+RunForDegrees into ONE BLE write so they start
    // in the same radio packet -- this is what actually eliminates left/right drift.
    // commands: [{bitMask, speedPercent, direction, degrees}, ...]
    runForDegreesSynced: async function(commands) {
        const parts = [];
        for (const c of commands) {
            parts.push(this._buildSetSpeed(c.bitMask, c.speedPercent));
            parts.push(this._buildRunForDegrees(c.bitMask, c.degrees, c.direction));
        }
        const combined = this._concat(...parts);
        const waiters = commands.map(() => this._waitForResult(this.MOTOR_RUN_FOR_DEGREES_RESULT));
        await this._rawWrite(combined);
        return Promise.all(waiters);
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
    },

    // Runs motor(s) continuously and polls the live IMU heading until the target
    // angle is reached (mirrors cyber.py's original turn-until-angle loop).
    turnUntilAngle: async function(bitMask, speedPercent, direction, targetAngle, toleranceDeg = 7.5, maxMs = 15000) {
        if (this.getAngle() === null) {
            console.warn("No IMU angle available; falling back is the caller's responsibility.");
            return false;
        }
        await this.runMotorContinuous(bitMask, speedPercent, direction);

        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const current = this.getAngle();
            const error = Math.abs(this.normalizeAngle(current - targetAngle));
            if (error < toleranceDeg) break;
            await new Promise(r => setTimeout(r, 20));
        }
        await this.stopMotor(bitMask);
        return true;
    }
};