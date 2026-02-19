import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AuthScreen } from './components/AuthScreen';
import { SrikaProvider } from './context/SrikaContext';
import { EngineProvider } from './context/EngineContext';
import { MainScreen } from './components/MainScreen';
import { InputController } from './engine/InputController';
import { UpdateOverlay } from './components/UpdateOverlay';

// --- Error Boundary for Robustness ---
interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[App] Uncaught render error:", error, errorInfo);
        if (window.electronAPI?.logError) {
            window.electronAPI.logError({
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            });
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0f] text-white p-8">
                    <div className="max-w-md text-center">
                        <h1 className="text-3xl font-bold text-rose-500 mb-4">Something went wrong</h1>
                        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                            The application encountered a rendering error. We've logged the details and you can try restarting the app.
                        </p>
                        <div className="bg-black/40 rounded-lg p-4 mb-8 text-left border border-white/5">
                            <code className="text-[10px] text-rose-300/70 break-all">
                                {this.state.error?.message}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function AppContent() {
    const [isInitializing, setIsInitializing] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        let authManager: any;
        let isMounted = true;

        const onUserChanged = (user: any) => {
            if (!isMounted) return;
            console.log('[App] Auth state changed:', user ? 'AUTH' : 'OUT');
            setAuthenticated(!!user);
            if (user) setShowOnboarding(false);
        };

        const init = async () => {
            console.log('[App] Initializing v1.0.6 Boot Sequence...');

            // 1. Safety Timeout: Force boot after 10 seconds no matter what
            const bootTimeout = setTimeout(() => {
                if (isMounted) {
                    setIsInitializing(current => {
                        if (current) {
                            console.warn('[App] BOOT TIMEOUT: Forcing initialization completion.');
                            setInitError('Initialization timed out. Proceeding with safe defaults.');
                            return false;
                        }
                        return false;
                    });
                }
            }, 10000);

            try {
                const onboarded = localStorage.getItem('srika_onboarding_done') === 'true';

                // Import and Init Managers
                const [
                    { ProfileManager },
                    { settingsManager },
                    authModule
                ] = await Promise.all([
                    import('./managers/ProfileManager'),
                    import('./managers/SettingsManager'),
                    import('./managers/AuthManager')
                ]);

                authManager = authModule.authManager;
                authManager.on('user-changed', onUserChanged);

                // Run initialize methods with internal safety
                await Promise.allSettled([
                    ProfileManager.init(),
                    settingsManager.init(),
                    authManager.init()
                ]);

                if (!isMounted) return;

                const currentUser = authManager.getUser();
                if (currentUser) {
                    setAuthenticated(true);
                    setShowOnboarding(false);
                } else if (!onboarded) {
                    setShowOnboarding(true);
                }

                // Initialize Input Bridge
                try {
                    InputController.initializeSession();
                } catch (e) {
                    console.error('[App] InputController init failed:', e);
                }

            } catch (err: any) {
                console.error('[App] CRITICAL BOOT ERROR:', err);
                if (isMounted) setInitError(err.message || 'Unknown initialization error');
            } finally {
                clearTimeout(bootTimeout);
                if (isMounted) {
                    console.log('[App] Boot Sequence Finished');
                    setIsInitializing(false);
                }
            }
        };

        init();
        return () => {
            isMounted = false;
            if (authManager) authManager.off('user-changed', onUserChanged);
        };
    }, []);

    if (isInitializing) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4 animate-pulse">
                        SRIKA
                    </h1>
                    <div className="w-12 h-12 border-t-2 border-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
                    {initError && (
                        <p className="text-[10px] text-blue-400/60 uppercase tracking-widest animate-pulse">
                            {initError}
                        </p>
                    )}
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
        <ErrorBoundary>
            <div className="dark w-full h-screen overflow-hidden bg-linear-to-br from-[#1e293b] via-[#0f172a] to-[#020617] text-white relative">
                <UpdateOverlay />
                <EngineProvider>
                    <SrikaProvider>
                        <AppContent />
                    </SrikaProvider>
                </EngineProvider>
            </div>
        </ErrorBoundary>
    );
}
