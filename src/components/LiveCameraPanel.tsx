import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Maximize2, Minimize2, VideoOff } from 'lucide-react';
import { Pose, POSE_CONNECTIONS, Results } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { useSrika } from '../context/SrikaContext';
import { gestureEngine } from '../engine/GestureEngine';

export function LiveCameraPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const lastContextUpdate = useRef<number>(0);
  const isVideoPlaying = useRef(false);

  const context = useSrika();

  // Destructure for dependency arrays to avoid deep re-renders
  const {
    isCameraOn,
    setCameraConnected,
    setPoseLandmarks,
    setActiveIntents,
    setConfidence,
    setSystemState,
    setLatencyMs,
    setFps,
    cameraConnected,
    isMirrored,
    isFullScreen,
    setIsFullScreen
  } = context;

  // Toggle FS
  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  // --------------------------------------------------
  // 1. POSE PIPELINE SETUP (Persistent)
  // --------------------------------------------------
  const poseRef = useRef<Pose | null>(null);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onResults);
    poseRef.current = pose;

    return () => {
      if (poseRef.current) poseRef.current.close();
    };
  }, []); // Run ONCE at mount

  // --------------------------------------------------
  // 2. THE GAME LOOP (Processing & Rendering)
  // --------------------------------------------------
  const onResults = useCallback((results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();

    // 1. Clear & Setup Canvas
    canvas.width = results.image.width;
    canvas.height = results.image.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Process Detection
    if (results.poseLandmarks) {
      const detection = gestureEngine.process(results.poseLandmarks, now);

      // Draw Skeleton
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#06b6d4', lineWidth: 3 });
      drawLandmarks(ctx, results.poseLandmarks, { color: '#10b981', lineWidth: 2, radius: 4 });

      // THROTTLE CONTEXT UPDATES for Performance (Every 100ms = 10fps UI update)
      if (now - lastContextUpdate.current > 100) {
        setPoseLandmarks(results.poseLandmarks);
        setActiveIntents(detection.intents as string[]);
        setConfidence(detection.confidence);
        setSystemState(detection.state);
        setLatencyMs(performance.now() - now);
        // Calculate FPS roughly based on loop speed from Engine or local diff
        setFps(detection.state === 'TRACKING' ? 60 : 30); // Placeholder for rapid switching
        lastContextUpdate.current = now;
      }
    } else {
      // Loop running but no person
      if (now - lastContextUpdate.current > 200) {
        setSystemState('TRACKING');
        setActiveIntents([]);
        setConfidence(0);
        lastContextUpdate.current = now;
      }
    }
  }, []);

  const tick = useCallback(async () => {
    if (!videoRef.current || !poseRef.current || !isVideoPlaying.current) {
      // Keep requesting if intended to run but not ready yet
      if (isCameraOn) rafId.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;

    if (video.readyState >= 2) {
      await poseRef.current.send({ image: video });
    }

    rafId.current = requestAnimationFrame(tick);
  }, [isCameraOn]);


  // --------------------------------------------------
  // 3. CAMERA LIFECYCLE (Explicit Start/Stop)
  // --------------------------------------------------
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (isCameraOn) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, frameRate: { ideal: 60 } }
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
              videoRef.current?.play();
              isVideoPlaying.current = true;
              setCameraConnected(true);
              setSystemState('IDLE');
              // Start Loop
              rafId.current = requestAnimationFrame(tick);
            };
          }
        } else {
          // Clean Stop
          setCameraConnected(false);
          setSystemState('IDLE');
          setActiveIntents([]);
          setConfidence(0);
          setFps(0);
          setLatencyMs(0);
        }
      } catch (err) {
        console.error("Camera Start Failed", err);
        setCameraConnected(false);
      }
    };

    startCamera();

    return () => {
      isVideoPlaying.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isCameraOn, setCameraConnected, setSystemState, setActiveIntents, setConfidence, setFps, setLatencyMs, tick]);


  return (
    <motion.div
      layout
      className={`
        bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20 flex flex-col group
        ${isFullScreen ? 'fixed inset-0 z-50 m-0 rounded-none' : 'h-full'}
      `}
    >
      <div className="px-4 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent flex items-center justify-between shrink-0 z-10 transition-colors">
        <span className="text-slate-300 text-sm font-medium">Live Pose Detection</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${!cameraConnected ? 'bg-slate-600' :
              'bg-emerald-400 animate-pulse'
              } shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
            <span className="text-xs text-slate-400 font-mono">
              {cameraConnected ? 'LIVE FEED' : 'OFFLINE'}
            </span>
          </div>
          <button
            onClick={toggleFullScreen}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4 text-slate-400" /> : <Maximize2 className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-[#0f111a] min-h-0 flex items-center justify-center overflow-hidden">
        {/* RAW VIDEO ELEMENT - VISIBLE */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${!cameraConnected ? 'opacity-0' : 'opacity-100'}`}
          style={{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
          playsInline
          muted
          autoPlay
        />

        {/* 
          CRITICAL: Background Execution Hack 
          Playing audio allows the tab to continue processing requestAnimationFrame 
          and timers even when minimized or fully backgrounded by the OS.
        */}
        {cameraConnected && (
          <audio
            autoPlay
            loop
            muted={false} // Must be technically 'playing' sound for some heuristics, but we use 0 volume or empty source
            src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
            style={{ display: 'none' }}
          />
        )}

        {/* DARK FILTER OVERLAY */}
        {cameraConnected && <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />}

        {/* CANVAS OVERLAY */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${!cameraConnected ? 'hidden' : ''}`}
          style={{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
        />

        {/* OFF STATE / PLACEHOLDER */}
        {!cameraConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
            <VideoOff className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">Camera Inactive</p>
            <p className="text-xs opacity-50 mt-1">Enable camera in Dashboard to start</p>
          </div>
        )}

        {/* OVERLAYS */}
        {cameraConnected && context.activeIntents.length > 0 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 z-20">
            <span className="text-2xl font-bold italic text-white drop-shadow-md">
              {context.activeIntents.join(' + ')}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}