import { GameProfile, ProfileManager } from '../managers/ProfileManager';

export class InputController {
    // Safety Latch (Synchronous O(1) Check)
    private static isInputAllowed: boolean = false;
    private static activeKeys: string[] = [];

    public static setInputAllowed(allowed: boolean) {
        this.isInputAllowed = allowed;
        if (!allowed) {
            this.emergencyStop();
        }
    }

    /**
     * Notify bridge of profile characteristics
     */
    public static onProfileSwitch(profile: GameProfile) {
        if (!profile || !window.electronAPI) return;

        // 1. Set Input Mode (Force KEYBOARD for Rebuild Test)
        window.electronAPI.triggerKey(`SET_INPUT_MODE:KEYBOARD`);

        // 2. Set Profile Type (e.g., 'tekken-official' or 'asphalt9')
        window.electronAPI.triggerKey(`SET_PROFILE:${profile.id}`);

        // 3. Sync initial settings if any
        if (profile.settings) {
            this.syncSettings(profile.settings);
        }

        console.log(`[InputController] Profile characteristics synced for: ${profile.id}`);
    }

    /**
     * FORCED PRODUCTION INITIALIZATION SEQUENCE
     */
    public static initializeSession() {
        console.log('[InputController] INITIALIZING PRODUCTION PIPELINE...');

        // 1. Force Load Preset
        const profile = ProfileManager.getActive();
        if (profile) this.onProfileSwitch(profile);
        console.log('--- Preset loaded ---');

        // Ensure input is allowed
        this.setInputAllowed(true);

        // 2. Initialize ActionManager (via Bridge Command)
        if (window.electronAPI) {
            window.electronAPI.triggerKey('CMD:INIT_ACTION_MANAGER');
            console.log('--- Bindings ready (ActionManager Initialized) ---');

            // 3. Register Outputs / Bind Bridge
            window.electronAPI.triggerKey('CMD:REGISTER_OUTPUTS');
            console.log('--- Bridge connected & Listeners attached ---');
        }

        // 4. Final Lock Check
        this.setInputAllowed(true);
        console.log('[InputController] PRODUCTION PIPELINE ACTIVE');
    }

    public static syncSettings(settings: Record<string, any>) {
        if (!window.electronAPI) return;
        window.electronAPI.triggerKey(`SET_SETTINGS:${JSON.stringify(settings)}`);
        console.log(`[InputController] Settings synced:`, settings);
    }

    /**
     * Immediately stop all input across the bridge
     */
    public static emergencyStop() {
        console.error('[InputController] EMERGENCY STOP: Flushing Bridge...');

        // 1. Send 'idle' to clear all virtual buttons/sticks instantly
        if (window.electronAPI) {
            window.electronAPI.triggerKey('idle');
        }

        // 2. Lock locally
        this.isInputAllowed = false;
        this.activeKeys = [];
    }

    /**
     * Synchronizes detected intents with the OS input bridge.
     */
    public static sync(intents: string[]) {
        if (!this.isInputAllowed) return;

        // Requirement: Flush keys on state change or 'idle'
        if (intents.length === 0) {
            if (this.activeKeys.length > 0) {
                window.electronAPI?.triggerKey('idle');
                this.activeKeys = [];
            }
            return;
        }

        // --- PRODUCTION MAPPING (Simplified for V1) ---
        const mappedTokens: string[] = [];
        intents.forEach(intent => {
            const key = ProfileManager.resolveKey(intent);
            if (key) {
                // Return lowercase for simple keys (u, i, j, k) or full for special
                if (key.startsWith('Key')) {
                    mappedTokens.push(key.slice(3).toLowerCase());
                } else {
                    mappedTokens.push(key.toLowerCase());
                }
            }
        });

        // 1. Dispatch Native Event (Bridge)
        if (mappedTokens.length > 0 && window.electronAPI) {
            const tokenStr = mappedTokens.sort().join(',');
            const lastTokenStr = this.activeKeys.sort().join(',');

            if (tokenStr !== lastTokenStr) {
                window.electronAPI.triggerKey(tokenStr);
            }
        } else if (this.activeKeys.length > 0) {
            window.electronAPI?.triggerKey('idle');
        }

        this.activeKeys = [...mappedTokens];
    }

    public static sendRawLandmarks(poseLandmarks: any, handLandmarks?: any[], handedness?: any[]) {
        if (!this.isInputAllowed || !window.electronAPI) return;

        // Protocol: RAW_LM:JSON (Updated to include handedness)
        const payload = {
            pose: poseLandmarks,
            hands: handLandmarks || [],
            handedness: handedness || []
        };
        window.electronAPI.triggerKey(`RAW_LM:${JSON.stringify(payload)}`);

        // DIAGNOSTIC
        if (!(this as any).frame_count) (this as any).frame_count = 0;
        (this as any).frame_count++;
        if ((this as any).frame_count % 30 === 0) {
            console.log(`[InputController] Streaming RAW_LM [F:${(this as any).frame_count}] | Hands: ${handLandmarks?.length || 0}`);
        }
    }
}
