import sys
import time
import threading
import queue
import ctypes
import psutil

# Accessibility Input using pywinauto
try:
    import pywinauto
    from pywinauto import Application
    PYWINAUTO_AVAILABLE = True
except ImportError:
    PYWINAUTO_AVAILABLE = False
    print("WARNING: pywinauto not available. Install: pip install pywinauto", flush=True)

# ==========================================
# CONSTANTS & STATE
# ==========================================
input_queue = queue.Queue()
running = True
active_backend = "NONE"  # "STEAM_INPUT" | "ACCESSIBILITY" | "NONE"
steam_process = None
focused_window = None

# ==========================================
# Threaded Input Reader
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

# ==========================================
# BACKEND DETECTION
# ==========================================
def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except:
        return False

def detect_steam():
    """Check if Steam is running"""
    for proc in psutil.process_iter(['name']):
        try:
            if proc.info['name'] and 'steam.exe' in proc.info['name'].lower():
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return False

def select_backend():
    """Priority: Steam Input > Accessibility > None"""
    global active_backend
    
    # Check Steam first
    if detect_steam():
        active_backend = "STEAM_INPUT"
        print("BACKEND_SELECTED:STEAM_INPUT", flush=True)
        print("INFO: Steam detected. Using Steam Input API (when available)", flush=True)
        return
    
    # Fallback to Accessibility
    if PYWINAUTO_AVAILABLE:
        active_backend = "ACCESSIBILITY"
        print("BACKEND_SELECTED:ACCESSIBILITY", flush=True)
        print("INFO: Using Windows UI Automation (limited compatibility)", flush=True)
        return
    
    # No compatible backend
    active_backend = "NONE"
    print("BACKEND_SELECTED:NONE", flush=True)
    print("WARNING: No compatible input backend available", flush=True)

# ==========================================
# INPUT HANDLERS
# ==========================================
def send_via_accessibility(tokens):
    """Send input via Windows UI Automation (pywinauto)"""
    if not PYWINAUTO_AVAILABLE:
        return
    
    try:
        # Get focused window
        from pywinauto import Desktop
        desktop = Desktop(backend="uia")
        focused = desktop.windows()[0] if desktop.windows() else None
        
        if not focused:
            return
        
        # Map tokens to keyboard keys
        for token in tokens:
            key = token.lower()
            # Send as keyboard input to focused window
            # This uses UI Automation, not raw injection
            try:
                focused.type_keys(key, pause=0.01, with_spaces=False)
                print(f"[ACCESSIBILITY] Key={key} | Mode=PRESS", flush=True)
            except Exception as e:
                # Silently fail if window doesn't accept input
                pass
                
    except Exception as e:
        print(f"ACCESSIBILITY_ERROR: {e}", flush=True)

def send_via_steam_input(tokens):
    """Placeholder for Steam Input API integration"""
    # NOTE: Requires Steamworks SDK + SteamworksPy bindings
    # This is a placeholder for future Steam Input integration
    print(f"[STEAM_INPUT] Actions={','.join(tokens)} | Status=NOT_IMPLEMENTED", flush=True)
    print("INFO: Steam Input API requires Steamworks SDK. See implementation plan.", flush=True)

# ==========================================
# Main Loop
# ==========================================
def main():
    global running
    
    print("SRIKA_COMPLIANCE_BRIDGE_STARTED", flush=True)
    
    # Admin check
    admin_status = "TRUE" if is_admin() else "FALSE"
    print(f"ADMIN_STATUS:{admin_status}", flush=True)
    
    # Detect backend
    select_backend()
    
    # Start Input Reader
    reader_thread = threading.Thread(target=read_stdin, daemon=True)
    reader_thread.start()

    last_command = "idle"
    
    try:
        while running:
            # Process input commands
            while not input_queue.empty():
                cmd = input_queue.get_nowait()
                
                if cmd.startswith("REDETECT_BACKEND"):
                    select_backend()
                elif cmd.lower() != "idle":
                    last_command = cmd
            
            # Parse tokens
            tokens = set()
            if last_command.lower() != "idle":
                tokens = {t.strip().lower() for t in last_command.split(',') if t.strip()}
            
            # Route to appropriate backend
            if tokens and active_backend == "STEAM_INPUT":
                send_via_steam_input(tokens)
            elif tokens and active_backend == "ACCESSIBILITY":
                send_via_accessibility(tokens)
            elif tokens and active_backend == "NONE":
                print("WARNING: Input blocked - no compatible backend", flush=True)
            
            # Reset on idle
            if last_command.lower() == "idle":
                # Nothing to release in accessibility mode
                pass
            
            time.sleep(0.05)  # Lower frequency for accessibility

    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"BRIDGE_ERROR: {e}", flush=True)
    finally:
        running = False
        print("BRIDGE_STOPPED", flush=True)

if __name__ == "__main__":
    main()
