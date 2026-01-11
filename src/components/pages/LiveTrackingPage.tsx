import { LiveCameraPanel } from '../LiveCameraPanel';

export function LiveTrackingPage() {
  return (
    <div className="flex-1 h-full flex flex-col p-8 gap-6 overflow-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
          Live Pose Tracking
        </h1>
        <p className="text-sm text-slate-400">Real-time skeleton detection and visualization</p>
      </div>

      {/* Camera View - Full Height */}
      <div className="flex-1 overflow-hidden">
        <LiveCameraPanel />
      </div>
    </div>
  );
}
