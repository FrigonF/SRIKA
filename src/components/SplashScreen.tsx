import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export function SplashScreen() {
  const [loadingText, setLoadingText] = useState('Initializing camera...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const texts = [
      'Initializing camera...',
      'Loading pose engine...',
      'Preparing input pipeline...',
      'System ready'
    ];
    
    let currentIndex = 0;
    const textInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % texts.length;
      setLoadingText(texts[currentIndex]);
    }, 1000);

    const progressInterval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 100 : prev + 2.5));
    }, 100);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-[#1a1d2e] via-[#1e2a3a] to-[#1a2634]">
      {/* Enhanced animated background with gradient dots */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: `radial-gradient(circle, ${
                i % 3 === 0 ? '#06b6d4' : i % 3 === 1 ? '#3b82f6' : '#10b981'
              }, transparent)`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.8, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {/* Enhanced Logo with gradient border */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 blur-xl" />
          <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center backdrop-blur-sm">
            <span className="text-7xl font-bold bg-gradient-to-br from-cyan-400 to-blue-400 bg-clip-text text-transparent">S</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold text-slate-100 mb-3 tracking-tight">
            SRIKA
          </h1>
          <p className="text-xl text-slate-400 font-light tracking-wide">
            Body Motion Input System
          </p>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-96 mb-6"
        >
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>

        {/* Status text */}
        <motion.p
          key={loadingText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-slate-400 text-sm font-mono"
        >
          {loadingText}
        </motion.p>

        {/* Bottom text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 text-center"
        >
          <p className="text-slate-500 text-xs font-mono">
            Prototype build | GDG TechSpirit Hackathon
          </p>
        </motion.div>
      </div>
    </div>
  );
}