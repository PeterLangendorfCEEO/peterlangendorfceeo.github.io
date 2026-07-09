var programmerState = [];
var robotState = [];
var deductionState = []; 
var auditPairs = []; 
var checksRemaining = 3;
var currentPhase = 1; 

window.animTimeouts = [];
window.hackerHistory = []; 
window.isUndoing = false; 

window.setAnimTimeout = function(callback, ms) {
    let id = setTimeout(callback, ms);
    window.animTimeouts.push(id);
    return id;
};

window.clearAnimTimeouts = function() {
    window.animTimeouts.forEach(clearTimeout);
    window.animTimeouts = [];
};

window.p1_flicker = null; window.p1_spray = null; window.p2_flicker = null;

window.doTransition = function(callback, event) {
    const wipe = document.getElementById('transition-wipe');
    if (event) { document.documentElement.style.setProperty('--wipe-x', event.clientX + 'px'); document.documentElement.style.setProperty('--wipe-y', event.clientY + 'px'); } 
    else { document.documentElement.style.setProperty('--wipe-x', '50%'); document.documentElement.style.setProperty('--wipe-y', '50%'); }
    document.body.classList.add('exploding'); 
    wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)'; wipe.classList.add('wipe-in');
    setTimeout(() => { callback(); document.body.classList.remove('exploding'); setTimeout(() => { wipe.classList.remove('wipe-in'); }, 100); }, 600); 
};

window.captureState = function() {
    let state = [];
    const moves = document.getElementById('move-listbox').children;
    for(let i=0; i<moves.length; i++) {
        state.push({ id: 'MOVE_' + i, moveId: moves[i].getAttribute('data-move-id'), label: `Instruction [${i}]`, value: moves[i].innerText.trim().toUpperCase() });
    }
    const settingsMap = [
        { id: 'FWD_SPD', el: 'fwd_spd', label: 'Forward Speed' }, { id: 'BCK_SPD', el: 'bck_spd', label: 'Backward Speed' },
        { id: 'RGT_SPD', el: 'rgt_spd', label: 'Right Speed' }, { id: 'LFT_SPD', el: 'lft_spd', label: 'Left Speed' },
        { id: 'RGT_ANG', el: 'rgt_ang', label: 'Right Angle' }, { id: 'LFT_ANG', el: 'lft_ang', label: 'Left Angle' }
    ];
    settingsMap.forEach(s => { let el = document.getElementById(s.el); if (el) { state.push({ id: s.id, label: s.label, value: el.value }); } });
    return state;
}

window.saveHackerState = function() {
    if (currentPhase !== 2) return;
    const listbox = document.getElementById('move-listbox');
    if (!listbox) return;
    
    window.hackerHistory.push({
        listHTML: listbox.innerHTML,
        settings: {
            fwd: document.getElementById('fwd_spd').value,
            bck: document.getElementById('bck_spd').value,
            rgtS: document.getElementById('rgt_spd').value,
            rgtA: document.getElementById('rgt_ang').value,
            lftS: document.getElementById('lft_spd').value,
            lftA: document.getElementById('lft_ang').value
        }
    });
};

window.undoHackerAction = function() {
    if (currentPhase !== 2 || window.hackerHistory.length === 0) return;
    
    window.isUndoing = true; 
    const last = window.hackerHistory.pop();
    
    document.getElementById('move-listbox').innerHTML = last.listHTML;
    document.getElementById('fwd_spd').value = last.settings.fwd;
    document.getElementById('bck_spd').value = last.settings.bck;
    document.getElementById('rgt_spd').value = last.settings.rgtS;
    document.getElementById('rgt_ang').value = last.settings.rgtA;
    document.getElementById('lft_spd').value = last.settings.lftS;
    document.getElementById('lft_ang').value = last.settings.lftA;
    
    if (window.syncSettings) window.syncSettings();
    if (window.syncHackerButtons) window.syncHackerButtons();
    if (window.logHackerAction) window.logHackerAction('sys.restore @mem_snapshot');
    
    setTimeout(() => { window.isUndoing = false; }, 50); 
};

window.syncHackerButtons = function() {
    if (currentPhase !== 2) return;
    const hasSelection = document.querySelectorAll('.list-item.selected').length > 0;
    
    ['btn-forward', 'btn-back', 'btn-left', 'btn-right', 'btn-remove'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = !hasSelection;
            if (!hasSelection) {
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        }
    });
};

window.syncSettings = function() {
    const listbox = document.getElementById('move-listbox');
    if (!listbox) return;
    const moves = Array.from(listbox.children).map(c => c.innerText.trim().toLowerCase());
    const hasFwd = moves.includes('forward'); const hasBck = moves.includes('back');
    const hasLft = moves.includes('left'); const hasRgt = moves.includes('right');

    const fwdSpd = document.getElementById('fwd_spd'); if (fwdSpd) { fwdSpd.disabled = !hasFwd; if (!hasFwd) fwdSpd.value = "100"; }
    const bckSpd = document.getElementById('bck_spd'); if (bckSpd) { bckSpd.disabled = !hasBck; if (!hasBck) bckSpd.value = "100"; }
    const lftSpd = document.getElementById('lft_spd'); if (lftSpd) { lftSpd.disabled = !hasLft; if (!hasLft) lftSpd.value = "10"; }
    const lftAng = document.getElementById('lft_ang'); if (lftAng) { lftAng.disabled = !hasLft; if (!hasLft) lftAng.value = "-90"; }
    const rgtSpd = document.getElementById('rgt_spd'); if (rgtSpd) { rgtSpd.disabled = !hasRgt; if (!hasRgt) rgtSpd.value = "10"; }
    const rgtAng = document.getElementById('rgt_ang'); if (rgtAng) { rgtAng.disabled = !hasRgt; if (!hasRgt) rgtAng.value = "90"; }
};

window.skipToPhase2 = function() {
    window.clearAnimTimeouts();
    if (window.p1_flicker) clearInterval(window.p1_flicker); if (window.p1_spray) clearInterval(window.p1_spray);
    document.getElementById('hijack-overlay').style.display = 'none'; document.body.classList.remove('exploding');
    const wipe = document.getElementById('transition-wipe'); wipe.style.transition = 'none'; wipe.classList.remove('wipe-in');
    
    document.getElementById('step-builder').style.display = 'none';
    programmerState = window.captureState(); currentPhase = 2;
    document.getElementById('phase2-container').style.display = 'flex';
    document.getElementById('attacker-overlay').style.display = 'flex';
    document.getElementById('phase2-list-container').appendChild(document.getElementById('shared-editor'));
    document.body.classList.add('hacker-mode'); 
    
    document.getElementById('btn-clear').style.display = 'none';
    document.getElementById('btn-undo').style.display = 'block';
    
    window.syncSettings(); 
    window.syncHackerButtons(); 
    
    if (window.clearMatrix) window.clearMatrix('#120004');
    window.matrixSettings.color = 'rgba(255, 0, 60, 0.7)'; window.matrixSettings.fade = 'rgba(18, 0, 4, 0.05)'; 
    if (window.preRenderMatrix) window.preRenderMatrix(); if (window.applyMatrixSettings) window.applyMatrixSettings();
};

window.goToPhase2 = function(event) {
    const wipe = document.getElementById('transition-wipe');
    if (event) { document.documentElement.style.setProperty('--wipe-x', event.clientX + 'px'); document.documentElement.style.setProperty('--wipe-y', event.clientY + 'px'); }
    
    document.body.classList.add('exploding'); wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)'; wipe.classList.add('wipe-in');
    
    window.setAnimTimeout(() => {
        document.body.classList.remove('exploding'); document.getElementById('step-builder').style.display = 'none';
        const overlay = document.getElementById('hijack-overlay'); const scene = document.getElementById('hijack-scene');
        overlay.style.display = 'flex'; scene.style.opacity = '1';
        const packet = document.getElementById('h-packet'); const hacker = document.getElementById('h-hacker');

        packet.style.transition = 'none'; packet.style.left = '50px'; packet.style.transform = 'translate(-50%, -50%) scale(0)'; packet.style.filter = 'none'; 
        hacker.style.transition = 'none'; hacker.style.top = '-150px'; hacker.style.opacity = '0';
        wipe.style.transition = 'none'; wipe.classList.remove('wipe-in');
        
        const binaryRows = document.querySelectorAll('.binary-row');
        window.p1_flicker = setInterval(() => {
            binaryRows.forEach(row => {
                let charArray = row.innerText.split('');
                for(let k=0; k<2; k++) { let idx = Math.floor(Math.random() * charArray.length); charArray[idx] = charArray[idx] === '0' ? '1' : '0'; }
                row.innerText = charArray.join('');
            });
        }, 150);

        window.setAnimTimeout(() => {
            packet.style.transition = 'left 3.0s linear, transform 0.3s cubic-bezier(0.1, 0.8, 0.3, 1)';
            packet.style.left = '50%'; packet.style.transform = 'translate(-50%, -50%) scale(1)';

            window.setAnimTimeout(() => {
                hacker.style.transition = 'top 0.3s cubic-bezier(0.8, 0, 0.2, 1), opacity 0.3s';
                hacker.style.top = '120px'; hacker.style.opacity = '1';

                window.setAnimTimeout(() => {
                    document.body.classList.add('exploding'); 
                    packet.style.filter = 'drop-shadow(0 0 20px #ff003c) sepia(1) hue-rotate(-50deg) saturate(5)';
                    
                    let sprayCount = 0;
                    window.p1_spray = setInterval(() => {
                        for(let i=0; i<3; i++) {
                            let p = document.createElement('div'); p.className = 'h-particle'; p.innerText = Math.random() > 0.5 ? '1' : '0';
                            p.style.left = '350px'; p.style.top = '170px';
                            let angle = Math.random() * Math.PI * 2; let distance = 50 + Math.random() * 200;
                            p.style.transition = 'all 0.6s cubic-bezier(0.1, 0.9, 0.2, 1)'; scene.appendChild(p); void p.offsetWidth; 
                            p.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(1.5)`; p.style.opacity = '0';
                            window.setAnimTimeout(() => p.remove(), 600);
                        }
                        sprayCount++; if(sprayCount > 40) clearInterval(window.p1_spray); 
                    }, 25);

                    window.setAnimTimeout(() => { document.body.classList.remove('exploding'); }, 400);

                    window.setAnimTimeout(() => {
                        clearInterval(window.p1_flicker); scene.style.transition = 'opacity 0.5s'; scene.style.opacity = '0';
                        
                        window.setAnimTimeout(() => {
                            wipe.style.transition = 'none'; document.documentElement.style.setProperty('--wipe-x', '50%'); document.documentElement.style.setProperty('--wipe-y', '50%'); wipe.classList.add('wipe-in');
                            
                            programmerState = window.captureState(); currentPhase = 2;
                            document.getElementById('phase2-container').style.display = 'flex'; document.getElementById('attacker-overlay').style.display = 'flex';
                            document.getElementById('phase2-list-container').appendChild(document.getElementById('shared-editor'));
                            document.body.classList.add('hacker-mode'); 
                            
                            document.getElementById('btn-clear').style.display = 'none';
                            document.getElementById('btn-undo').style.display = 'block';
                            
                            window.syncSettings(); 
                            window.syncHackerButtons(); 
                            
                            if (window.clearMatrix) window.clearMatrix('#120004'); window.matrixSettings.color = 'rgba(255, 0, 60, 0.7)'; window.matrixSettings.fade = 'rgba(18, 0, 4, 0.05)'; 
                            if (window.preRenderMatrix) window.preRenderMatrix(); if (window.applyMatrixSettings) window.applyMatrixSettings();

                            overlay.style.display = 'none';
                            window.setAnimTimeout(() => { wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)'; wipe.classList.remove('wipe-in'); }, 50);
                        }, 1000); 
                    }, 1200); 
                }, 300); 
            }, 2700); 
        }, 500); 
    }, 600); 
}

window.skipToPhase3 = function() {
    window.clearAnimTimeouts();
    if (window.p2_flicker) clearInterval(window.p2_flicker);
    document.getElementById('deploy-overlay').style.display = 'none'; document.getElementById('phase2-container').style.display = 'none';
    document.body.classList.remove('exploding');
    
    const wipe = document.getElementById('transition-wipe'); wipe.style.transition = 'none'; wipe.classList.remove('wipe-in');
    
    currentPhase = 3; robotState = window.captureState(); deductionState = []; document.getElementById('deduction-list').innerHTML = '';
    buildAlignment(); window.renderChecksumLists();
    
    document.getElementById('step-execution').style.display = 'flex'; document.body.classList.remove('hacker-mode');
    if (window.clearMatrix) window.clearMatrix('#0d0d12'); window.matrixSettings.color = 'rgba(0, 255, 65, 0.4)'; window.matrixSettings.fade = 'rgba(13, 13, 18, 0.08)';
    if (window.preRenderMatrix) window.preRenderMatrix(); if (window.applyMatrixSettings) window.applyMatrixSettings();
};

window.goToPhase3 = function(event) {
    const wipe = document.getElementById('transition-wipe');
    if (event) { document.documentElement.style.setProperty('--wipe-x', event.clientX + 'px'); document.documentElement.style.setProperty('--wipe-y', event.clientY + 'px'); }
    
    document.body.classList.add('exploding'); wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)'; wipe.classList.add('wipe-in');
    
    window.setAnimTimeout(() => {
        document.body.classList.remove('exploding'); document.getElementById('phase2-container').style.display = 'none';
        const overlay = document.getElementById('deploy-overlay'); const scene = document.getElementById('deploy-scene');
        overlay.style.display = 'flex'; scene.style.opacity = '1';
        
        const packet = document.getElementById('d-packet'); const bot = document.getElementById('d-bot');
        packet.style.transition = 'none'; packet.style.left = '50px'; packet.style.transform = 'translate(-50%, -50%) scale(0)'; bot.style.filter = 'none';
        wipe.classList.remove('wipe-in');
        
        const binaryRows = document.querySelectorAll('#d-stream .binary-row');
        window.p2_flicker = setInterval(() => {
            binaryRows.forEach(row => {
                let chars = row.innerText.split('');
                for(let k=0; k<5; k++) { let idx = Math.floor(Math.random() * chars.length); chars[idx] = chars[idx] === '0' ? '1' : '0'; }
                row.innerText = chars.join('');
            });
        }, 100);

        window.setAnimTimeout(() => {
            packet.style.transition = 'left 1.5s cubic-bezier(0.4, 0, 1, 1), transform 0.2s ease-out';
            packet.style.left = '95%'; packet.style.transform = 'translate(-50%, -50%) scale(1)';

            window.setAnimTimeout(() => {
                document.body.classList.add('exploding'); packet.style.opacity = '0'; bot.style.filter = 'drop-shadow(0 0 20px #ff003c) drop-shadow(0 0 30px #ff003c)';
                window.setAnimTimeout(() => { document.body.classList.remove('exploding'); }, 400);

                window.setAnimTimeout(() => {
                    scene.style.transition = 'opacity 0.5s'; scene.style.opacity = '0';
                    window.setAnimTimeout(() => {
                        wipe.style.transition = 'none'; document.documentElement.style.setProperty('--wipe-x', '50%'); document.documentElement.style.setProperty('--wipe-y', '50%'); wipe.classList.add('wipe-in');
                        
                        currentPhase = 3; robotState = window.captureState(); deductionState = []; document.getElementById('deduction-list').innerHTML = '';
                        buildAlignment(); window.renderChecksumLists();
                        
                        document.getElementById('step-execution').style.display = 'flex'; document.body.classList.remove('hacker-mode');
                        if (window.clearMatrix) window.clearMatrix('#0d0d12'); window.matrixSettings.color = 'rgba(0, 255, 65, 0.4)'; window.matrixSettings.fade = 'rgba(13, 13, 18, 0.08)';
                        if (window.preRenderMatrix) window.preRenderMatrix(); if (window.applyMatrixSettings) window.applyMatrixSettings();
                        
                        overlay.style.display = 'none'; clearInterval(window.p2_flicker);
                        window.setAnimTimeout(() => { wipe.style.transition = 'transform 0.6s cubic-bezier(0.9, 0.03, 0.05, 0.9)'; wipe.classList.remove('wipe-in'); }, 50);
                    }, 1000);
                }, 800); 
            }, 1500); 
        }, 300);
    }, 600);
}

window.unblurAttacker = function() { document.getElementById('attacker-overlay').style.display = 'none'; }

function buildAlignment() {
    let pMoves = programmerState.filter(x => x.id.startsWith('MOVE_'));
    let rMoves = robotState.filter(x => x.id.startsWith('MOVE_'));
    let pSettings = programmerState.filter(x => !x.id.startsWith('MOVE_'));
    let rSettings = robotState.filter(x => !x.id.startsWith('MOVE_'));

    auditPairs = [];

    pMoves.forEach(pItem => {
        let rItem = rMoves.find(r => r.moveId === pItem.moveId);
        if (!rItem) { rItem = { id: 'BLANK_' + pItem.moveId, label: '[ DELETED ]', value: '[ DELETED ]', virtual: true }; }
        auditPairs.push({ pItem: pItem, rItem: rItem, isMove: true });
    });

    for(let s=0; s<pSettings.length; s++) { 
        auditPairs.push({ pItem: pSettings[s], rItem: rSettings[s], isMove: false }); 
    }
}

window.currentHelpStep = 1;
window.TOTAL_HELP_STEPS = 7;

window.openHelp = function() {
    document.getElementById('help-overlay').style.display = 'flex';
    window.currentHelpStep = 1;
    window.updateHelpUI();
};

window.closeHelp = function() {
    document.getElementById('help-overlay').style.display = 'none';
};

window.nextHelp = function() {
    if (window.currentHelpStep < window.TOTAL_HELP_STEPS) {
        window.currentHelpStep++;
        window.updateHelpUI();
    }
};

window.prevHelp = function() {
    if (window.currentHelpStep > 1) {
        window.currentHelpStep--;
        window.updateHelpUI();
    }
};

window.updateHelpUI = function() {
    for (let i = 1; i <= window.TOTAL_HELP_STEPS; i++) {
        const step = document.getElementById('help-step-' + i);
        if (step) {
            step.style.display = (i === window.currentHelpStep) ? 'block' : 'none';
        }
    }
    
    const prevBtn = document.getElementById('btn-help-prev');
    const nextBtn = document.getElementById('btn-help-next');
    const finishBtn = document.getElementById('btn-help-finish');
    const dots = document.querySelectorAll('.help-dot');
    
    dots.forEach((dot, index) => {
        if (index + 1 === window.currentHelpStep) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    if (window.currentHelpStep === 1) {
        prevBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
    }
    
    if (window.currentHelpStep === window.TOTAL_HELP_STEPS) {
        nextBtn.disabled = true;
        finishBtn.disabled = false;
        finishBtn.style.opacity = '1';
        finishBtn.style.cursor = 'pointer';
    } else {
        nextBtn.disabled = false;
        finishBtn.disabled = true;
        finishBtn.style.opacity = '0.5';
        finishBtn.style.cursor = 'not-allowed';
    }
};

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        const helpOverlay = document.getElementById('help-overlay');
        if (helpOverlay && helpOverlay.style.display !== 'none') {
            window.closeHelp();
        }
    }
});

// REMOVED DOMContentLoaded LISTENER FROM HERE