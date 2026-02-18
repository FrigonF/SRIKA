import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Target, Settings, Settings2 } from 'lucide-react';
import logo from '../assets/logo.png';

export type PageType = 'dashboard' | 'tracking' | 'mapping' | 'output' | 'analytics' | 'settings' | 'help' | 'camera-setup' | 'calibration';

interface VerticalTaskBarProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
}

export function VerticalTaskBar({ activePage, onPageChange }: VerticalTaskBarProps) {
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  useEffect(() => {
    const fetchVersion = async () => {
      if (window.electronAPI?.getAppVersion) {
        const version = await window.electronAPI.getAppVersion();
        setAppVersion(version);
      }
    };
    fetchVersion();
  }, []);



  const menuItems = [
    { id: 'dashboard' as PageType, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'output' as PageType, icon: Target, label: 'Game' },
    { id: 'settings' as PageType, icon: Settings, label: 'Settings' },
    { id: 'help' as PageType, icon: Settings2, label: 'Help' },
  ];

  return (
    <div className="w-20 h-full bg-white/[0.02] backdrop-blur-3xl border-r border-white/10 flex flex-col items-center py-6 shrink-0 z-10 shadow-2xl">
      {/* Logo */}
      <div className="mb-8">
        <div className="relative w-10 h-10 rounded-xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-center overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <img
            src={logo}
            alt="Srika"
            className="w-full h-full object-cover scale-[1.65]"
          />
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 flex flex-col gap-2 w-full px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-cyan-500/10'
                : 'hover:bg-white/[0.03]'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-cyan-500/10 border border-cyan-500/30"
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
                />
              )}

              <Icon className={`relative w-4.5 h-4.5 transition-all duration-300 ${isActive
                ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                : 'text-gray-500 group-hover:text-cyan-400/80'
                }`} strokeWidth={2.5} />

              <span className={`relative font-black uppercase tracking-tighter transition-all duration-300 ${isActive
                ? 'text-cyan-300'
                : 'text-gray-600 group-hover:text-gray-400'
                }`} style={{ fontSize: '10px' }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>


      {/* Version info */}
      <div className="mt-auto text-center">
        <span className="text-[10px] text-gray-700 font-mono">v{appVersion}</span>
      </div>
    </div>
  );
}
