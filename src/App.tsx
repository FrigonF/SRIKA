import { useState, useEffect } from 'react';

// IPC Interface
declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      triggerKey: (key: string) => void;
      setGameMode: (on: boolean) => void;
      onAdminStatus: (callback: (status: boolean) => void) => void;
    };
  }
}
import { SplashScreen } from './components/SplashScreen';
import { SrikaProvider } from './context/SrikaContext';
import { MainScreen } from './components/MainScreen';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading sequence
    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#1a1d2e]">
      <SrikaProvider>
        {loading ? <SplashScreen /> : <MainScreen />}
      </SrikaProvider>
    </div>
  );
}