// Global State Variables
var programmerState = [];
var robotState = [];
var deductionState = []; 
var auditPairs = []; 
var checksRemaining = 3;
var currentPhase = 1; 

window.doTransition = function(callback, event) {
    const wipe = document.getElementById('transition-wipe');
    
    if (event) {
        document.documentElement.style.setProperty('--wipe-x', event.clientX + 'px');
        document.documentElement.style.setProperty('--wipe-y', event.clientY + 'px');
    } else {
        document.documentElement.style.setProperty('--wipe-x', '50%');
        document.documentElement.style.setProperty('--wipe-y', '50%');
    }

    document.body.classList.add('exploding'); 
    wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)';
    wipe.classList.add('wipe-in');
    
    setTimeout(() => {
        callback();
        document.body.classList.remove('exploding'); 
        
        setTimeout(() => {
            wipe.classList.remove('wipe-in');
        }, 100);
    }, 600); 
};

window.captureState = function() {
    let state = [];
    const moves = document.getElementById('move-listbox').children;
    for(let i=0; i<moves.length; i++) {
        state.push({
            id: 'MOVE_' + i,
            moveId: moves[i].getAttribute('data-move-id'), // stable identity, survives drag reordering
            label: `Instruction [${i}]`,
            value: moves[i].innerText.trim().toUpperCase()
        });
    }
    const settingsMap = [
        { id: 'FWD_SPD', el: 'fwd_spd', label: 'Forward Speed' }, { id: 'BCK_SPD', el: 'bck_spd', label: 'Backward Speed' },
        { id: 'RGT_SPD', el: 'rgt_spd', label: 'Right Speed' }, { id: 'LFT_SPD', el: 'lft_spd', label: 'Left Speed' },
        { id: 'RGT_ANG', el: 'rgt_ang', label: 'Right Angle' }, { id: 'LFT_ANG', el: 'lft_ang', label: 'Left Angle' }
    ];
    settingsMap.forEach(s => { state.push({ id: s.id, label: s.label, value: document.getElementById(s.el).value }); });
    return state;
}

window.goToPhase2 = function(event) {
    
    const wipe = document.getElementById('transition-wipe');
    if (event) {
        document.documentElement.style.setProperty('--wipe-x', event.clientX + 'px');
        document.documentElement.style.setProperty('--wipe-y', event.clientY + 'px');
    }
    
    // 1. Initial explosion to black
    document.body.classList.add('exploding'); 
    wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)';
    wipe.classList.add('wipe-in');
    
    setTimeout(() => {
        document.body.classList.remove('exploding'); 
        
        document.getElementById('step-builder').style.display = 'none';
        
        const overlay = document.getElementById('hijack-overlay');
        const scene = document.getElementById('hijack-scene');
        overlay.style.display = 'flex';
        scene.style.opacity = '1';
        
        const packet = document.getElementById('h-packet');
        const hacker = document.getElementById('h-hacker');
        const stream = document.getElementById('h-stream');

        // Reset Animation positions
        packet.style.transition = 'none';
        packet.style.left = '-10%';
        packet.style.transform = 'translate(-50%, -50%) scale(0)';
        packet.style.filter = 'none'; // Clears any old red filters
        
        hacker.style.transition = 'none';
        hacker.style.top = '-150px';
        hacker.style.opacity = '0';

        wipe.style.transition = 'none';
        wipe.classList.remove('wipe-in');
        
        // --- START BINARY FLICKER ---
        const binaryRows = document.querySelectorAll('.binary-row');
        const flickerInterval = setInterval(() => {
            binaryRows.forEach(row => {
                let charArray = row.innerText.split('');
                for(let k=0; k<2; k++) {
                    let idx = Math.floor(Math.random() * charArray.length);
                    if (charArray[idx] === '0') charArray[idx] = '1';
                    else if (charArray[idx] === '1') charArray[idx] = '0';
                }
                row.innerText = charArray.join('');
            });
        }, 150);

        setTimeout(() => {
            // A. Slow Glide (3.0 seconds total!)
            packet.style.transition = 'left 3.0s linear, transform 0.3s cubic-bezier(0.1, 0.8, 0.3, 1)';
            packet.style.left = '45%'; 
            packet.style.transform = 'translate(-50%, -50%) scale(1)';

            // B. Hacker Terminal Drops In (Start at 2.7s, drops for 0.3s -> Hits at 3.0s!)
            setTimeout(() => {
                hacker.style.transition = 'top 0.3s cubic-bezier(0.8, 0, 0.2, 1), opacity 0.3s';
                hacker.style.top = '120px';
                hacker.style.opacity = '1';

                // C. Impact!
                setTimeout(() => {
                    document.body.classList.add('exploding'); 
                    
                    // THE FIX: Uses CSS filter to instantly corrupt the custom image to Neon Red!
                    packet.style.filter = 'drop-shadow(0 0 20px #ff003c) sepia(1) hue-rotate(-50deg) saturate(5)';
                    
                    let sprayCount = 0;
                    const sprayInterval = setInterval(() => {
                        for(let i=0; i<3; i++) {
                            let p = document.createElement('div');
                            p.className = 'h-particle';
                            p.innerText = Math.random() > 0.5 ? '1' : '0';
                            
                            p.style.left = '350px'; 
                            p.style.top = '170px';
                            
                            let angle = Math.random() * Math.PI * 2;
                            let distance = 50 + Math.random() * 200;
                            let endX = 350 + Math.cos(angle) * distance;
                            let endY = 170 + Math.sin(angle) * distance;
                            
                            p.style.transition = 'all 0.6s cubic-bezier(0.1, 0.9, 0.2, 1)';
                            scene.appendChild(p);
                            
                            void p.offsetWidth; 
                            
                            p.style.transform = `translate(${endX - 350}px, ${endY - 170}px) scale(1.5)`;
                            p.style.opacity = '0';
                            
                            setTimeout(() => p.remove(), 600);
                        }
                        sprayCount++;
                        if(sprayCount > 40) clearInterval(sprayInterval); 
                    }, 25);

                    setTimeout(() => { document.body.classList.remove('exploding'); }, 400);

                    // D. End Animation
                    setTimeout(() => {
                        clearInterval(flickerInterval); // Stop the binary text loop
                        scene.style.transition = 'opacity 0.5s';
                        scene.style.opacity = '0';
                        
                        // E. Reverse explosion
                        setTimeout(() => {
                            wipe.style.transition = 'none';
                            document.documentElement.style.setProperty('--wipe-x', '50%');
                            document.documentElement.style.setProperty('--wipe-y', '50%');
                            wipe.classList.add('wipe-in');
                            
                            programmerState = window.captureState();
                            currentPhase = 2;
                            document.getElementById('phase2-container').style.display = 'flex';
                            document.getElementById('attacker-overlay').style.display = 'flex';
                            document.getElementById('phase2-list-container').appendChild(document.getElementById('shared-editor'));
                            document.body.classList.add('hacker-mode');
                            
                            if (window.clearMatrix) window.clearMatrix('#120004');
                            window.matrixSettings.color = 'rgba(255, 0, 60, 0.7)'; 
                            window.matrixSettings.fade = 'rgba(18, 0, 4, 0.05)'; 
                            if (window.preRenderMatrix) window.preRenderMatrix(); 
                            if (window.applyMatrixSettings) window.applyMatrixSettings();

                            overlay.style.display = 'none';
                            
                            setTimeout(() => { 
                                wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)';
                                wipe.classList.remove('wipe-in'); 
                            }, 50);

                        }, 1000); 
                    }, 1200); 

                }, 300); 
            }, 2700); // 2.7s + 0.3s drop = 3.0s impact!
        }, 500); 
        
    }, 600); 
}

window.unblurAttacker = function() { document.getElementById('attacker-overlay').style.display = 'none'; }

function buildAlignment() {
    let pMoves = programmerState.filter(x => x.id.startsWith('MOVE_'));
    let rMoves = robotState.filter(x => x.id.startsWith('MOVE_'));
    let pSettings = programmerState.filter(x => !x.id.startsWith('MOVE_'));
    let rSettings = robotState.filter(x => !x.id.startsWith('MOVE_'));

    auditPairs = [];

    // --- Identity-based diff ---
    // Match moves by their stable moveId, NOT by value. Matching by value
    // breaks down the moment two moves share a value (e.g. two "forward"s),
    // since a value-only LCS can't tell which "forward" is which and
    // misaligns everything downstream. Identity fixes that.
    let matrix = Array(pMoves.length + 1).fill().map(() => Array(rMoves.length + 1).fill(0));
    for (let i = 1; i <= pMoves.length; i++) {
        for (let j = 1; j <= rMoves.length; j++) {
            if (pMoves[i-1].moveId === rMoves[j-1].moveId) { matrix[i][j] = matrix[i-1][j-1] + 1; }
            else { matrix[i][j] = Math.max(matrix[i-1][j], matrix[i][j-1]); }
        }
    }

    let i = pMoves.length, j = rMoves.length;
    let rawDiff = []; // ordered list of {type:'keep'|'del'|'ins', ...}
    while (i > 0 && j > 0) {
        if (pMoves[i-1].moveId === rMoves[j-1].moveId) {
            rawDiff.unshift({ type: 'keep', pItem: pMoves[i-1], rItem: rMoves[j-1] });
            i--; j--;
        } else if (matrix[i][j-1] >= matrix[i-1][j]) {
            rawDiff.unshift({ type: 'ins', rItem: rMoves[j-1] });
            j--;
        } else {
            rawDiff.unshift({ type: 'del', pItem: pMoves[i-1] });
            i--;
        }
    }
    while (j > 0) { rawDiff.unshift({ type: 'ins', rItem: rMoves[j-1] }); j--; }
    while (i > 0) { rawDiff.unshift({ type: 'del', pItem: pMoves[i-1] }); i--; }

    // --- Second pass: link replacements ---
    // A "replace" (hacker adds a move, drags it into position, deletes the
    // original) shows up in rawDiff as a run of dels and inserts sitting
    // between two kept moves. Instead of rendering that as unrelated
    // "deleted" and "?????" rows, pair them up into single linked rows so
    // comparing the two sides in the audit reveals what really happened.
    let moveAuditPairs = [];
    let runDeletes = [];
    let runInserts = [];

    function flushRun() {
        // Within this run, first link any delete to an insert that shares
        // the SAME VALUE, before falling back to positional pairing.
        //
        // Why: identity (moveId) only tells us "is this literally the same
        // instruction instance". It does NOT tell us "did anything actually
        // change". If a hacker deletes a "forward" and later re-adds a
        // brand-new "forward" (a fresh moveId -- ids are never reused),
        // identity alone sees an unrelated delete plus an unrelated insert.
        // Pairing those by pure encounter order could link the untouched
        // "forward" against some unrelated insert (e.g. "left"), while the
        // real re-added "forward" is left showing as a foreign
        // "????? -> FORWARD" insertion -- both then read as breached even
        // though nothing about that move actually changed. Preferring a
        // same-value match first means a delete+re-add of an identical
        // value nets out as unchanged, and only genuine value changes fall
        // through to the positional "real replacement" pairing below.
        let usedInsert = new Array(runInserts.length).fill(false);
        let usedDelete = new Array(runDeletes.length).fill(false);

        for (let d = 0; d < runDeletes.length; d++) {
            for (let k = 0; k < runInserts.length; k++) {
                if (!usedInsert[k] && runInserts[k].value === runDeletes[d].value) {
                    moveAuditPairs.push({ pItem: runDeletes[d], rItem: runInserts[k], isMove: true });
                    usedInsert[k] = true;
                    usedDelete[d] = true;
                    break;
                }
            }
        }

        let remainingDeletes = runDeletes.filter((_, d) => !usedDelete[d]);
        let remainingInserts = runInserts.filter((_, k) => !usedInsert[k]);

        // Real replacements: whatever's left genuinely changed value.
        const pairCount = Math.min(remainingDeletes.length, remainingInserts.length);
        for (let k = 0; k < pairCount; k++) {
            moveAuditPairs.push({ pItem: remainingDeletes[k], rItem: remainingInserts[k], isMove: true });
        }
        // Pure deletions left over: keep the slot, but the "robot memory"
        // side is a blank stand-in (not a real executed move) so comparing
        // it to the original will simply read as wrong/breached.
        for (let k = pairCount; k < remainingDeletes.length; k++) {
            const d = remainingDeletes[k];
            moveAuditPairs.push({
                pItem: d,
                rItem: { id: 'BLANK_' + d.moveId, label: '[ REMOVED ]', value: '', virtual: true },
                isMove: true
            });
        }
        // Pure insertions left over: no original ever existed here, so the
        // programmer side is a genuine "?????" placeholder.
        for (let k = pairCount; k < remainingInserts.length; k++) {
            moveAuditPairs.push({ pItem: null, rItem: remainingInserts[k], isMove: true });
        }
        runDeletes = []; runInserts = [];
    }

    for (const entry of rawDiff) {
        if (entry.type === 'keep') {
            flushRun();
            moveAuditPairs.push({ pItem: entry.pItem, rItem: entry.rItem, isMove: true });
        } else if (entry.type === 'del') {
            runDeletes.push(entry.pItem);
        } else {
            runInserts.push(entry.rItem);
        }
    }
    flushRun();

    auditPairs.push(...moveAuditPairs);
    for(let s=0; s<pSettings.length; s++) { auditPairs.push({ pItem: pSettings[s], rItem: rSettings[s], isMove: false }); }
}

window.goToPhase3 = function(event) {
    window.doTransition(() => {
        currentPhase = 3;
        robotState = window.captureState();
        deductionState = []; 
        document.getElementById('deduction-list').innerHTML = '';
        
        buildAlignment(); 
        window.renderChecksumLists();
        
        document.getElementById('phase2-container').style.display = 'none';
        document.getElementById('step-execution').style.display = 'flex';
        
        document.body.classList.remove('hacker-mode');

        if (window.clearMatrix) window.clearMatrix('#0d0d12');
        window.matrixSettings.color = 'rgba(0, 255, 65, 0.4)'; 
        window.matrixSettings.fade = 'rgba(13, 13, 18, 0.08)';
        if (window.preRenderMatrix) window.preRenderMatrix(); 
        if (window.applyMatrixSettings) window.applyMatrixSettings();
    }, event);
}