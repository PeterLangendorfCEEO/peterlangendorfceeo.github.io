from pyodide.ffi import create_proxy, to_js
from pyscript import document, window
import random
import asyncio
import json
import time

ENGINE_FAILURE_CHANCE = 10
DIR_CW = 0
DIR_CCW = 1
TURN_MULTIPLIER = 1.7

is_connected = False

def normalize_angle(angle):
    if angle > 180: return angle - 360
    elif angle < -180: return angle + 360
    else: return angle

def print_term(message, color="lime"):
    terminal = document.querySelector("#terminal")
    if terminal:
        terminal.innerHTML += f"<span style='color:{color};'>{message}</span><br>"
        terminal.scrollTop = terminal.scrollHeight

def set_status(message, color="lime"):
    terminal = document.querySelector("#terminal")
    if terminal:
        terminal.innerHTML = f"<span style='color:{color};'>{message}</span><br>"

def update_status():
    listbox = document.querySelector("#move-listbox")
    if listbox and listbox.children.length == 0:
        set_status("Add a move to begin...")
    elif not is_connected:
        set_status("Connect a motor to begin...")
    else:
        set_status("Ready to execute!", color="#00ffcc")

def add_move(move):
    listbox = document.querySelector("#move-listbox")
    if not listbox: return
    item = document.createElement("div")
    item.className = "list-item"
    item.draggable = True
    item.innerText = move.lower()
    listbox.appendChild(item)
    save_state()
    update_status()

def remove_selected(event):
    selected_items = document.querySelectorAll(".list-item.selected")
    if selected_items.length > 0:
        for i in range(selected_items.length):
            selected_items.item(i).remove()
        save_state()
        update_status()

def clear_all(event):
    listbox = document.querySelector("#move-listbox")
    if listbox: listbox.innerHTML = ""
    save_state()
    update_status()

def save_state(*args):
    try:
        settings = {
            "forward_speed": document.querySelector("#fwd_spd").value,
            "right_speed": document.querySelector("#rgt_spd").value,
            "right_angle": document.querySelector("#rgt_ang").value,
            "left_speed": document.querySelector("#lft_spd").value,
            "left_angle": document.querySelector("#lft_ang").value,
            "backward_speed": document.querySelector("#bck_spd").value,
        }
        listbox = document.querySelector("#move-listbox")
        moves = [listbox.children.item(i).innerText.lower() for i in range(listbox.children.length)]
        window.localStorage.setItem("cyber_settings", json.dumps(settings))
        window.localStorage.setItem("cyber_moves", json.dumps(moves))
    except Exception as e:
        pass 

def load_state():
    try:
        saved_settings = window.localStorage.getItem("cyber_settings")
        saved_moves = window.localStorage.getItem("cyber_moves")
        
        if saved_settings:
            try:
                settings = json.loads(saved_settings)
                fwd = document.querySelector("#fwd_spd")
                if fwd and "forward_speed" in settings: fwd.value = settings["forward_speed"]
                rgt = document.querySelector("#rgt_spd")
                if rgt and "right_speed" in settings: rgt.value = settings["right_speed"]
                rgt_a = document.querySelector("#rgt_ang")
                if rgt_a and "right_angle" in settings: rgt_a.value = settings["right_angle"]
                lft = document.querySelector("#lft_spd")
                if lft and "left_speed" in settings: lft.value = settings["left_speed"]
                lft_a = document.querySelector("#lft_ang")
                if lft_a and "left_angle" in settings: lft_a.value = settings["left_angle"]
                bck = document.querySelector("#bck_spd")
                if bck and "backward_speed" in settings: bck.value = settings["backward_speed"]
            except Exception:
                pass
                
        if saved_moves:
            try:
                moves = json.loads(saved_moves)
                for move in moves:
                    add_move(move)
            except Exception:
                pass
    except Exception as e:
        window.localStorage.removeItem("cyber_settings")
        window.localStorage.removeItem("cyber_moves")

# --- Hardware Execution ---
async def connect_motor(event):
    global is_connected
    print_term("Triggering Web Bluetooth Pairing Menu...", color="yellow")
    
    device_name = await window.legoBluetooth.connectHub()
    
    if not device_name or device_name == False:
        print_term("Connection failed or cancelled.", color="red")
        is_connected = False
        document.querySelector("#btn-begin").setAttribute("disabled", "true")
        return

    is_connected = True
    print_term(f"Handshake complete! Bound to {device_name}.", color="#00ffcc")
    
    document.querySelector("#btn-begin").removeAttribute("disabled")
    
    btn_connect = document.querySelector("#btn-connect")
    btn_connect.setAttribute("disabled", "true")
    btn_connect.innerText = "CONNECTED"
    
    hw_id = document.getElementById("hardware-id")
    if hw_id:
        hw_id.innerText = str(device_name).upper()
        hw_id.style.color = "var(--neon-cyan)"

async def run_sequence(event):
    if not is_connected:
        update_status()
        return

    document.querySelector("#btn-begin").setAttribute("disabled", "true")
    if document.querySelector("#btn-diagnostics"): document.querySelector("#btn-diagnostics").setAttribute("disabled", "true")
    if document.querySelector("#btn-sensors"): document.querySelector("#btn-sensors").setAttribute("disabled", "true")

    save_state()
    listbox = document.querySelector("#move-listbox")
    move_set = [listbox.children.item(i).innerText.lower() for i in range(listbox.children.length)]
    
    try:
        settings = json.loads(window.localStorage.getItem("cyber_settings"))
    except:
        print_term("Critical Error: Payload memory corrupted.", color="red")
        return

    print_term("Executing sequence...", color="#00ffcc")
    
    # Trigger JS Background Polling
    if hasattr(window, 'startTelemetry'):
        window.startTelemetry()
        window.startRecording()
    
    await asyncio.sleep(1)

    LEFT = window.legoBluetooth.MOTOR_BITS_LEFT
    RIGHT = window.legoBluetooth.MOTOR_BITS_RIGHT

    for move in move_set:
        left_failed = False
        right_failed = False
        window.currentMoveLabel = move.upper()

        if random.randint(1, 100) <= ENGINE_FAILURE_CHANCE:
            if random.randint(1, 2) == 1: left_failed = True
            else: right_failed = True

        try:
            # Straight movements use synchronized hardware encoders
            if move in ["forward", "back"]:
                commands = []
                if move == "forward":
                    speed = int(settings.get("forward_speed", 100))
                    if not left_failed: commands.append({"bitMask": LEFT, "speedPercent": speed, "direction": DIR_CW, "degrees": 864})
                    if not right_failed: commands.append({"bitMask": RIGHT, "speedPercent": speed, "direction": DIR_CCW, "degrees": 864})
                elif move == "back":
                    speed = int(settings.get("backward_speed", 100))
                    if not left_failed: commands.append({"bitMask": LEFT, "speedPercent": speed, "direction": DIR_CCW, "degrees": 900})
                    if not right_failed: commands.append({"bitMask": RIGHT, "speedPercent": speed, "direction": DIR_CW, "degrees": 900})

                if len(commands) > 0:
                    js_commands = to_js(commands, dict_converter=window.Object.fromEntries)
                    await window.legoBluetooth.runForDegreesSynced(js_commands)

            # Turning uses Closed-Loop Gyro if the IMU is alive, else falls back to encoders
            elif move in ["left", "right"]:
                target_offset = float(settings.get(f"{move}_angle", -90 if move=="left" else 90))
                speed = int(settings.get(f"{move}_speed", 10))
                
                start_angle = window.legoBluetooth.getAngle()
                
                if start_angle is None:
                    # IMU Dead - Fallback to Encoder math
                    turn_degrees = int(abs(target_offset) * TURN_MULTIPLIER)
                    commands = []
                    if move == "left":
                        if not left_failed: commands.append({"bitMask": LEFT, "speedPercent": speed, "direction": DIR_CW, "degrees": turn_degrees})
                        if not right_failed: commands.append({"bitMask": RIGHT, "speedPercent": speed, "direction": DIR_CW, "degrees": turn_degrees})
                    else:
                        if not left_failed: commands.append({"bitMask": LEFT, "speedPercent": speed, "direction": DIR_CCW, "degrees": turn_degrees})
                        if not right_failed: commands.append({"bitMask": RIGHT, "speedPercent": speed, "direction": DIR_CCW, "degrees": turn_degrees})
                        
                    if len(commands) > 0:
                        js_commands = to_js(commands, dict_converter=window.Object.fromEntries)
                        await window.legoBluetooth.runForDegreesSynced(js_commands)
                
                else:
                    # IMU Alive - True Closed-Loop Turning
                    target_angle = normalize_angle(start_angle + target_offset)
                    left_dir = DIR_CW if move == "left" else DIR_CCW
                    right_dir = DIR_CW if move == "left" else DIR_CCW
                    
                    tasks = []
                    if not left_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorContinuous(LEFT, speed, left_dir)))
                    if not right_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorContinuous(RIGHT, speed, right_dir)))
                    for t in tasks: await t
                    
                    start_time = time.time()
                    while True:
                        current = window.legoBluetooth.getAngle()
                        if current is None: break
                        error = abs(normalize_angle(current - target_angle))
                        
                        if error < 7.5: break
                        if time.time() - start_time > 15:
                            print_term(f"Turn timeout! Error: {error:.1f}deg", color="orange")
                            break
                        await asyncio.sleep(0.02)
                    
                    await window.legoBluetooth.stopMotor(LEFT | RIGHT)

        except Exception as e:
            print_term(f"Command failed or timed out: {e}", color="red")

        await asyncio.sleep(0.5)

    window.currentMoveLabel = "IDLE"
    if hasattr(window, 'stopRecording'): window.stopRecording()
    print_term("Robot move sequence complete!")
    
    # Unlock Analysis Buttons
    if document.querySelector("#btn-diagnostics"): document.querySelector("#btn-diagnostics").removeAttribute("disabled")
    if document.querySelector("#btn-sensors"): document.querySelector("#btn-sensors").removeAttribute("disabled")


try:
    document.querySelector("#btn-forward").onclick = lambda e: add_move("forward")
    document.querySelector("#btn-back").onclick = lambda e: add_move("back")
    document.querySelector("#btn-left").onclick = lambda e: add_move("left")
    document.querySelector("#btn-right").onclick = lambda e: add_move("right")
    document.querySelector("#btn-remove").onclick = remove_selected
    document.querySelector("#btn-clear").onclick = clear_all
    
    proxy_drag = create_proxy(save_state)
    document.querySelector("#move-listbox").addEventListener("dragend", proxy_drag)

    connect_proxy = create_proxy(lambda e: asyncio.ensure_future(connect_motor(e)))
    document.querySelector("#btn-connect").addEventListener("click", connect_proxy)

    begin_proxy = create_proxy(lambda e: asyncio.ensure_future(run_sequence(e)))
    document.querySelector("#btn-begin").addEventListener("click", begin_proxy)

    load_state()
    update_status()

except Exception as e:
    print_term(f"Initialization Error: {str(e)}", color="red")

finally:
    loader = document.getElementById("loading-screen")
    if loader:
        loader.classList.add("fade-out")