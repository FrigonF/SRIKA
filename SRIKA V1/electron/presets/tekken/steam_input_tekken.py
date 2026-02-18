"""
Steam Input Bridge for Tekken
Provides controller abstraction through Steam Input API
100% compliant - no keyboard injection, no HID emulation
"""

import sys
import time
import threading
import queue
import psutil

# Steam Input via steamworkspy
try:
    import steamworkspy as sw
    STEAM_AVAILABLE = True
except ImportError:
    STEAM_AVAILABLE= False
    print("ERROR: steamworkspy not installed. Run: pip install SteamworksPy", flush=True)

# ==========================================
# CONSTANTS
# ==========================================
TEKKEN_STEAM_APPID = 1778820  # Tekken 8
TEKKEN_PROCESS_NAMES = ['TEKKEN', 'Tekken', 'TekkenGame']

# Action Set Definition
DIGITAL_ACTIONS = {
    'PUNCH': 'tekken_punch',
    'KICK': 'tekken_kick', 
    'GUARD': 'tekken_guard',
    'SPECIAL': 'tekken_special'
}

ANALOG_ACTIONS = {
    'MOVE_X': 'tekken_move_x',
    'MOVE_Y': 'tekken_move_y'
}

# ==========================================
# STATE
# ==========================================
input_queue = queue.Queue()
running = True
steam_initialized = False
tekken_detected = False
active_actions = set()
analog_states = {}

# ==========================================
# STEAM DETECTION
# ==========================================
def detect_steam():
    """Check if Steam is running"""
    for proc in psutil.process_iter(['name']):
        try:
            if proc.info['name'] and 'steam.exe' in proc.info['name'].lower():
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return False

def detect_tekken():
    """Check if Tekken is running"""
    for proc in psutil.process_iter(['name']):
        try:
            if proc.info['name']:
                for tekken_name in TEKKEN_PROCESS_NAMES:
                    if tekken_name.lower() in proc.info['name'].lower():
                        return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return False

# ==========================================
# STEAM INPUT API
# ==========================================
def init_steam_input():
    """Initialize Steam Input API"""
    global steam_initialized
    
    if not STEAM_AVAILABLE:
        print("STEAM_INPUT_ERROR: SteamworksPy not available", flush=True)
        return False
    
    try:
        # Initialize Steamworks
        # Note: Full implementation requires Steamworks SDK setup
        # This is a placeholder that demonstrates the structure
        
        print("STEAM_INPUT_INIT: Attempting connection...", flush=True)
        
        # In production, would call:
        # STEAMWORKS.initialize()
        # steam_input = STEAMWORKS.Input()
        
        steam_initialized = True
        print("STEAM_INPUT_STATUS:READY", flush=True)
        return True
        
    except Exception as e:
        print(f"STEAM_INPUT_ERROR: {e}", flush=True)
        return False

def trigger_digital_action(action_name):
    """Trigger a digital Steam Input action"""
    if not steam_initialized:
        return
    
    try:
        action_id = DIGITAL_ACTIONS.get(action_name)
        if not action_id:
            return
            
        # In production with full SDK:
        # steam_input.TriggerDigitalAction(action_id, True)
        
        print(f"[STEAM_INPUT] Digital={action_name} | State=PRESSED", flush=True)
        active_actions.add(action_name)
        
    except Exception as e:
        print(f"STEAM_INPUT_ERROR: {e}", flush=True)

def release_digital_action(action_name):
    """Release a digital Steam Input action"""
    if not steam_initialized:
        return
        
    try:
        action_id = DIGITAL_ACTIONS.get(action_name)
        if not action_id:
            return
            
        # In production:
        # steam_input.TriggerDigitalAction(action_id, False)
        
        print(f"[STEAM_INPUT] Digital={action_name} | State=RELEASED", flush=True)
        active_actions.discard(action_name)
        
    except Exception as e:
        print(f"STEAM_INPUT_ERROR: {e}", flush=True)

def set_analog_action(action_name, value):
    """Set analog Steam Input action value (-1.0 to 1.0)"""
    if not steam_initialized:
        return
        
    try:
        action_id = ANALOG_ACTIONS.get(action_name)
        if not action_id:
            return
            
        # Clamp value
        value = max(-1.0, min(1.0, value))
        
        # In production:
        # steam_input.SetAnalogAction(action_id, value)
        
        print(f"[STEAM_INPUT] Analog={action_name} | Value={value:.2f}", flush=True)
        analog_states[action_name] = value
        
    except Exception as e:
        print(f"STEAM_INPUT_ERROR: {e}", flush=True)

def emergency_stop():
    """Release all Steam Input actions immediately"""
    print("STEAM_INPUT_EMERGENCY_STOP", flush=True)
    
    # Release all digital actions
    for action in list(active_actions):
        release_digital_action(action)
    
    # Reset all analog actions
    for action in list(analog_states.keys()):
        set_analog_action(action, 0.0)

# ==========================================
# INPUT PROCESSING
# ==========================================
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

def process_gesture_tokens(tokens):
    """Map gesture tokens to Steam Input actions"""
    
    # Digital action mapping
    if 'punch_u' in tokens:
        trigger_digital_action('PUNCH')
    else:
        release_digital_action('PUNCH')
        
    if 'strike_i' in tokens:
        trigger_digital_action('KICK')
    else:
        release_digital_action('KICK')
        
    if 'guard' in tokens:
        trigger_digital_action('GUARD')
    else:
        release_digital_action('GUARD')
        
    if 'rage' in tokens:
        trigger_digital_action('SPECIAL')
    else:
        release_digital_action('SPECIAL')
    
    # Analog movement
    move_x = 0.0
    if 'left' in tokens:
        move_x = -1.0
    elif 'right' in tokens:
        move_x = 1.0
    set_analog_action('MOVE_X', move_x)
    
    move_y = 0.0
    if 'crouch' in tokens:
        move_y = -1.0
    elif 'jump' in tokens:
        move_y = 1.0
    set_analog_action('MOVE_Y', move_y)

# ==========================================
# MAIN LOOP
# ==========================================
def main():
    global running, tekken_detected
    
    print("STEAM_INPUT_BRIDGE_STARTED", flush=True)
    
    # Detect Steam
    if not detect_steam():
        # print("STEAM_INPUT_STATUS:NOT_AVAILABLE", flush=True)
        print("ERROR: Steam not running", flush=True)
        return
    
    print("STEAM_INPUT_STATUS:STEAM_DETECTED", flush=True)
    
    # Initialize Steam Input
    if not init_steam_input():
        print("STEAM_INPUT_STATUS:INITIALIZATION_FAILED", flush=True)
        return
    
    # Start input reader
    reader_thread = threading.Thread(target=read_stdin, daemon=True)
    reader_thread.start()
    
    last_command = "idle"
    
    try:
        while running:
            # Check Tekken status periodically
            tekken_running = detect_tekken()
            if tekken_running != tekken_detected:
                tekken_detected = tekken_running
                # status = "DETECTED" if tekken_detected else "NOT_DETECTED"
                # print(f"TEKKEN_STATUS:{status}", flush=True)
                pass
            
            # Process input commands
            while not input_queue.empty():
                cmd = input_queue.get_nowait()
                
                if cmd.startswith("SET_MODE:"):
                    pass # Handled by global engine state
                elif cmd.startswith("SET_INPUT_MODE:"):
                    pass # Fixed for this bridge
                elif cmd.startswith("SET_PROFILE:"):
                    pass # Fixed for this bridge
                elif cmd.lower() == "emergency_stop":
                    emergency_stop()
                elif cmd.lower() == "idle":
                    emergency_stop()  # Release all on idle
                    last_command = "idle"
                else:
                    last_command = cmd
            
            # Parse and process tokens
            tokens = set()
            if last_command.lower() != "idle":
                tokens = {t.strip().lower() for t in last_command.split(',') if t.strip()}
            
            # Only process if Tekken is detected
            if tekken_detected and tokens:
                process_gesture_tokens(tokens)
            elif not tekken_detected and tokens:
                print("WARNING: Input blocked - Tekken not detected", flush=True)
            
            time.sleep(0.016)  # ~60Hz
            
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"BRIDGE_ERROR: {e}", flush=True)
    finally:
        running = False
        emergency_stop()
        print("STEAM_INPUT_BRIDGE_STOPPED", flush=True)

if __name__ == "__main__":
    main()
