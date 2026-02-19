import { supabase } from '../lib/supabase';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar: string;
    subscription: string;
}

class AuthManager {
    private static instance: AuthManager;
    private _user: UserProfile | null = null;
    private listeners: Map<string, Set<Function>> = new Map();
    private initPromise: Promise<void> | null = null;

    private constructor() {
        console.log('[AuthManager] AuthManager instance created');
    }

    public static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    public async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.log('[AuthManager] Initializing Auth Pipeline...');

            // 1. Listen for Auth state changes from Supabase
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[AuthManager] Supabase Auth Event:', event);

                if (event === 'SIGNED_IN' && session?.user) {
                    await this.updateUserProfile(session.user);

                    // Save session securely via IPC
                    if (window.electronAPI) {
                        try {
                            await window.electronAPI.authSaveSession({
                                accessToken: session.access_token,
                                refreshToken: session.refresh_token,
                                user: this._user,
                                expiresAt: session.expires_at ? session.expires_at * 1000 : undefined
                            });
                        } catch (e) {
                            console.error('[AuthManager] Failed to save session:', e);
                        }
                    }
                    this.emit('user-changed', this._user);
                } else if (event === 'SIGNED_OUT') {
                    console.log('[AuthManager] SIGNED_OUT event received');
                    // Only clear if we aren't a guest
                    if (this._user?.id !== 'guest') {
                        this._user = null;
                        this.emit('user-changed', null);
                    }
                }
            });

            // 2. Listen for Deep Links and Restore Session
            if (window.electronAPI) {
                window.electronAPI.onDeepLink(async (url: string) => {
                    console.log('[AuthManager] Deep link received:', url);
                    await this.handleDeepLink(url);
                });

                // 3. MANDATORY: Restore existing session from safeStorage
                try {
                    console.log('[AuthManager] Fetching stored session (4s timeout)...');

                    // Race the IPC call against a 4s timeout
                    const session = await Promise.race([
                        window.electronAPI.authLoadSession(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('IPC_TIMEOUT')), 4000))
                    ]) as any;

                    if (session && session.accessToken) {
                        console.log('[AuthManager] Session found. Restoring...');
                        const { data, error } = await supabase.auth.setSession({
                            access_token: session.accessToken,
                            refresh_token: session.refreshToken || ''
                        });

                        if (error) {
                            console.error('[AuthManager] Session restoration failed:', error);
                            if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
                                await window.electronAPI.authClearSession();
                            }
                        } else if (data.session?.user) {
                            console.log('[AuthManager] Session restored successfully.');
                            await this.updateUserProfile(data.session.user);
                        }
                    } else {
                        console.log('[AuthManager] No stored session found.');
                    }
                } catch (e: any) {
                    console.error('[AuthManager] Session restoration bypassed:', e.message);
                }
            }

            console.log('[AuthManager] Initialization complete. Auth state stable.');
        })();

        return this.initPromise;
    }

    private async handleDeepLink(url: string) {
        try {
            console.log('[AuthManager] Parsing token from URL:', url);

            // Extract the fragment or query string
            let queryString = '';
            if (url.includes('#')) {
                queryString = url.split('#')[1];
            } else if (url.includes('?')) {
                queryString = url.split('?')[1];
            }

            if (!queryString) return;

            const params = new URLSearchParams(queryString);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const expiresIn = params.get('expires_in'); // In seconds

            if (accessToken) {
                console.log('[AuthManager] Setting session from extracted data...');
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || ''
                });

                if (error) throw error;
                console.log('[AuthManager] Session set successfully. Expiry in:', expiresIn, 'seconds');
            }
        } catch (e) {
            console.error('[AuthManager] Failed to handle deep link:', e);
        }
    }

    private async updateUserProfile(user: any) {
        console.log('[AuthManager] Updating profile. Metadata:', user.user_metadata);
        this._user = {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'User')}`,
            subscription: 'FREE' // TODO: Fetch from database
        };
    }

    public loginAsGuest() {
        console.log('[AuthManager] Logging in as Guest...');
        this._user = {
            id: 'guest',
            email: 'guest@srika.io',
            name: 'Guest User',
            avatar: `https://ui-avatars.com/api/?name=Guest+User&background=0D8ABC&color=fff`,
            subscription: 'GUEST'
        };
        console.log('[AuthManager] Guest identity created. Emitting user-changed.');
        this.emit('user-changed', this._user);
    }

    public async login() {
        console.log('[AuthManager] Starting Google OAuth (Direct)...');

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'srika://auth',
                    skipBrowserRedirect: true,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) throw error;

            if (data?.url && window.electronAPI) {
                await window.electronAPI.authOpenLoginWindow(data.url);
            }
        } catch (e) {
            console.error('[AuthManager] Login failed:', e);
            this.emit('auth-error', e);
        }
    }

    public async logout() {
        console.log('[AuthManager] Logging out...');
        try {
            await supabase.auth.signOut();
            if (window.electronAPI) {
                await window.electronAPI.authClearSession();
            }
            this._user = null;
            this.emit('user-changed', null);
        } catch (error) {
            console.error('[AuthManager] Logout failed:', error);
        }
    }

    public getUser(): UserProfile | null {
        return this._user;
    }

    public isAuthenticated(): boolean {
        return !!this._user;
    }

    public on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    public off(event: string, callback: Function) {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data?: any) {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }
}

export const authManager = AuthManager.getInstance();
