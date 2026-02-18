import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { NormalizedLandmarkList } from '@mediapipe/pose';
import { authManager } from '../managers/AuthManager';

// System States
export type SystemState = 'IDLE' | 'STABILIZING' | 'TRACKING' | 'READY' | 'ERROR';

// Context Interface
interface SrikaContextType {
  poseLandmarks: NormalizedLandmarkList | null;
  setPoseLandmarks: (landmarks: NormalizedLandmarkList | null) => void;
  activeIntents: string[];
  setActiveIntents: (intents: string[]) => void;
  confidence: number;
  setConfidence: (score: number) => void;
  systemState: SystemState;
  setSystemState: (state: SystemState) => void;
  isCameraOn: boolean;
  setIsCameraOn: (val: boolean | ((prev: boolean) => boolean)) => void;
  cameraConnected: boolean;
  setCameraConnected: (connected: boolean) => void;
  isMirrored: boolean;
  setIsMirrored: (mirrored: boolean) => void;
  isFullScreen: boolean;
  setIsFullScreen: (full: boolean) => void;
  fps: number;
  setFps: (fps: number) => void;
  latencyMs: number;
  setLatencyMs: (ms: number) => void;
  isGameMode: boolean;
  setIsGameMode: (on: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  steamStatus: string;
  setSteamStatus: (status: string) => void;
  tekkenStatus: string;
  setTekkenStatus: (status: string) => void;
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  accessLevel: 'GUEST' | 'USER' | 'PRO';
  setAccessLevel: (level: 'GUEST' | 'USER' | 'PRO') => void;
  trialRemainingTime: number; // in seconds
  setTrialRemainingTime: (time: number) => void;
  isTrialActive: boolean;
}

const defaultContext: SrikaContextType = {
  poseLandmarks: null,
  setPoseLandmarks: () => { },
  activeIntents: [],
  setActiveIntents: () => { },
  confidence: 0,
  setConfidence: () => { },
  systemState: 'IDLE',
  setSystemState: () => { },
  isCameraOn: false,
  setIsCameraOn: () => { },
  cameraConnected: false,
  setCameraConnected: () => { },
  isMirrored: true,
  setIsMirrored: () => { },
  isFullScreen: false,
  setIsFullScreen: () => { },
  fps: 0,
  setFps: () => { },
  latencyMs: 0,
  setLatencyMs: () => { },
  isGameMode: false,
  setIsGameMode: () => { },
  isAdmin: false,
  setIsAdmin: () => { },
  steamStatus: 'NOT_AVAILABLE',
  setSteamStatus: () => { },
  tekkenStatus: 'NOT_DETECTED',
  setTekkenStatus: () => { },
  activeProfileId: null,
  setActiveProfileId: () => { },
  accessLevel: 'GUEST',
  setAccessLevel: () => { },
  trialRemainingTime: 300,
  setTrialRemainingTime: () => { },
  isTrialActive: false,
};

const SrikaContext = createContext<SrikaContextType>(defaultContext);
export const useSrika = () => useContext(SrikaContext);

interface SrikaProviderProps { children: ReactNode; }

const LAST_RESET_KEY = 'srika_last_trial_reset';

export function SrikaProvider({ children }: SrikaProviderProps) {
  const [poseLandmarks, setPoseLandmarks] = useState<NormalizedLandmarkList | null>(null);
  const [activeIntents, setActiveIntents] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [systemState, setSystemState] = useState<SystemState>('IDLE');
  const [isCameraOn, _setIsCameraOn] = useState(false);
  const setIsCameraOn = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    _setIsCameraOn(prev => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (prev !== nextVal) console.log(`[SrikaContext] Camera State CHANGE: ${prev} -> ${nextVal}`);
      return nextVal;
    });
  }, []);

  const [cameraConnected, setCameraConnected] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [isGameMode, setIsGameMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [steamStatus, setSteamStatus] = useState('NOT_AVAILABLE');
  const [tekkenStatus, setTekkenStatus] = useState('NOT_DETECTED');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // 1. Storage Keys (Clean Slate to avoid legacy data bugs)
  const USED_TIME_KEY = 'srika_v1_used_seconds';
  const TIER_KEY = 'srika_auth_tier';

  const [accessLevel, setAccessLevelState] = useState<'GUEST' | 'USER' | 'PRO'>(() => {
    const stored = localStorage.getItem('srika_auth_tier');
    console.log('[SrikaContext] Initial accessLevel from storage:', stored);
    return (stored as any) || 'GUEST';
  });

  // 2. Initial State Fetching
  const getInitialUsedTime = () => {
    const lastResetStr = localStorage.getItem(LAST_RESET_KEY);
    const now = new Date();
    const resetPoint = new Date();
    resetPoint.setHours(3, 0, 0, 0);
    if (now.getHours() < 3) resetPoint.setDate(resetPoint.getDate() - 1);

    const lastResetTime = lastResetStr ? parseInt(lastResetStr) : 0;

    // Daily Reset
    if (lastResetTime < resetPoint.getTime()) {
      localStorage.setItem(LAST_RESET_KEY, now.getTime().toString());
      localStorage.setItem(USED_TIME_KEY, "0");
      return 0;
    }

    const storedUsed = localStorage.getItem(USED_TIME_KEY);
    return storedUsed ? parseInt(storedUsed) : 0;
  };

  const [usedTimeToday, setUsedTimeToday] = useState<number>(getInitialUsedTime());

  const getLimit = useCallback((level: string) => {
    if (level === 'PRO') return 999999;
    if (level === 'USER') return 1800; // 30m
    return 300; // Default/Guest is 5m
  }, []);

  // DRIVER: trialRemainingTime is derived. NEVER set manually.
  const trialRemainingTime = useMemo(() => {
    const limit = getLimit(accessLevel);
    const remaining = Math.max(0, limit - usedTimeToday);
    return remaining;
  }, [accessLevel, usedTimeToday, getLimit]);

  const setAccessLevel = (level: 'GUEST' | 'USER' | 'PRO') => {
    console.log(`[SrikaContext] Setting Access Level: ${level}`);
    setAccessLevelState(level);
    localStorage.setItem(TIER_KEY, level);
  };

  const setTrialRemainingTime = (time: number) => {
    // Legacy support for manual setting - convert back to USED
    const limit = getLimit(accessLevel);
    const newUsed = Math.max(0, limit - time);
    setUsedTimeToday(newUsed);
  };

  const isTrialActive = (accessLevel === 'GUEST' || accessLevel === 'USER');
  const isSystemRunning = isCameraOn && (systemState === 'TRACKING' || systemState === 'READY' || systemState === 'STABILIZING');

  // Daily Reset Interval
  useEffect(() => {
    const dailyCheck = setInterval(() => {
      const now = new Date();
      const resetPoint = new Date();
      resetPoint.setHours(3, 0, 0, 0);
      if (now.getHours() < 3) resetPoint.setDate(resetPoint.getDate() - 1);

      const lastResetStr = localStorage.getItem(LAST_RESET_KEY);
      const lastResetTime = lastResetStr ? parseInt(lastResetStr) : 0;

      if (lastResetTime < resetPoint.getTime()) {
        console.log('[SrikaContext] Daily Timer Reset Triggered (3 AM)');
        localStorage.setItem(LAST_RESET_KEY, now.getTime().toString());
        localStorage.setItem(USED_TIME_KEY, "0");
        setUsedTimeToday(0);
      }
    }, 60000);
    return () => clearInterval(dailyCheck);
  }, []);

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem(USED_TIME_KEY, usedTimeToday.toString());
  }, [usedTimeToday]);

  // Consumption Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTrialActive && isSystemRunning && trialRemainingTime > 0) {
      interval = setInterval(() => {
        setUsedTimeToday(prev => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTrialActive, isSystemRunning, trialRemainingTime]);

  // Auth Sync
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onAdminStatus((status: boolean) => setIsAdmin(status));
      // @ts-ignore
      if (window.electronAPI.onSteamStatus) window.electronAPI.onSteamStatus((s: string) => setSteamStatus(s));
      // @ts-ignore
      if (window.electronAPI.onTekkenStatus) window.electronAPI.onTekkenStatus((s: string) => setTekkenStatus(s));
    }

    const handleAuthChange = (user: any) => {
      console.log('[SrikaContext] Auth Event:', user?.subscription);
      if (user) {
        if (user.subscription === 'PRO') setAccessLevel('PRO');
        else if (user.subscription === 'GUEST') setAccessLevel('GUEST');
        else if (user.subscription === 'FREE') setAccessLevel('USER');
        else setAccessLevel('USER');
      } else {
        setAccessLevel('GUEST');
      }
    };

    authManager.on('user-changed', handleAuthChange);
    handleAuthChange(authManager.getUser());
    return () => authManager.off('user-changed', handleAuthChange);
  }, []);

  // Sync Timer when accessLevel changes (e.g. Guest -> User)
  // This useEffect is no longer needed as trialRemainingTime is derived from usedTimeToday and accessLevel
  // useEffect(() => {
  //   const newLimit = calculateRemainingTime(accessLevel);
  //   setTrialTime(newLimit);
  // }, [accessLevel]);

  useEffect(() => {
    const updateProfile = () => {
      import('../managers/ProfileManager').then(({ ProfileManager }) => {
        setActiveProfileId(ProfileManager.getActive()?.id || null);
      });
    };
    updateProfile();
    window.addEventListener('srika-active-profile-changed', updateProfile);
    return () => window.removeEventListener('srika-active-profile-changed', updateProfile);
  }, []);

  const value = useMemo(() => ({
    poseLandmarks, setPoseLandmarks,
    activeIntents, setActiveIntents,
    confidence, setConfidence,
    systemState, setSystemState,
    isCameraOn, setIsCameraOn,
    cameraConnected, setCameraConnected,
    isMirrored, setIsMirrored,
    isFullScreen, setIsFullScreen,
    fps, setFps,
    latencyMs, setLatencyMs,
    isGameMode, setIsGameMode,
    isAdmin, setIsAdmin,
    steamStatus, setSteamStatus,
    tekkenStatus, setTekkenStatus,
    activeProfileId, setActiveProfileId,
    accessLevel, setAccessLevel,
    trialRemainingTime, setTrialRemainingTime,
    isTrialActive,
  }), [
    poseLandmarks, activeIntents, confidence, systemState, isCameraOn, setIsCameraOn,
    cameraConnected, isMirrored, isFullScreen, fps, latencyMs, isGameMode, isAdmin,
    steamStatus, tekkenStatus, activeProfileId, accessLevel, trialRemainingTime, isTrialActive
  ]);

  return (
    <SrikaContext.Provider value={value}>
      {children}
    </SrikaContext.Provider>
  );
}
