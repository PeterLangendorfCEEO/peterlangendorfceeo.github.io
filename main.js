// --- MATRIX BACKGROUND ENGINE ---
const mCanvas = document.getElementById('matrix-bg');
const mCtx = mCanvas.getContext('2d');
mCanvas.width = window.innerWidth;
mCanvas.height = window.innerHeight;

const chars = '01'.split('');
const fontSize = 16;
const columns = mCanvas.width / fontSize;
const drops = [];

for (let x = 0; x < columns; x++) {
    drops[x] = Math.floor(Math.random() * (mCanvas.height / fontSize));
}

let matrixIntervalId;

window.matrixSettings = {
    color: 'rgba(0, 255, 65, 0.15)', 
    fade: 'rgba(13, 13, 18, 0.05)',
    speed: 120 
};

mCtx.fillStyle = '#0d0d12';
mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
for(let i = 0; i < 100; i++) {
    mCtx.fillStyle = window.matrixSettings.fade;
    mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
    mCtx.fillStyle = window.matrixSettings.color;
    mCtx.font = fontSize + 'px monospace';
    for (let j = 0; j < drops.length; j++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        mCtx.fillText(text, j * fontSize, drops[j] * fontSize);
        if (drops[j] * fontSize > mCanvas.height && Math.random() > 0.975) {
            drops[j] = 0;
        }
        drops[j]++;
    }
}

function drawMatrix() {
    mCtx.fillStyle = window.matrixSettings.fade;
    mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
    mCtx.fillStyle = window.matrixSettings.color;
    mCtx.font = fontSize + 'px monospace';
    
    for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        mCtx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > mCanvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

function applyMatrixSettings() {
    if (matrixIntervalId) clearInterval(matrixIntervalId);
    matrixIntervalId = setInterval(drawMatrix, window.matrixSettings.speed);
}
applyMatrixSettings();
window.addEventListener('resize', () => { mCanvas.width = window.innerWidth; mCanvas.height = window.innerHeight; });


// --- UI STATE ENGINE ---
let programmerState = [];
let robotState = [];
let deductionState = []; 
let auditPairs = []; 
let checksRemaining = 3;
window.currentPhase = 1; 

window.logHackerAction = function(cmd) {
    if (window.currentPhase !== 2) return;
    const term = document.getElementById('hacker-terminal');
    if (!term) return;
    
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    
    const span = document.createElement('span');
    span.innerHTML = `<span style="color: #555;">[${time}]</span> <span style="color: var(--neon-red);">root@sys:~#</span> ${cmd}`;
    term.appendChild(span);
    term.scrollTop = term.scrollHeight;
}

const settingsInputs = ['fwd_spd', 'rgt_spd', 'rgt_ang', 'lft_spd', 'lft_ang', 'bck_spd'];
settingsInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', (e) => {
            window.logHackerAction(`SET_PARAM --env="${id}" --val="${e.target.value}"`);
        });
    }
});

let isDraggingMove = false;
let previousOrder = [];
const listbox = document.getElementById('move-listbox');

const observer = new MutationObserver((mutations) => {
    if (window.currentPhase !== 2) return;
    if (isDraggingMove) return; 

    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('list-item')) {
                    window.logHackerAction(`INJECT_PAYLOAD --inst="${node.innerText.trim()}"`);
                }
            });
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('list-item')) {
                    window.logHackerAction(`OVERWRITE --mem_block="${node.innerText.trim()}" --val=NULL`);
                }
            });
        }
    });
});
if (listbox) {
    observer.observe(listbox, { childList: true });
}

window.captureState = function() {
    let state = [];
    const moves = document.getElementById('move-listbox').children;
    for(let i=0; i<moves.length; i++) {
        state.push({ id: 'MOVE_' + i, label: `Instruction [${i}]`, value: moves[i].innerText.trim().toUpperCase() });
    }
    const settingsMap = [
        { id: 'FWD_SPD', el: 'fwd_spd', label: 'Forward Speed' },
        { id: 'BCK_SPD', el: 'bck_spd', label: 'Backward Speed' },
        { id: 'RGT_SPD', el: 'rgt_spd', label: 'Right Speed' },
        { id: 'LFT_SPD', el: 'lft_spd', label: 'Left Speed' },
        { id: 'RGT_ANG', el: 'rgt_ang', label: 'Right Angle' },
        { id: 'LFT_ANG', el: 'lft_ang', label: 'Left Angle' }
    ];
    settingsMap.forEach(s => {
        state.push({ id: s.id, label: s.label, value: document.getElementById(s.el).value });
    });
    return state;
}

window.goToPhase2 = function() {
    programmerState = window.captureState();
    document.getElementById('panel-sequence').classList.remove('panel-center');
    document.getElementById('panel-parameters').style.display = 'flex';
    document.getElementById('btn-phase1-next').style.display = 'none';
    document.getElementById('sequence-header').innerHTML = '<span style="color: var(--neon-red);">[ Phase 2: Attacker_Sequence_Override ]</span>';
    document.getElementById('panel-sequence').style.borderColor = 'var(--neon-red)';
    document.getElementById('panel-sequence').style.borderTopColor = 'var(--neon-red)';
    document.getElementById('attacker-overlay').style.display = 'flex';

    window.matrixSettings.color = 'rgba(255, 0, 60, 0.15)'; 
    applyMatrixSettings();

    window.currentPhase = 2;
}

window.unblurAttacker = function() {
    document.getElementById('attacker-overlay').style.display = 'none';
}

function buildAlignment() {
    let pMoves = programmerState.filter(x => x.id.startsWith('MOVE_'));
    let rMoves = robotState.filter(x => x.id.startsWith('MOVE_'));
    let pSettings = programmerState.filter(x => !x.id.startsWith('MOVE_'));
    let rSettings = robotState.filter(x => !x.id.startsWith('MOVE_'));

    auditPairs = [];

    let matrix = Array(pMoves.length + 1).fill().map(() => Array(rMoves.length + 1).fill(0));
    for(let i=1; i<=pMoves.length; i++) {
        for(let j=1; j<=rMoves.length; j++) {
            if(pMoves[i-1].value === rMoves[j-1].value) {
                matrix[i][j] = matrix[i-1][j-1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i-1][j], matrix[i][j-1]);
            }
        }
    }
    
    let i = pMoves.length, j = rMoves.length;
    let tempMoves = [];
    
    while(i > 0 && j > 0) {
        if (matrix[i][j] === matrix[i][j-1]) {
            tempMoves.unshift({ pItem: null, rItem: rMoves[j-1], isMove: true });
            j--;
        } else if (matrix[i][j] === matrix[i-1][j]) {
            tempMoves.unshift({ pItem: pMoves[i-1], rItem: null, isMove: true });
            i--;
        } else {
            tempMoves.unshift({ pItem: pMoves[i-1], rItem: rMoves[j-1], isMove: true });
            i--; j--;
        }
    }
    while(j > 0) { tempMoves.unshift({ pItem: null, rItem: rMoves[j-1], isMove: true }); j--; }
    while(i > 0) { tempMoves.unshift({ pItem: pMoves[i-1], rItem: null, isMove: true }); i--; }

    auditPairs.push(...tempMoves);

    for(let s=0; s<pSettings.length; s++) {
        auditPairs.push({ pItem: pSettings[s], rItem: rSettings[s], isMove: false });
    }
}

window.goToPhase3 = function() {
    window.currentPhase = 3;
    robotState = window.captureState();
    
    deductionState = []; 
    document.getElementById('deduction-list').innerHTML = '';
    
    buildAlignment(); 
    window.renderChecksumLists();
    
    document.getElementById('step-builder').style.display = 'none';
    document.getElementById('step-execution').style.display = 'flex';

    window.matrixSettings.color = 'rgba(0, 255, 65, 0.25)';
    window.matrixSettings.fade = 'rgba(13, 13, 18, 0.08)';
    window.matrixSettings.speed = 50;
    applyMatrixSettings();
}

// --- CHECKSUM DIAGNOSTICS ---
window.openChecksum = function() { document.getElementById('checksum-overlay').style.display = 'flex'; }
window.closeChecksum = function() { document.getElementById('checksum-overlay').style.display = 'none'; }

function pseudoHash(id, val) {
    let str = id + ":" + val;
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return '0x' + ('00000000' + (hash >>> 0).toString(16)).slice(-8).toUpperCase();
}

window.renderChecksumLists = function() {
    checksRemaining = 3;
    document.getElementById('checks-counter').innerText = `CHECKS REMAINING: ${checksRemaining}`;
    
    const grid = document.querySelector('.checksum-grid');
    while (grid.children.length > 3) { grid.removeChild(grid.lastChild); }
    
    for(let i=0; i<auditPairs.length; i++) {
        let pair = auditPairs[i];
        let pHash = pair.pItem ? pseudoHash(pair.pItem.id, pair.pItem.value) : "0x00000000";
        let rHash = pair.rItem ? pseudoHash(pair.rItem.id, pair.rItem.value) : "0x00000000";

        let leftDiv = document.createElement('div');
        leftDiv.className = 'mem-block';
        if (pair.pItem) {
            leftDiv.innerHTML = `<span>${pair.pItem.label}: <span style="color:#e0e0e0;">${pair.pItem.value}</span></span><span class="hash-text">${pHash}</span>`;
        } else {
            leftDiv.innerHTML = `<span><span style="color:#e0e0e0;">[ ????? ]</span></span><span class="hash-text">${pHash}</span>`;
        }
        
        let arrowDiv = document.createElement('div');
        arrowDiv.className = 'match-arrow';
        arrowDiv.innerText = '↔';
        arrowDiv.id = `arrow-${i}`;

        let rightDiv = document.createElement('div');
        rightDiv.className = 'mem-block';
        if (pair.rItem) {
            rightDiv.innerHTML = `<span>Encrypted Block [${i}]</span><span class="hash-text">[ SELECT ]</span>`;
        } else {
            rightDiv.innerHTML = `<span><span style="color:#e0e0e0;">[ DELETED BY HACKER ]</span></span><span class="hash-text">[ SELECT ]</span>`;
        }
        
        leftDiv.onclick = () => window.selectBlock('left', i, pHash, leftDiv, arrowDiv);
        rightDiv.onclick = () => window.selectBlock('right', i, rHash, rightDiv, arrowDiv);
        
        grid.appendChild(leftDiv);
        grid.appendChild(arrowDiv);
        grid.appendChild(rightDiv);
    }
    selLeft = null; selRight = null;
}

window.selectBlock = function(side, index, hash, element, arrow) {
    if (checksRemaining <= 0) return;

    if (side === 'left') {
        if (selLeft) selLeft.el.classList.remove('selected');
        selLeft = { index, hash, el: element, arrow: arrow };
        element.classList.add('selected');
    } else {
        if (selRight) selRight.el.classList.remove('selected');
        selRight = { index, hash, el: element, arrow: arrow };
        element.classList.add('selected');
    }

    if (selLeft && selRight) {
        checksRemaining--;
        document.getElementById('checks-counter').innerText = `CHECKS REMAINING: ${checksRemaining}`;

        if (selLeft.index !== selRight.index) {
            selLeft.el.querySelector('.hash-text').innerText = selLeft.hash + " [ MISMATCH ]";
            selRight.el.querySelector('.hash-text').innerText = selRight.hash + " [ MISMATCH ]";
            selLeft.el.classList.add('match-fail');
            selRight.el.classList.add('match-fail');
        } 
        else if (selLeft.hash === selRight.hash && selLeft.hash !== "0x00000000") {
            selLeft.el.querySelector('.hash-text').innerText = selLeft.hash + " [ VERIFIED ]";
            selRight.el.querySelector('.hash-text').innerText = selRight.hash + " [ VERIFIED ]";
            selLeft.el.classList.add('match-success');
            selRight.el.classList.add('match-success');
            selLeft.arrow.classList.add('success');
        } 
        else {
            selLeft.el.querySelector('.hash-text').innerText = selLeft.hash + " [ BREACHED ]";
            selRight.el.querySelector('.hash-text').innerText = selRight.hash + " [ BREACHED ]";
            selLeft.el.classList.add('match-fail');
            selRight.el.classList.add('match-fail');
            selLeft.arrow.classList.add('fail');
        }
        
        selLeft.el.classList.remove('selected');
        selRight.el.classList.remove('selected');
        selLeft = null; selRight = null;

        if (checksRemaining <= 0) {
            document.querySelectorAll('.mem-block:not(.match-success):not(.match-fail)').forEach(el => {
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.4';
            });
        }
    }
}

// --- ALIGNED DEDUCTION BOARD ENGINE ---
window.openDeduction = function() {
    document.getElementById('deduction-overlay').style.display = 'flex';
    const container = document.getElementById('deduction-list');
    
    if (container.children.length === 0) {
        deductionState = [];
        let moveIndex = 0;
        
        auditPairs.forEach((pair, index) => {
            deductionState.push({ valid: false, breached: false, broken: false });
            
            let isMove = pair.isMove;
            let displayValue = "?????";
            let displayLabel = "Unknown";
            
            if (isMove) {
                displayLabel = pair.pItem ? pair.pItem.label : `Instruction [${moveIndex}]`;
                if (pair.pItem) displayValue = pair.pItem.value;
                if (pair.rItem) moveIndex++;
            } else {
                if (pair.pItem) {
                    displayValue = pair.pItem.value;
                    displayLabel = pair.pItem.label;
                }
            }
            
            let div = document.createElement('div');
            div.className = 'deduction-row';
            
            let html = `<div class="deduction-label" style="width: 30%;">${displayLabel}<br><span style="font-size: 0.8em; color: #888;">${displayValue}</span></div>`;
            
            html += `<div class="deduction-group" style="flex: 1; display: flex; gap: 10px;">
                <button class="btn-deduct" id="btn-val-${index}" onclick="window.toggleDeduct(${index}, 'valid')">VALID</button>
                <button class="btn-deduct" id="btn-bre-${index}" onclick="window.toggleDeduct(${index}, 'breached')">BREACHED</button>`;
            
            if (isMove && pair.rItem) {
                html += `<button class="btn-deduct" id="btn-bro-${index}" onclick="window.toggleDeduct(${index}, 'broken')">BROKEN</button>`;
            } else {
                html += `<div style="flex: 1; border: 1px dashed transparent;"></div>`; 
            }
            
            html += `</div>`;
            div.innerHTML = html;
            container.appendChild(div);
        });
    }
}

window.closeDeduction = function() {
    document.getElementById('deduction-overlay').style.display = 'none';
}

window.toggleDeduct = function(index, type) {
    let state = deductionState[index];
    
    if (type === 'valid') {
        if (!state.valid) {
            state.valid = true;
            state.breached = false;
            state.broken = false;
        } else {
            state.valid = false;
        }
    } 
    else if (type === 'breached') {
        state.breached = !state.breached;
        if (state.breached) state.valid = false;
    } 
    else if (type === 'broken') {
        state.broken = !state.broken;
        if (state.broken) state.valid = false;
    }

    document.getElementById(`btn-val-${index}`).className = 'btn-deduct' + (state.valid ? ' active-valid' : '');
    document.getElementById(`btn-bre-${index}`).className = 'btn-deduct' + (state.breached ? ' active-breached' : '');
    
    let broBtn = document.getElementById(`btn-bro-${index}`);
    if (broBtn) {
        broBtn.className = 'btn-deduct' + (state.broken ? ' active-broken' : '');
    }
}

window.submitDeduction = function() {
    let errors = [];
    let rIndexTracker = 0; 
    
    for (let i = 0; i < auditPairs.length; i++) {
        let pair = auditPairs[i];
        let state = deductionState[i];
        
        if (!state.valid && !state.breached && !state.broken) {
            alert("Please complete all Guesses before submitting!");
            return;
        }
        
        let trueBreached = false;
        let trueBroken = false;
        let label = "";
        
        if (pair.isMove) {
            label = pair.pItem ? pair.pItem.label : "Inserted Code";
            if (pair.pItem && pair.rItem) trueBreached = false; 
            else trueBreached = true;

            if (pair.rItem) {
                trueBroken = (window.runtimeFailures && window.runtimeFailures[rIndexTracker] === true);
                rIndexTracker++;
            }
        } else {
            label = pair.pItem.label;
            trueBreached = (pair.pItem.value !== pair.rItem.value);
        }
        
        let trueValid = !trueBreached && !trueBroken;
        
        if (state.breached !== trueBreached) {
            errors.push(`[${label}] Breach status was incorrect. (Was actually ${trueBreached ? 'HACKED' : 'SAFE'})`);
        }
        if (pair.isMove && pair.rItem && state.broken !== trueBroken) {
            errors.push(`[${label}] Motor status was incorrect. (Was actually ${trueBroken ? 'FAILED' : 'WORKING'})`);
        }
        if (state.valid !== trueValid && state.breached === trueBreached && state.broken === trueBroken) {
            errors.push(`[${label}] should have been marked VALID.`);
        }
    }
    
    window.closeDeduction();
    document.getElementById('result-overlay').style.display = 'flex';
    const title = document.getElementById('result-title');
    const desc = document.getElementById('result-desc');
    
    if (errors.length === 0) {
        title.innerText = "PROGRAMMER WINS!";
        title.className = "programmer-win";
        desc.style.borderColor = "var(--neon-green)";
        desc.innerHTML = "<span style='color: var(--neon-green); font-weight: bold;'>SYSTEM SECURED.</span>\n\nExcellent work! You correctly analyzed the Audit and Sensor logs to uncover the Hacker's payload and identify all hardware failures. The robot is safe!";
    } else {
        title.innerText = "HACKER WINS!";
        title.className = "hacker-win";
        desc.style.borderColor = "var(--neon-red)";
        
        let errorText = "<span style='color: var(--neon-red); font-weight: bold;'>BREACH SUCCESSFUL.</span>\nYour report was incorrect! The Hacker slipped through your defenses.\n\n<span style='color: white;'>ERRORS FOUND:</span>\n";
        errors.forEach(e => { errorText += "❌ " + e + "\n"; });
        desc.innerHTML = errorText;
    }
}


// --- FILTERED CANVAS ENGINE ---
window.openSensors = function() { 
    document.getElementById('sensor-overlay').style.display = 'flex'; 
    window.drawSensorGraph(); 
}
window.closeSensors = function() { document.getElementById('sensor-overlay').style.display = 'none'; }

let telemetryTimer = null;
let telemetryHistory = [];
let isRecording = false;
let recordStartMs = 0;
let graphMode = 'normal'; 

window.currentMoveLabel = "IDLE"; 
let t_leftSpeed = 0;
let t_rightSpeed = 0;

window.setCurrentTargetSpeeds = function(left, right) {
    t_leftSpeed = left;
    t_rightSpeed = right;
};

window.toggleGraphMode = function() {
    graphMode = graphMode === 'normal' ? 'advanced' : 'normal';
    const btn = document.getElementById('btn-toggle-graph');
    if (graphMode === 'normal') {
        btn.innerHTML = "Mode:<br>Normal (Simplified)";
        btn.className = "btn-success btn-toggle-normal";
    } else {
        btn.innerHTML = "Mode:<br>Advanced (Raw Data)";
        btn.className = "btn-success btn-toggle-advanced";
    }
    window.drawSensorGraph(); 
}

window.startRecording = function() {
    telemetryHistory = [];
    isRecording = true;
    recordStartMs = Date.now();
};

window.stopRecording = function() {
    isRecording = false;
};

window.startTelemetry = function() {
    if (!telemetryTimer) {
        telemetryTimer = setInterval(() => {
            if(window.legoBluetooth) {
                let left = window.legoBluetooth.getMotorSpeed(1);
                let right = window.legoBluetooth.getMotorSpeed(2);
                
                let lVal = left !== null ? left : 0;
                let rVal = right !== null ? right : 0;
                
                if (isRecording) {
                    telemetryHistory.push({
                        t: Date.now() - recordStartMs,
                        left: lVal,
                        right: rVal,
                        move: window.currentMoveLabel,
                        tgtLeft: t_leftSpeed,
                        tgtRight: t_rightSpeed
                    });
                }
            }
        }, 50); 
    }
}

window.drawSensorGraph = function() {
    const canvas = document.getElementById('sensor-canvas');
    const ctx = canvas.getContext('2d');
    const h = 400; 
    const pad = 40;
    const leftPad = 60; 
    
    let regions = [];
    let currentRegion = null;
    for (let pt of telemetryHistory) {
        if (currentRegion && currentRegion.move === pt.move) {
            currentRegion.end = pt.t;
        } else {
            if (currentRegion) regions.push(currentRegion);
            currentRegion = { move: pt.move, start: pt.t, end: pt.t };
        }
    }
    if (currentRegion) regions.push(currentRegion);

    let displayRegions = regions.filter(r => r.move !== 'IDLE' && r.move !== 'END');
    let targetWidth = 900;
    if (displayRegions.length > 6) {
        targetWidth = leftPad + pad + (displayRegions.length * 130); 
    }
    
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    else ctx.clearRect(0, 0, canvas.width, h);
    
    const w = canvas.width;

    if (telemetryHistory.length === 0) {
        ctx.fillStyle = '#888';
        ctx.font = '16px Share Tech Mono';
        ctx.textAlign = 'center';
        ctx.fillText("No data recorded yet. Execute Payload first.", w/2, h/2);
        return;
    }
    
    const maxT = Math.max(1, telemetryHistory[telemetryHistory.length - 1].t);
    
    ctx.font = '12px Share Tech Mono';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    
    for (let speed = -100; speed <= 100; speed += 20) {
        const y = h/2 - (speed / 100) * (h/2 - pad);
        
        ctx.strokeStyle = speed === 0 ? '#444' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = speed === 0 ? 2 : 1;
        ctx.beginPath(); 
        ctx.moveTo(leftPad, y); 
        ctx.lineTo(w - pad, y); 
        ctx.stroke();

        ctx.fillStyle = speed === 0 ? '#fff' : '#888';
        ctx.fillText(speed, leftPad - 10, y);
    }

    ctx.font = '14px Share Tech Mono';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';

    for (let reg of regions) {
        if (reg.move === 'IDLE' || reg.move === 'END') continue;

        let startX = leftPad + (reg.start / maxT) * (w - leftPad - pad);
        let endX = leftPad + (reg.end / maxT) * (w - leftPad - pad);

        ctx.strokeStyle = '#555';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, pad); ctx.lineTo(startX, h - pad);
        ctx.moveTo(endX, pad); ctx.lineTo(endX, h - pad);
        ctx.stroke();
        ctx.setLineDash([]);

        let arrowY = pad / 2 + 15;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;

        if (endX - startX > 30) {
            ctx.beginPath(); ctx.moveTo(startX + 10, arrowY); ctx.lineTo(endX - 10, arrowY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(startX + 10, arrowY); ctx.lineTo(startX + 15, arrowY - 4); ctx.lineTo(startX + 15, arrowY + 4); ctx.fill();
            ctx.beginPath(); ctx.moveTo(endX - 10, arrowY); ctx.lineTo(endX - 15, arrowY - 4); ctx.lineTo(endX - 15, arrowY + 4); ctx.fill();
        }

        ctx.fillText(reg.move, (startX + endX) / 2, arrowY - 5);
    }

    if (graphMode === 'normal') {
        function getSimplifiedPoints(key) {
            let simplified = [];
            for (let reg of regions) {
                let pts = telemetryHistory.filter(p => p.t >= reg.start && p.t <= reg.end);
                if (pts.length === 0) continue;

                if (reg.move === 'IDLE' || reg.move === 'END') {
                    simplified.push({ t: reg.start, val: 0 });
                    simplified.push({ t: reg.end, val: 0 });
                    continue;
                }

                let isActive = false;
                for (let p of pts) {
                    let tgt = key === 'left' ? p.tgtLeft : p.tgtRight;
                    if (tgt !== 0) {
                        isActive = true;
                        break;
                    }
                }

                let amp = 0;
                if (isActive) {
                    amp = (key === 'left') ? 100 : -100;
                }

                let activeEnd = Math.max(reg.start + 100, reg.end - 500);
                let activeDuration = activeEnd - reg.start;
                let ramp = Math.min(200, activeDuration * 0.2);

                simplified.push({ t: reg.start, val: 0 });
                simplified.push({ t: reg.start + ramp, val: amp });
                simplified.push({ t: activeEnd - ramp, val: amp });
                simplified.push({ t: activeEnd, val: 0 });
                simplified.push({ t: reg.end, val: 0 });
            }
            return simplified;
        }

        function drawSimplifiedLine(key, color) {
            const pts = getSimplifiedPoints(key);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                const x = leftPad + (pt.t / maxT) * (w - leftPad - pad);
                const y = h/2 - (pt.val / 100) * (h/2 - pad);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        drawSimplifiedLine('left', '#00ff41');
        drawSimplifiedLine('right', '#00f0ff');
        
    } else {
        function drawRawLine(key, color) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i < telemetryHistory.length; i++) {
                const pt = telemetryHistory[i];
                const x = leftPad + (pt.t / maxT) * (w - leftPad - pad);
                const yOffset = (key === 'right') ? 4 : 0;
                const y = h/2 - (pt[key] / 100) * (h/2 - pad) + yOffset;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        drawRawLine('left', '#00ff41');
        drawRawLine('right', '#00f0ff');
    }
}

// --- DRAG AND DROP UX ---
// (We removed the duplicate const listbox declaration here to prevent the SyntaxError!)
if (listbox) {
    document.addEventListener('click', (e) => { if (!e.target.closest('#move-listbox') && !e.target.closest('#btn-remove')) { document.querySelectorAll('.list-item.selected').forEach(el => el.classList.remove('selected')); } });
    listbox.addEventListener('click', (e) => { if (e.target.classList.contains('list-item')) { document.querySelectorAll('.list-item.selected').forEach(el => el.classList.remove('selected')); e.target.classList.add('selected'); } });
    listbox.addEventListener('dragstart', (e) => { 
        if(e.target.classList.contains('list-item')) { 
            isDraggingMove = true;
            previousOrder = Array.from(listbox.children).map(c => c.innerText);
            setTimeout(() => e.target.classList.add('dragging'), 0); 
        } 
    });
    listbox.addEventListener('dragend', (e) => { 
        if(e.target.classList.contains('list-item')) { 
            e.target.classList.remove('dragging'); 
            isDraggingMove = false;
            if (window.currentPhase === 2) {
                const currentOrder = Array.from(listbox.children).map(c => c.innerText);
                if (JSON.stringify(previousOrder) !== JSON.stringify(currentOrder)) {
                    window.logHackerAction(`MEM_SHIFT --ptr_realloc=SUCCESS`);
                }
            }
        } 
    });
    listbox.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(listbox, e.clientY);
        const currentDraggable = document.querySelector('.dragging');
        if (currentDraggable) { if (afterElement == null) { listbox.appendChild(currentDraggable); } else { listbox.insertBefore(currentDraggable, afterElement); } }
    });
}
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.list-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}