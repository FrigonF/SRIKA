import type { NormalizedLandmarkList, NormalizedLandmark } from '@mediapipe/pose';
import { SystemState } from '../context/SrikaContext';
import { InputController } from './InputController';

// Control Keys
export type VirtualControl = 'U' | 'I' | 'K' | 'P' | ';' | 'A' | 'D' | 'W' | 'S' | 'J' | null;

export interface DetectionResult {
    intents: VirtualControl[];  // All detected controls
    confidence: number;         // Average/Max confidence
    state: SystemState;         // IDLE, TRACKING, etc.
    debug?: string;             // Reason for detection
}

class GestureEngine {
    // State tracking
    private lastLandmarks: NormalizedLandmarkList | null = null;
    private activeIntents: Set<VirtualControl> = new Set();
    private poseStableStartTime: number = 0;

    // Configuration
    private readonly CONFIDENCE_THRESHOLD = 65;
    private readonly ACTION_COOLDOWN_MS = 400;
    private readonly STABILITY_THRESHOLD_MS = 200; // Time to hold a static pose like Rage

    // Thresholds (Normalized 0-1)
    private readonly THRESHOLDS = {
        HIP_MOVE_X: 0.04,
        HIP_JUMP_Y: 0.05,
        HIP_CROUCH_Y: 0.05,
        WRIST_FORWARD_Z: -0.3, // Z becomes negative as it gets closer to camera
        ARM_EXTENSION: 0.15,
    };

    // --- DETECTORS ---

    private isFrontPunch(landmarks: NormalizedLandmarkList, nose: NormalizedLandmark): boolean {
        // U: One arm extends slightly forward/up. 
        // Logic: Wrist X/Y moves away from shoulder, or elbow angle opens.
        // Simplified Low-Fatigue: Wrist is significantly in front of Shoulder (Z-axis) OR
        // Wrist is extended laterally? No, Front Punch -> Z axis.
        // Let's use: Wrist.y is close to Shoulder.y (raised) AND Elbow angle > 100 deg?
        // Or simple: Hand is projected forward vs shoulder.

        // Fallback 2D: Wrist X is far from shoulder X (lateral punch) OR Wrist Y is high.
        // Let's try: One wrist is distinctly away from body center compared to the other?

        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        // Check extensions (Horizontal punch)
        const leftExt = Math.abs(leftWrist.x - leftShoulder.x);
        const rightExt = Math.abs(rightWrist.x - rightShoulder.x);

        // Threshold 0.2 is moderate extension (not full extension which is ~0.4)
        return (leftExt > 0.25 || rightExt > 0.25) && (leftWrist.y < landmarks[23].y && rightWrist.y < landmarks[24].y); // Hands above hips
    }

    private isKneeUp(landmarks: NormalizedLandmarkList): boolean {
        // I: Knee Lift. 
        // Check if Knee Y is significantly higher than Ankle Y relative to Hip? 
        // Or simply Knee Y is close to Hip Y.
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Threshold: Knee usually well below hip. If knee.y < hip.y + 0.3 (inverted Y)?
        // MediaPipe Y: 0 is top, 1 is bottom. 
        // Knee Up means Knee.y decreases (moves closer to Hip.y).

        // Normal stance: Knee is ~0.4 units below hip.
        // Knee Up: Knee is < 0.2 units below hip.
        const leftLift = (leftKnee.y - leftHip.y) < 0.25;
        const rightLift = (rightKnee.y - rightHip.y) < 0.25;

        return leftLift || rightLift;
    }

    private isForearmsUp(landmarks: NormalizedLandmarkList): boolean {
        // P: Both hands up near chest/face
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        // Hands above shoulders (Y value smaller) -> or just close to shoulder height?
        // Let's say: Wrists above (Shoulder.y + 0.1)
        return leftWrist.y < (leftShoulder.y + 0.1) && rightWrist.y < (rightShoulder.y + 0.1);
    }

    /**
     * Main detection loop
     */
    public process(landmarks: NormalizedLandmarkList | null, timestamp: number): DetectionResult {
        // 1. STATE: IDLE
        if (!landmarks || landmarks.length === 0) {
            this.reset();
            return { intents: [], confidence: 0, state: 'IDLE', debug: 'No landmarks' };
        }

        // 2. STATE: TRACKING
        let currentState: SystemState = 'TRACKING';
        let currentIntents: VirtualControl[] = [];
        let maxConfidence = 0;

        const hipCenter = this.getMidPoint(landmarks[23], landmarks[24]);
        const nose = landmarks[0];

        // --- RULE EVALUATION (FATIGUE REDUCED) ---

        // 1. MOVEMENT (A / D)
        // Use position relative to center frame or relative movement?
        // "Person moves left in frame" usually implies position check.
        // If hipCenter.x < 0.4 -> Left (A)
        // If hipCenter.x > 0.6 -> Right (D)
        if (hipCenter.x < 0.42) {
            currentIntents.push('A');
            maxConfidence = 80;
        } else if (hipCenter.x > 0.58) {
            currentIntents.push('D');
            maxConfidence = 80;
        }

        // 2. CROUCH (S)
        const isCrouched = (hipCenter.y - nose.y) < 0.45; // Height compress check
        // Or check absolute Hip Y if camera is fixed. 
        // Let's use dy (change) for jump, but absolute for crouch? 
        // Or "Head position lower than calibrated"? 
        // For robustness without calibration, we usually check knee bend.
        // But requested rule: "Hip Y decreases". (Actually Increases in MP coords).
        // Let's use Nose to Hip distance (compactness).

        if (isCrouched) {
            // S is base state
            // Check combos first
            if (this.isFrontPunch(landmarks, nose)) {
                currentIntents.push('J'); // Crouch + Punch
                maxConfidence = 90;
            } else if (this.isKneeUp(landmarks)) {
                currentIntents.push('K'); // Crouch + Knee
                maxConfidence = 90;
            } else {
                currentIntents.push('S'); // Just Crouch
                maxConfidence = 85;
            }
        } else {
            // STANDING ACTIONS

            // W: JUMP (Sudden Upward Movement - Check DY)
            let dy = 0;
            if (this.lastLandmarks) {
                const prevHip = this.getMidPoint(this.lastLandmarks[23], this.lastLandmarks[24]);
                dy = hipCenter.y - prevHip.y;
            }
            if (dy < -0.04) { // Moving Up fast
                currentIntents.push('W');
                maxConfidence = 95;
            }

            // U: Front Punch
            if (this.isFrontPunch(landmarks, nose)) {
                currentIntents.push('U');
                maxConfidence = 85;
            }

            // I: Knee Up
            if (this.isKneeUp(landmarks)) {
                currentIntents.push('I');
                maxConfidence = 85;
            }

            // P: Forearms Up
            if (this.isForearmsUp(landmarks)) {
                currentIntents.push('P');
                maxConfidence = 85;
            }
        }

        // ; Rage (Power Stance - preserved)
        if (this.isPowerStance(landmarks)) {
            currentIntents.push(';');
        }

        // SYNC NATIVE INPUT
        InputController.sync(currentIntents);

        this.lastLandmarks = landmarks;

        return {
            intents: currentIntents,
            confidence: Math.round(maxConfidence),
            state: currentIntents.length > 0 ? 'READY' : 'TRACKING',
            debug: currentIntents.length > 0 ? `Detected ${currentIntents.join('+')}` : 'Tracking'
        };
    }

    // --- HELPERS ---

    private reset() {
        this.lastLandmarks = null;
    }

    private getMidPoint(p1: NormalizedLandmark, p2: NormalizedLandmark): { x: number, y: number, z: number } {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            z: (p1.z + p2.z) / 2, // z might need checking for existence
        };
    }

    private areHandsActive(landmarks: NormalizedLandmarkList): boolean {
        // Check if hands are above shoulders
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        return (leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y);
    }

    private isPunching(landmarks: NormalizedLandmarkList): boolean {
        // Legacy implementation, preserved for reference if needed, but unused in main logic now.
        return false;
    }

    private isPowerStance(landmarks: NormalizedLandmarkList): boolean {
        // Wide stance, arms out/down
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        const footSpread = Math.abs(leftAnkle.x - rightAnkle.x);
        return footSpread > 0.35; // Legs wide
    }

    private isSpecialPose(landmarks: NormalizedLandmarkList): boolean {
        // Hands crossed above head "X"
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const nose = landmarks[0];

        // Wrists above nose
        if (leftWrist.y > nose.y || rightWrist.y > nose.y) return false;

        // Wrists close to each other (Crossed)
        return Math.abs(leftWrist.x - rightWrist.x) < 0.1;
    }
}

export const gestureEngine = new GestureEngine();
