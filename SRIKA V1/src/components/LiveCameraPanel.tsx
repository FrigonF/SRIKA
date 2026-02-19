import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { Maximize2, Minimize2, VideoOff } from 'lucide-react';
import { Pose, POSE_CONNECTIONS, Results, NormalizedLandmarkList } from '@mediapipe/pose';
import { Hands, NormalizedLandmarkList as HandLandmarkList, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { useSrika } from '../context/SrikaContext';
import { useEngine, CameraState } from '../context/EngineContext';
import { gestureEngine } from '../engine/GestureEngine';
import { settingsManager } from '../managers/SettingsManager';


export function LiveCameraPanel() {
  // --- REFS (Truth Source for Loop) ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const handsRef = useRef<Hands | null>(null);

  // Lifecycle & Loop Refs
  const rafId = useRef<number | null>(null);
  const isComponentMounted = useRef(true);
  const isProcessingFrame = useRef(false);
  const loopInstanceId = useRef(Math.random().toString(36).substr(2, 9));

  // Data Refs (Shared between callback and component)
  const lastPoseRef = useRef<NormalizedLandmarkList | null>(null);
  const lastHandsRef = useRef<{ landmarks: HandLandmarkList[]; handedness: any[] } | null>(null);
  const lastSentIntentsRef = useRef<string>("");
  const lastContextUpdate = useRef(0);
  const lastHeartbeat = useRef(0);
  const lastImageRef = useRef<any>(null); // For decoupled rendering

  // Sync Refs (for zero-dep onResults)
  const engineStateRef = useRef({
    cameraState: 'OFF' as CameraState,
    engineMode: 'IDLE' as string,
    activeProfileId: null as string | null,
    isMirrored: true,
    isCameraOn: false
  });

  const context = useSrika();
  const { cameraState, engineMode } = useEngine();

  // --- SYNC EFFECTS (Update Refs, No Loop Restarts) ---
  useEffect(() => {
    engineStateRef.current = {
      cameraState,
      engineMode,
      activeProfileId: context.activeProfileId,
      isMirrored: context.isMirrored,
      isCameraOn: context.isCameraOn
    };
  }, [cameraState, engineMode, context.activeProfileId, context.isMirrored, context.isCameraOn]);


  // --- THE POSE CALLBACK (STABLE REF PATTERN) ---
  const contextRef = useRef(context);
  useEffect(() => { contextRef.current = context; }, [context]);

  const onResults = useCallback((results: Results) => {
    const ctxValue = contextRef.current;
    if (!isComponentMounted.current || !ctxValue) return;

    // Heartbeat & Structure
    if (Math.random() < 0.05) {
      console.log("[Camera] onResults heartbeat - MediaPipe is ALIVE");
    }

    // 1. Data Update (Reference Logic Only)
    const { engineMode: currentMode } = engineStateRef.current;
    const now = performance.now();
    let renderPose = results.poseLandmarks || lastPoseRef.current;

    if (renderPose) {
      lastPoseRef.current = renderPose;
      lastImageRef.current = results.image;

      // Update Metrics (Throttled)
      if (now - lastContextUpdate.current > 100) {
        ctxValue.setPoseLandmarks(renderPose);
        ctxValue.setLatencyMs(Math.round(performance.now() - now));
        ctxValue.setFps(60);
        lastContextUpdate.current = now;
      }

      // Gesture Engine
      try {
        const detection = gestureEngine.process(
          renderPose,
          lastHandsRef.current?.landmarks,
          lastHandsRef.current?.handedness
        );

        if (detection) {
          const isAct = currentMode === 'ACTIVE';
          const bridgeIntents = isAct ? detection.intents as string[] : [];
          const intentsStr = bridgeIntents.join(',');

          // 1. Snappy UI Updates (Every frame)
          ctxValue.setConfidence(detection.confidence);
          ctxValue.setSystemState(detection.state);
          ctxValue.setActiveIntents(detection.intents as string[]);

          // 2. Throttled Bridge Updates (Only when active & changed)
          if (intentsStr !== lastSentIntentsRef.current || (now - lastHeartbeat.current > 3000)) {
            if (window.electronAPI?.sendInput) window.electronAPI.sendInput(bridgeIntents);
            lastSentIntentsRef.current = intentsStr;
            lastHeartbeat.current = now;
          }
        }
      } catch (ge) {
        console.error("[Camera] Gesture Error:", ge);
      }
    }
  }, []);

  // --- THE MASTER LIFECYCLE (ENFORCED SINGLE LOOP) ---
  useEffect(() => {
    console.log(`[Camera] MASTER LOOP STARTING. ID: ${loopInstanceId.current}`);
    isComponentMounted.current = true;

    // Helper to resolve MediaPipe asset paths
    const locateFile = (file: string, pkg: 'pose' | 'hands') => {
      // In production, we use the custom srika-asset protocol to bypass ASAR
      const isProd = window.location.protocol === 'file:';
      const localUrl = isProd
        ? `srika-asset://mediapipe/${pkg}/${file}`
        : `./mediapipe/${pkg}/${file}`;

      console.log(`[MediaPipe] Requesting ${pkg}/${file} -> ${localUrl}`);
      return localUrl;
    };

    // 1. Create MediaPipe Instances (ONCE)
    let pose: Pose | null = null;
    let hands: Hands | null = null;

    try {
      console.log("[Camera] Initializing AI Models...");
      pose = new Pose({ locateFile: (file) => locateFile(file, 'pose') });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      pose.onResults(onResults);
      poseRef.current = pose;

      hands = new Hands({ locateFile: (file) => locateFile(file, 'hands') });
      hands.setOptions({ modelComplexity: 0, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      hands.onResults((res) => {
        if (Math.random() < 0.05) {
          console.log(`[Camera] Hands heartbeat - count: ${res.multiHandLandmarks?.length || 0}`);
        }
        lastHandsRef.current = { landmarks: res.multiHandLandmarks, handedness: res.multiHandedness };
      });
      handsRef.current = hands;
    } catch (err) {
      console.error("[Camera] AI Initialization Failed:", err);
      setLoadError(err instanceof Error ? err.message : "AI Initialization Failed");
    }

    // 2. The MASTER RAF Loop
    const tick = async () => {
      if (!isComponentMounted.current) return;

      const { cameraState, isCameraOn, activeProfileId } = engineStateRef.current;
      const wantsActive = cameraState === 'ON' || isCameraOn;
      const shouldProcess = wantsActive && videoRef.current && videoRef.current.readyState >= 2;

      // A. Processing (Throttled by Inference)
      if (shouldProcess && !isProcessingFrame.current) {
        isProcessingFrame.current = true;
        try {
          // Serial processing (More stable WASM state)
          if (poseRef.current) {
            await poseRef.current.send({ image: videoRef.current! });
          }
          if (handsRef.current) {
            await handsRef.current.send({ image: videoRef.current! });
          }
        } catch (e) {
          if (Math.random() < 0.05) console.warn("[Camera] Frame skip", e);
        } finally {
          isProcessingFrame.current = false;
        }
      }

      // B. Rendering (Decoupled @ 60fps)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const img = lastImageRef.current;
      const poseData = lastPoseRef.current;

      if (canvas && ctx && poseData) {
        // 1. Resize if needed
        if (img && (img.width !== canvas.width || img.height !== canvas.height)) {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Skeleton
        const isAsphalt = activeProfileId === 'asphalt9';
        if (isAsphalt) {
          drawConnectors(ctx, poseData, [[11, 13], [13, 15], [12, 14], [14, 16], [11, 12]] as any, { color: '#22d3ee', lineWidth: 4 });
        } else {
          drawConnectors(ctx, poseData, POSE_CONNECTIONS, { color: '#00ccff', lineWidth: 3 });
        }
        drawLandmarks(ctx, poseData, { color: '#ffffff', radius: 2 });

        // 3. Draw Hands
        const handsData = lastHandsRef.current?.landmarks;
        if (handsData) {
          handsData.forEach((hand: any) => {
            drawConnectors(ctx, hand, HAND_CONNECTIONS, { color: '#ffffff', lineWidth: 2 });
            drawLandmarks(ctx, hand, { color: '#22d3ee', radius: 1 });
          });
        }
      }

      rafId.current = requestAnimationFrame(tick);
    };

    // Start Exactly Once
    rafId.current = requestAnimationFrame(tick);

    // ... (imports)

    // ... inside component ...
    // 3. Hardware Manager (Manage stream based on state)
    let activeStream: MediaStream | null = null;
    let currentSettingsHash = '';

    const getSettingsHash = () => {
      const cam = settingsManager.get('camera');
      return `${cam.resolution}-${cam.fps}`;
    };

    const hardwareInterval = setInterval(async () => {
      if (!isComponentMounted.current) return;

      const { cameraState, isCameraOn } = engineStateRef.current;
      const wantsActive = cameraState === 'ON' || isCameraOn;
      const newSettingsHash = getSettingsHash();
      const settingsChanged = activeStream && currentSettingsHash !== newSettingsHash;

      // If settings changed while active, force restart
      if (settingsChanged) {
        console.log('[Camera] Settings changed, restarting stream...');
        if (activeStream) activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        contextRef.current.setCameraConnected(false);
      }

      if (wantsActive && !activeStream) {
        console.log("[Camera] Hardware: Requesting stream...");
        try {
          const camSettings = settingsManager.get('camera');
          // Parse resolution "1280x720"
          const [w, h] = camSettings.resolution.split('x').map(Number);

          const constraints = {
            video: {
              width: { ideal: w },
              height: { ideal: h },
              frameRate: { ideal: camSettings.fps }
            }
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);

          activeStream = stream;
          currentSettingsHash = newSettingsHash;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              console.log("[Camera] Metadata loaded, triggering play()");
              videoRef.current?.play().catch(e => console.error("[Camera] Play failed:", e));
            };
          }
          contextRef.current.setCameraConnected(true);
        } catch (e) {
          console.error("Hardware Fail", e);
          contextRef.current.setCameraConnected(false);
        }
      } else if (!wantsActive && activeStream) {
        console.log("[Camera] Hardware: Stopping stream...");
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        contextRef.current.setCameraConnected(false);
      }
    }, 500);


    return () => {
      console.log(`[Camera] MASTER LOOP STOPPING. ID: ${loopInstanceId.current}`);
      isComponentMounted.current = false;
      clearInterval(hardwareInterval);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
      if (pose) pose.close();
      if (hands) hands.close();
    };
  }, []); // ABSOLUTELY NO DEPENDENCIES

  return (
    <motion.div layout className={`bg-white/[0.08] backdrop-blur-[80px] rounded-xl border border-white/20 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col group ${context.isFullScreen ? 'fixed inset-0 z-50 m-0 rounded-none' : 'h-full'}`}>
      <div className="px-4 py-3 border-b border-white/20 bg-gradient-to-r from-white/15 to-transparent flex items-center justify-between shrink-0 z-10 backdrop-blur-[80px]">
        <span className="text-gray-200 font-bold uppercase tracking-wider text-[14px]">Live Pose Detection</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${!context.cameraConnected ? 'bg-gray-600' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="font-bold uppercase tracking-widest text-gray-400 text-[11px]">{context.cameraConnected ? 'LIVE FEED' : 'OFFLINE'}</span>
          </div>
          <button onClick={() => context.setIsFullScreen(!context.isFullScreen)} className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors">
            {context.isFullScreen ? <Minimize2 className="w-4 h-4 text-gray-400" /> : <Maximize2 className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>
      <div className="relative flex-1 bg-[#0f111a] min-h-0 flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${!context.cameraConnected ? 'opacity-0' : 'opacity-100'}`} style={{ transform: context.isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }} playsInline muted autoPlay />
        <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${!context.cameraConnected ? 'hidden' : ''}`} style={{ transform: context.isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }} />

        {!context.cameraConnected && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-[#0f111a]">
            <VideoOff className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">Camera Inactive</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-black/80 p-4 text-center">
            <VideoOff className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-bold mb-2">AI ENGINE ERROR</p>
            <p className="text-xs opacity-70 max-w-[200px] leading-relaxed">{loadError}</p>
            <p className="text-[10px] mt-4 opacity-40">Please reinstall or contact support.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
