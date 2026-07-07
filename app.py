from pyodide.ffi import create_proxy
from pyscript import document, window
import random
import asyncio
import json

ENGINE_FAILURE_CHANCE = 10
DIR_CW = 0
DIR_CCW = 1
TURN_MULTIPLIER = 1.7

is_connected = False

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
        pass # Silently catch DOM errors so it doesn't crash the proxy loop

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
        # If the local storage is fully corrupted, wipe it.
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
    
    btn_diag = document.querySelector("#btn-diagnostics")
    if btn_diag:
        btn_diag.setAttribute("disabled", "true")

    save_state()
    listbox = document.querySelector("#move-listbox")
    move_set = [listbox.children.item(i).innerText.lower() for i in range(listbox.children.length)]
    
    try:
        settings = json.loads(window.localStorage.getItem("cyber_settings"))
    except:
        print_term("Critical Error: Payload memory corrupted.", color="red")
        return

    print_term("Executing sequence...", color="#00ffcc")
    
    if hasattr(window, 'startTelemetry'):
        window.startTelemetry()
    
    await asyncio.sleep(1)

    LEFT = window.legoBluetooth.MOTOR_BITS_LEFT
    RIGHT = window.legoBluetooth.MOTOR_BITS_RIGHT

    for move in move_set:
        left_failed = False
        right_failed = False

        if random.randint(1, 100) <= ENGINE_FAILURE_CHANCE:
            if random.randint(1, 2) == 1: left_failed = True
            else: right_failed = True

        try:
            tasks = []
            
            if move == "forward":
                if not left_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, int(settings.get("forward_speed", 100)), DIR_CW, 864, not right_failed)))
                if not right_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(RIGHT, int(settings.get("forward_speed", 100)), DIR_CCW, 864, True)))

            elif move == "back":
                if not left_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, int(settings.get("backward_speed", 100)), DIR_CCW, 900, not right_failed)))
                if not right_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(RIGHT, int(settings.get("backward_speed", 100)), DIR_CW, 900, True)))

            elif move == "left":
                turn_degrees = int(abs(float(settings.get("left_angle", -90))) * TURN_MULTIPLIER)
                speed = int(settings.get("left_speed", 10))
                if not left_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, speed, DIR_CW, turn_degrees, not right_failed)))
                if not right_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(RIGHT, speed, DIR_CW, turn_degrees, True)))

            elif move == "right":
                turn_degrees = int(abs(float(settings.get("right_angle", 90))) * TURN_MULTIPLIER)
                speed = int(settings.get("right_speed", 10))
                if not left_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, speed, DIR_CCW, turn_degrees, not right_failed)))
                if not right_failed: tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(RIGHT, speed, DIR_CCW, turn_degrees, True)))

            for t in tasks:
                await t

        except Exception as e:
            print_term(f"Command failed or timed out: {e}", color="red")

        await asyncio.sleep(0.5)

    print_term("Robot move sequence complete!")
    
    if btn_diag:
        btn_diag.removeAttribute("disabled")


# --- Safe Boot Sequence ---
try:
    # 1. Bind UI buttons
    document.querySelector("#btn-forward").onclick = lambda e: add_move("forward")
    document.querySelector("#btn-back").onclick = lambda e: add_move("back")
    document.querySelector("#btn-left").onclick = lambda e: add_move("left")
    document.querySelector("#btn-right").onclick = lambda e: add_move("right")
    document.querySelector("#btn-remove").onclick = remove_selected
    document.querySelector("#btn-clear").onclick = clear_all
    
    # 2. Attach Proxies
    proxy_drag = create_proxy(save_state)
    document.querySelector("#move-listbox").addEventListener("dragend", proxy_drag)

    connect_proxy = create_proxy(lambda e: asyncio.ensure_future(connect_motor(e)))
    document.querySelector("#btn-connect").addEventListener("click", connect_proxy)

    begin_proxy = create_proxy(lambda e: asyncio.ensure_future(run_sequence(e)))
    document.querySelector("#btn-begin").addEventListener("click", begin_proxy)

    # 3. Initialize State
    load_state()
    update_status()

except Exception as e:
    print_term(f"Initialization Error: {str(e)}", color="red")

finally:
    # 4. Guarantee the loading screen is dismissed even if a setup error occurs!
    loader = document.getElementById("loading-screen")
    if loader:
        loader.classList.add("fade-out")