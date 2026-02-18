export { };

declare global {
    interface Window {
        electronAPI?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            triggerKey: (key: string) => void;
            setGameMode: (on: boolean) => void;
            onAdminStatus: (callback: (status: boolean) => void) => void;
            onSteamStatus: (callback: (status: string) => void) => void;
            onTekkenStatus: (callback: (status: string) => void) => void;
            onSidecarAction: (callback: (tokens: string[]) => void) => void;
            onEmergencyStop: (callback: () => void) => void;
            sendInput: (intents: string[]) => void;
            getAppVersion: () => Promise<string>;
        };
    }
}
