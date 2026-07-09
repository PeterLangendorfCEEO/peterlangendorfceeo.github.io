window.openSensors = function() { document.getElementById('sensor-overlay').style.display = 'flex'; window.drawSensorGraph(); }
window.closeSensors = function() { document.getElementById('sensor-overlay').style.display = 'none'; }

var telemetryTimer = null;
var telemetryHistory = [];
var isRecording = false;
var recordStartMs = 0;
var graphMode = 'normal'; 
window.currentMoveLabel = "IDLE";
var t_leftSpeed = 0;
var t_rightSpeed = 0;

window.setCurrentTargetSpeeds = function(left, right) { t_leftSpeed = left; t_rightSpeed = right; };
window.toggleGraphMode = function() {
    graphMode = graphMode === 'normal' ? 'advanced' : 'normal';
    const btn = document.getElementById('btn-toggle-graph');
    if (graphMode === 'normal') {
        btn.innerHTML = "Mode:<br>Normal (Simplified)"; btn.className = "btn-success btn-toggle-normal";
    } else {
        btn.innerHTML = "Mode:<br>Advanced (Raw Data)"; btn.className = "btn-success btn-toggle-advanced";
    }
    window.drawSensorGraph(); 
}

window.startRecording = function() { telemetryHistory = []; isRecording = true; recordStartMs = Date.now(); };
window.stopRecording = function() { isRecording = false; };

window.startTelemetry = function() {
    if (!telemetryTimer) {
        telemetryTimer = setInterval(() => {
            if(window.legoBluetooth) {
                let left = window.legoBluetooth.getMotorSpeed(1); let right = window.legoBluetooth.getMotorSpeed(2);
                let lVal = left !== null ? left : 0; let rVal = right !== null ? right : 0;
                
                if (isRecording) {
                    telemetryHistory.push({ t: Date.now() - recordStartMs, left: lVal, right: rVal, move: window.currentMoveLabel, tgtLeft: t_leftSpeed, tgtRight: t_rightSpeed });
                }
            }
        }, 50); 
    }
}

window.drawSensorGraph = function() {
    const canvas = document.getElementById('sensor-canvas');
    const ctx = canvas.getContext('2d');
    const h = 400; const pad = 40; const leftPad = 60; 
    
    let regions = [];
    let currentRegion = null;
    for (let pt of telemetryHistory) {
        if (currentRegion && currentRegion.move === pt.move) { currentRegion.end = pt.t; } 
        else {
            if (currentRegion) regions.push(currentRegion);
            currentRegion = { move: pt.move, start: pt.t, end: pt.t };
        }
    }
    if (currentRegion) regions.push(currentRegion);

    // THE FIX: Analyze the live data to snap the dashed visual boundary perfectly!
    for (let r of regions) {
        if (r.move === 'IDLE' || r.move === 'END') continue;
        let pts = telemetryHistory.filter(p => p.t >= r.start && p.t <= r.end);
        
        let lastActive = pts.findLast(p => Math.abs(p.left) > 0 || Math.abs(p.right) > 0);
        if (lastActive) {
            // Adds a tiny buffer so the line doesn't cut directly into the shape
            r.visualEnd = Math.min(r.end, lastActive.t + 100);
        } else {
            // Failsafe: if the motor broke instantly, give it a tiny box so it's still visible
            r.visualEnd = Math.min(r.end, r.start + 300);
        }
    }

    let displayRegions = regions.filter(r => r.move !== 'IDLE' && r.move !== 'END');
    let targetWidth = 900;
    if (displayRegions.length > 6) { targetWidth = leftPad + pad + (displayRegions.length * 130); }
    
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    else ctx.clearRect(0, 0, canvas.width, h);
    const w = canvas.width;

    if (telemetryHistory.length === 0) {
        ctx.fillStyle = '#888';
        ctx.font = '16px Share Tech Mono'; ctx.textAlign = 'center';
        ctx.fillText("No data recorded yet. Execute Payload first.", w/2, h/2); return;
    }
    
    const maxT = Math.max(1, telemetryHistory[telemetryHistory.length - 1].t);
    ctx.font = '12px Share Tech Mono'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (let speed = -100; speed <= 100; speed += 20) {
        const y = h/2 - (speed / 100) * (h/2 - pad);
        ctx.strokeStyle = speed === 0 ? '#444' : 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = speed === 0 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(leftPad, y); ctx.lineTo(w - pad, y); ctx.stroke();
        ctx.fillStyle = speed === 0 ? '#fff' : '#888';
        ctx.fillText(speed, leftPad - 10, y);
    }

    ctx.font = '14px Share Tech Mono'; ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
    
    for (let reg of displayRegions) {
        // THE FIX: Uses our new visualEnd to pull the dashed line tight!
        let startX = leftPad + (reg.start / maxT) * (w - leftPad - pad);
        let endX = leftPad + (reg.visualEnd / maxT) * (w - leftPad - pad);

        ctx.strokeStyle = '#555'; ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, pad); ctx.lineTo(startX, h - pad); 
        ctx.moveTo(endX, pad); ctx.lineTo(endX, h - pad); 
        ctx.stroke(); ctx.setLineDash([]);
        
        let arrowY = pad / 2 + 15; ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 1;

        if (endX - startX > 30) {
            ctx.beginPath();
            ctx.moveTo(startX + 10, arrowY); ctx.lineTo(endX - 10, arrowY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(startX + 10, arrowY); ctx.lineTo(startX + 15, arrowY - 4); ctx.lineTo(startX + 15, arrowY + 4); ctx.fill();
            ctx.beginPath(); ctx.moveTo(endX - 10, arrowY); ctx.lineTo(endX - 15, arrowY - 4); ctx.lineTo(endX - 15, arrowY + 4); ctx.fill();
        }
        ctx.fillText(reg.move, (startX + endX) / 2, arrowY - 5);
    }

    if (graphMode === 'normal') {
        function getSimplifiedPoints(key) {
            let simplified = [];
            for (let reg of displayRegions) {
                let pts = telemetryHistory.filter(p => p.t >= reg.start && p.t <= reg.end);
                let isActive = false;
                for (let p of pts) { let tgt = key === 'left' ? p.tgtLeft : p.tgtRight; if (tgt !== 0) { isActive = true; break; } }
                
                let amp = 0;
                if (isActive) { amp = (key === 'left') ? 100 : -100; }
                
                // THE FIX: Snaps the shape perfectly to the visualEnd boundary
                let activeDuration = reg.visualEnd - reg.start; 
                let ramp = Math.min(100, activeDuration * 0.2);

                simplified.push({ t: reg.start, val: 0 });
                simplified.push({ t: reg.start + ramp, val: amp });
                simplified.push({ t: reg.visualEnd - ramp, val: amp });
                simplified.push({ t: reg.visualEnd, val: 0 }); 
            }
            return simplified;
        }

        function drawSimplifiedLine(key, color) {
            const pts = getSimplifiedPoints(key);
            ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
            
            let isFirst = true;
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                const x = leftPad + (pt.t / maxT) * (w - leftPad - pad);
                const y = h/2 - (pt.val / 100) * (h/2 - pad);
                
                // THE FIX: Automatically draws flatlines connecting the separated regions!
                if (isFirst) { ctx.moveTo(leftPad, h/2); ctx.lineTo(x, y); isFirst = false; }
                else { ctx.lineTo(x, y); }
            }
            ctx.lineTo(w - pad, h/2);
            ctx.stroke();
        }
        drawSimplifiedLine('left', '#00ff41'); drawSimplifiedLine('right', '#00f0ff');
    } else {
        function drawRawLine(key, color) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
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
        drawRawLine('left', '#00ff41'); drawRawLine('right', '#00f0ff');
    }
}