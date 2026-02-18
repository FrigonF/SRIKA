import type { NormalizedLandmarkList } from '@mediapipe/pose';
import type { NormalizedLandmarkList as HandLandmarkList } from '@mediapipe/hands';
import { SystemState } from '../context/SrikaContext';
import { InputController } from './InputController';
import { ProfileManager } from '../managers/ProfileManager';

// Control Intents (Abstract Gesture IDs)
export type VirtualControl =
    'JUMP' | 'LEFT' | 'RIGHT' | 'CROUCH' | 'PUNCH_U' | 'STRIKE_I' | 'GUARD' | 'RAGE' | // Tekken descriptive
    'ACCEL' | 'STEER_L' | 'STEER_R' | 'BRAKE' | 'NITRO' | 'DRIFT' | // Racing descriptive
    'U' | 'I' | 'K' | 'J' | 'P' | ';' | 'W' | 'A' | 'S' | 'D' | 'SPACE' | null; // Compatibility

export interface DetectionResult {
    intents: VirtualControl[];  // All detected controls
    confidence: number;         // Average/Max confidence
    state: SystemState;         // IDLE, TRACKING, etc.
    debug?: string;             // Reason for detection
}

class GestureEngine {
    constructor() {
        if (window.electronAPI?.onSidecarAction) {
            window.electronAPI.onSidecarAction((tokens: string[]) => {
                console.log(`[GestureEngine] Received tokens from Sidecar: ${tokens.join(',')}`);
                const now = Date.now();
                tokens.forEach(t => {
                    const now = Date.now();
                    if (t.includes(':')) {
                        const axisName = t.split(':')[0];
                        // Clear OLD values for this specific axis to prevent "accumulation lag"
                        Object.keys(this.sidecarIntents).forEach(k => {
                            if (k.startsWith(`${axisName}:`)) {
                                delete this.sidecarIntents[k];
                            }
                        });
                        this.sidecarIntents[t] = now;
                    } else {
                        const key = t.toUpperCase();
                        this.sidecarIntents[key] = now;
                    }
                });
            });
        }

        // 2. Clear state on profile switch
        window.addEventListener('srika-active-profile-changed', () => {
            console.log('[GestureEngine] Profile switch detected, resetting internal state.');
            this.reset();
        });
    }

    private sidecarIntents: Record<string, number> = {}; // Action -> Timestamp

    // --- ACTION PIPELINE STATE ---
    private actionStates: Record<string, {
        stableFrames: number;
        cooldownExits: number; // Frames remaining in cooldown
        isTriggered: boolean;  // True if currently inside the "Hold" phase after trigger
        lastActiveTime: number; // Timestamp of last raw detection
    }> = {};

    // Pipeline Config (ZERO LATENCY REBUILD)
    private readonly MIN_STABLE_FRAMES = 1;  // Instant trigger
    private readonly ACTION_COOLDOWN = 1;    // No artificial gap
    private readonly PERSISTENCE_DURATION = 15;

    // Action Categories (CONTROLLER NATIVE REBUILD)
    private readonly DISCRETE_ACTIONS = ['U', 'I', 'J', 'K', 'P', 'ACCEL', 'BRAKE', 'NITRO'];
    private readonly CONTINUOUS_ACTIONS = [];

    // Configuration

    public setMode(mode: string) { // Fixed input type
        if (mode !== 'ACTIVE') this.reset();
    }

    public process(
        poseLandmarks: NormalizedLandmarkList | null,
        handLandmarks?: HandLandmarkList[],
        handedness?: any[]
    ): DetectionResult {
        if (!poseLandmarks || poseLandmarks.length === 0) {
            this.reset();
            return { intents: [], confidence: 0, state: 'IDLE', debug: 'No landmarks' };
        }

        const activeProfile = ProfileManager.getActive();
        let detection: DetectionResult;

        if (activeProfile?.isOfficial) {
            // REDIRECTION: Logic now lives in sidecar presets for all official modules
            InputController.sendRawLandmarks(poseLandmarks, handLandmarks, handedness);

            // Collect recent sidecar intents (last 150ms for racing/fighting smoothness)
            const now = Date.now();
            const sidecarActive = Object.keys(this.sidecarIntents).filter(key =>
                (now - this.sidecarIntents[key]) < 150
            ) as VirtualControl[];

            detection = {
                intents: sidecarActive,
                confidence: 90,
                state: 'TRACKING',
                debug: `Sidecar [${activeProfile.name}]: ${sidecarActive.join(',')}`
            };
        } else {
            // DETECT RAW -> PIPELINE -> FINAL (Default/Custom Fighting Profiles)
            const rawDetection = this.detectFightingRaw(poseLandmarks);
            const filteredIntents = this.runActionPipeline(rawDetection.intents);

            detection = {
                ...rawDetection,
                intents: filteredIntents
            };
        }

        // --- SYNC NATIVE INPUT ---
        // CRITICAL FIX: If profile isOfficial, the Sidecar (Python) ALREADY executed the input.
        // We only call sync() for Custom profiles where detection happens in JS.
        if (!activeProfile?.isOfficial) {
            InputController.sync(detection.intents as string[]);
        }

        return {
            intents: detection.intents,
            confidence: Math.round(detection.confidence),
            state: detection.intents.length > 0 ? 'READY' : 'TRACKING',
            debug: detection.debug
        };
    }

    // --- PIPELINE LOGIC (3-STAGE) ---
    private runActionPipeline(rawIntents: VirtualControl[]): VirtualControl[] {
        const output: VirtualControl[] = [];
        const rawSet = new Set(rawIntents);

        // Initialize Detectable Actions Union
        const allTracked = [...this.DISCRETE_ACTIONS, ...this.CONTINUOUS_ACTIONS];

        // --- STAGE 1: STABILITY GATE + PERSISTENCE ---
        const now = Date.now();

        // We must update state for ALL tracked actions, present or not
        allTracked.forEach(action => {
            if (!this.actionStates[action]) {
                this.actionStates[action] = {
                    stableFrames: 0,
                    cooldownExits: 0,
                    isTriggered: false,
                    lastActiveTime: 0
                };
            }
            const state = this.actionStates[action];

            // Cooldown Decay
            if (state.cooldownExits > 0) state.cooldownExits--;

            const isRawPresent = rawSet.has(action as VirtualControl);

            if (isRawPresent) {
                state.lastActiveTime = now;
                state.stableFrames++;
            } else {
                // SIGNAL LOST - CHECK PERSISTENCE
                const timeSinceActive = now - state.lastActiveTime; // NaN safe? lastActiveTime init 0.
                const isPersisting = (timeSinceActive < this.PERSISTENCE_DURATION) && (state.stableFrames > 0);

                if (isPersisting) {
                    // HOLD STATE (Phantom Presence)
                    // We do NOT increment stableFrames (don't make it "more stable"),
                    // but we do NOT reset it.
                    // Effectively, it stays "stable enough".
                } else {
                    // TRUE LOSS (Expired)
                    if (state.isTriggered) {
                        // Valid exit from a triggered state -> Enter Cooldown
                        state.cooldownExits = this.ACTION_COOLDOWN;
                    }
                    state.stableFrames = 0;
                    state.isTriggered = false; // Reset trigger state
                }
            }
        });

        // Identify Stable Candidates
        const stableCandidates = allTracked.filter(action =>
            this.actionStates[action].stableFrames >= this.MIN_STABLE_FRAMES
        );

        // --- STAGE 2: PROCESS ACTIONS ---
        // Pass Movement Through
        (stableCandidates as string[]).filter(a => (this.CONTINUOUS_ACTIONS as string[]).includes(a))
            .forEach(m => output.push(m as VirtualControl));

        // Process Discrete Action Lifecycle
        stableCandidates.filter(a => this.DISCRETE_ACTIONS.includes(a)).forEach(action => {
            const state = this.actionStates[action];

            // EDGE TRIGGER LOGIC
            // Can only trigger if NOT in cooldown AND NOT already triggered
            if (state.cooldownExits === 0 && !state.isTriggered) {
                console.log(`[GestureEngine] TRIGGER: ${action}`);
                output.push(action as VirtualControl);
                state.isTriggered = true; // Mark as fired
                state.cooldownExits = this.ACTION_COOLDOWN;
            }

            // FORCE RESET: If triggered and held > 300ms (approx 18 frames at 60fps), reset
            // This allows re-triggering and prevents sticking.
            if (state.isTriggered && state.stableFrames > 20) {
                console.log(`[GestureEngine] RELEASE (Force): ${action}`);
                state.isTriggered = false;
                state.stableFrames = 0;
                state.cooldownExits = 5; // Short cooldown before next
            }
        });

        return output;
    }

    // --- FIGHTING LOGIC (LOCAL FALLBACK) ---
    private detectFightingRaw(landmarks: NormalizedLandmarkList): DetectionResult {
        const intents: VirtualControl[] = [];
        let confidence = 0;
        let debug = '';

        if (!landmarks || landmarks.length < 33) {
            return { intents: [], confidence: 0, state: 'IDLE' };
        }

        // 1. Extract Key Landmarks
        const nose = landmarks[0];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Midpoints
        const hipMidX = (leftHip.x + rightHip.x) / 2;

        // 2. GUARD Detection (Hands near face)
        // Check if wrists are above shoulders and close to nose/center
        const handsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
        const handsClose = Math.abs(leftWrist.x - rightWrist.x) < 0.25; // Relaxed from 0.2

        if (handsUp && handsClose) {
            intents.push('GUARD');
            confidence = 85;
            debug = 'Guard';
        }

        // 3. PUNCH Detection (One hand extended forward/out)
        // Simple check: Wrist significantly far from shoulder in X or Z (if using Z)
        // 2D fallback: Check if wrist is extended far from body center
        const leftExtend = Math.abs(leftWrist.x - leftShoulder.x);
        const rightExtend = Math.abs(rightWrist.x - rightShoulder.x);

        // Debug string for visualization
        debug += ` | L-Ext:${leftExtend.toFixed(2)} R-Ext:${rightExtend.toFixed(2)}`;

        if (!intents.includes('GUARD')) {
            // RELAXED THRESHOLD: 0.4 -> 0.25
            if (leftExtend > 0.25 || rightExtend > 0.25) {
                intents.push('PUNCH_U'); // Generic punch
                confidence = 90;
                debug += ' -> PUNCH!';
            }
        }

        // 4. MOVEMENT Detection (Body Lean/Position)
        // Center of gravity shift
        const leanX = nose.x - hipMidX;
        debug += ` | LeanVal:${leanX.toFixed(2)}`;

        // RELAXED THRESHOLD: 0.15 -> 0.10
        if (leanX < -0.10) {
            intents.push('LEFT');
            confidence = 80;
            debug += ' -> LEFT';
        } else if (leanX > 0.10) {
            intents.push('RIGHT');
            confidence = 80;
            debug += ' -> RIGHT';
        }

        // Crouch (Head/Nose significantly lower than normal calibrated height - basic approximation)
        // Using relative distance between nose and hips
        // This is tricky without a calibrated "stand" baseline, but we can try a threshold
        // or check if hips are very low in screen (squat)
        // For now, let's skip crouch without calibration data, or use simple screen position
        if (nose.y > 0.6) { // Nose in bottom half of screen? Rough check
            intents.push('CROUCH');
            debug += ' -> CROUCH';
        }

        return {
            intents,
            confidence: Math.max(confidence, 60), // Baseline confidence if tracking
            state: intents.length > 0 ? 'READY' : 'TRACKING',
            debug
        };
    }

    // --- HELPERS ---

    public reset() {
        this.sidecarIntents = {};
        this.actionStates = {};
    }
}

export const gestureEngine = new GestureEngine();
