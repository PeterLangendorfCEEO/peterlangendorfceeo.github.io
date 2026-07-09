// --- Score system ---
// Scoring rules:
//  + points for every instruction the programmer wrote (longer/riskier
//    programs are worth more)
//  - points for every mistake in the final Incident Report
//  + bonus for every instruction correctly flagged as BOTH breached and
//    broken at once (the hardest case to catch)
//  + a big bonus for a flawless (zero-mistake) report

window.SCORE_CONFIG = {
    perInstruction: 15,
    perMistake: -20,
    doubleTroubleBonus: 30,
    perfectBonus: 100
};

window.computeScore = function(instructionCount, mistakeCount, doubleTroubleCount) {
    const cfg = window.SCORE_CONFIG;
    const breakdown = [];

    breakdown.push({
        label: `Instructions Programmed (${instructionCount})`,
        points: instructionCount * cfg.perInstruction
    });

    if (mistakeCount > 0) {
        breakdown.push({
            label: `Mistakes in Report (${mistakeCount})`,
            points: mistakeCount * cfg.perMistake
        });
    }

    if (doubleTroubleCount > 0) {
        breakdown.push({
            label: `Double Trouble Catch${doubleTroubleCount > 1 ? 'es' : ''} (${doubleTroubleCount})`,
            points: doubleTroubleCount * cfg.doubleTroubleBonus
        });
    }

    const perfect = (mistakeCount === 0);
    if (perfect) {
        breakdown.push({ label: `Perfect Audit Bonus`, points: cfg.perfectBonus });
    }

    let total = breakdown.reduce((sum, line) => sum + line.points, 0);
    if (total < 0) total = 0;

    return { breakdown, total, perfect };
};

// --- Styles (self-contained so this file doesn't depend on core.css) ---
(function injectScoreStyles() {
    if (document.getElementById('score-tally-styles')) return;
    const style = document.createElement('style');
    style.id = 'score-tally-styles';
    style.textContent = `
        #score-tally { position: relative; overflow: visible; }
        .score-tally-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 4px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            font-size: 1em;
            opacity: 0;
            transform: translateX(-15px);
            transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .score-tally-line-in { opacity: 1; transform: translateX(0); }
        .score-tally-label { color: #ccc; }
        .score-tally-value { font-weight: bold; letter-spacing: 1px; }
        .score-positive { color: var(--neon-green, #00ff41); }
        .score-negative { color: var(--neon-red, #ff003c); }
        .score-total-pop { animation: scoreTotalPop 0.5s ease; }
        @keyframes scoreTotalPop {
            0% { transform: scale(1); }
            40% { transform: scale(1.25); }
            100% { transform: scale(1); }
        }
        .score-perfect-pop { animation: scorePerfectPop 0.6s ease; }
        @keyframes scorePerfectPop {
            0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }
            60% { transform: scale(1.15) rotate(3deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .score-confetti-particle {
            position: absolute;
            font-weight: bold;
            pointer-events: none;
            color: #ffd700;
            font-size: 1.1em;
            left: 50%; top: 10%;
            transition: transform 1.1s cubic-bezier(0.15,0.8,0.3,1), opacity 1.1s ease;
            z-index: 5;
        }
    `;
    document.head.appendChild(style);
})();

window.animateScoreCount = function(from, to, duration, onUpdate, onComplete) {
    const start = performance.now();
    function step(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const val = Math.round(from + (to - from) * eased);
        onUpdate(val);
        if (progress < 1) { requestAnimationFrame(step); }
        else if (onComplete) { onComplete(); }
    }
    requestAnimationFrame(step);
};

window.spawnScoreConfetti = function(container) {
    const rect = container.getBoundingClientRect();
    const symbols = ['★', '✦', '1', '0'];
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'score-confetti-particle';
        p.innerText = symbols[Math.floor(Math.random() * symbols.length)];
        container.appendChild(p);

        const dx = (Math.random() - 0.5) * Math.max(rect.width, 300);
        const dy = 40 + Math.random() * 160;
        const rot = (Math.random() - 0.5) * 360;

        requestAnimationFrame(() => {
            p.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
            p.style.opacity = '0';
        });
        setTimeout(() => p.remove(), 1200);
    }
};

// --- Tally animation ---
// Reveals each score line one at a time, running the total up as it goes,
// then lands on the final number (with extra fanfare for a perfect run).
window.playScoreTally = function(scoreData) {
    const container = document.getElementById('score-tally');
    const linesEl = document.getElementById('score-tally-lines');
    const totalEl = document.getElementById('score-tally-total');
    const perfectEl = document.getElementById('score-tally-perfect');
    if (!container || !linesEl || !totalEl) return;

    linesEl.innerHTML = '';
    totalEl.style.display = 'none';
    totalEl.classList.remove('score-total-pop');
    totalEl.innerText = '';
    if (perfectEl) {
        perfectEl.style.display = 'none';
        perfectEl.classList.remove('score-perfect-pop');
    }
    container.style.display = 'block';

    const lineDelay = 550; // ms between each line appearing
    const lines = scoreData.breakdown;

    if (lines.length === 0) {
        totalEl.style.display = 'block';
        totalEl.innerText = `FINAL SCORE: ${scoreData.total}`;
        return;
    }

    let running = 0;
    lines.forEach((line, idx) => {
        setTimeout(() => {
            const row = document.createElement('div');
            row.className = 'score-tally-line';
            const sign = line.points >= 0 ? '+' : '';
            const colorClass = line.points >= 0 ? 'score-positive' : 'score-negative';
            row.innerHTML = `<span class="score-tally-label">${line.label}</span><span class="score-tally-value ${colorClass}">${sign}${line.points}</span>`;
            linesEl.appendChild(row);
            requestAnimationFrame(() => row.classList.add('score-tally-line-in'));

            running += line.points;

            if (idx === lines.length - 1) {
                setTimeout(() => {
                    totalEl.style.display = 'block';
                    window.animateScoreCount(0, scoreData.total, 800, (val) => {
                        totalEl.innerText = `FINAL SCORE: ${val}`;
                    }, () => {
                        totalEl.classList.add('score-total-pop');
                        if (scoreData.perfect && perfectEl) {
                            perfectEl.style.display = 'block';
                            perfectEl.classList.add('score-perfect-pop');
                            window.spawnScoreConfetti(container);
                        }
                    });
                }, 400);
            }
        }, idx * lineDelay);
    });
};