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
            // A "virtual" rItem is a blank stand-in for a deleted move -
            // it was never actually executed by the robot, so it shouldn't
            // count as a real move for motor-failure purposes.
            let isRealRobotMove = isMove && pair.rItem && !pair.rItem.virtual;
            
            if (isMove) {
                // Always use a single, live counter for the label -- never
                // pair.pItem.label. That field is a snapshot of this move's
                // position back in Phase 1, which has nothing to do with
                // where it ends up in the aligned audit list, and mixing
                // the two numbering schemes produces duplicate labels
                // (e.g. two different rows both showing "Instruction [0]").
                displayLabel = `Instruction [${moveIndex}]`;
                moveIndex++;
                if (pair.pItem) { displayValue = pair.pItem.value; }
                else { displayValue = pair.rItem.value; }
            } else {
                if (pair.pItem) { displayValue = pair.pItem.value; displayLabel = pair.pItem.label; }
                else { displayValue = pair.rItem.value; }
            }
            
            let div = document.createElement('div');
            div.className = 'deduction-row';
            
            let html = `<div class="deduction-label" style="width: 30%;">${displayLabel}<br><span style="font-size: 0.8em; color: #888;">${displayValue}</span></div>`;
            
            html += `<div class="deduction-group" style="flex: 1; display: flex; gap: 10px;">
                <button class="btn-deduct" id="btn-val-${index}" onclick="window.toggleDeduct(${index}, 'valid')">VALID</button>
                <button class="btn-deduct" id="btn-bre-${index}" onclick="window.toggleDeduct(${index}, 'breached')">BREACHED</button>`;
            
            if (isRealRobotMove) { html += `<button class="btn-deduct" id="btn-bro-${index}" onclick="window.toggleDeduct(${index}, 'broken')">BROKEN</button>`; } 
            else { html += `<div style="flex: 1; border: 1px dashed transparent;"></div>`; }
            
            html += `</div>`; div.innerHTML = html; container.appendChild(div);
        });
    }
}

window.closeDeduction = function() { document.getElementById('deduction-overlay').style.display = 'none'; }

window.toggleDeduct = function(index, type) {
    let state = deductionState[index];
    
    if (type === 'valid') {
        if (!state.valid) { state.valid = true; state.breached = false; state.broken = false; } else { state.valid = false; }
    } 
    else if (type === 'breached') { state.breached = !state.breached; if (state.breached) state.valid = false; } 
    else if (type === 'broken') { state.broken = !state.broken; if (state.broken) state.valid = false; }

    document.getElementById(`btn-val-${index}`).className = 'btn-deduct' + (state.valid ? ' active-valid' : '');
    document.getElementById(`btn-bre-${index}`).className = 'btn-deduct' + (state.breached ? ' active-breached' : '');
    
    let broBtn = document.getElementById(`btn-bro-${index}`);
    if (broBtn) { broBtn.className = 'btn-deduct' + (state.broken ? ' active-broken' : ''); }
}

window.submitDeduction = function() {
    let errors = [];
    let rIndexTracker = 0; 
    
    for (let i = 0; i < auditPairs.length; i++) {
        let pair = auditPairs[i];
        let state = deductionState[i];
        
        if (!state.valid && !state.breached && !state.broken) { alert("Please complete all Guesses before submitting!"); return; }
        
        let trueBreached = false; let trueBroken = false; let label = "";
        let isRealRobotMove = pair.isMove && pair.rItem && !pair.rItem.virtual;
        
        if (pair.isMove) {
            label = pair.pItem ? pair.pItem.label : "Inserted Code";
            // Unified rule: breached whenever what the programmer wrote
            // doesn't match what's actually in robot memory at that slot.
            // This naturally covers inserted code (no pItem), deleted code
            // (blank virtual rItem), and replaced code (mismatched values).
            let pVal = pair.pItem ? pair.pItem.value : undefined;
            let rVal = pair.rItem ? pair.rItem.value : undefined;
            trueBreached = (pVal !== rVal);

            if (isRealRobotMove) { trueBroken = (window.runtimeFailures && window.runtimeFailures[rIndexTracker] === true); rIndexTracker++; }
        } else {
            label = pair.pItem.label; trueBreached = (pair.pItem.value !== pair.rItem.value);
        }
        
        let trueValid = !trueBreached && !trueBroken;
        
        if (state.breached !== trueBreached) { errors.push(`[${label}] Breach status was incorrect. (Was actually ${trueBreached ? 'HACKED' : 'SAFE'})`); }
        if (isRealRobotMove && state.broken !== trueBroken) { errors.push(`[${label}] Motor status was incorrect. (Was actually ${trueBroken ? 'FAILED' : 'WORKING'})`); }
        if (state.valid !== trueValid && state.breached === trueBreached && state.broken === trueBroken) { errors.push(`[${label}] should have been marked VALID.`); }
    }
    
    window.closeDeduction(); document.getElementById('result-overlay').style.display = 'flex';
    const title = document.getElementById('result-title'); const desc = document.getElementById('result-desc');
    
    if (errors.length === 0) {
        title.innerText = "PROGRAMMER WINS!"; title.className = "programmer-win"; desc.style.borderColor = "var(--neon-green)";
        desc.innerHTML = "<span style='color: var(--neon-green); font-weight: bold;'>SYSTEM SECURED.</span>\n\nExcellent work! You correctly analyzed the Audit and Sensor logs to uncover the Hacker's payload and identify all hardware failures. The robot is safe!";
    } else {
        title.innerText = "HACKER WINS!"; title.className = "hacker-win"; desc.style.borderColor = "var(--neon-red)";
        let errorText = "<span style='color: var(--neon-red); font-weight: bold;'>BREACH SUCCESSFUL.</span>\nYour report was incorrect! The Hacker slipped through your defenses.\n\n<span style='color: white;'>ERRORS FOUND:</span>\n";
        errors.forEach(e => { errorText += "❌ " + e + "\n"; }); desc.innerHTML = errorText;
    }
}