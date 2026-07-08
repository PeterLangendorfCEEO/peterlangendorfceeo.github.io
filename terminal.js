let typingQueue = [];
let isTyping = false;
let currentString = "";

window.logHackerAction = function(cmd) {
    if (currentPhase !== 2) return;
    typingQueue.push(cmd);
    processTypingQueue();
}

function processTypingQueue() {
    if (isTyping || typingQueue.length === 0) return;
    isTyping = true;
    
    const targetCmd = typingQueue.shift();
    let charIndex = 0;
    const typeSpan = document.getElementById('typing-span');
    
    const typeInterval = setInterval(() => {
        currentString += targetCmd.charAt(charIndex);
        typeSpan.innerText = currentString;
        charIndex++;
        
        if (charIndex >= targetCmd.length) {
            clearInterval(typeInterval);
            setTimeout(() => {
                const logs = document.getElementById('bash-logs');
                const now = new Date();
                const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
                const historySpan = document.createElement('span');
                historySpan.innerHTML = `<span style="color: #555;">[${time}]</span> <span style="color: var(--neon-red);">root@sys:~#</span> ${currentString}`;
                logs.appendChild(historySpan);
                logs.scrollTop = logs.scrollHeight;
                
                currentString = ""; typeSpan.innerText = ""; isTyping = false; processTypingQueue();
            }, 300); 
        }
    }, 25); 
}

const settingsInputs = ['fwd_spd', 'rgt_spd', 'rgt_ang', 'lft_spd', 'lft_ang', 'bck_spd'];
settingsInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('change', (e) => { window.logHackerAction(`env.ovr !key=${id} !val=${e.target.value}`); }); }
});

var isDraggingMove = false; 
var previousOrder = [];     
const listbox = document.getElementById('move-listbox');

const observer = new MutationObserver((mutations) => {
    if (currentPhase !== 2) return;
    if (isDraggingMove) return; 

    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('list-item')) { 
                    window.logHackerAction(`mem.alloc @tail !val=${node.innerText.trim().substring(0,3)}`); 
                }
            });
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('list-item')) { 
                    window.logHackerAction(`mem.free @node !val=${node.innerText.trim().substring(0,3)}`); 
                }
            });
        }
    });
});
if (listbox) { observer.observe(listbox, { childList: true }); }