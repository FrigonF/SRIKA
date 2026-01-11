import { SettingsPanel } from '../SettingsPanel';
import { ControlButtons } from '../ControlButtons';

export function SettingsPage() {
  return (
    <div className="flex-1 h-full flex flex-col p-8 gap-6 overflow-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
          System Settings
        </h1>
        <p className="text-sm text-slate-400">Configure camera, sensitivity, and session controls</p>
      </div>

      {/* Settings Grid */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        {/* Settings Panel */}
        <div className="overflow-hidden">
          <SettingsPanel />
        </div>

        {/* Control Buttons */}
        <div className="overflow-hidden">
          <ControlButtons />
        </div>
      </div>
    </div>
  );
}
