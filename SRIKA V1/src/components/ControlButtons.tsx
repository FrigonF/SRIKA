import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, Monitor } from 'lucide-react';
import { useEngine } from '../context/EngineContext';

export function ControlButtons() {
  const { engineMode, setEngineMode } = useEngine();
  // Derived state
  const isTracking = engineMode === 'ACTIVE';

  const toggleTracking = () => {
    if (isTracking) {
      setEngineMode('IDLE');
    } else if (engineMode === 'EMERGENCY_STOP') {
      // If in ESTOP, first reset to IDLE, then user must click again or we can auto-start? 
      // Safer to just Reset to IDLE.
      setEngineMode('IDLE');
    } else {
      setEngineMode('ACTIVE');
    }
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-2xl rounded-xl border border-white/10 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <span className="text-gray-300 font-semibold uppercase tracking-wider" style={{ fontSize: '14px' }}>Session Controls</span>
      </div>
      <div className="p-6 grid grid-cols-2 gap-3">
        {/* Start/Pause Tracking */}
        <motion.button
          onClick={toggleTracking}
          whileHover={{ scale: 1.02, brightness: 1.1 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${isTracking
            ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/50 hover:border-cyan-500/70 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
            : 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-emerald-300 border border-emerald-500/50 hover:border-emerald-500/70 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
            }`}
          style={{ fontSize: '14px' }}
        >
          {isTracking ? (
            <>
              <Pause className="w-5 h-5 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
              <span>Pause Tracking</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span>Start Tracking</span>
            </>
          )}
        </motion.button>

        {/* Reset Session */}
        <motion.button
          onClick={() => setEngineMode('IDLE')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-br from-gray-800/30 to-gray-700/20 text-gray-300 border border-gray-700/50 hover:bg-gray-800/50 hover:border-gray-600 transition-all backdrop-blur-sm shadow-lg"
          style={{ fontSize: '14px' }}
        >
          <RotateCcw className="w-5 h-5" />
          <span>Reset Session</span>
        </motion.button>

        {/* Demo Mode - Placeholder action for now */}
        <motion.button
          className={`col-span-2 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold uppercase tracking-widest transition-all bg-gradient-to-br from-gray-800/30 to-gray-700/20 text-gray-300 border border-gray-700/50 backdrop-blur-sm shadow-lg opacity-50 cursor-not-allowed`}
          style={{ fontSize: '14px' }}
        >
          <Monitor className="w-5 h-5" />
          <span>Demo Mode (Coming Soon)</span>
        </motion.button>
      </div>
    </div>
  );
}
