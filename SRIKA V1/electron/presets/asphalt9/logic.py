import math
import time

class ControllerLogic:
    def __init__(self):
        # Configuration
        self.STEER_DEADZONE = 0.02    # Micro-deadzone for precision
        self.STEER_SENSITIVITY = 0.35 # Balanced: responsive but not twitchy
        self.CURVE_POWER = 1.4        # Slightly more linear response
        self.THROTTLE_ON_THRESHOLD = 0.16
        self.THROTTLE_OFF_THRESHOLD = 0.08
        
        # Stability Buffers (Number of frames needed to confirm gesture)
        self.BUFFER_THRESHOLD = 3 
        
        # State
        self.smoothed_steer = 0.0
        self.was_holding_wheel = False
        self.last_steer = 0.0
        self.last_throttle = 0.0
        
        # Gesture Counters
        self.nitro_frames = 0
        self.brake_frames = 0
        self.NITRO_BUFFER = 5 # Require sustained gesture
        self.BRAKE_BUFFER = 5 # Require sustained gesture
        
    def process(self, pose_lm, hands_lm=[], handedness_lm=[]):
        """
        Process pose and hand landmarks.
        hands_lm is a list of lists (up to 2 hands, 21 points each)
        """
        tokens = []
        
        # --- LAYER 1: GESTURE DETECTION ---
        l_wrist = pose_lm[15]
        r_wrist = pose_lm[16]
        l_shoulder = pose_lm[11]
        r_shoulder = pose_lm[12]
        
        # 1. Steering (Non-Linear Power Curve)
        raw_dy = l_wrist['y'] - r_wrist['y']
        norm_steer = -(raw_dy / self.STEER_SENSITIVITY)
        norm_steer = max(-1.0, min(1.0, norm_steer))
        
        # Apply Exponential Curve
        sign = 1.0 if norm_steer >= 0 else -1.0
        curved_steer = sign * (abs(norm_steer) ** self.CURVE_POWER)
        
        if abs(curved_steer) < self.STEER_DEADZONE:
            curved_steer = 0.0
            
        self.smoothed_steer += (curved_steer - self.smoothed_steer) * 0.40 # Responsive smoothing
        final_steer = self.smoothed_steer

        # --- SCALE FACTOR ---
        torso_size = self._get_distance(l_shoulder, r_shoulder)
        if torso_size < 0.05: torso_size = 0.3

        # 2. Key Hand Gestures (Nitro & Brake)
        raw_nitro_signal = False
        raw_brake_signal = False
        
        if hands_lm and len(hands_lm) > 0:
            for i, hand in enumerate(hands_lm):
                # 1. Calculate Robust Palm Size
                wrist = hand[0]
                mcp_indices = [5, 9, 13, 17] 
                palm_scale = sum(self._get_distance(wrist, hand[k]) for k in mcp_indices) / 4
                if palm_scale < 0.01: continue
                
                # 2. Key Landmarks
                thumb_tip = hand[4]
                index_mcp = hand[5]
                tips = [hand[8], hand[12], hand[16], hand[20]]
                mcps = [hand[5], hand[9], hand[13], hand[17]]
                
                # 3. Gesture Math
                avg_fold = sum(self._get_distance(tips[j], mcps[j]) for j in range(4)) / 4
                fold_ratio = avg_fold / palm_scale
                
                # NITRO: Tucked Fist + Thumb Flared (Any Hand) - STRICTER
                tip_to_index_scale = self._get_distance(thumb_tip, index_mcp) / palm_scale
                tip_to_wrist_scale = self._get_distance(thumb_tip, wrist) / palm_scale
                # Require very deliberate thumb extension
                thumb_extended = tip_to_index_scale > 1.50 and tip_to_wrist_scale > 1.70
                fingers_closed = fold_ratio < 0.40
                
                if fingers_closed and thumb_extended:
                    raw_nitro_signal = True
                
                # BRAKE: Open Palm (LEFT Hand Only) - STRICTER
                # Filter by X-position relative to shoulders to be sure it's the LEFT physical hand
                hand_x = wrist['x']
                is_left_physical = hand_x < (l_shoulder['x'] + r_shoulder['x']) / 2
                
                # Open Palm: require very flat hand
                is_open_palm = fold_ratio > 0.95
                
                if is_left_physical and is_open_palm:
                    raw_brake_signal = True
        
        # 4. Buffers
        if raw_nitro_signal: self.nitro_frames += 1
        else: self.nitro_frames = 0
            
        if raw_brake_signal: self.brake_frames += 1
        else: self.brake_frames = 0
            
        nitro_active = self.nitro_frames >= self.NITRO_BUFFER
        brake_active = self.brake_frames >= self.BRAKE_BUFFER
        
        # 5. Throttle
        l_dist = self._get_distance(l_wrist, l_shoulder)
        r_dist = self._get_distance(r_wrist, r_shoulder)
        avg_dist = (l_dist + r_dist) / 2
        
        if self.was_holding_wheel:
            if avg_dist < self.THROTTLE_OFF_THRESHOLD: self.was_holding_wheel = False
        else:
            if avg_dist > self.THROTTLE_ON_THRESHOLD: self.was_holding_wheel = True
        
        accel_signal = self.was_holding_wheel and not (brake_active or nitro_active)

        # --- LAYER 2: INTENT RESOLVER ---
        self.last_steer = final_steer
        
        if brake_active:
            tokens.append('B') # Standard Brake/Drift
            self.last_throttle = 0.0
        else:
            if nitro_active:
                tokens.append('A') # Standard Nitro
                self.last_throttle = 1.0
            elif accel_signal:
                tokens.append('ACCEL')
                self.last_throttle = 1.0
            else:
                self.last_throttle = 0.0

        # Final Formatting
        if abs(self.last_steer) > 0.01:
            tokens.append(f"steer:{self.last_steer:.2f}")

        # Debug logging
        if nitro_active or brake_active or abs(self.last_steer) > 0.3:
            print(f"PRESET_DEBUG: Racing Stick={self.last_steer:.2f} Nitro={nitro_active} Brake={brake_active}", flush=True)

        return tokens

    def _get_distance(self, p1, p2):
        return math.sqrt((p1['x'] - p2['x'])**2 + (p1['y'] - p2['y'])**2)

logic = ControllerLogic()
