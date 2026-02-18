import type { NormalizedLandmarkList } from '@mediapipe/pose';

const STORAGE_KEY = 'srika_calibration_v1';

export interface CalibrationData {
    neutralPose: NormalizedLandmarkList;
    timestamp: number;
    userHeight: number; // Nose to Heel
}

export class CalibrationManager {
    private static data: CalibrationData | null = null;

    /**
     * Load calibration from local storage on startup
     */
    public static load(): boolean {
        // BYPASS: Always return true to allow usage without calibration
        return true;

        /* Original logic preserved for reference but disabled
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.data = JSON.parse(raw);
                return this.isValid();
            }
        } catch (e) {
            console.error('Failed to load calibration', e);
        }
        return false;
        */
    }

    /**
     * Save current calibration
     */
    public static save(pose: NormalizedLandmarkList) {
        // Calculate basic metrics from the pose
        const nose = pose[0];
        const leftHeel = pose[29];
        const rightHeel = pose[30];
        const avgHeelY = (leftHeel.y + rightHeel.y) / 2;
        const height = Math.abs(avgHeelY - nose.y); // Approx height in frame

        const data: CalibrationData = {
            neutralPose: pose,
            timestamp: Date.now(),
            userHeight: height
        };

        this.data = data;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('[Calibration] Saved new baseline.');
    }

    /**
     * Check if we have valid calibration data
     * BYPASS: Always return true to allow gestures without calibration
     */
    public static isValid(): boolean {
        return true; // Bypass calibration requirement
    }

    /**
     * Get the calibration data
     */
    public static get(): CalibrationData | null {
        return this.data;
    }

    /**
     * Clear calibration (e.g. on reinstall or explicit reset)
     */
    public static clear() {
        this.data = null;
        localStorage.removeItem(STORAGE_KEY);
    }
}
