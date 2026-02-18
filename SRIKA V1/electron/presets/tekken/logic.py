import math
import time

class ControllerLogic:
    def __init__(self):
        # Configuration (Identical to TypeScript)
        self.MIN_ELBOW_ANGLE = 110
        self.PUNCH_THRESHOLD = -0.55
        self.KICK_THRESHOLD = -0.50
        self.BURST_THRESHOLD = -0.50
        
        # Debounce/Cooldown
        self.last_action_time = 0
        self.ACTION_COOLDOWN = 0.25 # 250ms between hits
        
        # Smoothing
        self.Z_SMOOTHING = 0.4
        
        # State
        self.last_landmarks = None
        self.last_time = 0
        self.velocities = {
            'lWristZ': 0, 'rWristZ': 0, 
            'lKneeY': 0, 'rKneeY': 0,
            'lWristY': 0, 'rWristY': 0
        }
        self.velocity_history = {
            'lGlobalZ': [], 'rGlobalZ': [],
            'lGlobalY': [], 'rGlobalY': [],
            'lUpY': [], 'rUpY': []
        }

    def process(self, pose_lm, hands_lm=[], handedness_lm=[]):
        """
        Process raw landmarks and return a list of active tokens (u, i, j, k, p)
        """
        landmarks = pose_lm
        now = time.time()
        dt = now - self.last_time
        if dt <= 0: dt = 0.016 # Fallback to 60fps
        self.last_time = now

        if not self.last_landmarks:
            self.last_landmarks = landmarks
            return []

        # 1. Update Physics
        self._update_physics(landmarks, dt)
        self.last_landmarks = landmarks

        # 2. Peak Detection
        def get_peak(key):
            buff = self.velocity_history.get(key, [])
            return min(buff) if buff else 0

        peakL_Punch = get_peak('lGlobalZ')
        peakR_Punch = get_peak('rGlobalZ')
        peakL_Up = get_peak('lUpY')
        peakR_Up = get_peak('rUpY')
        peakL_Kick = get_peak('lGlobalY')
        peakR_Kick = get_peak('rGlobalY')

        # 2.5 Diagnostic (Log if motion detected)
        max_energy = max(abs(peakL_Punch), abs(peakR_Punch), abs(peakL_Kick), abs(peakR_Kick))
        if max_energy > 0.4:
            print(f"PRESET_DEBUG: Energy={max_energy:.2f} | Thr={self.PUNCH_THRESHOLD}", flush=True)

        # 3. Global Dominance Duel
        lArmEnergy = abs(peakL_Punch)
        rArmEnergy = abs(peakR_Punch)
        lLegEnergy = abs(peakL_Kick)
        rLegEnergy = abs(peakR_Kick)
        hBurstEnergy = max(abs(peakL_Up), abs(peakR_Up))

        winnerEnergy = max(lArmEnergy, rArmEnergy, lLegEnergy, rLegEnergy, hBurstEnergy)
        
        # 4. Anatomical Gates
        lElbowAngle = self._calculate_angle(landmarks[11], landmarks[13], landmarks[15])
        rElbowAngle = self._calculate_angle(landmarks[12], landmarks[14], landmarks[16])

        # 5. Mapping with Cooldown
        tokens = []
        if winnerEnergy > 0 and (now - self.last_action_time) > self.ACTION_COOLDOWN:
            if hBurstEnergy == winnerEnergy and hBurstEnergy > abs(self.BURST_THRESHOLD):
                activeWrist = landmarks[15] if abs(peakL_Up) > abs(peakR_Up) else landmarks[16]
                if activeWrist['z'] > -0.25:
                    tokens.append('RB') # Heat Burst
                    self.last_action_time = now
            elif lArmEnergy == winnerEnergy and peakL_Punch < self.PUNCH_THRESHOLD and lElbowAngle > self.MIN_ELBOW_ANGLE:
                tokens.append('X') # LP
                self.last_action_time = now
            elif rArmEnergy == winnerEnergy and peakR_Punch < self.PUNCH_THRESHOLD and rElbowAngle > self.MIN_ELBOW_ANGLE:
                tokens.append('Y') # RP
                self.last_action_time = now
            elif lLegEnergy == winnerEnergy and peakL_Kick < self.KICK_THRESHOLD:
                tokens.append('A') # LK
                self.last_action_time = now
            elif rLegEnergy == winnerEnergy and peakR_Kick < self.KICK_THRESHOLD:
                tokens.append('B') # RK
                self.last_action_time = now

        return tokens

    def _update_physics(self, landmarks, dt):
        # indices: 15=L_Wrist, 16=R_Wrist, 25=L_Knee, 26=R_Knee
        # indices: 11=L_Shoulder, 13=L_Elbow, 12=R_Shoulder, 14=R_Elbow
        
        rawLZ = (landmarks[15]['z'] - self.last_landmarks[15]['z']) / dt
        rawRZ = (landmarks[16]['z'] - self.last_landmarks[16]['z']) / dt
        rawLY = (landmarks[25]['y'] - self.last_landmarks[25]['y']) / dt
        rawRY = (landmarks[26]['y'] - self.last_landmarks[26]['y']) / dt
        rawLUpY = (landmarks[15]['y'] - self.last_landmarks[15]['y']) / dt
        rawRUpY = (landmarks[16]['y'] - self.last_landmarks[16]['y']) / dt

        # Low-Pass Filtered Velocity
        lZ = self.velocities['lWristZ'] * (1 - self.Z_SMOOTHING) + rawLZ * self.Z_SMOOTHING
        rZ = self.velocities['rWristZ'] * (1 - self.Z_SMOOTHING) + rawRZ * self.Z_SMOOTHING
        lY = self.velocities['lKneeY'] * 0.7 + rawLY * 0.3 # Y is usually cleaner
        rY = self.velocities['rKneeY'] * 0.7 + rawRY * 0.3
        lUp = self.velocities['lWristY'] * 0.7 + rawLUpY * 0.3
        rUp = self.velocities['rWristY'] * 0.7 + rawRUpY * 0.3

        self.velocities = {
            'lWristZ': lZ, 'rWristZ': rZ, 
            'lKneeY': lY, 'rKneeY': rY,
            'lWristY': lUp, 'rWristY': rUp
        }

        def update_buff(key, val):
            buff = self.velocity_history[key]
            buff.append(val)
            if len(buff) > 3: buff.pop(0)

        update_buff('lGlobalZ', lZ)
        update_buff('rGlobalZ', rZ)
        update_buff('lGlobalY', lY)
        update_buff('rGlobalY', rY)
        update_buff('lUpY', lUp)
        update_buff('rUpY', rUp)

    def _calculate_angle(self, a, b, c):
        v1 = [a['x']-b['x'], a['y']-b['y'], a['z']-b['z']]
        v2 = [c['x']-b['x'], c['y']-b['y'], c['z']-b['z']]
        
        dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2]
        mag1 = math.sqrt(v1[0]**2 + v1[1]**2 + v1[2]**2)
        mag2 = math.sqrt(v2[0]**2 + v2[1]**2 + v2[2]**2)
        
        if mag1 == 0 or mag2 == 0: return 0
        
        cos_angle = dot / (mag1 * mag2)
        cos_angle = max(-1.0, min(1.0, cos_angle))
        
        return math.degrees(math.acos(cos_angle))

logic = ControllerLogic()
