import { ControlMappingPanel } from '../ControlMappingPanel';

export function ControlMappingPage() {
  return (
    <div className="flex-1 h-full flex flex-col p-8 gap-6 overflow-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
          Control Mapping
        </h1>
        <p className="text-sm text-slate-400">Gesture to game action mappings</p>
      </div>

      {/* Control Mapping Table - Full Height */}
      <div className="flex-1 overflow-hidden">
        <ControlMappingPanel />
      </div>
    </div>
  );
}
