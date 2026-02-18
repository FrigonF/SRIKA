import time
import threading

# DRIVER CHECK
try:
    import vgamepad as vg
    HAS_VGJ = True
except ImportError:
    HAS_VGJ = False
    print("[DRIVER_ERROR] 'vgamepad' library not found. pip install vgamepad", flush=True)

class XboxAdapter:
    def __init__(self):
        self.gamepad = None
        self.active_buttons = set()
        self.state = {} # key -> { 'pressed': bool, 'time': float }
        self.cooldowns = {}
        
        # CONFIGURATION
        self.MIN_HOLD = 0.01
        self.COOLDOWN = 0.0

        if HAS_VGJ:
            self._init_controller()
            if not self.gamepad:
                # Start a background retry if it failed (maybe driver just installed)
                threading.Thread(target=self._retry_init, daemon=True).start()

    def _init_controller(self):
        try:
            self.gamepad = vg.VX360Gamepad()
            print("[CONTROLLER] Virtual Xbox 360 Controller CREATE SUCCESS", flush=True)
            return True
        except Exception as e:
            error_msg = str(e)
            print(f"[DRIVER_ERROR] Controller Init Failed: {error_msg}", flush=True)
            if "vigem" in error_msg.lower() or "not found" in error_msg.lower():
                print("[DRIVER_ERROR] CRITICAL: ViGEmBus Driver not found. Please run ViGEmBusSetup.exe as ADMIN.", flush=True)
            return False

    def _retry_init(self):
        # Retry every 5 seconds for 1 minute
        for _ in range(12):
            if self.gamepad: break
            time.sleep(5)
            if self._init_controller():
                print("[CONTROLLER] Virtual Controller CONNECTED on retry.", flush=True)
                break

    def update(self, active_tokens):
        if not self.gamepad: return

        now = time.time()
        active_set = set(t.lower() for t in active_tokens)

        # 1. PROCESS ANALOG AXES (Racing / Smooth Movement)
        # Reset axes to neutral initially unless held
        steer_val = 0.0
        accel_val = 0.0
        brake_val = 0.0

        for token in active_set:
            if token.startswith('steer:'):
                try:
                    steer_val = float(token.split(':')[1])
                except: pass
            elif token == 'accel':
                accel_val = 1.0
            elif token == 'brake':
                brake_val = 1.0

        # Apply Analog State
        self.gamepad.left_joystick_float(x_value_float=steer_val, y_value_float=0.0)
        self.gamepad.right_trigger_float(value_float=accel_val)
        self.gamepad.left_trigger_float(value_float=brake_val)

        # 2. PROCESS BUTTON PRESSES (Digital)
        for token in active_set:
            if token.startswith('steer:') or token in ['accel', 'brake']:
                continue
            
            btn = self._resolve_button(token)
            if not btn: continue

            # Init State
            if token not in self.state:
                self.state[token] = { 'pressed': False, 'time': 0 }
            
            st = self.state[token]
            last_release = self.cooldowns.get(token, 0)
            
            # REMOVED PULSING: Only press if not currently pressed and not in cooldown
            if not st['pressed'] and now >= last_release:
                self.gamepad.press_button(button=btn)
                st['pressed'] = True
                st['time'] = now
                print(f"[CONTROLLER] PRESS {token.upper()}", flush=True)
        
        # 3. PROCESS BUTTON RELEASES
        for token, st in list(self.state.items()):
            if not st['pressed']: continue
            if token.startswith('steer:') or token in ['accel', 'brake']:
                continue

            is_active = token in active_set
            duration = now - st['time']
            
            # Standard Release Pattern (No Safety Timeout)
            if not is_active and duration > self.MIN_HOLD:
                btn = self._resolve_button(token)
                if btn:
                    self.gamepad.release_button(button=btn)
                    st['pressed'] = False
                    self.cooldowns[token] = now + self.COOLDOWN
                    print(f"[CONTROLLER] RELEASE {token.upper()}", flush=True)
        
        self.gamepad.update() # Single update call at the end for performance

    def _resolve_button(self, name):
        name = name.upper()
        
        # Generic Mapping (Presets should return these tokens)
        mapping = {
            'A': vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
            'B': vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
            'X': vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
            'Y': vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
            'LB': vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER,
            'RB': vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER,
            'START': vg.XUSB_BUTTON.XUSB_GAMEPAD_START,
            'BACK': vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK,
            'UP': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP,
            'DOWN': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN,
            'LEFT': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT,
            'RIGHT': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT,
            'GUIDE': vg.XUSB_BUTTON.XUSB_GAMEPAD_GUIDE,
        }
        
        return mapping.get(name)

# Singleton
xbox_adapter = XboxAdapter()
