import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pause, Play, Activity, Zap, Hand, Target } from 'lucide-react';

interface FullScreenSkeletonViewProps {
  onExit: () => void;
}

export function FullScreenSkeletonView({ onExit }: FullScreenSkeletonViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [fps, setFps] = useState(60);
  const [latency, setLatency] = useState(12);
  const [currentGesture, setCurrentGesture] = useState('Right Hand Raised');
  const [currentAction, setCurrentAction] = useState('Punch (J)');
  const [lastExecutedMove, setLastExecutedMove] = useState('Special Move');
  const [currentGameAction, setCurrentGameAction] = useState('Air Combo Initiated');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pose skeleton points (normalized coordinates)
    const posePoints = {
      nose: { x: 0.5, y: 0.2 },
      leftEye: { x: 0.48, y: 0.18 },
      rightEye: { x: 0.52, y: 0.18 },
      leftEar: { x: 0.45, y: 0.19 },
      rightEar: { x: 0.55, y: 0.19 },
      leftShoulder: { x: 0.42, y: 0.32 },
      rightShoulder: { x: 0.58, y: 0.32 },
      leftElbow: { x: 0.38, y: 0.48 },
      rightElbow: { x: 0.62, y: 0.48 },
      leftWrist: { x: 0.35, y: 0.64 },
      rightWrist: { x: 0.72, y: 0.58 },
      leftHip: { x: 0.44, y: 0.58 },
      rightHip: { x: 0.56, y: 0.58 },
      leftKnee: { x: 0.43, y: 0.75 },
      rightKnee: { x: 0.57, y: 0.75 },
      leftAnkle: { x: 0.42, y: 0.92 },
      rightAnkle: { x: 0.58, y: 0.92 },
    };

    const connections = [
      ['leftEye', 'nose'],
      ['rightEye', 'nose'],
      ['leftEye', 'leftEar'],
      ['rightEye', 'rightEar'],
      ['leftShoulder', 'rightShoulder'],
      ['leftShoulder', 'leftElbow'],
      ['leftElbow', 'leftWrist'],
      ['rightShoulder', 'rightElbow'],
      ['rightElbow', 'rightWrist'],
      ['leftShoulder', 'leftHip'],
      ['rightShoulder', 'rightHip'],
      ['leftHip', 'rightHip'],
      ['leftHip', 'leftKnee'],
      ['leftKnee', 'leftAnkle'],
      ['rightHip', 'rightKnee'],
      ['rightKnee', 'rightAnkle'],
    ];

    let animationFrame = 0;
    let animationId: number;

    const animate = () => {
      if (isPaused) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Enhanced gradient background
      const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5);
      bgGradient.addColorStop(0, '#1e2634');
      bgGradient.addColorStop(0.5, '#1a1d2e');
      bgGradient.addColorStop(1, '#151820');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle animated grid
      ctx.strokeStyle = 'rgba(42, 45, 62, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      const offset = (animationFrame * 0.5) % gridSize;
      
      for (let i = -gridSize; i < width + gridSize; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i + offset, 0);
        ctx.lineTo(i + offset, height);
        ctx.stroke();
      }
      for (let i = -gridSize; i < height + gridSize; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i + offset);
        ctx.lineTo(width, i + offset);
        ctx.stroke();
      }

      // Breathing animation
      const breathe = Math.sin(animationFrame * 0.02) * 0.01;

      // Enhanced bounding box with animated gradient
      const boxGradient = ctx.createLinearGradient(0, 0, width, height);
      const colorShift = Math.sin(animationFrame * 0.05) * 0.3 + 0.5;
      boxGradient.addColorStop(0, `rgba(6, 182, 212, ${0.4 + colorShift * 0.3})`);
      boxGradient.addColorStop(0.5, `rgba(59, 130, 246, ${0.3 + colorShift * 0.2})`);
      boxGradient.addColorStop(1, `rgba(16, 185, 129, ${0.3 + colorShift * 0.2})`);
      ctx.strokeStyle = boxGradient;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -animationFrame * 0.5;
      const boxPadding = 120;
      ctx.strokeRect(
        width * 0.35 - boxPadding,
        height * 0.12,
        width * 0.3 + boxPadding * 2,
        height * 0.8
      );
      ctx.setLineDash([]);

      // Draw skeleton connections with enhanced gradient
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 15;

      connections.forEach(([point1, point2], index) => {
        const p1 = posePoints[point1 as keyof typeof posePoints];
        const p2 = posePoints[point2 as keyof typeof posePoints];
        
        const lineGradient = ctx.createLinearGradient(
          width * p1.x, height * (p1.y + breathe),
          width * p2.x, height * (p2.y + breathe)
        );
        lineGradient.addColorStop(0, '#06b6d4');
        lineGradient.addColorStop(0.5, '#3b82f6');
        lineGradient.addColorStop(1, '#0891b2');
        
        ctx.strokeStyle = lineGradient;
        ctx.shadowColor = '#06b6d4';
        
        ctx.beginPath();
        ctx.moveTo(width * p1.x, height * (p1.y + breathe));
        ctx.lineTo(width * p2.x, height * (p2.y + breathe));
        ctx.stroke();
      });

      ctx.shadowBlur = 0;

      // Draw joints with enhanced glow effects
      Object.entries(posePoints).forEach(([key, point]) => {
        const isActiveJoint = key === 'rightWrist';
        
        // Outer animated glow
        const glowSize = isActiveJoint ? 25 : 18;
        const glowGradient = ctx.createRadialGradient(
          width * point.x, height * (point.y + breathe), 0,
          width * point.x, height * (point.y + breathe), glowSize
        );
        
        if (isActiveJoint) {
          const glowIntensity = 0.6 + Math.sin(animationFrame * 0.1) * 0.3;
          glowGradient.addColorStop(0, `rgba(16, 185, 129, ${glowIntensity})`);
          glowGradient.addColorStop(0.5, `rgba(16, 185, 129, ${glowIntensity * 0.5})`);
          glowGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
          glowGradient.addColorStop(0, 'rgba(6, 182, 212, 0.6)');
          glowGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.3)');
          glowGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
        }
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(width * point.x, height * (point.y + breathe), glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Inner joint with gradient
        const jointSize = isActiveJoint ? 8 : 6;
        const jointGradient = ctx.createRadialGradient(
          width * point.x, height * (point.y + breathe), 0,
          width * point.x, height * (point.y + breathe), jointSize
        );
        
        if (isActiveJoint) {
          jointGradient.addColorStop(0, '#34d399');
          jointGradient.addColorStop(1, '#10b981');
        } else {
          jointGradient.addColorStop(0, '#22d3ee');
          jointGradient.addColorStop(1, '#06b6d4');
        }
        
        ctx.fillStyle = jointGradient;
        ctx.beginPath();
        ctx.arc(width * point.x, height * (point.y + breathe), jointSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(width * point.x - 2, height * (point.y + breathe) - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isPaused]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(58 + Math.floor(Math.random() * 4));
      setLatency(8 + Math.floor(Math.random() * 5));
    }, 1000);

    const gestureInterval = setInterval(() => {
      const gestures = ['Right Hand Raised', 'Left Hand Wave', 'Both Hands Up', 'Jump Motion'];
      const actions = ['Punch (J)', 'Wave (G)', 'Block (K)', 'Jump (Space)'];
      const gameActions = ['Air Combo Initiated', 'Special Move Executed', 'Rage Mode Active', 'Power Attack Ready'];
      const executedMoves = ['Special Move', 'Low Attack', 'Air Combo', 'Counter Strike', 'Rage Mode'];
      
      const randomIndex = Math.floor(Math.random() * gestures.length);
      setCurrentGesture(gestures[randomIndex]);
      setCurrentAction(actions[randomIndex]);
      setCurrentGameAction(gameActions[randomIndex]);
      setLastExecutedMove(executedMoves[randomIndex]);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(gestureInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-[#0f1117] via-[#151820] to-[#0f1117]"
    >
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Overlay Stats - Top Right */}
      <div className="absolute top-6 right-6 space-y-3">
        <motion.div
          key="fps-stat"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">FPS</div>
            <div className="text-2xl font-bold font-mono bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {fps}
            </div>
          </div>
        </motion.div>

        <motion.div
          key="latency-stat"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/40 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Latency</div>
            <div className="text-2xl font-bold font-mono bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {latency}<span className="text-base text-slate-500">ms</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Overlay Stats - Bottom Left */}
      <div className="absolute bottom-6 left-6 space-y-3 max-w-md">
        {/* Current Game Action */}
        <motion.div
          key={`game-action-${currentGameAction}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 px-5 py-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-purple-500/50 shadow-2xl shadow-purple-500/20"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-purple-500/50 flex items-center justify-center">
            <Zap className="w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
              Current Game Action
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {currentGameAction}
            </div>
          </div>
        </motion.div>

        {/* Last Executed Move */}
        <motion.div
          key={`last-move-${lastExecutedMove}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-4 px-5 py-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-600/30 border border-slate-600/50 flex items-center justify-center">
            <Target className="w-6 h-6 text-slate-400 drop-shadow-[0_0_6px_rgba(148,163,184,0.6)]" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
              Last Executed Move
            </div>
            <div className="text-xl font-bold text-slate-300">
              {lastExecutedMove}
            </div>
          </div>
        </motion.div>

        <motion.div
          key={`gesture-${currentGesture}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 px-5 py-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Hand className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
              Detected Gesture
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {currentGesture}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls - Top Left */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-cyan-500/50 transition-all shadow-2xl group"
        >
          {isPaused ? (
            <Play className="w-5 h-5 text-emerald-400 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          ) : (
            <Pause className="w-5 h-5 text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          )}
          <span className="text-sm font-medium text-slate-300">
            {isPaused ? 'Resume' : 'Pause'}
          </span>
        </button>

        <button
          onClick={onExit}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-red-500/50 transition-all shadow-2xl group"
        >
          <X className="w-5 h-5 text-slate-400 group-hover:text-red-400 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-sm font-medium text-slate-300">Exit Full Screen</span>
        </button>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-6 right-6 px-4 py-2 rounded-lg bg-slate-900/40 backdrop-blur-md border border-slate-700/30">
        <p className="text-xs text-slate-500 font-mono">SRIKA – Live Demo Mode</p>
      </div>
    </motion.div>
  );
}