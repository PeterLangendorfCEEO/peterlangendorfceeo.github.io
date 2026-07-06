from pyodide.ffi import create_proxy
from pyscript import document, window
import random
import asyncio
import json

ENGINE_FAILURE_CHANCE = 10

def print_term(message, color="lime"):
    terminal = document.querySelector("#terminal")
    terminal.innerHTML += f"<span style='color:{color};'>{message}</span><br>"
    terminal.scrollTop = terminal.scrollHeight

# --- UI State Management ---
def add_move(move):
    listbox = document.querySelector("#move-listbox")
    option = document.createElement("option")
    option.text = move
    option.value = move
    listbox.add(option)
    save_state()

def remove_last(event):
    listbox = document.querySelector("#move-listbox")
    if listbox.options.length > 0:
        listbox.remove(listbox.options.length - 1)
        save_state()

def clear_all(event):
    document.querySelector("#move-listbox").innerHTML = ""
    save_state()

document.querySelector("#btn-forward").onclick = lambda e: add_move("forward")
document.querySelector("#btn-back").onclick = lambda e: add_move("back")
document.querySelector("#btn-left").onclick = lambda e: add_move("left")
document.querySelector("#btn-right").onclick = lambda e: add_move("right")
document.querySelector("#btn-remove").onclick = remove_last
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
    moves = [listbox.options.item(i).value for i in range(listbox.options.length)]
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

# --- Hardware Execution ---
async def execute_sequence(event):
    save_state()
    listbox = document.querySelector("#move-listbox")
    move_set = [listbox.options.item(i).value for i in range(listbox.options.length)]
    settings = json.loads(window.localStorage.getItem("cyber_settings"))
    
    print_term("Triggering Web Bluetooth Pairing Menu...", color="yellow")
    
    # Call the JavaScript Bluetooth function directly
    connected = await window.legoBluetooth.connectHub()
    if not connected:
        print_term("Connection failed or cancelled.", color="red")
        return

    print_term("Motors Connected! Executing sequence...", color="#00ffcc")
    await asyncio.sleep(1)
    
    for move in move_set:
        left_failed = False
        right_failed = False
        
        # Engine Failure Logic
        if random.randint(1, 100) <= ENGINE_FAILURE_CHANCE:
            if random.randint(1, 2) == 1:
                left_failed = True
                print_term("! SYSTEM ALERT: Left Motor Breach !", color="red")
            else:
                right_failed = True
                print_term("! SYSTEM ALERT: Right Motor Breach !", color="red")

        print_term(f"Executing: {move.upper()}")

        if move == "forward":
            if not left_failed: window.legoBluetooth.runMotor("LEFT", int(settings["forward_speed"]), 864)
            if not right_failed: window.legoBluetooth.runMotor("RIGHT", -int(settings["forward_speed"]), 864) # Inverse polarity for right motor
            
        elif move == "back":
            if not left_failed: window.legoBluetooth.runMotor("LEFT", -int(settings["backward_speed"]), 900)
            if not right_failed: window.legoBluetooth.runMotor("RIGHT", int(settings["backward_speed"]), 900)
            
        elif move == "left":
            # To turn left, spin left motor backwards, right motor forwards
            turn_degrees = abs(int(settings["left_angle"])) * 3 # Arbitrary ratio to map UI angle to motor rotation
            speed = int(settings["left_speed"])
            if not left_failed: window.legoBluetooth.runMotor("LEFT", -speed, turn_degrees)
            if not right_failed: window.legoBluetooth.runMotor("RIGHT", -speed, turn_degrees)
            
        elif move == "right":
            # To turn right, spin left motor forwards, right motor backwards
            turn_degrees = abs(int(settings["right_angle"])) * 3
            speed = int(settings["right_speed"])
            if not left_failed: window.legoBluetooth.runMotor("LEFT", speed, turn_degrees)
            if not right_failed: window.legoBluetooth.runMotor("RIGHT", speed, turn_degrees)

        # Wait for physical execution before sending the next command
        await asyncio.sleep(3) 

    print_term("Robot move sequence complete!")

proxy = create_proxy(lambda e: asyncio.ensure_future(execute_sequence(e)))
document.querySelector("#btn-run").addEventListener("click", proxy)

load_state()