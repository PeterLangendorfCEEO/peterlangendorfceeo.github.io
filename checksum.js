var selLeft = null;
var selRight = null;

window.openChecksum = function() { document.getElementById('checksum-overlay').style.display = 'flex'; }
window.closeChecksum = function() { document.getElementById('checksum-overlay').style.display = 'none'; }

function pseudoHash(id, val) {
    let str = id + ":" + val; let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return '0x' + ('00000000' + (hash >>> 0).toString(16)).slice(-8).toUpperCase();
}

window.renderChecksumLists = function() {
    checksRemaining = 3;
    document.getElementById('checks-counter').innerText = `CHECKS REMAINING: ${checksRemaining}`;
    
    const grid = document.querySelector('.checksum-grid');
    while (grid.children.length > 3) { grid.removeChild(grid.lastChild); }
    
    let moveIndex = 0; // live counter for move rows only -- see note below

    for(let i=0; i<auditPairs.length; i++) {
        let pair = auditPairs[i];
        // Hash against the row index `i`, not pItem.id/rItem.id. Those ids
        // (e.g. "MOVE_0", "MOVE_1") are just each item's DOM position at
        // capture time, which shifts whenever something is inserted or
        // deleted elsewhere in the sequence -- even for a move nobody
        // touched. auditPairs already did the real identity-alignment work
        // upstream, so all this hash needs to check is "same value in the
        // same (already-matched) row", and `i` is guaranteed identical for
        // both sides of that row.
        let pHash = pair.pItem ? pseudoHash(i, pair.pItem.value) : "0x00000000";
        let rHash = pair.rItem ? pseudoHash(i, pair.rItem.value) : "0x00000000";

        // Same fix as deduction.js: pItem.label/rItem.label are stale,
        // position-based labels frozen at capture time (e.g. "Instruction
        // [0]" because that move was 1st in the list *when it was
        // captured*). A move's position can shift between Phase 1 and
        // Phase 3 just from insertions/deletions elsewhere, so reading
        // either side's stored label produces duplicate/wrong numbers.
        // Settings rows are unaffected -- their label is a real fixed name
        // ("Forward Speed"), not a position-derived one.
        let leftLabel;
        if (pair.isMove) {
            leftLabel = `Instruction [${moveIndex}]`;
            moveIndex++;
        } else {
            leftLabel = pair.pItem.label;
        }
        let leftValue = pair.pItem ? pair.pItem.value : pair.rItem.value;

        let leftDiv = document.createElement('div');
        leftDiv.className = 'mem-block';
        leftDiv.innerHTML = `<span>${leftLabel}: <span style="color:#e0e0e0;">${leftValue}</span></span><span class="hash-text">${pair.pItem ? pHash : rHash}</span>`;
        
        let arrowDiv = document.createElement('div'); arrowDiv.className = 'match-arrow'; arrowDiv.innerText = '↔'; arrowDiv.id = `arrow-${i}`;

        let rightDiv = document.createElement('div'); rightDiv.className = 'mem-block';
        if (pair.rItem) { rightDiv.innerHTML = `<span>Encrypted Block [${i}]</span><span class="hash-text">[ SELECT ]</span>`; } 
        else { rightDiv.innerHTML = `<span><span style="color:#e0e0e0;">[ DELETED BY HACKER ]</span></span><span class="hash-text">[ SELECT ]</span>`; }
        
        leftDiv.onclick = () => window.selectBlock('left', i, pHash, leftDiv, arrowDiv);
        rightDiv.onclick = () => window.selectBlock('right', i, rHash, rightDiv, arrowDiv);
        
        grid.appendChild(leftDiv); grid.appendChild(arrowDiv); grid.appendChild(rightDiv);
    }
    selLeft = null; selRight = null;
}

window.selectBlock = function(side, index, hash, element, arrow) {
    if (checksRemaining <= 0) return;

    if (side === 'left') {
        if (selLeft) selLeft.el.classList.remove('selected');
        selLeft = { index, hash, el: element, arrow: arrow }; element.classList.add('selected');
    } else {
        if (selRight) selRight.el.classList.remove('selected');
        selRight = { index, hash, el: element, arrow: arrow }; element.classList.add('selected');
    }

    if (selLeft && selRight) {
        checksRemaining--;
        document.getElementById('checks-counter').innerText = `CHECKS REMAINING: ${checksRemaining}`;

        if (selLeft.index !== selRight.index) {
            selLeft.el.querySelector('.hash-text').innerText = selLeft.hash + " [ MISMATCH ]";
            selRight.el.querySelector('.hash-text').innerText = selRight.hash + " [ MISMATCH ]";
            selLeft.el.classList.add('match-fail'); selRight.el.classList.add('match-fail');
        } 
        else if (selLeft.hash === selRight.hash && selLeft.hash !== "0x00000000") {
            selLeft.el.querySelector('.hash-text').innerText = selLeft.hash + " [ VERIFIED ]";
            selRight.el.querySelector('.hash-text').innerText = selRight.hash + " [ VERIFIED ]";
            selLeft.el.classList.add('match-success'); selRight.el.classList.add('match-success'); selLeft.arrow.classList.add('success');
        } 
        else {
            selLeft.el.querySelector('.hash-text').innerText = selLeft.hash + " [ BREACHED ]";
            selRight.el.querySelector('.hash-text').innerText = selRight.hash + " [ BREACHED ]";
            selLeft.el.classList.add('match-fail'); selRight.el.classList.add('match-fail'); selLeft.arrow.classList.add('fail');
        }
        
        selLeft.el.classList.remove('selected'); selRight.el.classList.remove('selected');
        selLeft = null; selRight = null;

        if (checksRemaining <= 0) {
            document.querySelectorAll('.mem-block:not(.match-success):not(.match-fail)').forEach(el => { el.style.pointerEvents = 'none'; el.style.opacity = '0.4'; });
        }
    }
}