import { useEffect, useRef, useState } from 'react';

interface UpdateState {
    version: string;
    percent: number;
    status: string;
    error?: string;
    complete?: boolean;
}

export function UpdateOverlay() {
    const [update, setUpdate] = useState<UpdateState | null>(null);
    const [displayPercent, setDisplayPercent] = useState(0);
    const animFrameRef = useRef<number>(0);

    // Smoothly animate the displayed percentage towards the real one
    useEffect(() => {
        if (update === null) return;
        const target = update.percent;
        const animate = () => {
            setDisplayPercent(prev => {
                const diff = target - prev;
                if (Math.abs(diff) < 0.5) return target;
                const next = prev + diff * 0.08;
                animFrameRef.current = requestAnimationFrame(animate);
                return next;
            });
        };
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [update?.percent]);

    useEffect(() => {
        if (!window.electronAPI) return;

        const offFound = window.electronAPI.onUpdateFound((data: { version: string }) => {
            setUpdate({ version: data.version, percent: 0, status: 'Preparing...' });
            setDisplayPercent(0);
        });

        const offProgress = window.electronAPI.onUpdateProgress((data: { percent: number; status: string }) => {
            setUpdate(prev => prev ? { ...prev, percent: data.percent, status: data.status } : prev);
        });

        const offComplete = window.electronAPI.onUpdateComplete((data: { version: string }) => {
            setUpdate(prev => prev ? { ...prev, percent: 100, status: 'Restarting...', complete: true } : prev);
        });

        const offError = window.electronAPI.onUpdateError((data: { message: string }) => {
            setUpdate(prev => prev ? { ...prev, error: data.message } : prev);
        });

        return () => {
            offFound?.();
            offProgress?.();
            offComplete?.();
            offError?.();
        };
    }, []);

    if (!update) return null;

    const pct = Math.round(displayPercent);
    const hasError = !!update.error;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'linear-gradient(135deg, #020617 0%, #0a0f1e 50%, #020617 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                WebkitAppRegion: 'drag',
            } as any}
        >
            {/* Ambient glow */}
            <div style={{
                position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
                width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480, padding: '0 32px', WebkitAppRegion: 'no-drag' } as any}>

                {/* Logo */}
                <div style={{ marginBottom: 40 }}>
                    <h1 style={{
                        fontSize: 48, fontWeight: 900, letterSpacing: '0.3em',
                        background: 'linear-gradient(90deg, #22d3ee, #3b82f6, #7c3aed)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text', margin: 0,
                    }}>
                        SRIKA
                    </h1>
                </div>

                {/* Status */}
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {hasError ? 'Update Failed' : update.complete ? 'Restarting' : `Updating to v${update.version}`}
                </p>

                {/* Big percentage */}
                {!hasError && (
                    <div style={{ fontSize: 80, fontWeight: 800, color: '#e2e8f0', lineHeight: 1, marginBottom: 24 }}>
                        {pct}%
                    </div>
                )}

                {/* Error message */}
                {hasError && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 12, padding: '16px 20px', marginBottom: 24, color: '#f87171',
                        fontSize: 13, lineHeight: 1.5,
                    }}>
                        ❌ {update.error}
                    </div>
                )}

                {/* Progress bar */}
                {!hasError && (
                    <div style={{
                        width: '100%', height: 6, background: 'rgba(255,255,255,0.06)',
                        borderRadius: 999, overflow: 'hidden', marginBottom: 16, position: 'relative',
                    }}>
                        {/* Glow shimmer */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(99,179,237,0.15), transparent)',
                            animation: 'shimmer 1.8s infinite',
                        }} />
                        <div style={{
                            height: '100%', width: `${displayPercent}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #22d3ee)',
                            borderRadius: 999, transition: 'width 0.1s linear',
                            boxShadow: '0 0 12px rgba(59,130,246,0.6)',
                        }} />
                    </div>
                )}

                {/* Step label */}
                {!hasError && (
                    <p style={{ fontSize: 12, color: '#475569', marginBottom: 40 }}>{update.status}</p>
                )}

                {/* Warning */}
                <p style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>
                    {hasError ? 'You can continue using the app normally.' : '⚠ Do not close the app until the update completes.'}
                </p>

                <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
            </div>
        </div>
    );
}
