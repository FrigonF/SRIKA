import { useState } from 'react';
import { Minimize2, Maximize2, X, Camera, Activity } from 'lucide-react';
import { VerticalTaskBar, PageType } from './VerticalTaskBar';
import { DashboardPage } from './pages/DashboardPage';
import { ControlMappingPage } from './pages/ControlMappingPage';
import { GameOutputPage } from './pages/GameOutputPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSrika } from '../context/SrikaContext';

export function MainScreen() {
  const [activePage, setActivePage] = useState<PageType>('dashboard');
  const context = useSrika();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'mapping':
        return <ControlMappingPage />;
      case 'output':
        return <GameOutputPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-[#1a1d2e] via-[#1e2634] to-[#1a2332]">
      {/* Enhanced Top Application Bar with gradient - DRAGGABLE */}
      <div
        className="h-14 bg-gradient-to-r from-[#232735] via-[#252b3d] to-[#232735] border-b border-slate-700/50 backdrop-blur-xl flex items-center justify-between px-6 shadow-lg shadow-black/20"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-100 font-semibold tracking-tight">
              SRIKA – Body Motion Input System
            </span>
          </div>

          {/* Real Status indicators from Context */}
          <div className="flex items-center gap-3 ml-8">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${context.cameraConnected
              ? 'bg-slate-800/30 border-slate-700/50'
              : 'bg-red-900/20 border-red-900/50'
              } backdrop-blur-sm`}>
              <Camera className={`w-3.5 h-3.5 ${context.cameraConnected ? 'text-emerald-400' : 'text-red-400'}`} />
              <span className={`text-xs font-medium ${context.cameraConnected ? 'text-slate-300' : 'text-red-300'}`}>
                {context.cameraConnected ? 'Camera Connected' : 'Camera Disconnected'}
              </span>
              {context.cameraConnected && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              )}
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${context.systemState !== 'IDLE'
              ? 'bg-slate-800/30 border-slate-700/50'
              : 'bg-slate-800/30 border-slate-700/50 opacity-50'
              } backdrop-blur-sm`}>
              <Activity className={`w-3.5 h-3.5 ${context.systemState !== 'IDLE' ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="text-xs text-slate-300 font-medium">
                {context.systemState === 'IDLE' ? 'Idle' : 'Tracking Active'}
              </span>
              {context.systemState !== 'IDLE' && (
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              )}
            </div>
          </div>
        </div>

        {/* Window controls - NON-DRAGGABLE */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => window.electronAPI?.minimize()}
            className="w-12 h-9 flex items-center justify-center hover:bg-slate-700/50 transition-colors"
          >
            <Minimize2 className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => window.electronAPI?.maximize()}
            className="w-12 h-9 flex items-center justify-center hover:bg-slate-700/50 transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            className="w-12 h-9 flex items-center justify-center hover:bg-red-500/20 transition-colors group"
          >
            <X className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vertical Task Bar */}
        <VerticalTaskBar activePage={activePage} onPageChange={setActivePage} />

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}