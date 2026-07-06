window.legoBluetooth = {
    device: null,
    characteristic: null,

    connectHub: async function() {
        try {
            console.log("Requesting Web Bluetooth Connection...");
            
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['00001623-1212-efde-1623-785feabcd123', 0xFD02] 
            });

            const server = await this.device.gatt.connect();
            
            // Give the hub a second to wake up
            await new Promise(resolve => setTimeout(resolve, 1000));

            let service;
            try {
                service = await server.getPrimaryService('00001623-1212-efde-1623-785feabcd123');
            } catch (e) {
                console.log("Standard 128-bit service hidden. Falling back to 16-bit alias (0xFD02)...");
                service = await server.getPrimaryService(0xFD02);
            }

            console.log("Service locked in. Scanning for writable characteristics...");
            
            // THE FIX: Dynamically fetch ALL characteristics instead of guessing the UUID
            const characteristics = await service.getCharacteristics();
            
            for (let char of characteristics) {
                console.log(`Discovered Characteristic: ${char.uuid}`);
                
                // Automatically bind to the first characteristic that allows us to send commands
                if (char.properties.write || char.properties.writeWithoutResponse) {
                    this.characteristic = char;
                    console.log(`SUCCESS! Bound to writable characteristic: ${char.uuid}`);
                    return true;
                }
            }

            console.error("Failed to find any writable characteristics.");
            return false;
            
        } catch (error) {
            console.error("Web Bluetooth Error: ", error);
            return false;
        }
    },

    runMotor: async function(portName, speed, degrees) {
        if (!this.characteristic) return;

        // Maps "LEFT" to Port 0x00 and "RIGHT" to Port 0x01
        const portId = portName === 'LEFT' ? 0x00 : 0x01;
        
        // Converts the degree integer into a 4-byte little-endian array
        const degArray = [
            degrees & 0xFF,
            (degrees >> 8) & 0xFF,
            (degrees >> 16) & 0xFF,
            (degrees >> 24) & 0xFF
        ];

        const payload = new Uint8Array([
            0x0E,           // 1. Length of the message (14 bytes)
            0x00,           // 2. Hub ID
            0x81,           // 3. Command Type: Port Output Command
            portId,         // 4. Port to address
            0x10,           // 5. THE FIX: 0x10 = Execute Immediately, NO Feedback
            0x0B,           // 6. Subcommand: WriteDirectModeData (Turn Degrees)
            ...degArray,    // 7, 8, 9, 10. The 4 bytes representing the degrees
            speed & 0xFF,   // 11. Speed (-100 to 100)
            100,            // 12. Max Power (0-100)
            0x7F,           // 13. End State (0x7F = Brake motor when done)
            0x00            // 14. Use Profile (0x00 = No acceleration profile)
        ]);

        try {
            // THE FIX: Restored the standard, safe writeValue function
            await this.characteristic.writeValue(payload);
        } catch (error) {
            console.error("Failed to write motor frame:", error);
        }
    }
};