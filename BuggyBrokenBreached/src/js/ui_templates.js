const UI_MODALS = `
    <div id="settings-overlay" class="modal-overlay" style="display: none; z-index: 10005;">
        <div class="modal-content" style="max-width: 650px; text-align: center; border-color: #888;">
            <h2 style="color: #fff; margin-top: 0; text-shadow: 0 0 10px rgba(255,255,255,0.4);">[ DIFFICULTY SETTINGS ]</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: nowrap; justify-content: center;">
                <button id="btn-diff-easy" class="btn-success active-valid" onclick="window.setDifficulty('easy')" style="flex: 1; margin-top: 0; border-color: var(--neon-green); color: var(--neon-green); font-size: 1em; padding: 10px;">EASY</button>
                <button id="btn-diff-medium" class="btn-success" onclick="window.setDifficulty('medium')" style="flex: 1; margin-top: 0; border-color: #888; color: #888; font-size: 1em; padding: 10px;">MEDIUM</button>
                <button id="btn-diff-hard" class="btn-success" onclick="window.setDifficulty('hard')" style="flex: 1; margin-top: 0; border-color: #888; color: #888; font-size: 1em; padding: 10px;">HARD</button>
            </div>
            <div id="diff-desc" style="text-align: left; background: rgba(0,0,0,0.5); padding: 20px; border: 1px solid var(--border-color); color: #ccc; min-height: 140px; font-size: 1.05em; line-height: 1.5; white-space: pre-wrap;"></div>
            <button onclick="window.closeSettings()" class="btn-success" style="margin-top: 25px; width: 60%; align-self: center; border-color: #fff; color: #fff;">APPLY & CLOSE</button>
        </div>
    </div>

    <div id="p1-start-overlay" class="modal-overlay" style="display: none; z-index: 9990; position: fixed;">
        <button id="btn-settings" class="btn-success" style="position: absolute; top: 15px; right: 20px; width: auto; margin: 0; padding: 10px 20px; z-index: 10000; font-weight: bold; font-size: 1.1em; border-color: #888; color: #888;" onclick="window.openSettings()">[ ⚙ ] SETTINGS</button>
        <div style="display: flex; flex-direction: row; gap: 40px; max-width: 1000px; width: 95%; justify-content: center; align-items: stretch; flex-wrap: wrap;">
            <div class="modal-content" style="flex: 1; min-width: 320px; max-width: 450px; border-color: var(--neon-green); box-shadow: 0 0 30px rgba(0,255,65,0.15); margin: 0; display: flex; flex-direction: column; justify-content: center;">
                <h3 style="color: var(--neon-green); margin-top: 0; margin-bottom: 15px; text-align: center; text-shadow: 0 0 8px rgba(0,255,65,0.3);">[ PROGRAMMER RULES ]</h3>
                <ul id="rules-programmer" style="color: #ccc; line-height: 1.6; padding-left: 20px; margin-bottom: 0; font-size: 1.05em; text-align: left;"><li>Loading rules...</li></ul>
            </div>
            <div class="modal-content" style="flex: 1; min-width: 320px; max-width: 450px; border-color: var(--neon-green); box-shadow: 0 0 30px rgba(0,255,65,0.15); margin: 0; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h2 style="color: var(--neon-green); margin-top: 0; text-shadow: 0 0 10px rgba(0,255,65,0.4);">[ PHASE 1: PROGRAMMER ]</h2>
                <p style="color: #ccc; margin-bottom: 25px; font-size: 1.1em;">You have <strong id="time-p1">2 minutes</strong> to build your sequence.</p>
                <button class="btn-success" onclick="window.startPhase1()" style="font-size: 1.2em; padding: 15px; width: 100%; max-width: 300px; margin: 0 auto; display: block;">PROGRAMMER: BEGIN</button>
            </div>
        </div>
    </div>

    <div id="p2-start-overlay" class="modal-overlay" style="display: none; z-index: 9990;">
        <div style="display: flex; flex-direction: row; gap: 40px; max-width: 1000px; width: 95%; justify-content: center; align-items: stretch; flex-wrap: wrap;">
            <div class="modal-content" style="flex: 1; min-width: 320px; max-width: 450px; border-color: var(--neon-red); box-shadow: 0 0 30px rgba(255,0,60,0.15); margin: 0; display: flex; flex-direction: column; justify-content: center;">
                <h3 style="color: var(--neon-red); margin-top: 0; margin-bottom: 15px; text-align: center; text-shadow: 0 0 8px rgba(255,0,60,0.3);">[ HACKER RULES ]</h3>
                <ul id="rules-hacker" style="color: #ccc; line-height: 1.6; padding-left: 20px; margin-bottom: 0; font-size: 1.05em; text-align: left;"><li>Loading rules...</li></ul>
            </div>
            <div class="modal-content" style="flex: 1; min-width: 320px; max-width: 450px; border-color: var(--neon-red); box-shadow: 0 0 30px rgba(255,0,60,0.15); margin: 0; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h2 style="color: var(--neon-red); margin-top: 0; text-shadow: 0 0 10px rgba(255,0,60,0.4);">[ PHASE 2: HACKER ]</h2>
                <p style="color: #ccc; margin-bottom: 25px; font-size: 1.1em;">You have <strong id="time-p2">2 minutes</strong> to intercept the payload.</p>
                <button class="btn-danger" onclick="window.startPhase2()" style="font-size: 1.2em; padding: 15px; width: 100%; max-width: 300px; margin: 0 auto; display: block;">HACKER: BEGIN</button>
            </div>
        </div>
    </div>

    <div id="p3-start-overlay" class="modal-overlay" style="display: none; z-index: 9990;">
        <div style="display: flex; flex-direction: row; gap: 40px; max-width: 1000px; width: 95%; justify-content: center; align-items: stretch; flex-wrap: wrap;">
            <div class="modal-content" style="flex: 1; min-width: 320px; max-width: 450px; border-color: var(--neon-cyan); box-shadow: 0 0 30px rgba(0,240,255,0.15); margin: 0; display: flex; flex-direction: column; justify-content: center;">
                <h3 style="color: var(--neon-cyan); margin-top: 0; margin-bottom: 15px; text-align: center; text-shadow: 0 0 8px rgba(0,240,255,0.3);">[ INVESTIGATION RULES ]</h3>
                <ul id="rules-investigation" style="color: #ccc; line-height: 1.6; padding-left: 20px; margin-bottom: 0; font-size: 1.05em; text-align: left;"><li>Loading rules...</li></ul>
            </div>
            <div class="modal-content" style="flex: 1; min-width: 320px; max-width: 450px; border-color: var(--neon-cyan); box-shadow: 0 0 30px rgba(0,240,255,0.15); margin: 0; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h2 style="color: var(--neon-cyan); margin-top: 0; text-shadow: 0 0 10px rgba(0,240,255,0.4);">[ PHASE 3: EXECUTION ]</h2>
                <p style="color: #ccc; margin-bottom: 25px; font-size: 1.1em;">You will have <strong id="time-p3">5 minutes</strong> to investigate the run.</p>
                <button class="btn-success" onclick="window.startPhase3()" style="font-size: 1.2em; padding: 15px; width: 100%; max-width: 350px; border-color: var(--neon-cyan); color: var(--neon-cyan); margin: 0 auto; display: block;">INITIATE HARDWARE LINK</button>
            </div>
        </div>
    </div>

    <div id="help-overlay" class="modal-overlay" style="display: none; z-index: 10000;">
        <div class="modal-content" style="max-width: 650px; text-align: center;">
            <h2 style="color: var(--neon-cyan); margin-top: 0; text-shadow: 0 0 10px rgba(0,240,255,0.4);">[ SYSTEM MANUAL ]</h2>
            <div id="help-content-container" style="min-height: 200px; display: flex; flex-direction: column; justify-content: center; margin-bottom: 20px; padding: 20px; background: rgba(0,240,255,0.05); border: 1px solid var(--border-color); border-radius: 4px;">
                <div class="help-step" id="help-step-1"><h3 style="color: var(--neon-cyan); margin-top: 0; font-size: 1.4em;">WELCOME TO THE GAME!</h3><p style="color: #ccc; line-height: 1.5; font-size: 1.1em;">This is a game for <strong>two players</strong>!<br><br>Player 1 is the <strong style="color: var(--neon-green);">Programmer</strong> who wants to make the robot move. Player 2 is the sneaky <strong style="color: var(--neon-red);">Hacker</strong> who wants to secretly mess up the robot's instructions.</p></div>
                <div class="help-step" id="help-step-2" style="display:none;"><h3 style="color: var(--neon-green); margin-top: 0; font-size: 1.4em;">STEP 1: THE PROGRAMMER</h3><p style="color: #ccc; line-height: 1.5; font-size: 1.1em;">The <strong style="color: var(--neon-green);">Programmer</strong> builds a <strong style="color: var(--neon-green);">public</strong> movement sequence for the robot using the directional instructions.<br><br><strong style="color: #fff;">Make sure to memorize your sequence!</strong> You will need to remember it later to catch the Hacker.</p></div>
                <div class="help-step" id="help-step-3" style="display:none;"><h3 style="color: var(--neon-red); margin-top: 0; font-size: 1.4em;">STEP 2: THE HACKER STRIKES</h3><p style="color: #ccc; line-height: 1.5; font-size: 1.1em;">The <strong style="color: var(--neon-red);">Hacker</strong> intercepts the code! The <strong style="color: var(--neon-red);">Hacker</strong> creates a <strong style="color: var(--neon-red);">secret</strong> sequence by <strong style="color: var(--neon-red);">REPLACING</strong> or <strong style="color: var(--neon-red);">DELETING</strong> the original instructions.</p></div>
                <div class="help-step" id="help-step-4" style="display:none;"><h3 style="color: var(--neon-cyan); margin-top: 0; font-size: 1.4em;">STEP 3: ROBOT EXECUTION</h3><p style="color: #ccc; line-height: 1.5; font-size: 1.1em;">The robot connects and executes the final sequence. Watch closely!<br><br>Some motors may experience spontaneous <strong style="color: #ff9d00;">MECHANICAL FAILURES</strong>. When this happens, <strong style="color: #fff;">one of the motors will break and stop turning for exactly one move</strong>.</p></div>
                <div class="help-step" id="help-step-5" style="display:none;"><h3 style="color: #ff9d00; margin-top: 0; font-size: 1.4em;">STEP 4: DETECTIVE TOOL 1 (THE GRAPH)</h3><p style="color: #ccc; line-height: 1.5; font-size: 1.1em;">The <strong>Sensor Graph</strong> shows how fast the wheels spun. If a line drops to ZERO when it was supposed to be moving, that motor is mechanically <strong style="color: #ff9d00;">BROKEN</strong>!</p></div>
                <div class="help-step" id="help-step-6" style="display:none;"><h3 style="color: #ff9d00; margin-top: 0; font-size: 1.4em;">STEP 5: DETECTIVE TOOL 2 (THE AUDIT)</h3><p style="color: #ccc; line-height: 1.5; font-size: 1.1em;">The <strong>Memory Audit</strong> scans the code. You only get 3 guesses! If the screen flashes <strong style="color: var(--neon-green);">GREEN</strong>, the move is Safe. If it flashes <strong style="color: var(--neon-red);">RED</strong>, the <strong style="color: var(--neon-red);">Hacker</strong> changed it!</p></div>
                <div class="help-step" id="help-step-7" style="display:none;"><h3 style="color: var(--neon-cyan); margin-top: 0; font-size: 1.4em;">STEP 6: WIN THE GAME!</h3><p style="color: #ccc; line-height: 1.5; font-size: 1.1em;">In the <strong>Incident Report</strong>, guess what happened to every single move! Was it Safe (<strong style="color: var(--neon-green);">VALID</strong>), Hacked (<strong style="color: var(--neon-red);">BREACHED</strong>), or did the motor break (<strong style="color: #ff9d00;">BROKEN</strong>)?</p></div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; padding: 0 20px;">
                <button id="btn-help-prev" class="help-arrow" onclick="window.prevHelp()">&#9664;</button>
                <div id="help-dots" style="display: flex; gap: 10px;">
                    <div class="help-dot active"></div><div class="help-dot"></div><div class="help-dot"></div><div class="help-dot"></div><div class="help-dot"></div><div class="help-dot"></div><div class="help-dot"></div>
                </div>
                <button id="btn-help-next" class="help-arrow" onclick="window.nextHelp()">&#9654;</button>
            </div>
            <button id="btn-help-finish" onclick="window.closeHelp()" class="btn-success" style="margin-top: 0; opacity: 0.5; cursor: not-allowed;" disabled>FINISH</button>
        </div>
    </div>

    <div id="hijack-overlay" class="cinematic-overlay" style="display:none;">
        <button class="skip-btn" onclick="window.skipToPhase2()">[ SKIP CUTSCENE >> ]</button>
        <div id="hijack-scene" class="cinematic-scene">
            <div class="cinematic-pc"><svg width="100" height="100" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="8" fill="#555"/><rect x="3" y="3" width="10" height="6" fill="#00ff41"/><rect x="4" y="10" width="8" height="2" fill="#777"/><rect x="1" y="12" width="14" height="2" fill="#555"/></svg></div>
            <div class="cinematic-stream" id="h-stream">
                <div class="binary-row">01001101 01100001 01110011 01110100 01100101 01110010 01100011 01101000 01001101 01100001</div>
                <div class="binary-row">01101001 01100101 01100110 00100000 01110011 01110000 01100001 01110010 01101001 01100101</div>
                <div class="binary-row">01110100 01100001 01101110 00100000 00110001 00110001 00110111 00000000 01110100 01100001</div>
            </div>
            <img class="cinematic-packet" id="h-packet" src="resources/packet.png" alt="DATA">
            <div class="cinematic-hacker" id="h-hacker"><svg width="120" height="120" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="1" width="14" height="10" fill="#222"/><rect x="2" y="2" width="12" height="8" fill="#ff003c"/><rect x="5" y="4" width="2" height="2" fill="#000"/><rect x="9" y="4" width="2" height="2" fill="#000"/><rect x="4" y="7" width="8" height="2" fill="#000"/><rect x="3" y="11" width="10" height="2" fill="#111"/><rect x="0" y="13" width="16" height="3" fill="#222"/></svg></div>
            <div class="cinematic-bot"><svg width="100" height="100" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="8" fill="#aaa"/><rect x="5" y="6" width="2" height="2" fill="#00f0ff"/><rect x="9" y="6" width="2" height="2" fill="#00f0ff"/><rect x="7" y="1" width="2" height="3" fill="#888"/><rect x="2" y="12" width="4" height="4" fill="#555"/><rect x="10" y="12" width="4" height="4" fill="#555"/></svg></div>
        </div>
    </div>
    
    <div id="deploy-overlay" class="cinematic-overlay" style="display:none;">
        <button class="skip-btn" onclick="window.skipToPhase3()">[ SKIP CUTSCENE >> ]</button>
        <div id="deploy-scene" class="cinematic-scene">
            <div class="cinematic-pc"><svg width="100" height="100" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="1" width="14" height="10" fill="#222"/><rect x="2" y="2" width="12" height="8" fill="#ff003c"/><rect x="5" y="4" width="2" height="2" fill="#000"/><rect x="9" y="4" width="2" height="2" fill="#000"/><rect x="4" y="7" width="8" height="2" fill="#000"/><rect x="3" y="11" width="10" height="2" fill="#111"/><rect x="0" y="13" width="16" height="3" fill="#222"/></svg></div>
            <div class="cinematic-stream" id="d-stream">
                <div class="binary-row red">10110010 11010111 00110101 10001010 11110000 00101101 11001011 01010100 11100011 10101010</div>
                <div class="binary-row red">11101001 10111100 01101011 11000111 01010101 10011010 11011011 00010101 10111100 01100110</div>
                <div class="binary-row red">10010101 11010011 00101010 11101101 01110011 10101010 11001100 01011101 11101100 00101010</div>
                <img class="cinematic-packet" id="d-packet" src="resources/packet.png" alt="DATA" style="filter: drop-shadow(0 0 20px #ff003c) sepia(1) hue-rotate(-50deg) saturate(5);">
            </div>
            <div class="cinematic-bot" id="d-bot"><svg width="100" height="100" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="8" fill="#aaa"/><rect x="5" y="6" width="2" height="2" fill="#00f0ff"/><rect x="9" y="6" width="2" height="2" fill="#00f0ff"/><rect x="7" y="1" width="2" height="3" fill="#888"/><rect x="2" y="12" width="4" height="4" fill="#555"/><rect x="10" y="12" width="4" height="4" fill="#555"/></svg></div>
        </div>
    </div>

    <div id="loading-screen"><div class="loader-title">[ SYSTEM_BOOT_SEQUENCE ]</div><div class="progress-box"><div class="progress-fill"></div></div><div class="loader-log"></div></div>

    <div id="checksum-overlay" class="modal-overlay" style="display: none;">
        <div class="modal-content" style="max-width: 850px;">
            <h2 style="text-align: center; color: var(--neon-cyan); margin-top: 0; text-shadow: 0 0 10px rgba(0,240,255,0.4);">[ SECURE MEMORY AUDIT ]</h2>
            <h3 id="checks-counter" style="text-align: center; color: var(--neon-cyan); margin-top: -5px; margin-bottom: 15px; border: 1px solid var(--neon-cyan); padding: 5px 15px; width: max-content; margin-left: auto; margin-right: auto; border-radius: 4px;">CHECKS REMAINING: 3</h3>
            <div id="checksum-list-view">
                <div class="analysis-guide" style="margin-top: 0; margin-bottom: 15px;">Click an original memory block to audit its cryptographic hash against the live robot. You only have 3 checks! If the hashes match, the block is <strong style="color: var(--neon-green);">VERIFIED</strong>. If they differ, the block was <strong style="color: var(--neon-red);">BREACHED</strong>.</div>
                <div id="checksum-blocks" style="display: flex; flex-direction: column; gap: 10px; max-height: 45vh; overflow-y: auto; padding-right: 10px;"></div>
            </div>
            <div id="checksum-anim-view" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 30px;">
                    <div style="text-align: center; flex: 1;"><h4 style="color: #aaa; margin-bottom: 10px;">PROGRAMMER INPUT</h4><div id="anim-p-val" style="font-size: 1.5em; color: var(--text-main); margin-bottom: 10px;">FORWARD</div><div id="anim-p-hash" style="font-size: 2em; color: var(--neon-cyan); font-weight: bold; letter-spacing: 2px;">0x00000000</div></div>
                    <div style="font-size: 2.5em; color: #555; font-weight: bold; padding: 0 20px;">VS</div>
                    <div style="text-align: center; flex: 1;"><h4 style="color: #aaa; margin-bottom: 10px;">ROBOT MEMORY</h4><div id="anim-r-val" style="font-size: 1.5em; color: var(--text-main); margin-bottom: 10px;">?????</div><div id="anim-r-hash" style="font-size: 2em; color: var(--neon-red); font-weight: bold; letter-spacing: 2px;">0x00000000</div></div>
                </div>
                <div id="anim-result" style="font-size: 2.5em; font-weight: bold; height: 50px; margin-bottom: 20px; text-transform: uppercase;"></div>
                <button id="btn-anim-back" onclick="window.backToChecksumList()" class="btn-success" style="width: 50%; opacity: 0; pointer-events: none; transition: opacity 0.5s;">RETURN TO LIST</button>
            </div>
            <button id="btn-close-diagnostics" onclick="window.closeChecksum()" class="btn-success" style="margin-top: 25px; align-self: center; width: 50%;">Close Diagnostics</button>
        </div>
    </div>

    <div id="sensor-overlay" class="modal-overlay" style="display: none;">
        <div class="modal-content">
            <h2 style="text-align: center; color: var(--neon-cyan); margin-top: 0; margin-bottom: 15px; text-shadow: 0 0 10px rgba(0,240,255,0.4);">[ SENSOR TELEMETRY LOG ]</h2>
            <div style="display: flex; gap: 20px; align-items: stretch; margin-bottom: 5px;">
                <div class="analysis-guide" style="flex: 1; padding: 12px; background: rgba(0,240,255,0.05); color: #aaa; font-size: 0.9em; border-left: 3px solid var(--neon-cyan);"><strong>ANALYSIS:</strong> Look for flatlines at 0%. If the motor drops to 0% when it should be moving, it means the motor failed!</div>
                <button id="btn-toggle-graph" onclick="window.toggleGraphMode()" class="btn-success btn-toggle-normal" style="width: auto; margin-top: 0; padding: 10px 20px;">Mode:<br>Normal</button>
            </div>
            <div class="canvas-container"><canvas id="sensor-canvas" width="900" height="400"></canvas></div>
            <div class="legend">
                <div class="legend-item"><div class="color-box" style="background: var(--neon-green);"></div> Left Motor [M0]</div>
                <div class="legend-item"><div class="color-box" style="background: var(--neon-cyan);"></div> Right Motor [M1]</div>
            </div>
            <button onclick="window.closeSensors()" class="btn-success" style="margin-top: 25px; align-self: center; width: 50%;">Close Telemetry</button>
        </div>
    </div>

    <div id="deduction-overlay" class="modal-overlay" style="display: none; z-index: 250;">
        <div class="modal-content" style="max-width: 900px;">
            <h2 style="text-align: center; color: var(--neon-cyan); margin-top: 0; text-shadow: 0 0 10px rgba(0,240,255,0.4);">[ INCIDENT REPORT ]</h2>
            <div class="analysis-guide" style="margin-top: 0; margin-bottom: 15px;">Review the memory audit and sensor graph to find the Hacker's modifications and broken motors. Mark each row as <strong style="color: var(--neon-green);">VALID</strong> (Safe), <strong style="color: var(--neon-red);">BREACHED</strong> (Hacked), or <strong style="color: #ff9d00;">BROKEN</strong> (Mechanical Failure).</div>
            <div id="deduction-list" style="overflow-y: auto; max-height: 50vh; display: flex; flex-direction: column; gap: 10px; padding-right: 10px;"></div>
            <div style="display: flex; gap: 15px; margin-top: 25px;">
                <button onclick="window.closeDeduction()" class="btn-success" style="flex: 1; border-color: var(--neon-cyan); color: var(--neon-cyan); background: rgba(0, 240, 255, 0.05);">Wait, Let Me Check</button>
                <button id="btn-submit-report" onclick="window.submitDeduction()" class="btn-success" style="flex: 2; border-color: var(--neon-green); color: var(--neon-green); background: rgba(0, 255, 65, 0.05); opacity: 0.5;" disabled>Submit Final Report</button>
            </div>
        </div>
    </div>

    <div id="result-overlay" class="modal-overlay" style="display: none; z-index: 300;">
        <div class="modal-content" style="text-align: center; max-width: 1000px; width: 95%; max-height: 90vh;">
            <h1 id="result-title" style="font-size: 3em; margin: 10px 0; text-transform: uppercase;"></h1>
            <div style="display: flex; gap: 20px; text-align: left; overflow: hidden; margin-bottom: 25px; flex: 1; min-height: 400px;">
                <div id="result-desc" style="flex: 1; color: #ccc; font-size: 1.1em; line-height: 1.6; white-space: pre-wrap; background: rgba(0,0,0,0.5); padding: 20px; border-radius: 4px; border: 1px solid var(--border-color); overflow-y: auto;"></div>
                <div id="score-tally" style="flex: 1; display: none; background: rgba(0,0,0,0.5); padding: 20px; border-radius: 4px; border: 1px solid var(--border-color); overflow-y: auto;">
                    <h3 style="text-align: center; color: var(--neon-cyan); margin-top: 0; letter-spacing: 2px;">[ FINAL SCORE TALLY ]</h3>
                    <div id="score-tally-lines"></div>
                    <div id="score-tally-total" style="display: none; text-align: center; font-size: 2.2em; font-weight: bold; margin-top: 15px; color: var(--neon-green); text-shadow: 0 0 15px rgba(0,255,65,0.5);"></div>
                    <div id="score-tally-perfect" style="display: none; text-align: center; font-size: 1.2em; font-weight: bold; margin-top: 10px; color: #ffd700; text-shadow: 0 0 15px rgba(255,215,0,0.6); letter-spacing: 2px;">★ PERFECT AUDIT! ★</div>
                </div>
            </div>
            <button onclick="location.reload()" class="btn-success" style="width: 60%; margin: 0 auto; color: var(--text-main); border-color: var(--text-main); flex-shrink: 0;">Reboot System (Play Again)</button>
        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', UI_MODALS);