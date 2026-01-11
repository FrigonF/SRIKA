import type { FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Gamepad2 } from 'lucide-react';
import { useSrika } from '../context/SrikaContext';

// Grid Layout Helper
interface ControlKeyProps {
  label: string;
  description?: string;
  active: boolean;
  size?: 'normal' | 'large';
}

const ControlKey = ({ label, description, active, size = 'normal' }: ControlKeyProps) => (
  <motion.div
    animate={{
      scale: active ? 1.1 : 1,
      backgroundColor: active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.4)',
      borderColor: active ? 'rgba(16, 185, 129, 0.6)' : 'rgba(71, 85, 105, 0.3)',
      boxShadow: active ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none',
    }}
    className={`
      relative border rounded-xl flex flex-col items-center justify-center transition-colors
      ${size === 'large' ? 'h-24 w-full' : 'h-20 w-20'}
      ${active ? 'z-10' : 'z-0'}
    `}
  >
    <span className={`font-mono font-bold ${active ? 'text-emerald-300' : 'text-slate-500'} text-2xl`}>
      {label}
    </span>
    {description && (
      <span className={`text-[10px] uppercase font-medium mt-1 ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
        {description}
      </span>
    )}

    {active && (
      <motion.div
        layoutId="active-glow"
        className="absolute inset-0 rounded-xl bg-emerald-400/10 blur-md -z-10"
      />
    )}
  </motion.div>
);

export function ControlMappingPanel() {
  const { virtualControl, confidence, systemState } = useSrika();

  return (
    <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20 h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
          <span className="text-slate-300 text-sm font-medium">Virtual Combat Control</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${confidence > 65 ? 'text-emerald-400' : 'text-slate-500'}`}>
            {confidence}% Conf
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-8 min-h-0 overflow-y-auto">

        {/* UPPER CONTROLS (Combat) */}
        <div className="grid grid-cols-4 gap-4">
          <ControlKey label="U" description="Special" active={virtualControl === 'U'} />
          <ControlKey label="I" description="Air Combo" active={virtualControl === 'I'} />
          <ControlKey label="P" description="Power" active={virtualControl === 'P'} />
          <ControlKey label=";" description="Rage" active={virtualControl === ';'} />
        </div>

        {/* MIDDLE CONTROLS (Movement Horyzontal) */}
        <div className="grid grid-cols-3 gap-12">
          <ControlKey label="A" description="Left" active={virtualControl === 'A'} />
          <div className="w-20 h-20 flex items-center justify-center opacity-20">
            <div className="w-2 h-2 bg-slate-500 rounded-full" />
          </div>
          <ControlKey label="D" description="Right" active={virtualControl === 'D'} />
        </div>

        {/* LOWER CONTROLS (Movement Vertical / Low) */}
        <div className="grid grid-cols-2 gap-4">
          <ControlKey label="W" description="Jump" active={virtualControl === 'W'} />
          <ControlKey label="S" description="Crouch" active={virtualControl === 'S'} />
        </div>

        {/* KICK (Center Bottom) */}
        <div>
          <ControlKey label="K" description="Low Moves" active={virtualControl === 'K'} />
        </div>

        {/* System Message Overlay */}
        <AnimatePresence>
          {systemState === 'IDLE' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-sm font-mono">
                WAITING FOR PLAYER...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
