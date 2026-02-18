import { useState, useEffect } from 'react';

import { Minimize2, Maximize2, X, Activity, Power, ShieldAlert, LogOut, User, ChevronDown } from 'lucide-react';
import { VerticalTaskBar, PageType } from './VerticalTaskBar';
import { HomeDashboard } from './HomeDashboard';
import { ControlMapping } from './ControlMapping';
import { GameProfiles } from './GameProfiles';
import { Analytics } from './Analytics';
import { Settings } from './Settings';
import { HelpTutorials } from './HelpTutorials';
import { CameraSetup } from './CameraSetup';
import { BodyCalibration } from './BodyCalibration';
import { useSrika } from '../context/SrikaContext';
import { useEngine } from '../context/EngineContext';
import { ProfileSelector } from './ProfileSelector';
import { PresetSettingsDialog } from './PresetSettingsDialog';
import { GameProfile } from '../managers/ProfileManager';
import { authManager } from '../managers/AuthManager';

function AvatarImage({ src, alt, fallback }: { src?: string, alt: string, fallback: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    if (!src) {
      setHasError(true);
    } else {
      setImgSrc(src);
      setHasError(false);
    }
  }, [src]);

  return (
    <img
      src={hasError ? fallback : imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      className="w-full h-full rounded-full object-cover"
      onError={(e) => {
        console.warn('[Avatar] Failed to load image:', src, e);
        setHasError(true);
      }}
    />
  );
}

export function MainScreen() {
  const [activePage, setActivePage] = useState<PageType>('dashboard');
  const [settingsProfile, setSettingsProfile] = useState<GameProfile | null>(null);
  const [user, setUser] = useState(authManager.getUser());

  useEffect(() => {
    const update = (u: any) => setUser(u);
    authManager.on('user-changed', update);
    return () => authManager.off('user-changed', update);
  }, []);

  const context = useSrika();
  const { engineMode, setEngineMode, emergencyStop } = useEngine();

  // Trial Enforcement: Auto-stop when time hits zero
  useEffect(() => {
    if (context.isTrialActive && context.trialRemainingTime <= 0 && context.isCameraOn) {
      console.error('[Trial] Session expired. Automatically stopping engine.');
      context.setIsCameraOn(false);
      setEngineMode('IDLE');

      // Notify User
      window.alert("No Usage remains for today, Please Come Next Day OR Upgrade to Srika PRO to unlock Unlimited usage.");
    }
  }, [context.isTrialActive, context.trialRemainingTime, context.isCameraOn, setEngineMode]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <HomeDashboard onNavigate={(screen) => console.log('Nav:', screen)} />;
      case 'mapping':
        return <ControlMapping onNavigate={(s) => setActivePage(s as PageType)} />;
      case 'output':
        return <GameProfiles onNavigate={(s) => setActivePage(s as PageType)} />;
      case 'analytics':
        return <Analytics onNavigate={(s) => setActivePage(s as PageType)} />;
      case 'settings':
        return <Settings onNavigate={(s) => setActivePage(s as PageType)} />;
      case 'help':
        return <HelpTutorials onNavigate={(s) => setActivePage(s as PageType)} />;
      case 'camera-setup':
        return <CameraSetup onNavigate={(s) => setActivePage(s as PageType)} />;
      case 'calibration':
        return <BodyCalibration onNavigate={(s) => setActivePage(s as PageType)} />;
      default:
        return <HomeDashboard onNavigate={(screen) => console.log('Nav:', screen)} />;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-linear-to-tr from-white/[0.02] via-transparent to-blue-500/[0.05] relative overflow-hidden text-white font-sans">
      {/* Subdued Professional Lighting */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[0%] w-[30%] h-[30%] bg-indigo-400/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Application Bar */}
      <div
        className="h-12 bg-white/[0.03] backdrop-blur-[80px] border-b border-white/10 flex items-center justify-between px-4 shrink-0 relative z-[100] shadow-2xl"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Left: Status + Profiles */}
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>

          {context.isTrialActive && (
            <div className="group relative flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full cursor-help transition-all hover:bg-amber-500/20">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                Usage: {Math.floor(context.trialRemainingTime / 60)}m {context.trialRemainingTime % 60}s
              </span>

              {/* Tooltip Cloud */}
              <div className="absolute top-full left-0 mt-2 w-32 p-1.5 bg-[#1e293b]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top left-[-5px] z-100 pointer-events-none group-hover:translate-y-1">
                <div className="absolute top-[-5px] left-[15px] w-2 h-2 bg-[#1e293b] border-t border-l border-white/10 rotate-45" />
                <p className="text-[9px] text-amber-200/80 font-medium text-center tracking-tight">
                  Limit will reset daily.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-1 py-1 transition-opacity">
            <Activity className={`w-3.5 h-3.5 ${context.systemState === 'READY' ? 'text-cyan-400' : context.systemState === 'TRACKING' ? 'text-amber-400' : 'text-gray-500'} ${context.systemState !== 'IDLE' ? 'animate-pulse' : ''}`} strokeWidth={2.5} />
            <span className={`font-bold tracking-tight uppercase ${context.systemState === 'READY' ? 'text-cyan-400' : 'text-gray-400'}`} style={{ fontSize: '11px' }}>
              {context.isCameraOn ? context.systemState : 'OFF'}
            </span>
          </div>

          <ProfileSelector />
        </div>

        {/* Right: Controls + Windows */}
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as any}>

          {/* Operational Mode Badge */}
          {engineMode !== 'IDLE' && (
            <div className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${engineMode === 'ACTIVE' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-red-500'}`}>
              {engineMode.replace('_', ' ')}
            </div>
          )}

          {/* User Profile Badge */}
          {user && (
            <div className="group relative">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 p-0.5">
                  {user.avatar ? (
                    <AvatarImage
                      src={user.avatar}
                      alt={user.name}
                      fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-black/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-none">{user.name}</span>
                  <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wider">{user.subscription}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors" />
              </div>

              {/* Dropdown */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50">
                <div className="p-3 border-b border-white/5">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => authManager.logout()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Functional Buttons */}
          <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded-xl border border-white/5">
            <button
              onClick={() => {
                const isRunning = engineMode !== 'IDLE' && engineMode !== 'EMERGENCY_STOP';

                // Strict Trial Check
                if (!isRunning && context.isTrialActive && context.trialRemainingTime <= 0) {
                  window.alert("No Usage remains for today, Please Come Next Day OR Upgrade to Srika PRO to unlock Unlimited usage.");
                  return;
                }

                const nextActive = !isRunning;

                context.setIsCameraOn(nextActive);
                if (nextActive) {
                  setEngineMode('ACTIVE');
                } else {
                  setEngineMode('IDLE');
                }
              }}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg font-bold transition-all ${engineMode !== 'IDLE' && engineMode !== 'EMERGENCY_STOP'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              style={{ fontSize: '12px' }}
            >
              <Power className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{engineMode !== 'IDLE' && engineMode !== 'EMERGENCY_STOP' ? 'STOP' : 'START'}</span>
            </button>

            <button
              onClick={emergencyStop}
              className="flex items-center gap-2 px-3 py-1 rounded-lg border border-gray-800 text-gray-500 hover:bg-red-900/20 hover:border-red-900/30 hover:text-red-400 transition-all font-bold"
              style={{ fontSize: '12px' }}
            >
              <ShieldAlert className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>ESTOP</span>
            </button>

            <button
              onClick={() => context.setIsMirrored(!context.isMirrored)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-bold transition-all ${context.isMirrored
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'border-gray-800 text-gray-500 hover:bg-gray-800/30'
                }`}
              style={{ fontSize: '12px' }}
            >
              <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>MIRROR</span>
            </button>
          </div>

          {/* Window controls - Interactive balanced icons */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={() => window.electronAPI?.minimize()}
              className="w-6.5 h-6.5 flex items-center justify-center rounded-md hover:bg-white/5 active:scale-90 transition-all group"
            >
              <Minimize2 className="w-3 h-3 text-gray-500 group-hover:text-white" />
            </button>
            <button
              onClick={() => window.electronAPI?.maximize()}
              className="w-6.5 h-6.5 flex items-center justify-center rounded-md hover:bg-white/5 active:scale-90 transition-all group"
            >
              <Maximize2 className="w-3 h-3 text-gray-500 group-hover:text-white" />
            </button>
            <button
              onClick={() => window.electronAPI?.close()}
              className="w-6.5 h-6.5 flex items-center justify-center rounded-md hover:bg-rose-500/10 active:scale-90 transition-all group"
            >
              <X className="w-3.5 h-3.5 text-gray-500 group-hover:text-rose-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vertical Task Bar */}
        <VerticalTaskBar
          activePage={activePage}
          onPageChange={setActivePage}
        />

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative">
          {renderPage()}
        </div>
      </div>

      <ShortcutHandler
        setActivePage={setActivePage}
        setIsCameraOn={context.setIsCameraOn}
        setEngineMode={setEngineMode}
        emergencyStop={emergencyStop}
      />

      {settingsProfile && (
        <PresetSettingsDialog
          profile={settingsProfile}
          onClose={() => setSettingsProfile(null)}
        />
      )}
    </div >
  );
}

function ShortcutHandler({
  setActivePage,
  setIsCameraOn,
  setEngineMode,
  emergencyStop
}: {
  setActivePage: (p: PageType) => void,
  setIsCameraOn: (val: boolean | ((p: boolean) => boolean)) => void,
  setEngineMode: (m: any) => void,
  emergencyStop: () => void
}) {
  useEffect(() => {
    if (!window.electronAPI) return;

    // 1. Start Camera + Nav to Dashboard
    const cleanupCamera = window.electronAPI.onToggleCamera(() => {
      console.log('[ShortcutHandler] Starting Camera via Global Shortcut (Dashboard Focus)');
      setActivePage('dashboard');
      setIsCameraOn(true);
      setEngineMode('ACTIVE');
    });

    // 2. Emergency Stop
    const cleanupEmergency = window.electronAPI.onEmergencyStop(() => {
      console.log('[ShortcutHandler] EMERGENCY STOP via Global Shortcut');
      emergencyStop();
    });

    return () => {
      cleanupCamera();
      cleanupEmergency();
    };
  }, [setActivePage, setIsCameraOn, setEngineMode, emergencyStop]);

  return null;
}
