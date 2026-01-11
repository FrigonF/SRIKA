import { motion, AnimatePresence } from 'motion/react';
import { Hand } from 'lucide-react';
import { useSrika } from '../context/SrikaContext';

export function GestureDisplay() {
  const { intent, confidence, systemState } = useSrika();

  const getGestureLabel = () => {
    switch (intent) {
      case 'U': return 'Special Move';
      case 'I': return 'Air Combo';
      case 'K': return 'Low Attack';
      case 'P': return 'Power Strike';
      case ';': return 'Rage Mode';
      case 'A': return 'Move Left';
      case 'D': return 'Move Right';
      case 'W': return 'Jump';
      case 'S': return 'Crouch';
      case 'IDLE': return 'No Gesture';
      default: return 'Tracking...';
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20">
      <div className="px-6 py-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent">
        <span className="text-slate-300 text-sm font-medium">Gesture Recognition</span>
      </div>
      <div className="p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className={`relative w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-lg transition-colors duration-300
            ${intent !== 'IDLE' ? 'bg-cyan-500/20 border-cyan-500/40 shadow-cyan-500/20' : 'bg-slate-800/50 border-slate-700/50'}
          `}>
            <Hand className={`relative w-6 h-6 transition-colors duration-300 ${intent !== 'IDLE' ? 'text-cyan-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium block mb-2">
              Current Intent
            </span>
            <AnimatePresence mode="wait">
              <motion.h2
                key={intent || 'idle'}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`text-3xl font-bold bg-clip-text text-transparent ${intent && intent !== 'IDLE'
                    ? 'bg-gradient-to-r from-slate-100 to-cyan-300'
                    : 'bg-gradient-to-r from-slate-500 to-slate-600'
                  }`}
              >
                {getGestureLabel()}
              </motion.h2>
            </AnimatePresence>
            <span className="text-xs text-slate-500 mt-1 block">
              State: {systemState}
            </span>
          </div>
        </div>

        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">
              Confidence
            </span>
            <span className="text-sm font-mono font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
              {Math.round(confidence)}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-800/30 backdrop-blur-sm rounded-full overflow-hidden border border-slate-700/30 shadow-inner">
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