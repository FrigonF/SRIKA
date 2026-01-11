import { useState, useEffect } from 'react';
import { Activity, Zap, Target, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useSrika } from '../context/SrikaContext';

export function AnalyticsPanel() {
  const { fps, latencyMs, confidence, systemState, cameraConnected } = useSrika();

  const stats = [
    {
      label: 'FPS',
      value: cameraConnected ? Math.round(fps) : 0,
      unit: '',
      icon: Activity,
      color: 'text-cyan-400',
      bgGradient: 'from-cyan-500/20 to-cyan-500/5',
      borderColor: 'border-cyan-500/40',
      glowColor: 'shadow-cyan-500/20',
    },
    {
      label: 'Latency',
      value: cameraConnected && systemState !== 'IDLE' ? Math.round(latencyMs) : '-',
      unit: cameraConnected && systemState !== 'IDLE' ? 'ms' : '',
      icon: Zap,
      color: latencyMs > 100 ? 'text-red-400' : 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-blue-500/5',
      borderColor: 'border-blue-500/40',
      glowColor: 'shadow-blue-500/20',
    },
    {
      label: 'Confidence',
      value: cameraConnected ? Math.round(confidence) : 0,
      unit: '%',
      icon: Target,
      color: confidence > 65 ? 'text-emerald-400' : 'text-yellow-400',
      bgGradient: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/40',
      glowColor: 'shadow-emerald-500/20',
    },
    {
      label: 'Status',
      value: cameraConnected ? systemState : 'NO CAM',
      unit: '',
      icon: AlertCircle,
      color: !cameraConnected ? 'text-red-400' : systemState === 'IDLE' ? 'text-slate-400' : 'text-emerald-400',
      bgGradient: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/40',
      glowColor: 'shadow-emerald-500/20',
      isText: true,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20">
      <div className="px-4 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent">
        <span className="text-slate-300 text-sm font-medium">System Analytics</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.bgGradient} border ${stat.borderColor} rounded-lg p-4 backdrop-blur-sm shadow-lg ${stat.glowColor} transition-all`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                  {stat.label}
                </span>
                <Icon className={`w-4 h-4 ${stat.color} drop-shadow-[0_0_4px_currentColor]`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${stat.color} font-mono drop-shadow-[0_0_8px_currentColor] ${stat.isText ? 'text-sm' : ''}`}>
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-sm text-slate-500 font-mono">{stat.unit}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}