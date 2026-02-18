import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Zap } from 'lucide-react';
import { useSrika } from '../context/SrikaContext';

interface ExecutedMove {
  id: string;
  timestamp: string;
  action: string;
  key: string;
}

export function MovesExecutedPanel() {
  const { activeIntents } = useSrika();
  const [executedMoves, setExecutedMoves] = useState<ExecutedMove[]>([]);
  const lastIntentsRef = useRef<string>('');

  const getActionLabel = (key: string) => {
    switch (key) {
      case 'U': return 'Left Punch';
      case 'I': return 'Right Punch';
      case 'K': return 'Knee Up';
      case 'P': return 'Power Strike';
      case ';': return 'Rage Mode';
      case 'A': return 'Move Left';
      case 'D': return 'Move Right';
      case 'W': return 'Jump';
      case 'S': return 'Crouch';
      // Racing
      case 'ACCEL': return 'Accelerate';
      case 'BRAKE': return 'Brake';
      case 'NITRO': return 'Nitro Boost';
      case 'DRIFT': return 'Drift';
      default:
        if (key.startsWith('steer:')) return `Steering ${key.split(':')[1]}`;
        return 'Unknown Action';
    }
  };

  useEffect(() => {
    // 1. Filter out continuous axis updates (like 'steer:0.5') for the "Recent Moves" log
    // We only want to log discrete actions (Nitro, Accel, Brake, Punches, etc.)
    const discreteIntents = activeIntents.filter(intent => !intent.includes(':'));

    if (discreteIntents.length === 0) {
      lastIntentsRef.current = '';
      return;
    }

    const currentCombo = [...discreteIntents].sort().join(',');

    // Only record when combo CHANGES and is non-empty
    if (currentCombo !== lastIntentsRef.current) {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const label = discreteIntents.map(k => getActionLabel(k)).join(' + ');
      const keys = discreteIntents.join(' + ');

      const newMove: ExecutedMove = {
        id: Date.now().toString(),
        timestamp,
        action: label,
        key: keys,
      };

      setExecutedMoves((prev: ExecutedMove[]) => [newMove, ...prev.slice(0, 14)]);
    }
    lastIntentsRef.current = currentCombo;
  }, [activeIntents]);

  return (
    <div className="bg-white/[0.03] backdrop-blur-3xl rounded-xl border border-white/20 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] h-full flex flex-col">
      <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-white/5 to-transparent flex items-center gap-3 shrink-0">
        <Clock className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
        <span className="text-gray-300 font-semibold uppercase tracking-wider" style={{ fontSize: '14px' }}>Moves Executed</span>
        <div className="ml-auto">
          <span className="font-bold uppercase tracking-[0.2em] text-gray-500" style={{ fontSize: '11px' }}>{executedMoves.length} Total</span>
        </div>
      </div>

      <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        <div className="space-y-2">
          <AnimatePresence initial={false} mode="popLayout">
            {executedMoves.map((move: ExecutedMove, index: number) => (
              <motion.div
                key={move.id}
                initial={{ opacity: 0, x: -30, scale: 0.85 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: index === 0 ? [1, 1.02, 1] : 1,
                  transition: {
                    type: 'spring',
                    bounce: 0.4,
                    duration: 0.5,
                    scale: index === 0 ? { repeat: Infinity, duration: 2 } : { duration: 0.5 }
                  }
                }}
                exit={{ opacity: 0, x: 40, scale: 0.8, transition: { duration: 0.3 } }}
                layout
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border backdrop-blur-sm transition-shadow duration-500 ${index === 0
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/15 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                  : 'bg-gradient-to-r from-gray-800/20 to-gray-700/10 border-gray-700/30'
                  }`}
              >
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${index === 0
                    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse'
                    : 'bg-gray-600'
                    }`} />
                  {index < executedMoves.length - 1 && (
                    <div className="w-0.5 h-6 bg-gray-700/50 mt-1" />
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 min-w-[80px]">
                  <span className={`text-xs font-mono ${index === 0 ? 'text-cyan-400 font-bold' : 'text-gray-500'
                    }`}>
                    {move.timestamp}
                  </span>
                </div>

                {/* Action name - Splashy and Ultra Bold */}
                <div className="flex-1">
                  <span className={`text-sm font-black uppercase tracking-tight transition-all duration-300 ${index === 0
                    ? 'bg-gradient-to-r from-[#60a5fa] via-[#818cf8] to-[#a855f7] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]'
                    : 'text-gray-400'
                    }`}>
                    {move.action}
                  </span>
                </div>

                {/* Key - Removed Cube Styling */}
                <div className={`px-2 py-1 text-xs font-mono font-bold transition-all ${index === 0
                  ? 'text-cyan-400/80'
                  : 'text-gray-600'
                  }`}>
                  {move.key}
                </div>

                {/* Action icon */}
                {index === 0 && (
                  <Zap className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {executedMoves.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-10">
              Waiting for moves...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
