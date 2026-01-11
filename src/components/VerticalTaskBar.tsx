import { motion } from 'motion/react';
import { LayoutDashboard, Video, Gamepad2, Target, BarChart3, Settings } from 'lucide-react';

export type PageType = 'dashboard' | 'tracking' | 'mapping' | 'output' | 'analytics' | 'settings';

interface VerticalTaskBarProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
}

export function VerticalTaskBar({ activePage, onPageChange }: VerticalTaskBarProps) {
  const menuItems = [
    { id: 'dashboard' as PageType, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'mapping' as PageType, icon: Gamepad2, label: 'Control Mapping' },
    { id: 'output' as PageType, icon: Target, label: 'Game Output' },
    { id: 'analytics' as PageType, icon: BarChart3, label: 'Analytics' },
    { id: 'settings' as PageType, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-20 h-full bg-gradient-to-b from-[#1e2130] via-[#1a1d2e] to-[#1e2130] border-r border-slate-700/30 flex flex-col items-center py-6 gap-2">
      {/* Logo */}
      <div className="mb-6">
        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-emerald-500/10 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
          <span className="text-2xl font-bold bg-gradient-to-br from-cyan-400 to-blue-400 bg-clip-text text-transparent">S</span>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 flex flex-col gap-2 w-full px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl transition-all group ${isActive
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                  : 'hover:bg-slate-800/30 border border-transparent'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/50"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}

              <Icon className={`relative w-5 h-5 transition-all ${isActive
                  ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'text-slate-500 group-hover:text-slate-400'
                }`} />

              <span className={`relative text-[9px] font-medium uppercase tracking-wider transition-colors ${isActive
                  ? 'text-cyan-300'
                  : 'text-slate-600 group-hover:text-slate-500'
                }`}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Version info */}
      <div className="mt-auto text-center">
        <span className="text-[8px] text-slate-700 font-mono">v1.0</span>
      </div>
    </div>
  );
}
