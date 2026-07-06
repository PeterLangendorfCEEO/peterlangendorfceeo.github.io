from pyodide.ffi import create_proxy
from pyscript import document, window
import random
import asyncio
import json

ENGINE_FAILURE_CHANCE = 10

DIR_CW = 0
DIR_CCW = 1

def print_term(message, color="lime"):
    terminal = document.querySelector("#terminal")
    terminal.innerHTML += f"<span style='color:{color};'>{message}</span><br>"
    terminal.scrollTop = terminal.scrollHeight

# --- UI State Management ---
def add_move(move):
    listbox = document.querySelector("#move-listbox")
    
    # Create the new custom list element
    item = document.createElement("div")
    item.className = "list-item"
    item.draggable = True
    item.innerText = move.lower()
    
    listbox.appendChild(item)
    save_state()

def remove_selected(event):
    # Now targets the highlighted element instead of just the last one in the list
    selected_items = document.querySelectorAll(".list-item.selected")
    if selected_items.length > 0:
        for i in range(selected_items.length):
            selected_items.item(i).remove()
        save_state()

def clear_all(event):
    document.querySelector("#move-listbox").innerHTML = ""
    save_state()

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
    
    # Read the custom div's innerText
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

# Force Python to re-save the move sequence whenever a drag-and-drop ends
proxy_drag = create_proxy(save_state)
document.querySelector("#move-listbox").addEventListener("dragend", proxy_drag)

# --- Hardware Execution ---
async def execute_sequence(event):
    save_state()
    listbox = document.querySelector("#move-listbox")
    
    # Read the text directly out of the reordered list
    move_set = [listbox.children.item(i).innerText.lower() for i in range(listbox.children.length)]
    settings = json.loads(window.localStorage.getItem("cyber_settings"))

    print_term("Triggering Web Bluetooth Pairing Menu...", color="yellow")

    connected = await window.legoBluetooth.connectHub()
    if not connected:
        print_term("Connection failed or cancelled.", color="red")
        return

    print_term("Motors connected and handshake complete! Executing sequence...", color="#00ffcc")
    await asyncio.sleep(1)

    LEFT = window.legoBluetooth.MOTOR_BITS_LEFT
    RIGHT = window.legoBluetooth.MOTOR_BITS_RIGHT

    for move in move_set:
        left_failed = False
        right_failed = False

        if random.randint(1, 100) <= ENGINE_FAILURE_CHANCE:
            if random.randint(1, 2) == 1:
                left_failed = True
                print_term("! SYSTEM ALERT: Left Motor Breach !", color="red")
            else:
                right_failed = True
                print_term("! SYSTEM ALERT: Right Motor Breach !", color="red")

        print_term(f"Executing: {move.upper()}")

        try:
            if move == "forward":
                left_task = None
                if not left_failed:
                    # Fire left motor in the background (Non-blocking)
                    left_task = asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, int(settings["forward_speed"]), DIR_CW, 864))
                    # 100ms delay prevents the Bluetooth radio from dropping packets
                    await asyncio.sleep(0.1) 
                    
                if not right_failed:
                    # Await right motor (Blocking)
                    await window.legoBluetooth.runMotorForDegrees(RIGHT, int(settings["forward_speed"]), DIR_CCW, 864)
                    
                # Ensure the left motor is also completely finished before moving to the next sequence item
                if left_task: await left_task

            elif move == "back":
                left_task = None
                if not left_failed:
                    left_task = asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, int(settings["backward_speed"]), DIR_CCW, 900))
                    await asyncio.sleep(0.1)
                if not right_failed:
                    await window.legoBluetooth.runMotorForDegrees(RIGHT, int(settings["backward_speed"]), DIR_CW, 900)
                if left_task: await left_task

            elif move == "left":
                turn_degrees = abs(int(settings["left_angle"])) * 3
                speed = int(settings["left_speed"])
                left_task = None
                if not left_failed:
                    left_task = asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, speed, DIR_CW, turn_degrees))
                    await asyncio.sleep(0.1)
                if not right_failed:
                    await window.legoBluetooth.runMotorForDegrees(RIGHT, speed, DIR_CW, turn_degrees)
                if left_task: await left_task

            elif move == "right":
                turn_degrees = abs(int(settings["right_angle"])) * 3
                speed = int(settings["right_speed"])
                left_task = None
                if not left_failed:
                    left_task = asyncio.ensure_future(window.legoBluetooth.runMotorForDegrees(LEFT, speed, DIR_CCW, turn_degrees))
                    await asyncio.sleep(0.1)
                if not right_failed:
                    await window.legoBluetooth.runMotorForDegrees(RIGHT, speed, DIR_CCW, turn_degrees)
                if left_task: await left_task

        except Exception as e:
            print_term(f"Command failed or timed out: {e}", color="red")

        await asyncio.sleep(0.5)

    print_term("Robot move sequence complete!")

proxy = create_proxy(lambda e: asyncio.ensure_future(execute_sequence(e)))
document.querySelector("#btn-run").addEventListener("click", proxy)

load_state()

# Hide the boot screen once Python is fully ready
document.getElementById("loading-screen").classList.add("fade-out")