import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { InputController } from '../engine/InputController';
import { CalibrationManager } from '../managers/CalibrationManager';
import { ProfileManager } from '../managers/ProfileManager';

// 1. Types
export type EngineMode = 'IDLE' | 'TRAINING' | 'ACTIVE' | 'EMERGENCY_STOP' | 'CALIBRATION';
export type CameraState = 'OFF' | 'ON' | 'ERROR';
export type CalibrationStatus = 'UNSET' | 'VALID' | 'INVALID';

interface EngineContextType {
    engineMode: EngineMode;
    cameraState: CameraState;
    calibrationStatus: CalibrationStatus;

    // Actions
    setEngineMode: (mode: EngineMode) => void;
    emergencyStop: () => void;
    setCalibrationStatus: (status: CalibrationStatus) => void;

    // Training State
    trainingActionId: string | null;
    startTraining: (actionId: string) => void;
    cancelTraining: () => void;

    // Trial
    trialStatus: { isExpired: boolean, daysRemaining: number, percentUsed: number };

    // Errors
    lastError: string | null;
}

const EngineContext = createContext<EngineContextType | null>(null);

export const useEngine = () => {
    const context = useContext(EngineContext);
    if (!context) throw new Error('useEngine must be used within an EngineProvider');
    return context;
};

interface EngineProviderProps {
    children: ReactNode;
}

export function EngineProvider({ children }: EngineProviderProps) {
    // State
    const [engineMode, _setEngineMode] = useState<EngineMode>('IDLE');
    const [cameraState, setCameraState] = useState<CameraState>('OFF');
    const [calibrationStatus, _setCalibrationStatus] = useState<CalibrationStatus>('UNSET');
    const [lastError, setLastError] = useState<string | null>(null);
    const [trialStatus, setTrialStatus] = useState({ isExpired: false, daysRemaining: 30, percentUsed: 0 });

    // Sync Ref for synchronous checks (fixes closure bug in rapid transitions)
    const calibrationStatusRef = useRef<CalibrationStatus>('UNSET');
    const setCalibrationStatus = useCallback((status: CalibrationStatus) => {
        calibrationStatusRef.current = status;
        _setCalibrationStatus(status);
    }, []);

    // --- INVARIANT LOGIC ---

    // Transition Handler
    const setEngineMode = useCallback(async (newMode: EngineMode) => {
        console.log(`[Engine] Transition request: ${engineMode} -> ${newMode} (Calibration: ${calibrationStatusRef.current})`);

        // 1. ESTOP is a trap state
        if (engineMode === 'EMERGENCY_STOP' && newMode !== 'IDLE') {
            console.warn('[Engine] Blocked: Can only transition from ESTOP to IDLE.');
            return;
        }

        // 2. TRIAL ENFORCEMENT
        if (newMode === 'ACTIVE') {
            const status = ProfileManager.getTrialStatus();
            setTrialStatus(status);
            if (status.isExpired) {
                console.error('[Engine] Blocked: Trial expired.');
                setLastError('Trial expired. Please upgrade to continue.');
                return;
            }

            // Centralized Daily Limit Check (Backup)
            const used = parseInt(localStorage.getItem('srika_v1_used_seconds') || '0');
            const level = localStorage.getItem('srika_auth_tier') || 'GUEST';
            const limit = level === 'USER' ? 1800 : level === 'PRO' ? 999999 : 300;

            if (used >= limit) {
                console.error('[Engine] Blocked: Daily limit reached.');
                setLastError('Daily limit reached. Please come back tomorrow.');
                return;
            }
        }

        // 3. ACTIVE Requires VALID Calibration
        if (newMode === 'ACTIVE' && calibrationStatusRef.current !== 'VALID') {
            console.warn('[Engine] Blocked: ACTIVE mode requires VALID calibration.');
            setLastError('Calibration required before starting');
            return;
        }

        // 4. SESSION TRACKING
        if (newMode === 'ACTIVE' && engineMode !== 'ACTIVE') {
            await ProfileManager.onEngineStart();
        } else if (engineMode === 'ACTIVE' && newMode !== 'ACTIVE') {
            await ProfileManager.onEngineStop();
        }

        // 5. SAFETY LATCH (Synchronous)
        if (newMode === 'ACTIVE') {
            InputController.setInputAllowed(true);
        } else {
            InputController.setInputAllowed(false);
        }

        // 6. Apply Mode
        _setEngineMode(newMode);

        // 7. Enforce Camera Invariants
        if (newMode === 'EMERGENCY_STOP' || newMode === 'IDLE') {
            setCameraState('OFF');
        } else {
            setCameraState('ON');
        }

    }, [engineMode, calibrationStatus]);

    // Emergency Stop
    const emergencyStop = useCallback(async () => {
        console.error('[Engine] !!! EMERGENCY STOP TRIGGERED !!!');
        InputController.setInputAllowed(false);
        InputController.emergencyStop();

        if (engineMode === 'ACTIVE') {
            await ProfileManager.onEngineStop();
        }

        _setEngineMode('EMERGENCY_STOP');
        setCameraState('OFF');
    }, [engineMode]);


    // --- MOUNT/UNMOUNT LIFECYCLE ---
    const emergencyStopRef = useRef(emergencyStop);
    useEffect(() => { emergencyStopRef.current = emergencyStop; }, [emergencyStop]);

    useEffect(() => {
        // Only set IDLE on initial mount
        _setEngineMode('IDLE');

        if ((window as any).electronAPI) {
            (window as any).electronAPI.onEmergencyStop(() => {
                console.error('[Engine] Shortcut triggered Emergency Stop');
                emergencyStopRef.current();
            });
        }

        const setup = async () => {
            if (window.electronAPI) {
                console.log('[Engine] Sending DEV_TOKEN verification...');
                window.electronAPI.triggerKey('CMD:VERIFY:DEV_TOKEN');
            }

            await ProfileManager.init();
            setTrialStatus(ProfileManager.getTrialStatus());

            const isValid = CalibrationManager.load();
            const initialStatus = isValid ? 'VALID' : 'INVALID';
            calibrationStatusRef.current = initialStatus;
            _setCalibrationStatus(initialStatus);

            window.dispatchEvent(new CustomEvent('srika-profiles-ready'));
        };

        setup();

        return () => {
            if (window.electronAPI) {
                window.electronAPI.triggerKey('idle');
            }
        };
    }, []); // Empty dependency array fixes the infinite loop


    const [trainingActionId, setTrainingActionId] = useState<string | null>(null);

    const startTraining = useCallback((actionId: string) => {
        setTrainingActionId(actionId);
        setEngineMode('TRAINING');
    }, [setEngineMode]);

    const cancelTraining = useCallback(() => {
        setTrainingActionId(null);
        setEngineMode('IDLE');
    }, [setEngineMode]);

    return (
        <EngineContext.Provider value={{
            engineMode,
            cameraState,
            calibrationStatus,
            setEngineMode,
            emergencyStop,
            setCalibrationStatus,
            lastError,
            trainingActionId,
            startTraining,
            cancelTraining,
            trialStatus
        }}>
            {children}
        </EngineContext.Provider>
    );
}
