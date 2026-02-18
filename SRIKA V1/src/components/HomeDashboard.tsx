import { Activity } from 'lucide-react';
import { LiveCameraPanel } from './LiveCameraPanel';
import { GestureDisplay } from './GestureDisplay';
import { MovesExecutedPanel } from './MovesExecutedPanel';
import { useSrika } from '../context/SrikaContext';
import { PageType } from './VerticalTaskBar';

interface HomeDashboardProps {
  onNavigate: (screen: PageType) => void;
}

export function HomeDashboard({ }: HomeDashboardProps) {
  const { fps, latencyMs, confidence } = useSrika();

  return (
    <div className="h-full w-full bg-transparent p-4 flex gap-4 overflow-hidden">
      {/* Camera Section - Takes ALL available space */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex-1 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-3xl rounded-2xl border border-cyan-500/30 p-2 overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]">
          <div className="h-full relative bg-transparent rounded-xl overflow-hidden">
            <LiveCameraPanel />
          </div>
        </div>
      </div>

      {/* Right Panel - FIXED WIDTH (Compact) */}
      <div className="w-80 flex flex-col gap-3 min-h-0 shrink-0">

        {/* Current Action */}
        <div className="shrink-0">
          <h3 className="font-bold uppercase tracking-wider text-gray-500 mb-2" style={{ fontSize: '14px' }}>Current Action</h3>
          <GestureDisplay />
        </div>

        {/* Performance Card */}
        <div className="shrink-0 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 backdrop-blur-3xl rounded-2xl border border-teal-500/30 p-3 shadow-[0_0_40px_rgba(20,184,166,0.1)]">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-teal-400" strokeWidth={2} />
            <h3 className="font-bold uppercase tracking-wider text-teal-400/80" style={{ fontSize: '14px' }}>Performance</h3>
          </div>

          <div className="space-y-2">
            {/* FPS */}
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase tracking-wider text-teal-500/60" style={{ fontSize: '11px' }}>FPS</span>
              <span className="font-bold text-teal-400" style={{ fontSize: '13px' }}>{fps}</span>
            </div>

            {/* Latency */}
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase tracking-wider text-teal-500/60" style={{ fontSize: '11px' }}>Latency</span>
              <span className="font-bold text-teal-400" style={{ fontSize: '13px' }}>{Math.round(latencyMs)}ms</span>
            </div>

            {/* Confidence */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-teal-500/60 font-bold uppercase tracking-wider" style={{ fontSize: '11px' }}>Confidence</span>
              <span className="font-bold text-teal-400" style={{ fontSize: '13px' }}>{Math.round(confidence)}%</span>
            </div>
          </div>
        </div>

        {/* Recent Moves */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <h3 className="font-bold uppercase tracking-wider text-gray-500 mb-2" style={{ fontSize: '14px' }}>Recent Moves</h3>
          <div className="flex-1 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 backdrop-blur-3xl rounded-2xl border border-purple-500/30 p-2 overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.1)]">
            <MovesExecutedPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
