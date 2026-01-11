import sys
import time
import threading
import queue

# Try importing vgamepad
try:
    import vgamepad as vg
    VGAMEPAD_AVAILABLE = True
except ImportError:
    VGAMEPAD_AVAILABLE = False
    print("ERROR: vgamepad library not found. Run 'pip install vgamepad'", flush=True)

# ==========================================
# CONSTANTS & MAPPING
# ==========================================
# We map the abstract keys sent by SRIKA (w, a, s, d, p, etc.) to Controller Inputs
# W -> Jump -> Button A
# S -> Crouch -> Stick Y -1.0
# A -> Left -> Stick X -1.0
# D -> Right -> Stick X 1.0
# P -> Power -> Button X
# K -> Kick/Low -> Button B
# I -> Air Combo -> Button Y
# U -> Special -> Right Trigger
# ; -> Rage -> Left Trigger

# ==========================================
# Threaded Input Reader
# ==========================================
# Reads stdin without blocking the main loop
input_queue = queue.Queue()
running = True

def read_stdin():
    global running
    while running:
        try:
            line = sys.stdin.readline()
            if not line:
                running = False
                break
            input_queue.put(line.strip())
        except:
            running = False
            break

# ==========================================
# Main Loop
# ==========================================
def main():
    global running
    
    # Initialization
    print("SRIKA_INPUT_BRIDGE_STARTED", flush=True)
    
    if not VGAMEPAD_AVAILABLE:
        print("BRIDGE_STOPPED: MISSING_DEPENDENCY", flush=True)
        return

    try:
        gamepad = vg.VX360Gamepad()
        print("VIRTUAL_CONTROLLER_CONNECTED", flush=True)
    except Exception as e:
        print(f"BRIDGE_ERROR: Failed to connect to ViGEmBus. Is it installed? {e}", flush=True)
        return

    # Start Input Reader
    reader_thread = threading.Thread(target=read_stdin, daemon=True)
    reader_thread.start()

    last_command = "idle" 
    
    # Active State Tracking
    # We reconstruct the controller state fresh every frame to ensure no stuck keys
    # This also handles the "release immediately when gesture ends" requirement naturally.

    try:
        while running:
            # Drain Queue to get latest state
            while not input_queue.empty():
                cmd = input_queue.get_nowait()
                if cmd.startswith("SET_MODE:"):
                    # SRIKA only has one mode now: CONTROLLER
                    pass 
                else:
                    last_command = cmd

            # --- 1. Reset Gamepad State ---
            gamepad.reset() # Clears all buttons, sticks, triggers to 0

            # --- 2. Parse Active Tokens ---
            # Input comes as "w,a,p" or "idle"
            tokens = set()
            if last_command.lower() != "idle":
                 tokens = {t.strip().lower() for t in last_command.split(',') if t.strip()}

            # --- 3. Apply Mappings ---
            
            # STICK CALCULATIONS
            stick_x = 0.0
            stick_y = 0.0

            if 'a' in tokens: stick_x -= 1.0
            if 'd' in tokens: stick_x += 1.0
            if 's' in tokens: stick_y -= 1.0 # Crouch is Down (-1.0)
            
            # Gamepad Joysticks (Float)
            if stick_x != 0.0 or stick_y != 0.0:
                gamepad.left_joystick_float(x_value_float=stick_x, y_value_float=stick_y)

            # BUTTON MAPPINGS
            # U: Front Punch -> Button X
            if 'u' in tokens: gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_X) 
            
            # I: Knee Up/Kick -> Button B
            if 'i' in tokens: gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_B)

            # P: Forearms Up -> Button Y (Strong/Air)
            if 'p' in tokens: gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_Y)

            # S: Crouch (Just Stick Down) - Handled above by 'stick_y' check if 's' in tokens
            
            # COMPLEX COMBOS (Gesture Engine sends these as distinct tokens for clarity)
            # J: Crouch + Punch -> Down + X
            if 'j' in tokens:
                stick_y = -1.0 # Force crouch
                gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_X)
            
            # K: Crouch + Knee -> Down + B
            if 'k' in tokens:
                stick_y = -1.0 # Force crouch
                gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_B)

            # W: Jump -> Button A (Legacy/Standard)
            if 'w' in tokens: gamepad.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_A)

            # Apply Stick Updates (Recalculate with potential overrides from J/K)
            if stick_x != 0.0 or stick_y != 0.0:
                gamepad.left_joystick_float(x_value_float=stick_x, y_value_float=stick_y)
            
            # TRIGGERS
            # if 'u' in tokens: ... Removed (U is now X)
            # ; -> Rage (Unchanged if needed, but not in new spec list explicitly, keeping legacy support or removing?)
            # Spec says "U, I, K, J, P, W, A, D, S". Rage ';' is not listed in "NEW CONTROL MAPPING".
            # I will keep ';' as Rage (Left Trigger) as a useful fallback unless it conflicts.
            if ';' in tokens: gamepad.left_trigger_float(value_float=1.0) 


            # --- 4. Send Report ---
            gamepad.update()

            # --- 5. Frequency Control ---
            # 60Hz - 100Hz is good for games.
            time.sleep(0.01) 

    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"BRIDGE_ERROR: {e}", flush=True)
    finally:
        running = False
        # Clean shutdown
        try:
            gamepad.reset()
            gamepad.update()
        except:
            pass

if __name__ == "__main__":
    main()
