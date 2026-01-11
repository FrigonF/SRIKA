import { AnalyticsPanel } from '../AnalyticsPanel';

export function AnalyticsPage() {
  return (
    <div className="flex-1 h-full flex flex-col p-8 gap-6 overflow-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
          System Analytics
        </h1>
        <p className="text-sm text-slate-400">Technical performance metrics</p>
      </div>

      {/* Analytics Panel - Centered */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-2xl">
          <AnalyticsPanel />
        </div>
      </div>
    </div>
  );
}
