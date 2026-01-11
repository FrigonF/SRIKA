import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, Target, CheckCircle, BarChart3, Clock, Camera, Power, AlertTriangle } from 'lucide-react';
import { useSrika } from '../../context/SrikaContext';
import { LiveCameraPanel } from '../LiveCameraPanel';

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      triggerKey: (key: string) => void;
      setGameMode: (on: boolean) => void;
      onAdminStatus: (callback: (status: boolean) => void) => void;
    };
  }
}

export function DashboardPage() {
  const {
    fps,
    latencyMs,
    confidence,
    activeIntents,
    cameraConnected,
    systemState,
    isCameraOn,
    setIsCameraOn,
    isMirrored,
    setIsMirrored,
    isGameMode,
    setIsGameMode,
    isAdmin,
    setIsAdmin
  } = useSrika();

  const [recentMoves, setRecentMoves] = useState<{ id: string, timestamp: string, action: string }[]>([]);
  const lastIntentsRef = useRef<string>('');

  // Maintain Recent Moves History (Combos)
  useEffect(() => {
    const currentCombo = [...activeIntents].sort().join('+');
    if (activeIntents.length > 0 && currentCombo !== lastIntentsRef.current) {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      setRecentMoves(prev => [
        { id: Date.now().toString(), timestamp, action: currentCombo },
        ...prev.slice(0, 4)
      ]);
    }
    lastIntentsRef.current = currentCombo;
  }, [activeIntents]);

  // Setup Admin Status Listener
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onAdminStatus((status: boolean) => {
        setIsAdmin(status);
      });
    }
  }, [setIsAdmin]);

  const toggleGameMode = () => {
    const newState = !isGameMode;
    setIsGameMode(newState);
    if (window.electronAPI) {
      window.electronAPI.setGameMode(newState);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden">
      {/* Status & Control Strip */}
      <div className="px-6 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* CAMERA POWER TOGGLE */}
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shadow-lg group ${isCameraOn
              ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20'
              : 'bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20'
              }`}
          >
            <Power className={`w-4 h-4 ${isCameraOn ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className={`text-sm font-bold ${isCameraOn ? 'text-red-300' : 'text-emerald-300'}`}>
              {isCameraOn ? 'STOP CAMERA' : 'START CAMERA'}
            </span>
          </button>

          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shadow-lg ${isMirrored
              ? 'bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20'
              : 'bg-slate-500/10 border-slate-500/50 hover:bg-slate-500/20'
              }`}
          >
            <Activity className={`w-4 h-4 ${isMirrored ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className={`text-sm font-bold ${isMirrored ? 'text-blue-300' : 'text-slate-300'}`}>
              {isMirrored ? 'MIRROR: ON' : 'MIRROR: OFF'}
            </span>
          </button>

          <div className="h-6 w-px bg-slate-700/50" />

          {/* Read-Only Status Indicators */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cameraConnected
              ? 'bg-slate-800/50 border-emerald-500/30'
              : 'bg-slate-800/50 border-slate-700/50 opacity-50'
              }`}>
              <Camera className={`w-3.5 h-3.5 ${cameraConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-xs font-medium text-slate-300">
                Signal: {cameraConnected ? 'OK' : 'Waiting'}
              </span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${systemState !== 'IDLE'
              ? 'bg-slate-800/50 border-cyan-500/30'
              : 'bg-slate-800/50 border-slate-700/50 opacity-50'
              }`}>
              <Activity className={`w-3.5 h-3.5 ${systemState !== 'IDLE' ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="text-xs font-medium text-slate-300">
                Engine: {systemState}
              </span>
            </div>

            <button
              onClick={toggleGameMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isGameMode
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isGameMode ? 'text-orange-400' : 'text-slate-500'}`} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Game Mode: {isGameMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {!isAdmin && isGameMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-500/30 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[10px] font-bold text-red-300 uppercase">Run as Admin required</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left: Live Video */}
        <div className="flex-1 relative overflow-hidden rounded-xl shadow-2xl shadow-black/20 bg-[#0f111a]">
          {/* The Live Panel handles its own internal lifecycle based on 'isCameraOn' */}
          <LiveCameraPanel />
        </div>

        {/* Right: Compact Stack */}
        <div className="w-80 flex flex-col gap-4 overflow-hidden">
          {/* Current Action */}
          <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl shadow-2xl shadow-black/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Current Action</span>
            </div>
            <motion.div
              key={activeIntents.join('+') || 'IDLE'}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]"
            >
              {activeIntents.length > 0 ? activeIntents.join(' + ') : 'IDLE'}
            </motion.div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl shadow-2xl shadow-black/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Performance</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-slate-400">FPS</span>
                </div>
                <span className="text-lg font-bold font-mono text-cyan-400">{cameraConnected ? Math.round(fps) : 0}</span>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-slate-400">Latency</span>
                </div>
                <span className="text-lg font-bold font-mono text-blue-400">
                  {cameraConnected && systemState !== 'IDLE' ? Math.round(latencyMs) : '-'}
                  <span className="text-xs text-slate-500">ms</span>
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-slate-400">Confidence</span>
                </div>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {cameraConnected ? Math.round(confidence) : 0}
                  <span className="text-xs text-slate-500">%</span>
                </span>
              </div>
            </div>
          </div>

          {/* Recent Moves */}
          <div className="flex-1 bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl shadow-2xl shadow-black/20 p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Recent Moves</span>
            </div>

            <div className="space-y-2">
              {recentMoves.length === 0 && (
                <div className="text-xs text-slate-600 italic">History empty</div>
              )}
              {recentMoves.map((move, index) => (
                <motion.div
                  key={move.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${index === 0
                    ? 'bg-cyan-500/10 border-cyan-500/40'
                    : 'bg-slate-800/30 border-slate-700/30'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                    }`} />
                  <span className={`text-[10px] font-mono ${index === 0 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                    {move.timestamp}
                  </span>
                  <span className={`text-xs flex-1 ${index === 0 ? 'text-cyan-300 font-medium' : 'text-slate-400'}`}>
                    {move.action}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
