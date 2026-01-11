# SRIKA - Real-Time Body Motion Game Control

SRIKA is a native Windows application that converts your body movements into **Virtual Xbox 360 Controller** inputs, allowing you to play fighting games (like Tekken 8, Street Fighter 6) using only your webcam.

## ⚠ CRITICAL PRE-REQUISITE
**You MUST install the ViGEmBus Driver for the virtual controller to work.**
1. Download the latest installer: [ViGEmBus Release](https://github.com/ViGEm/ViGEmBus/releases/latest)
2. Run the installer (.exe) and restart your computer if prompted.

## Architecture
- **Input:** Webcam (MediaPipe Pose Detection)
- **Engine:** Electron + React (Gesture Recognition)
- **Output:** Python Sidecar (Virtual Xbox 360 Controller via ViGEmBus)

## Gestures & Controls
SRIKA maps your body movements to a virtual gamepad:
- **Move Left/Right:** Move hips laterally -> **Left Stick X**
- **Crouch:** Squat down -> **Left Stick Y (Down)**
- **Jump:** Rapid upward motion -> **Button A**
- **Punch:** Punch forward -> **Button X**
- **Kick:** Kick or wide stance -> **Button B**
- **Air Combo:** Hands up -> **Button Y**
- **Special:** Special Pose -> **Right Trigger**
- **Rage:** Power Stance -> **Left Trigger**

---

## Key Features
- **Virtual Xbox 360 Controller**: Native integration via ViGEmBus.
- **Background Execution**: SRIKA continues to run and track gestures even when minimized to the System Tray or behind your game.
- **Ultra-Low Latency**: Direct hardware interrupt emulation via Python sidecar.
- **Admin-level Input**: Works with games running as Administrator (Tekken 8, SF6).

## Usage Guide
1. **Launch SRIKA**: Double-click `launch_srika.bat`.
   - *Note*: Accept the UAC prompt to ensure Admin privileges (required for game input).
2. **Start Camera**: Click the toggle in the Dashboard to start tracking.
3. **Minimize (Optional)**: Click the minimize button to send SRIKA to the System Tray. 
   - Tracking **CONTINUES** in the background.
   - Double-click the Tray icon to restore the UI.
4. **Play**: Launch your game. SRIKA acts as "Controller 1" or "Controller 2".

---

## Setup & Run
To launch the app as a standalone Windows window with REAL OS-level keyboard control:

1. **Open Terminal (As Administrator)**: Right-click your terminal (PowerShell or CMD) and select "Run as Administrator". This is required for the system-wide keyboard injection to work.
2. **Navigate to the project directory**.
3. **Launch Command**:
   ```powershell
   npm run electron
   ```
4. **Wait**: The SRIKA window will appear automatically.

> [!IMPORTANT]
> If you do not run your terminal as Administrator, the app will still open, but the model might fail to press keys in games.

---

## 3. How to Test the Model

### Phase 1: Visual Verification
1. Open the **SRIKA App**.
2. Go to the **Dashboard**.
3. Click the green **START CAMERA** button.
4. **Result**: You should see your camera feed (horizontally inverted/mirrored for natural movement). 
5. Step back so your body is visible. You should see a **Cyan Skeleton** overlaid on your body.

### Phase 2: Logic Verification
1. Perform a **Jump** or **Punch**.
2. **Result**: The "Current Action" card in the app should change from `IDLE` to `W` (Jump) or `P` (Power).
3. The **Recent Moves** list will track your history.

### Phase 3: Real OS-Level Input (Game Test)
1. Ensure you have launched the app as **Administrator**.
2. Open the SRIKA App and toggle **GAME MODE: ON** (found in the top status bar).
3. Open a Game (or a simple text editor like Notepad).
4. Ensure the game/notepad is the **focused window**.
5. Perform a gesture in the SRIKA app.
6. **Result**: The "W", "A", "S", or "D" keys will be pressed automatically at the Windows System level using hardware scan codes, controlling your game even with DirectInput.

---

## 4. Troubleshooting
- **No Video**: Click "STOP CAMERA" then "START CAMERA" again.
- **Window Stuck**: You can drag the window by the top "SRIKA" bar. Use the top-right buttons to Minimize or Close.
- **Low FPS**: Ensure your room is well-lit for accurate tracking.
