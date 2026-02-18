
declare global {
    interface Window {
        electronAPI: {
            readJson: (filename: string) => Promise<any>;
            writeJson: (filename: string, data: any) => Promise<{ success: boolean; error?: string }>;
            getLoginItemSettings: () => Promise<{ openAtLogin: boolean }>;
            setLoginItemSettings: (openAtLogin: boolean) => Promise<{ success: boolean }>;
            updateGlobalShortcuts: (bindings: Record<string, string>) => Promise<Record<string, boolean>>;
            onGlobalShortcut: (callback: (action: string) => void) => void;
            getAppVersion: () => Promise<string>;
            // Add other existing APIs if needed to silence linter, or use 'any' for now
            [key: string]: any;
        };
    }
}

// Define Schema
export interface SettingsSchema {
    _version: number;
    general: {
        language: string;
        theme: 'dark' | 'light' | 'auto';
        launchOnBoot: boolean;
    };
    notifications: {
        tracking: boolean;
        lowAccuracy: boolean;
        updates: boolean;
    };
    camera: {
        resolution: string;
        fps: number;
        autoBrightness: boolean;
    };
    keybindings: {
        startStop: string;
        overlay: string;
        calibration: string;
        switchProfile: string;
        emergencyStop: string;
    };
}

const DEFAULT_SETTINGS: SettingsSchema = {
    _version: 1,
    general: {
        language: 'en',
        theme: 'dark',
        launchOnBoot: false
    },
    notifications: {
        tracking: true,
        lowAccuracy: true,
        updates: true
    },
    camera: {
        resolution: '1280x720',
        fps: 30,
        autoBrightness: true
    },
    keybindings: {
        startStop: 'Ctrl+Shift+T',
        overlay: 'Ctrl+Shift+O',
        calibration: 'Ctrl+Shift+C',
        switchProfile: 'Ctrl+Shift+P',
        emergencyStop: 'Ctrl+Shift+Escape'
    }
};

class SettingsManager {
    private static instance: SettingsManager;
    private state: SettingsSchema = { ...DEFAULT_SETTINGS };
    private listeners: Set<(settings: SettingsSchema) => void> = new Set();
    private saveTimeout: NodeJS.Timeout | null = null;
    private initialized = false;

    private constructor() { }

    public static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    public async init() {
        if (this.initialized) return;

        try {
            // Safe Load
            const data = await window.electronAPI.readJson('settings.json');

            if (data) {
                // TODO: Version Migration Check
                if (data._version !== DEFAULT_SETTINGS._version) {
                    console.warn('[Settings] Schema version mismatch. Resetting/Migrating...');
                    // For V1, we just reset or merge safe keys. 
                    // To be safe, we merge data ON TOP of defaults to ensure new keys exist.
                    this.state = this.deepMerge(DEFAULT_SETTINGS, data);
                    this.state._version = DEFAULT_SETTINGS._version; // forcing update
                    this.save(true);
                } else {
                    this.state = this.deepMerge(DEFAULT_SETTINGS, data);
                }
            } else {
                console.log('[Settings] No settings found. creating defaults.');
                this.save(true);
            }
        } catch (e) {
            console.error('[Settings] Critical load error. Resetting to safe defaults.', e);
            // We do NOT save immediately to avoid overwriting a potentially recoverable file 
            // unless we rename it first. But IPC `readJson` returns null on error usually.
            this.state = { ...DEFAULT_SETTINGS };
        }

        // Apply Side Effects Initial State
        this.applyTheme(this.state.general.theme);
        this.applyLaunchOnBoot(this.state.general.launchOnBoot);
        this.applyShortcuts(this.state.keybindings);

        this.initialized = true;
        this.notify();
    }

    // --- ACCESSORS ---

    public getSettings(): SettingsSchema {
        return { ...this.state };
    }

    public get<K extends keyof SettingsSchema>(section: K): SettingsSchema[K] {
        return this.state[section];
    }

    // --- UPDATERS ---

    public update<K extends keyof SettingsSchema>(
        section: K,
        updates: Partial<SettingsSchema[K]>
    ) {
        // Update State
        this.state = {
            ...this.state,
            [section]: {
                ...this.state[section],
                ...updates
            }
        };

        this.notify();
        this.save(); // Debounced save

        // Trigger Scoped Side Effects
        if (section === 'general') {
            const gen = updates as Partial<SettingsSchema['general']>;
            if (gen.theme) this.applyTheme(gen.theme);
            if (gen.launchOnBoot !== undefined) this.applyLaunchOnBoot(gen.launchOnBoot);
        }

        if (section === 'keybindings') {
            this.applyShortcuts(this.state.keybindings);
        }
    }

    public reset() {
        this.state = { ...DEFAULT_SETTINGS };
        this.notify();
        this.save(true);
        this.applyTheme('dark');
        this.applyLaunchOnBoot(false);
        this.applyShortcuts(this.state.keybindings);
    }

    // --- SIDE EFFECTS ---

    private applyTheme(theme: string) {
        const root = document.documentElement;
        if (theme === 'auto') {
            // Detect system preference
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDark) root.classList.add('dark');
            else root.classList.remove('dark');
        } else {
            if (theme === 'dark') root.classList.add('dark');
            else root.classList.remove('dark');
        }
    }

    private async applyLaunchOnBoot(enabled: boolean) {
        try {
            await window.electronAPI.setLoginItemSettings(enabled);
        } catch (e) {
            console.error('Failed to set launch on boot:', e);
        }
    }

    private async applyShortcuts(bindings: SettingsSchema['keybindings']) {
        try {
            // bindings is object { startStop: "Ctrl+T", ... }
            await window.electronAPI.updateGlobalShortcuts(bindings);
        } catch (e) {
            console.error('Failed to register shortcuts:', e);
        }
    }

    // --- PERSISTENCE ---

    private save(immediate = false) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        const doSave = () => {
            window.electronAPI.writeJson('settings.json', this.state)
                .catch(e => console.error('Failed to save settings:', e));
        };

        if (immediate) {
            doSave();
        } else {
            this.saveTimeout = setTimeout(doSave, 1000); // 1s debounce
        }
    }

    // --- UTILS ---

    public subscribe(listener: (s: SettingsSchema) => void) {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l(this.state));
    }

    private deepMerge(target: any, source: any): any {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) Object.assign(output, { [key]: source[key] });
                    else output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
}

function isObject(item: any) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

export const settingsManager = SettingsManager.getInstance();
