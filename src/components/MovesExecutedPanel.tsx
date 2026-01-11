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
      case 'U': return 'Special Move';
      case 'I': return 'Air Combo';
      case 'K': return 'Low Attack';
      case 'P': return 'Power Strike';
      case ';': return 'Rage Mode';
      case 'A': return 'Move Left';
      case 'D': return 'Move Right';
      case 'W': return 'Jump';
      case 'S': return 'Crouch';
      default: return 'Unknown Action';
    }
  };

  useEffect(() => {
    const currentCombo = [...activeIntents].sort().join(',');

    // Only record when combo CHANGES and is non-empty
    if (activeIntents.length > 0 && currentCombo !== lastIntentsRef.current) {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const label = activeIntents.map(k => getActionLabel(k)).join(' + ');
      const keys = activeIntents.join(' + ');

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
    <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20 h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent flex items-center gap-3 shrink-0">
        <Clock className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
        <span className="text-slate-300 text-sm font-medium">Moves Executed</span>
        <div className="ml-auto px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">
          <span className="text-xs text-slate-400 font-mono">{executedMoves.length} Total</span>
        </div>
      </div>

      <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {executedMoves.map((move: ExecutedMove, index: number) => (
              <motion.div
                key={move.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border backdrop-blur-sm ${index === 0
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                  : 'bg-gradient-to-r from-slate-800/20 to-slate-700/10 border-slate-700/30'
                  }`}
              >
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${index === 0
                    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse'
                    : 'bg-slate-600'
                    }`} />
                  {index < executedMoves.length - 1 && (
                    <div className="w-0.5 h-6 bg-slate-700/50 mt-1" />
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 min-w-[80px]">
                  <span className={`text-xs font-mono ${index === 0 ? 'text-cyan-400 font-bold' : 'text-slate-500'
                    }`}>
                    {move.timestamp}
                  </span>
                </div>

                {/* Action name */}
                <div className="flex-1">
                  <span className={`text-sm font-medium ${index === 0
                    ? 'bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent'
                    : 'text-slate-300'
                    }`}>
                    {move.action}
                  </span>
                </div>

                {/* Key */}
                <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${index === 0
                  ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
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
            <div className="text-center text-slate-500 text-sm mt-10">
              Waiting for moves...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}