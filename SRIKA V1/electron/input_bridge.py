"""
SRIKA Unified Input Bridge (Compliance-First)
Supports Steam Input for Games and Accessibility for Apps.
Zero anti-cheat risk. 
"""

import sys
import os
import time
import threading
import queue
import ctypes
import psutil

# ==========================================
# LOGGING (SAFE)
# ==========================================
def log_to_file(msg):
    try:
        log_path = os.path.join(os.path.dirname(__file__), 'bridge.log')
        with open(log_path, 'a') as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except (PermissionError, IOError):
        # Fallback to stdout if file is locked (prevents crash)
        print(f"LOG_FALLBACK: {msg}", flush=True)

log_to_file("SRIKA Bridge Starting...")
log_to_file(f"Python: {sys.version}")
log_to_file(f"CWD: {os.getcwd()}")
log_to_file(f"PID: {os.getpid()}")

# ==========================================
# STEAM API HACK
# ==========================================
try:
    # Use site-packages directly if available
    try:
        from steamworks.methods import STEAMWORKS
        STEAMWORKS_CLASS = STEAMWORKS
        STEAM_AVAILABLE = True
    except:
        STEAM_AVAILABLE = False
except Exception:
    STEAM_AVAILABLE = False

# ==========================================
# ACCESSIBILITY (pywinauto)
# ==========================================
try:
    import pywinauto
    from pywinauto import Desktop
    PYWINAUTO_AVAILABLE = True
except ImportError:
    PYWINAUTO_AVAILABLE = False

# ==========================================
# STATE & CONFIG
# ==========================================
input_queue = queue.Queue()
running = True
active_backend = "ACCESSIBILITY" # Default
active_profile = "asphalt" # Standard fallback

# Backends
try:
    from xbox_adapter import xbox_adapter
except Exception:
    xbox_adapter = None

# Dynamic Preset Discovery
logic_registry = {}

def load_presets():
    global logic_registry
    preset_dir = os.path.join(os.path.dirname(__file__), 'presets')
    if not os.path.exists(preset_dir):
        print(f"[BRIDGE] Preset directory not found: {preset_dir}", flush=True)
        return
        
    for d in os.listdir(preset_dir):
        path = os.path.join(preset_dir, d)
        if os.path.isdir(path):
            logic_file = os.path.join(path, 'logic.py')
            if os.path.exists(logic_file):
                try:
                    import importlib.util
                    spec = importlib.util.spec_from_file_location(f"preset_{d}", logic_file)
                    mod = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(mod)
                    if hasattr(mod, 'logic'):
                        logic_registry[d] = mod.logic
                        print(f"[BRIDGE] Loaded preset: {d}", flush=True)
                except Exception as e:
                    print(f"[BRIDGE] Failed to load preset {d}: {e}", flush=True)

load_presets()

# Steam State
steam_api = None
steam_input = None
tekken_pid = None

# ==========================================
# ==========================================
# BACKEND DETECTION
# ==========================================
def detect_steam_app():
    """Detect if target game (Tekken) is running and return its PID"""
    global tekken_pid
    tekken_names = ['Polaris-Win64-Shipping', 'TEKKEN 8', 'TEKKEN', 'TekkenGame']
    for proc in psutil.process_iter(['name', 'pid']):
        try:
            name = proc.info['name'] or ""
            for tn in tekken_names:
                if tn.lower() in name.lower():
                    pid = proc.info['pid']
                    if pid != tekken_pid:
                        # console.log equivalent
                        print(f"TEKKEN_PID_FOUND:{pid}", flush=True)
                    tekken_pid = pid
                    return True
        except: pass
    tekken_pid = None
    return False

def select_best_backend():
    global active_backend, steam_api
    
    # 0. ALWAYS PREFER VIRTUAL CONTROLLER IF DRIVER IS WORKING
    if xbox_adapter and xbox_adapter.gamepad:
        active_backend = "VIRTUAL_CONTROLLER"
        print("[BRIDGE] Backend Selected: VIRTUAL_CONTROLLER", flush=True)
        return
        
    # 1. Try Steam Input if game is running and API available
    app_running = detect_steam_app()
    if STEAM_AVAILABLE and app_running:
        try:
            if not steam_api:
                # Create steam_appid.txt
                if not os.path.exists("steam_appid.txt"):
                    with open("steam_appid.txt", "w") as f:
                        f.write("1778820") # Tekken 8
                
                # Attempt to initialize
                if hasattr(steamworks, 'STEAMWORKS'):
                    steam_api = steamworks.STEAMWORKS()
                elif hasattr(steamworks, 'steamworks') and hasattr(steamworks.steamworks, 'STEAMWORKS'):
                    steam_api = steamworks.steamworks.STEAMWORKS()
                
                if steam_api:
                    steam_api.initialize()
            
            active_backend = "STEAM_INPUT"
            print("BACKEND_SELECTED:STEAM_INPUT", flush=True)
            print("STEAM_INPUT_STATUS:READY", flush=True)
            return
        except: pass
        
    # 2. Fallback to Accessibility
    if PYWINAUTO_AVAILABLE:
        active_backend = "ACCESSIBILITY"
        if app_running:
             print(f"BACKEND_SELECTED:ACCESSIBILITY (Game Detected PID={tekken_pid})", flush=True)
        else:
             print("BACKEND_SELECTED:ACCESSIBILITY", flush=True)
    else:
        active_backend = "NONE"
        print("BACKEND_SELECTED:NONE", flush=True)

# ==========================================
# ACCESS CONTROL
# ==========================================
# Add srika_native to path to import AccessClient
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from srika_native.managers.access_client import AccessClient

access_client = AccessClient()
demo_remaining = 60.0
last_frame_time = time.time()
session_expired = False

# ==========================================
# INPUT EXECUTION
# ==========================================
def execute_input(tokens):
    global session_expired, active_backend
    
    if session_expired:
        return # Input blocked

    # Silent execution for speed
    if active_backend == "VIRTUAL_CONTROLLER" and xbox_adapter:
        try:
            xbox_adapter.update(tokens)
        except Exception as e:
             print(f"XBOX_ERROR: {e}", flush=True)
            
    elif active_backend == "ACCESSIBILITY":
        try:
            from action_manager import action_manager
            action_manager.update(tokens)
        except Exception as e:
            print(f"ACTION_MANAGER_ERROR: {e}", flush=True)
        
    elif active_backend == "STEAM_INPUT" and steam_api:
        try:
            for t in tokens:
                action = t.upper()
                # Standardized Steam Mapping
                steam_map = {
                    'X': 'tekken_punch', 
                    'Y': 'tekken_kick',
                    'RB': 'tekken_guard'
                }
                
                if action in steam_map:
                    action_id = steam_map[action]
                    if hasattr(steam_api, 'Input'): 
                        steam_api.Input().TriggerDigitalAction(action_id, True)
                        print(f"[STEAM_INPUT] Digital={action_id} | State=PRESSED", flush=True)
                # Movement
                elif action in ['LEFT', 'RIGHT']:
                    val = -1.0 if action == 'LEFT' else 1.0
                    print(f"[STEAM_INPUT] Analog=MOVE_X | Value={val}", flush=True)
        except Exception as e:
            print(f"STEAM_EXEC_ERROR: {e}", flush=True)
            
    elif active_backend == "ACCESSIBILITY":
        try:
            from action_manager import action_manager
            action_manager.update(tokens)
        except Exception as e:
            print(f"ACTION_MANAGER_ERROR: {e}", flush=True)

# ==========================================
# SYSTEM THREADS
# ==========================================
def read_input():
    global running
    while running:
        try:
            line = sys.stdin.readline()
            if not line: break
            input_queue.put(line.strip())
        except:
            break

def main():
    print("SRIKA_INPUT_BRIDGE_STARTED", flush=True)
    
    # IMMEDIATE CHECK: VIGEMBUS (Force Controller Creation)
    # This triggers the Windows "Device Connected" Sound if successful.
    global active_backend
    try:
        if xbox_adapter and xbox_adapter.gamepad:
            print("[BRIDGE] Virtual Controller: CREATED (Sound should play)", flush=True)
            active_backend = "VIRTUAL_CONTROLLER"
    except ImportError:
        print("[BRIDGE] Virtual Controller: DRIVER MISSING (vgamepad)", flush=True)
    except Exception as e:
        print(f"[BRIDGE] Virtual Controller: FAILED ({e})", flush=True)

    admin_status = 'TRUE' if ctypes.windll.shell32.IsUserAnAdmin() != 0 else 'FALSE'
    print(f"ADMIN_STATUS:{admin_status}", flush=True)
    
    # Note: select_best_backend() might override this if Tekken not running?
    # No, we want controller ALWAYS if available, per user request.
    # So we skip select_best_backend() unless we need Steam Input.
    
    detect_steam_app() # Just to update PID log
    
    threading.Thread(target=read_input, daemon=True).start()
    
    global last_frame_time, demo_remaining, session_expired
    last_command = "idle"
    last_status_time = 0
    
    try:
        while running:
            current_time = time.time()
            delta_time = current_time - last_frame_time
            last_frame_time = current_time

            # Refresh detection every 5 minutes (300 seconds)
            if current_time - last_status_time > 300.0:
                last_status_time = current_time
                # DISABLED: We force Virtual Controller at startup, don't override it
                # select_best_backend()
                # BROADCAST STATUS
                # TEKKEN_STATUS and STEAM_INPUT_STATUS logs removed as per user request
                
                # PLAN STATUS BROADCAST
                limits = access_client.get_session_limits()
                if not limits['allowed']:
                     print("ACCESS_STATUS:LOCKED", flush=True)
                elif limits['plan'] == 'FREE':
                     print(f"ACCESS_STATUS:FREE|DEMO_LEFT:{int(demo_remaining)}", flush=True)
                else:
                     print("ACCESS_STATUS:PAID", flush=True)

                # Logs removed
                
            while not input_queue.empty():
                cmd = input_queue.get_nowait()
                if cmd.lower() == "idle":
                    execute_input([]) # Force release
                elif cmd.startswith("SET_PROFILE:"):
                    active_profile = cmd.replace("SET_PROFILE:", "").strip()
                    print(f"[BRIDGE] Active Profile Sync: {active_profile}", flush=True)
                elif cmd.startswith("SET_SETTINGS:"):
                    try:
                        import json
                        payload = cmd.replace("SET_SETTINGS:", "").strip()
                        new_settings = json.loads(payload)
                        
                        # Update active logic
                        logic = logic_registry.get(active_profile)
                        if not logic and "-official" in active_profile:
                            logic = logic_registry.get(active_profile.replace("-official", ""))
                        
                        if logic:
                            for k, v in new_settings.items():
                                # Conversion: steerSensitivity -> STEER_SENSITIVITY
                                attr_name = "".join([f"_{c.lower()}" if c.isupper() else c for c in k]).upper()
                                if hasattr(logic, attr_name):
                                    setattr(logic, attr_name, v)
                                    print(f"[BRIDGE] Updated {attr_name} = {v}", flush=True)
                                elif hasattr(logic, k):
                                    setattr(logic, k, v)
                                    print(f"[BRIDGE] Updated {k} = {v}", flush=True)
                    except Exception as e:
                        print(f"SET_SETTINGS_ERROR: {e}", flush=True)
                elif cmd.startswith("RAW_LM:"):
                    # DEBUG: Print every 100 frames to avoid spam
                    if not hasattr(main, 'lm_count'): main.lm_count = 0
                    main.lm_count += 1
                    
                    try:
                        import json
                        payload = json.loads(cmd[7:])
                        pose_lm = payload.get('pose', [])
                        hands_lm = payload.get('hands', [])
                        handedness_lm = payload.get('handedness', [])
                        
                        # Route by Active Profile
                        tokens = []
                        logic = logic_registry.get(active_profile)
                        if not logic:
                            # Fallback chain for Beta
                            logic = logic_registry.get("asphalt") or logic_registry.get("tekken")
                            
                        if logic:
                            tokens = logic.process(pose_lm, hands_lm, handedness_lm)
                            
                        if tokens:
                            # 1. ALWAYS Relay back to UI for "Recent Actions"
                            print(f"G_ACTION:{','.join(tokens)}", flush=True)
                            
                            # 2. Execute via Active Backend
                            execute_input(tokens)
                        elif main.lm_count % 30 == 0:
                             # Faster Heartbeat (1s at 30fps)
                             print(f"DEBUG: Bridge active | Backend={active_backend} | Count={main.lm_count}", flush=True)
                    except Exception as e:
                        print(f"LOGIC_ERROR: {e}", flush=True)
                elif cmd.startswith("CMD:VERIFY:"):
                     # Handle Verification
                     jwt = cmd.replace("CMD:VERIFY:", "").strip()
                     result = access_client.verify_user(jwt)
                     if result.get('allowed'):
                         demo_remaining = float(result.get('demo_seconds') or 60.0)
                         session_expired = False
                         print(f"VERIFY_RESULT:ALLOWED|PLAN:{result.get('plan')}", flush=True)
                     else:
                         print("VERIFY_RESULT:DENIED", flush=True)
                else:
                    # Execute IMMEDIATELY when received
                    if access_client.is_verified and not session_expired:
                        tokens = [t.strip() for t in cmd.split(',') if t.strip()]
                        if tokens:
                            print(f"G_ACTION:{','.join(tokens)}", flush=True)
                            execute_input(tokens)
                
            time.sleep(0.005) # Faster loop for responsiveness
            
    except KeyboardInterrupt: pass
    finally:
        print("BRIDGE_STOPPED", flush=True)

if __name__ == "__main__":
    main()
