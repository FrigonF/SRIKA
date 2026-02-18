import { useState, useEffect } from 'react';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AuthScreen } from './components/AuthScreen';
import { SrikaProvider } from './context/SrikaContext';
import { EngineProvider } from './context/EngineContext';
import { MainScreen } from './components/MainScreen';
import { InputController } from './engine/InputController';

function AppContent() {
    const [isInitializing, setIsInitializing] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const init = async () => {
            console.log('[App] Starting initialization...');

            // 1. Check local storage for onboarding
            const onboarded = localStorage.getItem('srika_onboarding_done') === 'true';

            // 2. Initialize Managers
            const { ProfileManager } = await import('./managers/ProfileManager');
            const { settingsManager } = await import('./managers/SettingsManager');
            const { authManager } = await import('./managers/AuthManager');

            // 3. IMPORTANT: Subscribe to Auth BEFORE initializing
            // This ensures we catch the state change emitted DURING init() restoration
            authManager.on('user-changed', (user: any) => {
                console.log('[App] Auth state changed notification:', user ? 'AUTHENTICATED' : 'LOGGED_OUT');
                setAuthenticated(!!user);
                if (user) setShowOnboarding(false);
            });

            await Promise.all([
                ProfileManager.init(),
                settingsManager.init(),
                authManager.init()
            ]);

            // 4. Verification Check
            const currentUser = authManager.getUser();
            console.log('[App] Post-init user check:', currentUser?.email || 'None');

            if (currentUser) {
                setAuthenticated(true);
                setShowOnboarding(false);
            } else if (!onboarded) {
                setShowOnboarding(true);
            }

            InputController.initializeSession();

            // Initialization finished
            console.log('[App] Initialization complete');
            setIsInitializing(false);
        };
        init();
    }, []);

    if (isInitializing) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
                        SRIKA
                    </h1>
                    <div className="w-12 h-12 border-t-2 border-cyan-500 rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    if (showOnboarding && !authenticated) {
        return (
            <OnboardingScreen
                onComplete={() => {
                    setShowOnboarding(false);
                    localStorage.setItem('srika_onboarding_done', 'true');
                }}
            />
        );
    }

    if (!authenticated) {
        return (
            <AuthScreen
                onComplete={() => {
                    console.log('[App] AuthScreen onComplete triggered');
                    setAuthenticated(true);
                }}
            />
        );
    }

    return <MainScreen />;
}

export default function App() {
    return (
        <div className="dark w-full h-screen overflow-hidden bg-linear-to-br from-[#1e293b] via-[#0f172a] to-[#020617] text-white relative">
            <EngineProvider>
                <SrikaProvider>
                    <AppContent />
                </SrikaProvider>
            </EngineProvider>
        </div>
    );
}
