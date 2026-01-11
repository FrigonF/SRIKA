import { VirtualControl } from './GestureEngine';

declare global {
    interface Window {
        electronAPI?: {
            triggerKey: (key: string) => void;
        };
    }
}

export class InputController {
    // Map intents to KeyCodes (e.g. 'W' -> 'KeyW')
    private static keyMap: Record<string, string> = {
        'W': 'KeyW',
        'A': 'KeyA',
        'S': 'KeyS',
        'D': 'KeyD',
        'U': 'KeyU', // Front Punch
        'I': 'KeyI', // Knee Up
        'K': 'KeyK', // Crouch + Knee
        'J': 'KeyJ', // Crouch + Punch
        'P': 'KeyP', // Forearms Up
        ';': 'Semicolon', // Rage
    };

    /**
     * Synchronizes current active keys with the OS
     */
    public static sync(intents: VirtualControl[]) {
        const activeIntents = intents.filter(i => i !== null) as string[];

        if (activeIntents.length === 0) {
            if (window.electronAPI) window.electronAPI.triggerKey('idle');
            return;
        }

        console.log(`[Input] Syncing intents: ${activeIntents.join(', ')}`);

        // 1. Dispatch Native Event
        if (window.electronAPI) {
            window.electronAPI.triggerKey(activeIntents.join(',').toLowerCase());
        }

        // 2. Dispatch Web Events for UI feedback
        activeIntents.forEach(intent => {
            const code = this.keyMap[intent];
            if (code) {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: intent, code: code }));
            }
        });
    }

    public static trigger(control: VirtualControl) {
        if (!control) return;

        const code = this.keyMap[control];
        if (!code) return;

        console.log(`[Input] Triggering Native Key: ${control} (${code})`);

        // 1. Dispatch Web Event (for UI feedback)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: control, code: code }));

        // 2. DISPATCH NATIVE EVENT (SYSTEM-WIDE)
        if (window.electronAPI) {
            window.electronAPI.triggerKey(control.toLowerCase());
        }

        // 2. Dispatch KeyUp (Immediate release for impulse actions)
        setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keyup', {
                key: control,
                code: code,
                bubbles: true,
                cancelable: true
            }));
        }, 100);
    }

    /**
     * Start holding a key (for continuous movement like walking)
     */
    public static hold(control: VirtualControl) {
        if (!control) return;
        const code = this.keyMap[control];
        if (!code) return;

        window.dispatchEvent(new KeyboardEvent('keydown', {
            key: control,
            code: code,
            bubbles: true,
            cancelable: true
        }));
    }

    /**
     * Release a key
     */
    public static release(control: VirtualControl) {
        if (!control) return;
        const code = this.keyMap[control];
        if (!code) return;

        window.dispatchEvent(new KeyboardEvent('keyup', {
            key: control,
            code: code,
            bubbles: true,
            cancelable: true
        }));
    }
}
