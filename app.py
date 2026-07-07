from pyodide.ffi import create_proxy, to_js
from pyscript import document, window
import random
import asyncio
import time
import json

ENGINE_FAILURE_CHANCE = 10
DIR_CW = 0
DIR_CCW = 1

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
    update_status()

def remove_selected(event):
    selected_items = document.querySelectorAll(".list-item.selected")
    if selected_items.length > 0:
        for i in range(selected_items.length):
            selected_items.item(i).remove()
        update_status()

def clear_all(event):
    listbox = document.querySelector("#move-listbox")
    if listbox: listbox.innerHTML = ""
    update_status()

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
    
    # Wait for Claude's Javascript to capture the Zero Angle
    await asyncio.sleep(1)

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

    listbox = document.querySelector("#move-listbox")
    move_set = [listbox.children.item(i).innerText.lower() for i in range(listbox.children.length)]

    settings = {
        "forward_speed": document.querySelector("#fwd_spd").value,
        "backward_speed": document.querySelector("#bck_spd").value,
        "right_speed": document.querySelector("#rgt_spd").value,
        "left_speed": document.querySelector("#lft_spd").value,
        "right_angle": document.querySelector("#rgt_ang").value,
        "left_angle": document.querySelector("#lft_ang").value,
    }

    print_term("Executing sequence...", color="#00ffcc")
    
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
            if move in ["forward", "back"]:
                commands = []
                if move == "forward":
                    speed = int(settings.get("forward_speed", 100))
                    if not left_failed: commands.append({"bitMask": LEFT, "speedPercent": speed, "direction": DIR_CW, "degrees": 864})
                    if not right_failed: commands.append({"bitMask": RIGHT, "speedPercent": speed, "direction": DIR_CCW, "degrees": 864})
                    if hasattr(window, 'setCurrentTargetSpeeds'): window.setCurrentTargetSpeeds(speed, speed)

                elif move == "back":
                    speed = int(settings.get("backward_speed", 100))
                    if not left_failed: commands.append({"bitMask": LEFT, "speedPercent": speed, "direction": DIR_CCW, "degrees": 900})
                    if not right_failed: commands.append({"bitMask": RIGHT, "speedPercent": speed, "direction": DIR_CW, "degrees": 900})
                    if hasattr(window, 'setCurrentTargetSpeeds'): window.setCurrentTargetSpeeds(-speed, -speed)

                if len(commands) > 0:
                    js_commands = to_js(commands, dict_converter=window.Object.fromEntries)
                    await window.legoBluetooth.runForDegreesSynced(js_commands)

            elif move in ["left", "right"]:
                target_offset = float(settings.get(f"{move}_angle", -90 if move=="left" else 90))
                speed = int(settings.get(f"{move}_speed", 10))
                
                active_bitmask = 0
                if not left_failed: active_bitmask |= LEFT
                if not right_failed: active_bitmask |= RIGHT
                
                if hasattr(window, 'setCurrentTargetSpeeds'): window.setCurrentTargetSpeeds(speed, speed)

                if active_bitmask > 0:
                    turn_dir = DIR_CW if move == "left" else DIR_CCW
                    
                    # TRUE CLOSED-LOOP IMU TURN
                    start_angle = window.legoBluetooth.getAngle()
                    if start_angle is None:
                        print_term("Error: IMU data unavailable. Cannot complete turn.", color="red")
                    else:
                        target_angle = window.legoBluetooth.normalizeAngle(start_angle + target_offset)
                        
                        tasks = []
                        tasks.append(asyncio.ensure_future(window.legoBluetooth.runMotorContinuous(active_bitmask, speed, turn_dir)))
                        for t in tasks: await t
                        
                        start_time = time.time()
                        while True:
                            current = window.legoBluetooth.getAngle()
                            if current is None: break
                            
                            error = abs(window.legoBluetooth.normalizeAngle(current - target_angle))
                            
                            if error < 7.5: break
                            if time.time() - start_time > 15:
                                print_term(f"Turn timeout! Error: {error:.1f}deg", color="orange")
                                break
                            await asyncio.sleep(0.02)
                        
                        # Hit the brakes
                        await window.legoBluetooth.stopMotor(active_bitmask)

        except Exception as e:
            print_term(f"Command failed or timed out: {e}", color="red")

        await asyncio.sleep(0.5)

    window.currentMoveLabel = "IDLE"
    if hasattr(window, 'setCurrentTargetSpeeds'): window.setCurrentTargetSpeeds(0, 0)
    if hasattr(window, 'stopRecording'): window.stopRecording()
    print_term("Robot move sequence complete!")
    
    if document.querySelector("#btn-diagnostics"): document.querySelector("#btn-diagnostics").removeAttribute("disabled")
    if document.querySelector("#btn-sensors"): document.querySelector("#btn-sensors").removeAttribute("disabled")


try:
    window.localStorage.removeItem("cyber_settings")
    window.localStorage.removeItem("cyber_moves")

    document.querySelector("#btn-forward").onclick = lambda e: add_move("forward")
    document.querySelector("#btn-back").onclick = lambda e: add_move("back")
    document.querySelector("#btn-left").onclick = lambda e: add_move("left")
    document.querySelector("#btn-right").onclick = lambda e: add_move("right")
    document.querySelector("#btn-remove").onclick = remove_selected
    document.querySelector("#btn-clear").onclick = clear_all
    
    connect_proxy = create_proxy(lambda e: asyncio.ensure_future(connect_motor(e)))
    document.querySelector("#btn-connect").addEventListener("click", connect_proxy)

    begin_proxy = create_proxy(lambda e: asyncio.ensure_future(run_sequence(e)))
    document.querySelector("#btn-begin").addEventListener("click", begin_proxy)

    update_status()

except Exception as e:
    print_term(f"Initialization Error: {str(e)}", color="red")

finally:
    loader = document.getElementById("loading-screen")
    if loader:
        loader.classList.add("fade-out")