import type { NormalizedLandmarkList } from '@mediapipe/pose';
import { InputController } from '../engine/InputController';
import { supabase } from '../lib/supabase';
import { authManager } from './AuthManager';

export interface ActionMapping {
    id: string;
    name: string;
    key: string;
    type: 'BUILTIN' | 'CUSTOM';
    gestureId: string;
    trained: boolean;
}

export interface EngineConfig {
    modelComplexity?: number;
    poseSmoothing?: boolean;
    handsEnabled?: boolean;
}

export interface GameProfile {
    id: string;
    name: string;
    game_name: string; // Added
    isOfficial: boolean;
    category?: string;
    inputMode?: 'KEYBOARD' | 'GAMEPAD' | 'STEAM_INPUT';
    steamAppId?: number;
    mappings: ActionMapping[];
    customPoses: Record<string, NormalizedLandmarkList>;
    engineConfig?: EngineConfig;
    settings?: Record<string, any>;
    created_at: number; // Updated name
    updated_at: number; // Added
    is_active: boolean; // Added
    total_hours_used: number; // Added
    total_sessions: number; // Added
}

export interface UserData {
    trial_start_timestamp: number | null;
    session_start_timestamp: number | null;
    active_profile_id: string | null;
}

const PROFILES_FILE = 'profiles.json';
const USER_FILE = 'user.json';

export class ProfileManager {
    private static profiles: GameProfile[] = [];
    private static userData: UserData = {
        trial_start_timestamp: null,
        session_start_timestamp: null,
        active_profile_id: null
    };

    public static async init() {
        console.log('[ProfileManager] Initializing for production...');

        // 1. Load User Data (Trial, Active Profile ID, Session Crash Recovery)
        const loadedUser = await (window as any).electronAPI.readJson(USER_FILE);
        if (loadedUser) {
            this.userData = { ...this.userData, ...loadedUser };
        } else {
            // First Launch
            this.userData.trial_start_timestamp = Date.now();
            await this.saveUser();
        }

        // 2. Load Profiles
        const loadedProfiles = await (window as any).electronAPI.readJson(PROFILES_FILE);
        if (loadedProfiles) {
            this.profiles = loadedProfiles;
        } else {
            this.profiles = this.getDefaults();
            await this.saveProfiles();
        }

        // 3. CRASH RECOVERY: Check for unfinished session
        if (this.userData.session_start_timestamp && this.userData.active_profile_id) {
            const activeProfile = this.profiles.find(p => p.id === this.userData.active_profile_id);
            if (activeProfile) {
                const durationMs = Date.now() - this.userData.session_start_timestamp;
                const hours = durationMs / (1000 * 60 * 60);
                activeProfile.total_hours_used += hours;
                console.log(`[ProfileManager] Crash recovery: Added ${hours.toFixed(2)} hours to ${activeProfile.name}`);

                this.userData.session_start_timestamp = null; // Clear timestamp
                await this.saveUser();
                await this.saveProfiles();
            }
        }

        console.log(`[ProfileManager] Init complete. ${this.profiles.length} profiles loaded.`);

        // Initial sync to InputController
        const active = this.getActive();
        if (active) InputController.onProfileSwitch(active);
    }

    private static getDefaults(): GameProfile[] {
        const now = Date.now();
        return [
            {
                id: 'tekken-official',
                name: 'Tekken',
                game_name: 'Tekken 8',
                isOfficial: true,
                category: 'Fighting',
                inputMode: 'STEAM_INPUT',
                steamAppId: 1778820,
                created_at: now,
                updated_at: now,
                is_active: true,
                total_hours_used: 0,
                total_sessions: 0,
                mappings: [
                    { id: 't-1', name: 'Jump', key: 'W', type: 'BUILTIN', gestureId: 'W', trained: true },
                    { id: 't-2', name: 'Left', key: 'A', type: 'BUILTIN', gestureId: 'A', trained: true },
                    { id: 't-3', name: 'Right', key: 'D', type: 'BUILTIN', gestureId: 'D', trained: true },
                    { id: 't-4', name: 'Crouch', key: 'S', type: 'BUILTIN', gestureId: 'S', trained: true },
                    { id: 't-5', name: 'Punch (Y)', key: 'U', type: 'BUILTIN', gestureId: 'Y', trained: true },
                    { id: 't-6', name: 'Kick (B)', key: 'I', type: 'BUILTIN', gestureId: 'B', trained: true },
                    { id: 't-7', name: 'Low Punch (X)', key: 'J', type: 'BUILTIN', gestureId: 'X', trained: true },
                    { id: 't-8', name: 'Low Kick (A)', key: 'K', type: 'BUILTIN', gestureId: 'A', trained: true },
                    { id: 't-9', name: 'Guard', key: 'P', type: 'BUILTIN', gestureId: 'GUARD', trained: true },
                    { id: 't-10', name: 'Heat Burst', key: ';', type: 'BUILTIN', gestureId: 'RB', trained: true }
                ],
                customPoses: {},
                engineConfig: { modelComplexity: 1, poseSmoothing: true, handsEnabled: false }
            },
            {
                id: 'asphalt9',
                name: 'Asphalt 9',
                game_name: 'Asphalt 9: Legends',
                isOfficial: true,
                category: 'Racing',
                inputMode: 'GAMEPAD',
                created_at: now,
                updated_at: now,
                is_active: false,
                total_hours_used: 0,
                total_sessions: 0,
                mappings: [
                    { id: 'a-1', name: 'Accelerate', key: 'W', type: 'BUILTIN', gestureId: 'ACCEL', trained: true },
                    { id: 'a-2', name: 'Steer Left', key: 'A', type: 'BUILTIN', gestureId: 'STEER_L', trained: true },
                    { id: 'a-3', name: 'Steer Right', key: 'D', type: 'BUILTIN', gestureId: 'STEER_R', trained: true },
                    { id: 'a-4', name: 'Brake', key: 'S', type: 'BUILTIN', gestureId: 'BRAKE', trained: true },
                    { id: 'a-5', name: 'Nitro', key: 'SPACE', type: 'BUILTIN', gestureId: 'NITRO', trained: true },
                    { id: 'a-6', name: 'Drift', key: 'SPACE', type: 'BUILTIN', gestureId: 'DRIFT', trained: true }
                ],
                customPoses: {},
                engineConfig: { modelComplexity: 0, poseSmoothing: true, handsEnabled: true },
                settings: { steerSensitivity: 0.22 }
            }
        ];
    }

    public static getActive(): GameProfile | undefined {
        return this.profiles.find(p => p.is_active);
    }

    public static async setActive(id: string) {
        this.profiles.forEach(p => p.is_active = (p.id === id));
        this.userData.active_profile_id = id;

        await this.saveProfiles();
        await this.saveUser();

        const active = this.getActive();
        if (active) InputController.onProfileSwitch(active);

        window.dispatchEvent(new CustomEvent('srika-active-profile-changed', { detail: id }));
    }

    public static async createProfile(name: string, gameName: string = 'Custom Game', category: string = 'Custom'): Promise<GameProfile> {
        const now = Date.now();
        const profile: GameProfile = {
            id: crypto.randomUUID(),
            name,
            game_name: gameName,
            isOfficial: false,
            category,
            created_at: now,
            updated_at: now,
            is_active: false,
            total_hours_used: 0,
            total_sessions: 0,
            mappings: [],
            customPoses: {}
        };
        this.profiles.push(profile);
        await this.saveProfiles();
        return profile;
    }

    public static async deleteProfile(id: string, currentEngineMode: string, setEngineMode: (mode: any) => void) {
        const idx = this.profiles.findIndex(p => p.id === id);
        if (idx !== -1 && !this.profiles[idx].isOfficial) {
            const wasActive = this.profiles[idx].is_active;

            // 1. Deletion Safety: If active, stop engine first
            if (wasActive && currentEngineMode !== 'IDLE') {
                console.log('[ProfileManager] Deleting ACTIVE profile. Shutting down engine.');
                setEngineMode('IDLE');
            }

            this.profiles.splice(idx, 1);

            // 2. Prevent orphan active state
            if (wasActive && this.profiles.length > 0) {
                await this.setActive(this.profiles[0].id);
            }

            await this.saveProfiles();
        }
    }

    public static async saveProfile(profile: GameProfile) {
        const idx = this.profiles.findIndex(p => p.id === profile.id);
        if (idx !== -1) {
            profile.updated_at = Date.now();
            if (this.profiles[idx].isOfficial) {
                this.profiles[idx].settings = profile.settings;
                this.profiles[idx].updated_at = profile.updated_at;
            } else {
                this.profiles[idx] = profile;
            }
            await this.saveProfiles();
        }
    }

    // --- SESSION TRACKING ---

    public static async onEngineStart() {
        const active = this.getActive();
        if (!active) return;

        this.userData.session_start_timestamp = Date.now();
        await this.saveUser();
        console.log(`[ProfileManager] Session started for ${active.name}`);

        // Reset action counter for new session
        InputController.resetSessionActionCount();
    }

    public static async onEngineStop() {
        if (!this.userData.session_start_timestamp) return;

        const active = this.getActive();
        const durationMs = Date.now() - this.userData.session_start_timestamp;
        const hours = durationMs / (1000 * 60 * 60);

        if (active) {
            active.total_hours_used += hours;
            active.total_sessions += 1;
            active.updated_at = Date.now();
            console.log(`[ProfileManager] Session ended locally. Added ${hours.toFixed(4)} hours to ${active.name}.`);
        }

        // Cloud Sync: Atomic Increment to All-Time Stats
        const user = authManager.getUser();
        if (user && user.id !== 'guest-user') {
            try {
                const actionCount = InputController.getSessionActionCount();
                const { error } = await supabase.rpc('increment_user_usage', {
                    target_user_id: user.id,
                    inc_hours: parseFloat(hours.toFixed(6)),
                    inc_actions: actionCount,
                    inc_sessions: 1
                });

                if (error) throw error;
                console.log(`[ProfileManager] Cloud usage incremented for user: ${user.id} (Actions: ${actionCount})`);
            } catch (err) {
                console.error('[ProfileManager] Failed to increment cloud usage:', err);
            }
        }

        this.userData.session_start_timestamp = null;
        await this.saveUser();
        await this.saveProfiles();

        // Reset counter
        InputController.resetSessionActionCount();
    }

    public static getTrialStatus() {
        const now = Date.now();
        const start = this.userData.trial_start_timestamp || now;
        const daysPassed = (now - start) / (1000 * 60 * 60 * 24);
        const daysRemaining = Math.max(0, 30 - daysPassed);

        return {
            isExpired: daysPassed > 30,
            daysRemaining: Math.floor(daysRemaining),
            percentUsed: Math.min(100, (daysPassed / 30) * 100)
        };
    }

    // --- PERSISTENCE ---

    public static getProfiles(): GameProfile[] {
        return [...this.profiles];
    }

    private static async saveProfiles() {
        await (window as any).electronAPI.writeJson(PROFILES_FILE, this.profiles);
    }

    private static async saveUser() {
        await (window as any).electronAPI.writeJson(USER_FILE, this.userData);
    }

    public static resolveKey(gestureId: string): string | null {
        const profile = this.getActive();
        if (!profile) return null;

        const mapping = profile.mappings.find(m => m.gestureId === gestureId);
        if (mapping) {
            if (mapping.key.length === 1 && /^[a-zA-Z]$/.test(mapping.key)) {
                return `Key${mapping.key.toUpperCase()}`;
            }
            return mapping.key;
        }
        return null;
    }
}
