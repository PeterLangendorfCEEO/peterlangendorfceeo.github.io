window.openChecksum = function() { document.getElementById('checksum-overlay').style.display = 'flex'; }
window.closeChecksum = function() { document.getElementById('checksum-overlay').style.display = 'none'; }

function pseudoHash(id, val) {
    let str = id + ":" + val; let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return '0x' + ('00000000' + (hash >>> 0).toString(16)).slice(-8).toUpperCase();
}

let checkedBlocks = new Set();

window.renderChecksumLists = function() {
    checksRemaining = 3;
    checkedBlocks.clear();
    document.getElementById('checks-counter').innerText = `CHECKS REMAINING: ${checksRemaining}`;
    
    document.getElementById('checksum-list-view').style.display = 'block';
    document.getElementById('checksum-anim-view').style.display = 'none';
    
    const closeBtn = document.getElementById('btn-close-diagnostics');
    if (closeBtn) closeBtn.style.display = 'block';
    
    const container = document.getElementById('checksum-blocks');
    container.innerHTML = '';
    
    // THE FIX: Start index at 1
    let moveIndex = 1;
    let hasShownDivider = false;
    
    auditPairs.forEach((pair, index) => {
        if (!pair.isMove && !hasShownDivider) {
            let divider = document.createElement('div');
            divider.style.borderTop = "1px dashed var(--border-color)";
            divider.style.margin = "10px 0 5px 0";
            divider.style.paddingTop = "10px";
            divider.style.color = "#aaa";
            divider.style.fontSize = "0.9em";
            divider.innerText = "// MOTOR_CONSTANTS";
            container.appendChild(divider);
            hasShownDivider = true;
        }
        
        let block = document.createElement('div');
        block.className = 'mem-block';
        block.id = `audit-block-${index}`;
        
        let label = pair.isMove ? `Instruction [${moveIndex}] : ${pair.pItem.value}` : `${pair.pItem.label} : ${pair.pItem.value}`;
        
        block.innerHTML = `<span>${label}</span> <span class="hash-text" style="color: #888;">[ UNAUDITED ]</span>`;
        
        block.onclick = () => window.inspectMove(index, pair);
        container.appendChild(block);
        
        if (pair.isMove) moveIndex++;
    });
}

window.inspectMove = function(index, pair) {
    if (checkedBlocks.has(index)) return; 
    if (checksRemaining <= 0) return; 
    
    checksRemaining--;
    document.getElementById('checks-counter').innerText = `CHECKS REMAINING: ${checksRemaining}`;
    checkedBlocks.add(index);
    
    if (checksRemaining === 0) {
        document.querySelectorAll('.mem-block').forEach(block => {
            let blockIdx = parseInt(block.id.replace('audit-block-', ''));
            if (!checkedBlocks.has(blockIdx)) {
                block.style.opacity = '0.3';
                block.style.pointerEvents = 'none';
                block.style.filter = 'grayscale(100%)';
                
                let hashTxt = block.querySelector('.hash-text');
                if (hashTxt) {
                    hashTxt.innerText = '[ LOCKED ]';
                    hashTxt.style.color = '#555';
                }
            }
        });
    }
    
    const closeBtn = document.getElementById('btn-close-diagnostics');
    if (closeBtn) closeBtn.style.display = 'none';
    
    document.getElementById('checksum-list-view').style.display = 'none';
    document.getElementById('checksum-anim-view').style.display = 'flex';
    document.getElementById('btn-anim-back').style.opacity = '0';
    document.getElementById('btn-anim-back').style.pointerEvents = 'none';
    document.getElementById('anim-result').innerText = '';
    
    document.getElementById('anim-p-val').innerText = pair.isMove ? pair.pItem.value : `${pair.pItem.id}=${pair.pItem.value}`;
    document.getElementById('anim-r-val').innerText = "?????";
    
    let pHashEl = document.getElementById('anim-p-hash');
    let rHashEl = document.getElementById('anim-r-hash');
    
    let pId = pair.isMove ? pair.pItem.moveId : pair.pItem.id;
    let rId = pair.isMove ? (pair.rItem.virtual ? "VIRTUAL" : pair.rItem.moveId) : pair.rItem.id;
    
    let targetPHash = pseudoHash(pId, pair.pItem.value);
    let targetRHash = (pair.isMove && pair.rItem.virtual) ? "0xDEADDEAD" : pseudoHash(rId, pair.rItem.value);
    let rActualVal = (pair.isMove && pair.rItem.virtual) ? "[ DELETED ]" : (pair.isMove ? pair.rItem.value : `${pair.rItem.id}=${pair.rItem.value}`);
    
    let startTime = Date.now();
    let animInterval = setInterval(() => {
        let pRand = '0x' + Math.floor(Math.random()*4294967295).toString(16).padStart(8, '0').toUpperCase();
        let rRand = '0x' + Math.floor(Math.random()*4294967295).toString(16).padStart(8, '0').toUpperCase();
        pHashEl.innerText = pRand;
        rHashEl.innerText = rRand;
        
        if (Date.now() - startTime >= 1500) {
            clearInterval(animInterval);
            pHashEl.innerText = targetPHash;
            rHashEl.innerText = targetRHash;
            document.getElementById('anim-r-val').innerText = rActualVal;
            
            let resEl = document.getElementById('anim-result');
            let blockEl = document.getElementById(`audit-block-${index}`);
            let overlay = document.getElementById('checksum-overlay'); 
            
            if (targetPHash === targetRHash) {
                resEl.innerText = "VERIFIED";
                resEl.style.color = "var(--neon-green)";
                resEl.style.textShadow = "0 0 15px var(--neon-green)";
                
                blockEl.classList.add('match-success');
                blockEl.querySelector('.hash-text').innerText = targetPHash + " [ VERIFIED ]";
                blockEl.querySelector('.hash-text').style.color = "var(--neon-green)";
                
                overlay.classList.add('flash-success');
                overlay.style.transition = 'background-color 0.1s ease';
                overlay.style.backgroundColor = 'rgba(0, 255, 65, 0.4)';
                setTimeout(() => { 
                    overlay.classList.remove('flash-success');
                    overlay.style.transition = 'background-color 0.8s ease'; 
                    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'; 
                }, 150);
                
            } else {
                resEl.innerText = "BREACHED";
                resEl.style.color = "var(--neon-red)";
                resEl.style.textShadow = "0 0 15px var(--neon-red)";
                
                blockEl.classList.add('match-fail');
                blockEl.querySelector('.hash-text').innerText = targetRHash + " [ BREACHED ]";
                blockEl.querySelector('.hash-text').style.color = "var(--neon-red)";
                
                overlay.classList.add('flash-fail');
                overlay.style.transition = 'background-color 0.1s ease';
                overlay.style.backgroundColor = 'rgba(255, 0, 60, 0.4)';
                setTimeout(() => { 
                    overlay.classList.remove('flash-fail');
                    overlay.style.transition = 'background-color 0.8s ease'; 
                    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'; 
                }, 150);
            }
            
            document.getElementById('btn-anim-back').style.opacity = '1';
            document.getElementById('btn-anim-back').style.pointerEvents = 'auto';
        }
    }, 50);
}

window.backToChecksumList = function() {
    document.getElementById('checksum-list-view').style.display = 'block';
    document.getElementById('checksum-anim-view').style.display = 'none';
    
    const closeBtn = document.getElementById('btn-close-diagnostics');
    if (closeBtn) closeBtn.style.display = 'block';
}