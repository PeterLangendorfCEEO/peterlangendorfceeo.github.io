window.legoBluetooth = {
    device: null,
    characteristic: null,
    attachedPorts: {},   // populated from Hub Attached I/O notifications, e.g. {0: "Motor", 1: "Motor"}

    // Canonical, documented UUIDs -- do not fall back to 0xFD02.
    // (0xFD02 is only the *advertising* alias; it is not guaranteed to expose
    // the same control characteristic as the real Hub Service.)
    HUB_SERVICE_UUID: '00001623-1212-efde-1623-785feabcd123',
    HUB_CHARACTERISTIC_UUID: '00001624-1212-efde-1623-785feabcd123',

    connectHub: async function() {
        try {
            console.log("Requesting Web Bluetooth Connection...");

            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [this.HUB_SERVICE_UUID]
            });

            const server = await this.device.gatt.connect();
            await new Promise(resolve => setTimeout(resolve, 1000));

            const service = await server.getPrimaryService(this.HUB_SERVICE_UUID);
            console.log("Hub service locked in:", service.uuid);

            this.characteristic = await service.getCharacteristic(this.HUB_CHARACTERISTIC_UUID);
            console.log("Bound characteristic:", this.characteristic.uuid,
                        "properties:", JSON.stringify(this.characteristic.properties));

            // Subscribe so we can actually see what the hub says back.
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this._handleNotification(event.target.value);
            });

            // Give the hub a moment to announce its attached motors (Hub Attached I/O, type 0x04).
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log("Attached ports discovered so far:", this.attachedPorts);

            return true;

        } catch (error) {
            console.error("Web Bluetooth Error: ", error);
            return false;
        }
    },

    _handleNotification: function(dataView) {
        const bytes = new Uint8Array(dataView.buffer);
        const msgType = bytes[2];

        if (msgType === 0x04) {
            // Hub Attached I/O: byte[3] = port id, byte[4] = event (0=detached,1=attached,2=virtual)
            const portId = bytes[3];
            const event = bytes[4];
            if (event === 0x01 || event === 0x02) {
                this.attachedPorts[portId] = "attached";
                console.log(`Port ${portId}: device ATTACHED`);
            } else {
                delete this.attachedPorts[portId];
                console.log(`Port ${portId}: device DETACHED`);
            }
        } else if (msgType === 0x05) {
            // Generic Error Message: byte[3] = command that failed, byte[4] = error code
            console.warn(`Hub reported an ERROR for command 0x${bytes[3].toString(16)}: ` +
                         `code 0x${bytes[4].toString(16)} (see LWP3 Error Codes table)`);
        } else if (msgType === 0x82) {
            // Port Output Command Feedback -- confirms a motor command actually completed
            console.log(`Port ${bytes[3]}: command feedback status 0x${bytes[4].toString(16)}`);
        }
    },

    runMotor: async function(portName, speed, degrees) {
        if (!this.characteristic) {
            console.error("No characteristic bound -- call connectHub() first.");
            return;
        }

        const portId = portName === 'LEFT' ? 0x00 : 0x01;
        if (!(portId in this.attachedPorts)) {
            console.warn(`Warning: no device reported as attached on port ${portId}. ` +
                         `Double-check your wiring/port mapping -- this command will likely be ignored.`);
        }

        const degArray = [
            degrees & 0xFF,
            (degrees >> 8) & 0xFF,
            (degrees >> 16) & 0xFF,
            (degrees >> 24) & 0xFF
        ];

        const payload = new Uint8Array([
            0x0E, 0x00, 0x81, portId, 0x10, 0x0B,
            ...degArray,
            speed & 0xFF,
            100,
            0x7F,
            0x00
        ]);

        try {
            // The Hub Characteristic (1624) is documented as "Write without response".
            // Using writeValueWithoutResponse matches that capability directly instead
            // of going through the deprecated writeValue() compatibility path.
            await this.characteristic.writeValueWithoutResponse(payload);
        } catch (error) {
            console.error("Failed to write motor frame:", error);
        }
    }
};