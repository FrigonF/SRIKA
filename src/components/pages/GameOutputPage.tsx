import { GestureDisplay } from '../GestureDisplay';
import { MovesExecutedPanel } from '../MovesExecutedPanel';

export function GameOutputPage() {
  return (
    <div className="flex-1 h-full flex flex-col p-8 gap-6 overflow-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
          Game Output
        </h1>
        <p className="text-sm text-slate-400">Executed actions and move history</p>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        {/* Current Gesture - Left */}
        <div className="overflow-hidden">
          <GestureDisplay />
        </div>

        {/* Moves Executed - Right */}
        <div className="overflow-hidden">
          <MovesExecutedPanel />
        </div>
      </div>
    </div>
  );
}
