# 🤖 Buggy, Broken, or Breached!

*A 2-player local web game of programming, sabotage, and mechanical deduction.*

### 🎮 Live Demos
* **Normal Mode:** [https://peterlangendorfceeo.github.io/BuggyBrokenBreached/src]
* **Speed Round Mode:** [https://peterlangendorfceeo.github.io/BuggyBrokenBreached/src/?mode=speed_round]

---

## 📖 The Game Explained

**Buggy, Broken, or Breached!** is an adversarial puzzle game played on a single screen alongside a live Bluetooth robotics hub. It is a game of deduction where players must figure out exactly why a robot didn't do what it was told.

In this game, there are three forces at play: The **Programmer**, the **Hacker**, and the **Hardware**. 

The Programmer wants the robot to execute a specific path. The Hacker secretly steps in to alter that path. But the biggest twist is the **Hardware itself**: the robot is highly unreliable. As it drives, there is a constant, looming threat of **Spontaneous Motor Failures**. At any moment, the left or right wheel might physically break down, dropping to 0% power for exactly one instruction before recovering.

When the robot finally finishes moving, it will likely be way off course. The players must then team up (or compete!) using telemetry graphs and cryptographic hashes to deduce the fate of *every single instruction*. 

For every move in the sequence, you must answer one question:
* Was the move **VALID**? (The robot executed the original code perfectly).
* Was the move **BREACHED**? (The Hacker secretly replaced or deleted the code).
* Was the move **BROKEN**? (The code was safe, but the physical motor failed and stopped spinning).

---

## 🕹️ The Phases of Play

### Phase 1: Programmer Input
The **Programmer** uses the terminal to build a sequence of movements (Forward, Back, Left, Right) and sets the exact speeds and angles for the motors. 
* *Note: You do NOT need to memorize your sequence! Your original instructions are securely backed up and will be visible to you during the final investigation phase.*

### Phase 2: Hacker Interception
The Programmer looks away, and the **Hacker** takes the keyboard. They have a limited number of edits (based on difficulty) to secretly **Replace** or **Delete** the Programmer's instructions. The goal is to be subtle enough to confuse the Programmer, making them wonder if the robot just broke down naturally.

### Phase 3: Hardware Link & Execution
The Bluetooth motors spin up and execute the final, hacked payload. This is where the **Motor Failures** happen in real-time. Watch the robot closely—if you see it drag a wheel or fail to turn, a motor just broke!

### Phase 4: The Incident Report
The robot stops, and the investigation begins. Players must use their detective tools to fill out the final Incident Report, marking each step as Valid, Breached, or Broken.

---

## 🧰 Investigation Tools

To figure out what happened, you are given two highly restricted diagnostic tools:

1. **The Sensor Graph (Find the "BROKEN" moves):** This graph plots the actual speed of the Left and Right motors over time. You are looking for anomalies—specifically, flatlines. If an instruction tells the robot to move, but the graph shows a motor dropping to ZERO, you have successfully identified a mechanical motor failure.
   
2. **The Secure Memory Audit (Find the "BREACHED" moves):** This tool displays the Programmer's *original* instructions side-by-side with the robot's memory. You can select an instruction to audit its cryptographic hash. 
   * Flashes **GREEN**: The hashes match. The code is safe.
   * Flashes **RED**: The hashes differ. You just caught the Hacker!
   * *Beware: You only get 3 or 4 guesses per game! Use them strategically on the moves you are most suspicious of.*

---

## ⚙️ Difficulty Levels

The game features dynamic difficulties that scale the complexity of the puzzle, limit the Hacker's power, and encrypt the diagnostic tools:

* 🟢 **EASY:** Maintinance workers treated like kings (**5% Motor Failure Chance**). Programmer sequence must be 5-10 instructions. Hacker is limited to 5 changes. The Memory Audit allows 4 secure checks. The Sensor Graph is high-fidelity (shows true speeds and exact durations). *1x Score Multiplier.*
* 🟡 **MEDIUM:** Maintinance workers paid minimum wage (**10% Motor Failure Chance**). Programmer sequence must be 9-14 instructions. Hacker is limited to 7 changes. The Memory Audit allows 4 secure checks. The Sensor Graph is amplitude-masked (hides true motor speeds). *2x Score Multiplier.*
* 🔴 **HARD:** Maintinance workers fired (**20% Motor Failure Chance**). Programmer sequence must be 12-16 instructions. Hacker has UNLIMITED changes. The Memory Audit only allows 3 secure checks. The Sensor Graph is heavily encrypted (hides both speeds and time durations). *3x Score Multiplier.*

---

## 🚀 Hosting

This game runs entirely in the browser using HTML, CSS, JavaScript, and PyScript for the Bluetooth backend. It requires absolutely no installation or local servers for the players.

Simply click the link, pair your Web-Bluetooth compatible LEGO Hub, and start hacking! 

*(Note: Web Bluetooth requires a compatible modern browser, such as Google Chrome or Microsoft Edge).*
