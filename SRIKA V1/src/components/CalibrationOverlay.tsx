import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, ScanFace, Target } from 'lucide-react';
import { useSrika } from '../context/SrikaContext';
import { useEngine } from '../context/EngineContext';
import { CalibrationManager } from '../managers/CalibrationManager';

export function CalibrationOverlay() {
    const { poseLandmarks } = useSrika();
    const { engineMode, setEngineMode, setCalibrationStatus } = useEngine();

    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'WAITING' | 'HOLD' | 'SUCCESS'>('WAITING');
    const holdStartTime = useRef<number>(0);
    const rafId = useRef<number>(0);

    const isVisible = engineMode === 'CALIBRATION';

    useEffect(() => {
        if (!isVisible) {
            setProgress(0);
            setStatus('WAITING');
            return;
        }

        const loop = () => {
            if (!poseLandmarks) {
                setStatus('WAITING');
                setProgress(0);
                holdStartTime.current = 0;
            } else {
                if (status === 'WAITING') {
                    setStatus('HOLD');
                    holdStartTime.current = performance.now();
                } else if (status === 'HOLD') {
                    const elapsed = performance.now() - holdStartTime.current;
                    const p = Math.min(100, (elapsed / 2000) * 100);
                    setProgress(p);

                    if (p >= 100) {
                        setStatus('SUCCESS');
                        CalibrationManager.save(poseLandmarks);
                        setCalibrationStatus('VALID');
                        setTimeout(() => {
                            setEngineMode('ACTIVE');
                        }, 800);
                        return;
                    }
                }
            }
            rafId.current = requestAnimationFrame(loop);
        };

        rafId.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId.current);
    }, [isVisible, poseLandmarks, status, setEngineMode, setCalibrationStatus]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center"
            >
                <style>{`
                  .calib-glass {
                    background: radial-gradient(circle at center, rgba(6,182,212,0.1) 0%, transparent 70%);
                  }
                  .progress-track {
                     background: rgba(255,255,255,0.03);
                     box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
                  }
                `}</style>

                <div className="absolute inset-0 calib-glass pointer-events-none opacity-40" />

                <div className="relative mb-10">
                    <div className="w-32 h-32 rounded-full bg-black/40 flex items-center justify-center relative shadow-[0_0_50px_rgba(6,182,212,0.15)] ring-1 ring-white/5">
                        <ScanFace className={`w-14 h-14 ${status === 'SUCCESS' ? 'text-emerald-400' : 'text-cyan-400'} transition-colors duration-500`} />
                        {status === 'SUCCESS' && (
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="absolute -bottom-2 -right-2 bg-emerald-500/20 backdrop-blur-md rounded-full p-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4 mb-10">
                    <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-cyan-500 opacity-60" />
                        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Baseline Acquisition</h2>
                    </div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                        {status === 'SUCCESS' ? 'Bypass Established' : 'Neural Calibration'}
                    </h3>
                </div>

                <div className="max-w-xs mb-12">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-relaxed italic opacity-70">
                        {status === 'WAITING' && "Position entity within capture volume."}
                        {status === 'HOLD' && "Maintain skeletal lock..."}
                        {status === 'SUCCESS' && "Sync complete. Redirecting to Active Link."}
                    </p>
                </div>

                {/* Progress Bar */}
                {status === 'HOLD' && (
                    <div className="flex flex-col items-center gap-4 mb-12">
                        <div className="w-64 h-2 progress-track rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ ease: "linear", duration: 0.1 }}
                            />
                        </div>
                        <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-widest animate-pulse">Scanning {Math.floor(progress)}%</span>
                    </div>
                )}

                <button
                    onClick={() => setEngineMode('IDLE')}
                    className="px-10 py-4.5 bg-gray-900/40 text-gray-600 rounded-[22px] font-black uppercase text-[10px] tracking-widest transition-all hover:bg-red-500/10 hover:text-red-500 shadow-inner"
                >
                    Abort Calibration
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
