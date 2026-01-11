import { useState } from 'react';
import { Play, Pause, RotateCcw, Monitor } from 'lucide-react';

export function ControlButtons() {
  const [isTracking, setIsTracking] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  return (
    <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20">
      <div className="px-6 py-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent">
        <span className="text-slate-300 text-sm font-medium">Session Controls</span>
      </div>
      <div className="p-6 grid grid-cols-2 gap-3">
        {/* Start/Pause Tracking */}
        <button
          onClick={() => setIsTracking(!isTracking)}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all ${
            isTracking
              ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/50 hover:border-cyan-500/70 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
              : 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-emerald-300 border border-emerald-500/50 hover:border-emerald-500/70 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
          }`}
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
        </button>

        {/* Reset Session */}
        <button className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium bg-gradient-to-br from-slate-800/30 to-slate-700/20 text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600 transition-all backdrop-blur-sm shadow-lg">
          <RotateCcw className="w-5 h-5" />
          <span>Reset Session</span>
        </button>

        {/* Demo Mode */}
        <button
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`col-span-2 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all ${
            isDemoMode
              ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/10 text-blue-300 border border-blue-500/50 hover:border-blue-500/70 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
              : 'bg-gradient-to-br from-slate-800/30 to-slate-700/20 text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600 backdrop-blur-sm shadow-lg'
          }`}
        >
          <Monitor className={`w-5 h-5 ${isDemoMode ? 'drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]' : ''}`} />
          <span>{isDemoMode ? 'Exit Demo Mode' : 'Switch to Demo Mode'}</span>
        </button>
      </div>
    </div>
  );
}