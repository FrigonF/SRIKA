import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Video, Monitor, Sun, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PageType } from './VerticalTaskBar';

interface CameraSetupProps {
  onNavigate: (screen: PageType) => void;
}

export function CameraSetup({ onNavigate }: CameraSetupProps) {
  const [selectedCamera, setSelectedCamera] = useState('camera-1');
  const [resolution, setResolution] = useState('1920x1080');

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-12">
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-bold">Camera & Device Setup</h1>
          <p className="text-gray-400 text-lg mt-1">Configure your tracking hardware</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-2 gap-8">
        {/* Left: Camera preview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6">
            <h2 className="text-2xl font-bold mb-6">Camera Preview</h2>

            {/* Preview area */}
            <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-16 h-16 text-gray-600" />
              </div>

              {/* Grid overlay */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(0, 230, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 230, 255, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />

              {/* Calibration guide */}
              <div className="absolute inset-8 border-2 border-dashed border-cyan-500/30 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Position yourself within this frame</p>
                </div>
              </div>
            </div>

            {/* Skeleton calibration preview */}
            <div className="bg-[#0a0a0f]/50 rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Skeleton Detection Preview
              </h3>
              <div className="flex justify-center">
                <svg className="w-40 h-60" viewBox="0 0 100 150">
                  {/* Head */}
                  <circle cx="50" cy="15" r="8" fill="none" stroke="#00e6ff" strokeWidth="2" />
                  {/* Neck */}
                  <line x1="50" y1="23" x2="50" y2="35" stroke="#00e6ff" strokeWidth="2" />
                  {/* Shoulders */}
                  <line x1="30" y1="35" x2="70" y2="35" stroke="#00e6ff" strokeWidth="2" />
                  {/* Spine */}
                  <line x1="50" y1="35" x2="50" y2="70" stroke="#00e6ff" strokeWidth="2" />
                  {/* Left arm */}
                  <line x1="30" y1="35" x2="20" y2="50" stroke="#00e6ff" strokeWidth="2" />
                  <line x1="20" y1="50" x2="15" y2="70" stroke="#00e6ff" strokeWidth="2" />
                  {/* Right arm */}
                  <line x1="70" y1="35" x2="80" y2="50" stroke="#00e6ff" strokeWidth="2" />
                  <line x1="80" y1="50" x2="85" y2="70" stroke="#00e6ff" strokeWidth="2" />
                  {/* Hips */}
                  <line x1="40" y1="70" x2="60" y2="70" stroke="#00e6ff" strokeWidth="2" />
                  {/* Left leg */}
                  <line x1="40" y1="70" x2="35" y2="100" stroke="#00e6ff" strokeWidth="2" />
                  <line x1="35" y1="100" x2="30" y2="130" stroke="#00e6ff" strokeWidth="2" />
                  {/* Right leg */}
                  <line x1="60" y1="70" x2="65" y2="100" stroke="#00e6ff" strokeWidth="2" />
                  <line x1="65" y1="100" x2="70" y2="130" stroke="#00e6ff" strokeWidth="2" />
                  {/* Key points */}
                  {[
                    [50, 15], [50, 35], [30, 35], [70, 35],
                    [20, 50], [80, 50], [15, 70], [85, 70],
                    [50, 70], [40, 70], [60, 70],
                    [35, 100], [65, 100], [30, 130], [70, 130]
                  ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="#00e6ff">
                      <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" begin={i * 0.1} />
                    </circle>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Camera selection */}
          <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6">
            <h2 className="text-xl font-bold mb-4">Camera Selection</h2>
            <div className="space-y-3">
              {[
                { id: 'camera-1', name: 'Built-in Camera', resolution: '1920x1080 @ 60fps' },
                { id: 'camera-2', name: 'USB Camera', resolution: '1280x720 @ 30fps' },
                { id: 'camera-3', name: 'External Webcam', resolution: '3840x2160 @ 30fps' }
              ].map((camera) => (
                <button
                  key={camera.id}
                  onClick={() => setSelectedCamera(camera.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${selectedCamera === camera.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-700 bg-[#0a0a0f]/30 hover:border-gray-600'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Video className={`w-5 h-5 ${selectedCamera === camera.id ? 'text-cyan-400' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="font-medium">{camera.name}</div>
                      <div className="text-sm text-gray-400">{camera.resolution}</div>
                    </div>
                    {selectedCamera === camera.id && (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution settings */}
          <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6">
            <h2 className="text-xl font-bold mb-4">Resolution & Quality</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-[#0a0a0f]/50 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  <option value="3840x2160">4K (3840x2160)</option>
                  <option value="1920x1080">Full HD (1920x1080)</option>
                  <option value="1280x720">HD (1280x720)</option>
                  <option value="640x480">SD (640x480)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Frame Rate</label>
                <select className="w-full bg-[#0a0a0f]/50 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors">
                  <option value="60">60 FPS (Recommended)</option>
                  <option value="30">30 FPS</option>
                  <option value="24">24 FPS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Environment status */}
          <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6">
            <h2 className="text-xl font-bold mb-4">Environment Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium">Lighting</span>
                </div>
                <span className="text-sm text-green-400">Excellent</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium">Space Clearance</span>
                </div>
                <span className="text-sm text-green-400">Good</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-medium">Background</span>
                </div>
                <span className="text-sm text-yellow-400">Cluttered</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={() => onNavigate('calibration')}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-4 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            Continue to Calibration
          </button>
        </motion.div>
      </div>
    </div>
  );
}
