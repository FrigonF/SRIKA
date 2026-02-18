import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, CameraOff } from 'lucide-react';
import { useSrika } from '../context/SrikaContext';

export function GestureDisplay() {
  const { activeIntents, confidence, systemState, cameraConnected } = useSrika();
  const [persistentIntent, setPersistentIntent] = useState<string>('IDLE');

  const currentIntent = activeIntents[0] || 'IDLE';

  // Update persistent intent only when we have a real action
  useEffect(() => {
    if (currentIntent !== 'IDLE') {
      setPersistentIntent(currentIntent);
    }
  }, [currentIntent]);

  // Logic: If camera is off, show IDLE. If camera is on, show current action or last known action.
  const displayIntent = !cameraConnected ? 'IDLE' : (currentIntent !== 'IDLE' ? currentIntent : persistentIntent);

  const getGestureLabel = (intent: string) => {
    if (!cameraConnected) return 'CAMERA OFF';
    switch (intent) {
      case 'U': return 'Left Punch';
      case 'I': return 'Right Punch';
      case 'K': return 'Knee Up';
      case 'P': return 'Power Strike';
      case ';': return 'Rage Mode';
      case 'A': return 'Move Left';
      case 'D': return 'Move Right';
      case 'W': return 'Jump';
      case 'S': return 'Crouch';
      // Racing Mappings
      case 'ACCEL': return 'Accelerate';
      case 'NITRO': return 'Nitro Boost';
      case 'BRAKE': return 'Brake / Drift';
      case 'IDLE': return 'No Gesture';
      default:
        if (intent.startsWith('steer:')) return `Steering ${intent.split(':')[1]}`;
        return intent; // Fallback to raw intent name
    }
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-3xl rounded-xl border border-white/20 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-white/5 to-transparent">
        <span className="text-gray-300 font-semibold uppercase tracking-wider" style={{ fontSize: '14px' }}>Gesture Recognition</span>
      </div>
      <div className="p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className={`relative w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-lg transition-colors duration-300
            ${displayIntent !== 'IDLE' ? 'bg-cyan-500/20 border-cyan-500/40 shadow-cyan-500/20' : 'bg-gray-800/50 border-gray-700/50'}
          `}>
            {!cameraConnected ? (
              <CameraOff className="relative w-6 h-6 text-rose-500/50" />
            ) : (
              <Hand className={`relative w-6 h-6 transition-colors duration-300 ${displayIntent !== 'IDLE' ? 'text-cyan-400' : 'text-gray-500'}`} />
            )}
          </div>
          <div className="flex-1">
            <span className="text-gray-500 uppercase tracking-widest font-bold block mb-2" style={{ fontSize: '11px' }}>
              Current Intent
            </span>
            <AnimatePresence mode="wait">
              <motion.h2
                key={displayIntent}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className={`text-2xl font-black tracking-tight transition-all ${displayIntent && displayIntent !== 'IDLE'
                  ? 'bg-gradient-to-r from-[#60a5fa] via-[#818cf8] to-[#a855f7] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(129,140,248,0.5)]'
                  : 'text-gray-400'
                  }`}
              >
                {getGestureLabel(displayIntent)}
              </motion.h2>
            </AnimatePresence>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/60">
                System State
              </span>
              <span className="text-[10px] font-bold uppercase text-gray-400">
                {systemState}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              Confidence
            </span>
            <span className="text-sm font-mono font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
              {Math.round(confidence)}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-800/30 backdrop-blur-sm rounded-full overflow-hidden border border-gray-700/30 shadow-inner">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background: `linear-gradient(90deg, #06b6d4 0%, #3b82f6 50%, #10b981 100%)`
              }}
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.2 }} // Faster response
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -skew-x-12 translate-x-full animate-shimmer" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
