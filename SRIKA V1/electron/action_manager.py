import time
import threading
try:
    import directks as dx
    HAS_DX = True
except:
    HAS_DX = False

import winsound # For audible confirmation

class ActionManager:
    def __init__(self):
        # State: 'pressed': bool, 'time': float (press time), 'released_time': float
        self.state = {} 
        self.cooldowns = {} # key -> timestamp when available again
        
        # CONFIGURATION
        self.MIN_HOLD = 0.08    # 80ms Minimum Hold (Phase 3 Requirement)
        self.COOLDOWN = 0.2     # 200ms Cooldown (Phase 5 Requirement)

        # Mappings
        self.KEY_MAP = {
            'u': dx.DIK_U, 'i': dx.DIK_I, 'k': dx.DIK_K, 'j': dx.DIK_J,
            ';': dx.DIK_SEMICOLON,
            'w': dx.DIK_W, 'a': dx.DIK_A, 's': dx.DIK_S, 'd': dx.DIK_D,
            'left': dx.DIK_A, 'right': dx.DIK_D,
            'punch_u': dx.DIK_U, 'strike_i': dx.DIK_I, 'guard': dx.DIK_K
        } if HAS_DX else {}

        if HAS_DX:
            print("[AM] DirectKS: AVAILABLE", flush=True)
        else:
            print("[AM] DirectKS: MISSING - ACTIONS WILL FAIL", flush=True)

    def update(self, active_tokens):
        if not HAS_DX:
            print("[AM] Ignored update (No DirectKS)", flush=True)
            return
        
        now = time.time()
        active_set = set(t.lower() for t in active_tokens)
        
        # 1. PROCESS PRESSES (Edge Trigger)
        for token in active_set:
            scancode = self.KEY_MAP.get(token)
            if not scancode: continue
            
            # Init State
            if token not in self.state:
                self.state[token] = { 'pressed': False, 'time': 0 }
            
            st = self.state[token]
            last_release = self.cooldowns.get(token, 0)
            
            # TRIGGER CONDITION:
            # 1. Not currently pressed
            # 2. Cooldown expired (now > last_release)
            if not st['pressed'] and now > last_release:
                dx.PressKey(scancode)
                st['pressed'] = True
                st['time'] = now
                
                # FEEDBACK (Phase 3)
                print(f"[ACTION] PRESS {token.upper()}", flush=True)
                # winsound.Beep(1000, 50) # 1kHz, 50ms beep (Async? No, blocks. Use small duration or thread)
                # Threading beep to avoid blocking loop
                threading.Thread(target=winsound.Beep, args=(1000, 30)).start()

        # 2. PROCESS RELEASES (Min Hold Decoupling)
        for token, st in self.state.items():
            if not st['pressed']: continue
            
            # RELEASE CONDITION:
            # 1. Min Hold Duration Passed
            # 2. (Token is GONE from active_set) OR (Force release after Max Hold? No, allow long hold for movement)
            
            duration = now - st['time']
            is_active = token in active_set
            
            # If signals stops, we only release IF duration > MIN_HOLD
            # If signal continues, we keep holding (Good for WASD)
            
            if not is_active and duration > self.MIN_HOLD:
                scancode = self.KEY_MAP.get(token)
                if scancode:
                    dx.ReleaseKey(scancode)
                    st['pressed'] = False
                    self.cooldowns[token] = now + self.COOLDOWN
                    print(f"[ACTION] RELEASE {token.upper()} (Held {int(duration*1000)}ms)", flush=True)

action_manager = ActionManager()
