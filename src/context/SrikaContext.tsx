import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { NormalizedLandmarkList } from '@mediapipe/pose';

// System States
export type SystemState = 'IDLE' | 'STABILIZING' | 'TRACKING' | 'READY' | 'ERROR';

// Context Interface
interface SrikaContextType {
  // Core Pose Data
  poseLandmarks: NormalizedLandmarkList | null;
  setPoseLandmarks: (landmarks: NormalizedLandmarkList | null) => void;

  // Intent & Control
  activeIntents: string[];  // ['W', 'D', 'P'] etc.
  setActiveIntents: (intents: string[]) => void;

  // System Metadata
  confidence: number;
  setConfidence: (score: number) => void;

  systemState: SystemState;
  setSystemState: (state: SystemState) => void;

  // Hardware State
  isCameraOn: boolean; // User Switch
  setIsCameraOn: (on: boolean) => void;
  cameraConnected: boolean; // Actual Stream State
  setCameraConnected: (connected: boolean) => void;

  // Camera Settings
  isMirrored: boolean;
  setIsMirrored: (mirrored: boolean) => void;

  // UI State
  isFullScreen: boolean;
  setIsFullScreen: (full: boolean) => void;

  // Performance
  fps: number;
  setFps: (fps: number) => void;

  latencyMs: number;
  setLatencyMs: (ms: number) => void;

  // New OS States
  isGameMode: boolean;
  setIsGameMode: (on: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
}

// Default Values
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
  isMirrored: true, // Default to true (standard mirror mode)
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
};

const SrikaContext = createContext<SrikaContextType>(defaultContext);

export const useSrika = () => useContext(SrikaContext);

interface SrikaProviderProps {
  children: ReactNode;
}

export function SrikaProvider({ children }: SrikaProviderProps) {
  const [poseLandmarks, setPoseLandmarks] = useState<NormalizedLandmarkList | null>(null);
  const [activeIntents, setActiveIntents] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [systemState, setSystemState] = useState<SystemState>('IDLE');
  const [isCameraOn, setIsCameraOn] = useState(false); // Default OFF per requirement
  const [cameraConnected, setCameraConnected] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [isGameMode, setIsGameMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <SrikaContext.Provider
      value={{
        poseLandmarks,
        setPoseLandmarks,
        activeIntents,
        setActiveIntents,
        confidence,
        setConfidence,
        systemState,
        setSystemState,
        isCameraOn,
        setIsCameraOn,
        cameraConnected,
        setCameraConnected,
        isMirrored,
        setIsMirrored,
        isFullScreen,
        setIsFullScreen,
        fps,
        setFps,
        latencyMs,
        setLatencyMs,
        isGameMode,
        setIsGameMode,
        isAdmin,
        setIsAdmin,
      }}
    >
      {children}
    </SrikaContext.Provider>
  );
}
