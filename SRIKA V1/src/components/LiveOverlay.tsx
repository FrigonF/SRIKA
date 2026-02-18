import { motion } from 'motion/react';
import { X, Activity, Zap } from 'lucide-react';
import { PageType } from './VerticalTaskBar';

interface LiveOverlayProps {
  onNavigate: (screen: PageType) => void;
}

export function LiveOverlay({ onNavigate }: LiveOverlayProps) {
  const recentActions = [
    { action: 'Right Punch', key: 'J', time: '0.2s ago' },
    { action: 'Jump', key: 'Space', time: '1.5s ago' },
    { action: 'Left Kick', key: 'K', time: '2.1s ago' },
    { action: 'Forward Walk', key: 'W', time: '3.0s ago' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Simulated game background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(0, 230, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 230, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      {/* Top bar - minimal */}
      <div className="absolute top-4 left-0 right-0 flex justify-between items-start px-4 z-50">
        {/* Left: Tracking status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.08] backdrop-blur-[80px] border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm font-semibold">Tracking Active</span>
        </motion.div>

        {/* Right: Exit button */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onNavigate('dashboard')}
          className="bg-red-500/10 backdrop-blur-[80px] border border-red-500/50 p-3 rounded-2xl hover:bg-red-500/20 active:scale-95 transition-all"
        >
          <X className="w-5 h-5 text-red-400" />
        </motion.button>
      </div>

      {/* Left side: Skeleton visualization */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute left-4 top-24 bg-white/[0.08] backdrop-blur-[80px] border border-white/20 rounded-3xl p-4"
      >
        <div className="text-xs font-semibold text-gray-400 mb-3">Body Tracking</div>
        <svg className="w-24 h-36" viewBox="0 0 100 150">
          {/* Skeleton */}
          <circle cx="50" cy="15" r="8" fill="none" stroke="#00e6ff" strokeWidth="2" />
          <line x1="50" y1="23" x2="50" y2="35" stroke="#00e6ff" strokeWidth="2" />
          <line x1="30" y1="35" x2="70" y2="35" stroke="#00e6ff" strokeWidth="2" />
          <line x1="50" y1="35" x2="50" y2="70" stroke="#00e6ff" strokeWidth="2" />
          <line x1="30" y1="35" x2="20" y2="60" stroke="#00e6ff" strokeWidth="2" />
          <line x1="70" y1="35" x2="80" y2="60" stroke="#00e6ff" strokeWidth="2" />
          <line x1="40" y1="70" x2="35" y2="100" stroke="#00e6ff" strokeWidth="2" />
          <line x1="35" y1="100" x2="30" y2="130" stroke="#00e6ff" strokeWidth="2" />
          <line x1="60" y1="70" x2="65" y2="100" stroke="#00e6ff" strokeWidth="2" />
          <line x1="65" y1="100" x2="70" y2="130" stroke="#00e6ff" strokeWidth="2" />

          {/* Keypoints with animation */}
          {[
            [50, 15], [50, 35], [30, 35], [70, 35],
            [20, 60], [80, 60], [50, 70],
            [35, 100], [65, 100], [30, 130], [70, 130]
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#00e6ff">
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" begin={i * 0.1} />
            </circle>
          ))}
        </svg>

        {/* Confidence indicator */}
        <div className="mt-3 text-xs">
          <div className="text-gray-400 mb-1">Confidence</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                initial={{ width: '0%' }}
                animate={{ width: '96%' }}
                transition={{ duration: 1 }}
              />
            </div>
            <span className="text-cyan-400 font-semibold">96%</span>
          </div>
        </div>
      </motion.div>

      {/* Right side: Action log */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute right-4 top-24 w-80 space-y-2"
      >
        <div className="bg-white/[0.08] backdrop-blur-[80px] border border-white/20 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
            <Activity className="w-4 h-4" />
            Action Log
          </div>
        </div>

        {recentActions.map((action, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/[0.08] backdrop-blur-[80px] border border-white/20 rounded-2xl px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold font-mono">{action.key}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">{action.action}</div>
                  <div className="text-xs text-gray-400">{action.time}</div>
                </div>
              </div>
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom: Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/[0.1] backdrop-blur-[80px] border border-white/20 rounded-2xl px-6 py-3 flex items-center gap-8"
      >
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">FPS</div>
          <div className="text-lg font-bold text-green-400">60</div>
        </div>
        <div className="w-px h-8 bg-gray-700" />
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Latency</div>
          <div className="text-lg font-bold text-cyan-400">12ms</div>
        </div>
        <div className="w-px h-8 bg-gray-700" />
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Actions</div>
          <div className="text-lg font-bold text-blue-400">247</div>
        </div>
        <div className="w-px h-8 bg-gray-700" />
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Session</div>
          <div className="text-lg font-bold text-purple-400">12:34</div>
        </div>
      </motion.div>

      {/* Center: Demo message */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/[0.05] backdrop-blur-[80px] border border-white/20 rounded-3xl px-12 py-8"
        >
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-3xl font-bold mb-3">Overlay Active</h2>
          <p className="text-gray-400 text-lg max-w-md">
            This minimal overlay sits on top of your game, providing real-time feedback without disrupting gameplay.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
