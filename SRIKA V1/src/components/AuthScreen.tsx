import { useState } from 'react';
import { motion } from 'motion/react';
import { UserCircle } from 'lucide-react';
import { authManager } from '../managers/AuthManager';

interface AuthScreenProps {
  onComplete: () => void;
}

export function AuthScreen({ onComplete }: AuthScreenProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGoogleLogin = async () => {
    setIsConnecting(true);
    try {
      await authManager.login();
    } catch (err) {
      console.error('[AuthScreen] Login failed:', err);
    } finally {
      setTimeout(() => setIsConnecting(false), 5000);
    }
  };

  // Generate some stable random positions for particles
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    initialX: Math.random() * 100,
    initialY: Math.random() * 100,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 5,
    size: 1 + Math.random() * 3
  }));

  return (
    <div className="h-screen w-full bg-[#030308] flex items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Dynamic Liquid Fluid Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Deep Blue to Purple Base Gradient */}
        <div className="absolute inset-0 bg-[#020205]" />

        {/* HIGH VISIBILITY Liquid Morphing Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [-50, 50, -50],
            y: [-30, 30, -30],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[800px] h-[800px] bg-blue-600/30 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.3, 1, 1.3],
            x: [50, -50, 50],
            y: [30, -30, 30],
            rotate: [360, 180, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[900px] h-[900px] bg-purple-600/30 rounded-full blur-[150px]"
        />

        {/* Pulsing Core */}
        <motion.div
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px]"
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ left: `${p.initialX}%`, top: `${p.initialY}%`, opacity: 0 }}
            animate={{
              y: [0, -200, 0],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear"
            }}
            style={{ width: p.size, height: p.size }}
            className="absolute bg-white/40 rounded-full blur-[1px]"
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter italic select-none drop-shadow-2xl uppercase">
            SRIKA
          </h1>
          <p className="text-cyan-400 font-bold tracking-[0.3em] uppercase text-[9px] opacity-80">
            Body-Native Interface
          </p>
        </div>

        {/* Floating Auth Elements */}
        <div className="relative overflow-visible p-10">
          <h2 className="text-xl font-bold text-white mb-14 tracking-widest text-center uppercase opacity-80">
            Sign In
          </h2>

          <div className="flex justify-center mb-10 relative">
            {/* SURROUNDING CIRCULAR ANIMATION */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-25px] rounded-full border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] pointer-events-none"
            />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={isConnecting}
              onClick={handleGoogleLogin}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all bg-transparent border-none outline-none relative z-10"
            >
              {!isConnecting ? (
                <img
                  src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg"
                  alt="Google"
                  className="w-8 h-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              )}
            </motion.button>
          </div>

          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                authManager.loginAsGuest();
                onComplete();
              }}
              className="w-fit px-8 bg-white/5 border border-white/10 py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 text-white"
            >
              <UserCircle className="w-4 h-4 text-blue-400" />
              Continue as Guest
            </motion.button>
          </div>

          <p className="text-center text-[9px] text-gray-600 mt-8 uppercase font-bold tracking-widest opacity-40">
            Secure Protocol v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
