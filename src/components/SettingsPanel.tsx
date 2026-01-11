import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function SettingsPanel() {
  const [cameraSource, setCameraSource] = useState('USB Camera 0');
  const [skeletonOverlay, setSkeletonOverlay] = useState(true);
  const [analyticsOverlay, setAnalyticsOverlay] = useState(true);
  const [sensitivity, setSensitivity] = useState('Medium');
  const [demoMode, setDemoMode] = useState(false);

  return (
    <div className="bg-gradient-to-br from-[#232735]/80 to-[#1e2130]/80 rounded-xl border border-slate-700/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20">
      <div className="px-4 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/20 to-transparent">
        <span className="text-slate-300 text-sm font-medium">System Controls</span>
      </div>
      <div className="p-4 space-y-4">
        {/* Camera Source */}
        <div>
          <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide font-medium">
            Camera Source
          </label>
          <div className="relative">
            <select
              value={cameraSource}
              onChange={(e) => setCameraSource(e.target.value)}
              className="w-full bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-300 appearance-none cursor-pointer hover:border-slate-600 transition-colors focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              <option>USB Camera 0</option>
              <option>USB Camera 1</option>
              <option>Integrated Webcam</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Toggle Controls */}
        <div className="space-y-3">
          <ToggleControl
            label="Skeleton Overlay"
            checked={skeletonOverlay}
            onChange={setSkeletonOverlay}
          />
          <ToggleControl
            label="Analytics Overlay"
            checked={analyticsOverlay}
            onChange={setAnalyticsOverlay}
          />
        </div>

        {/* Sensitivity Level */}
        <div>
          <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide font-medium">
            Sensitivity Level
          </label>
          <div className="flex gap-2">
            {['Low', 'Medium', 'High'].map((level) => (
              <button
                key={level}
                onClick={() => setSensitivity(level)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  sensitivity === level
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Mode */}
        <div>
          <ToggleControl
            label="Demo Mode"
            checked={demoMode}
            onChange={setDemoMode}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-cyan-500' : 'bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}