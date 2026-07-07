from pyodide.ffi import create_proxy
from pyscript import document, window
import random
import asyncio
import json
import time

ENGINE_FAILURE_CHANCE = 10
TURN_TOLERANCE = 7.5

DIR_CW = 0
DIR_CCW = 1

is_connected = False
zero_angle = 0

def get_angle():
    # Grabs the yaw live from the JavaScript bridge
    raw_yaw = window.legoBluetooth.yaw
    if raw_yaw is None: raw_yaw = 0
        
    angle = (raw_yaw / 10) - zero_angle
    if angle > 0: angle = angle - 360
    angle = (angle + 180) * -1
    if angle < 0: angle = angle + 180
    elif angle > 0: angle = angle - 180
    return round(angle, 1)

def normalize_angle(angle):
    if angle > 180: return angle - 360
    elif angle < -180: return angle + 360
    else: return angle

def print_term(message, color="lime"):
    terminal = document.querySelector("#terminal")
    terminal.innerHTML += f"<span style='color:{color};'>{message}</span><br>"
    terminal.scrollTop = terminal.scrollHeight

def set_status(message, color="lime"):
    terminal = document.querySelector("#terminal")
    terminal.innerHTML = f"<span style='color:{color};'>{message}</span><br>"

def update_status():
    listbox = document.querySelector("#move-listbox")
    if listbox.children.length == 0:
        set_status("Add a move to begin...")
    elif not is_connected:
        set_status("Connect a motor to begin...")
    else:
        set_status("Ready to execute!", color="#00ffcc")

def add_move(move):
    listbox = document.querySelector("#move-listbox")
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
    document.querySelector("#move-listbox").innerHTML = ""
    save_state()
    update_status()

document.querySelector("#btn-forward").onclick = lambda e: add_move("forward")
document.querySelector("#btn-back").onclick = lambda e: add_move("back")
document.querySelector("#btn-left").onclick = lambda e: add_move("left")
document.querySelector("#btn-right").onclick = lambda e: add_move("right")
document.querySelector("#btn-remove").onclick = remove_selected
document.querySelector("#btn-clear").onclick = clear_all

def save_state(*args):
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

def load_state():
    saved_settings = window.localStorage.getItem("cyber_settings")
    saved_moves = window.localStorage.getItem("cyber_moves")
    if saved_settings:
        settings = json.loads(saved_settings)
        document.querySelector("#fwd_spd").value = settings.get("forward_speed", 100)
        document.querySelector("#rgt_spd").value = settings.get("right_speed", 10)
        document.querySelector("#rgt_ang").value = settings.get("right_angle", 90)
        document.querySelector("#lft_spd").value = settings.get("left_speed", 10)
        document.querySelector("#lft_ang").value = settings.get("left_angle", -90)
        document.querySelector("#bck_spd").value = settings.get("backward_speed", 100)
    if saved_moves:
        moves = json.loads(saved_moves)
        for move in moves:
            add_move(move)

proxy_drag = create_proxy(save_state)
document.querySelector("#move-listbox").addEventListener("dragend", proxy_drag)

# --- Hardware Execution ---
async def connect_motor(event):
    global is_connected
    global zero_angle
    print_term("Triggering Web Bluetooth Pairing Menu...", color="yellow")
    
    device_name = await window.legoBluetooth.connectHub()
    
    if not device_name or device_name == False:
        print_term("Connection failed or cancelled.", color="red")
        is_connected = False
        document.querySelector("#btn-begin").disabled = True
        return

    is_connected = True
    print_term(f"Handshake complete! Bound to {device_name}.", color="#00ffcc")
    document.querySelector("#btn-begin").disabled = False
    
    hw_id = document.getElementById("hardware-id")
    hw_id.innerText = str(device_name).upper()
    hw_id.style.color = "var(--neon-cyan)"

    # Zero the IMU on connection
    await asyncio.sleep(1)
    raw_yaw = window.legoBluetooth.yaw
    zero_angle = raw_yaw / 10 if raw_yaw else 0

async def run_sequence(event):
    if not is_connected:
        update_status()
        return

    save_state()
    listbox = document.querySelector("#move-listbox")
    move_set = [listbox.children.item(i).innerText.lower() for i in range(listbox.children.length)]
    settings = json.loads(window.localStorage.getItem("cyber_settings"))

    print_term("Executing sequence...", color="#00ffcc")
    await asyncio.sleep(1)

    LEFT = window.legoBluetooth.MOTOR_BITS_LEFT
    RIGHT = window.legoBluetooth.MOTOR_BITS_RIGHT

    for move in move_set:
        left_failed = False
        right_failed = False

        if random.randint(1, 100) <= ENGINE_FAILURE_CHANCE:
            if random.randint(1, 2) == 1: left_failed = True
            else: right_failed = True

        print_term(f"Executing: {move.upper()}")

        try:
            if move in ["forward", "back"]:
                tasks = []
                if move == "forward":
                    if not left_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, int(settings["forward_speed"]), DIR_CW, 864)))
                    if not right_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(RIGHT, int(settings["forward_speed"]), DIR_CCW, 864)))
                elif move == "back":
                    if not left_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, int(settings["backward_speed"]), DIR_CCW, 900)))
                    if not right_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(RIGHT, int(settings["backward_speed"]), DIR_CW, 900)))
                for t in tasks: await t

            elif move in ["left", "right"]:
                # --- IMU CLOSED-LOOP TURNING ---
                turn_degrees = float(settings[f"{move}_angle"])
                speed = int(settings[f"{move}_speed"])
                
                left_dir = DIR_CW if move == "left" else DIR_CCW
                right_dir = DIR_CW if move == "left" else DIR_CCW

                starting_angle = get_angle()
                target_angle = normalize_angle(starting_angle + turn_degrees)

                # 1. Start continuous rotation
                tasks = []
                if not left_failed: 
                    tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorContinuous(LEFT, speed, left_dir)))
                if not right_failed: 
                    tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorContinuous(RIGHT, speed, right_dir)))
                for t in tasks: await t

                # 2. Polling loop
                start_time = time.time()
                while True:
                    current_angle = get_angle()
                    error = abs(normalize_angle(current_angle - target_angle))
                    
                    if error < TURN_TOLERANCE:
                        break
                        
                    if time.time() - start_time > 5.0:
                        print_term(f"Turn timed out! Target: {target_angle}, Current: {current_angle}", color="orange")
                        break
                        
                    # Yield thread to allow JS to process background BLE packets
                    await asyncio.sleep(0.02) 

                # 3. Halt the motors
                await window.legoBluetooth.stopMotor(LEFT | RIGHT)

        except Exception as e:
            print_term(f"Command failed or timed out: {e}", color="red")

        await asyncio.sleep(0.5)

    print_term("Robot move sequence complete!")

connect_proxy = create_proxy(lambda e: asyncio.ensure_future(connect_motor(e)))
document.querySelector("#btn-connect").addEventListener("click", connect_proxy)

begin_proxy = create_proxy(lambda e: asyncio.ensure_future(run_sequence(e)))
document.querySelector("#btn-begin").addEventListener("click", begin_proxy)

load_state()
update_status()

document.getElementById("loading-screen").classList.add("fade-out")