import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Toggle, Accessibility as AccessibilityIcon } from 'lucide-react';
import type { Screen } from '../App';

interface AccessibilitySettingsProps {
  onNavigate: (screen: Screen) => void;
}

export function AccessibilitySettings({ onNavigate }: AccessibilitySettingsProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [oneSideBody, setOneSideBody] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [assistiveMode, setAssistiveMode] = useState(false);
  const [delayCompensation, setDelayCompensation] = useState(150);

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-14 h-8 rounded-full transition-colors ${
        enabled ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gray-700'
      }`}
    >
      <motion.div
        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"
        animate={{ x: enabled ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-12">
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-bold">Accessibility Settings</h1>
          <p className="text-gray-400 text-lg mt-1">Customize SRIKA to work best for you</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Visual settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-cyan-500/20 rounded-2xl">
              <AccessibilityIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold">Visual Accessibility</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Reduced Motion Mode</h3>
                <p className="text-sm text-gray-400">Minimize animations and transitions throughout the app</p>
              </div>
              <ToggleSwitch enabled={reducedMotion} onChange={setReducedMotion} />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">High Contrast Mode</h3>
                <p className="text-sm text-gray-400">Increase contrast for better visibility</p>
              </div>
              <ToggleSwitch enabled={highContrast} onChange={setHighContrast} />
            </div>
          </div>
        </motion.div>

        {/* Physical settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Physical Adaptations</h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">One-Side Body Support</h3>
                <p className="text-sm text-gray-400">Enable tracking with limited mobility on one side</p>
              </div>
              <ToggleSwitch enabled={oneSideBody} onChange={setOneSideBody} />
            </div>

            {oneSideBody && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="ml-8 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Preferred Side</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 bg-cyan-500/20 border-2 border-cyan-500 rounded-2xl font-semibold">
                      Left Side
                    </button>
                    <button className="p-4 bg-[#0a0a0f]/50 border-2 border-gray-700 rounded-2xl font-semibold hover:border-gray-600 transition-colors">
                      Right Side
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Assistive Mode</h3>
                <p className="text-sm text-gray-400">Lower detection thresholds for easier triggering</p>
              </div>
              <ToggleSwitch enabled={assistiveMode} onChange={setAssistiveMode} />
            </div>
          </div>
        </motion.div>

        {/* Feedback settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Feedback Options</h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Audio Feedback</h3>
                <p className="text-sm text-gray-400">Play sounds when actions are detected</p>
              </div>
              <ToggleSwitch enabled={audioFeedback} onChange={setAudioFeedback} />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Haptic Feedback</h3>
                <p className="text-sm text-gray-400">Vibration feedback on supported devices</p>
              </div>
              <ToggleSwitch enabled={hapticFeedback} onChange={setHapticFeedback} />
            </div>
          </div>
        </motion.div>

        {/* Custom gestures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Custom Gestures</h2>

          <div className="space-y-4">
            <p className="text-gray-400">
              Define alternative gestures that are more comfortable for your range of motion
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Punch Alternative', current: 'Forward Punch', alternative: 'Arm Raise' },
                { name: 'Kick Alternative', current: 'High Kick', alternative: 'Knee Lift' },
                { name: 'Jump Alternative', current: 'Vertical Jump', alternative: 'Crouch' },
                { name: 'Duck Alternative', current: 'Full Crouch', alternative: 'Slight Lean' },
              ].map((gesture, index) => (
                <div key={index} className="p-4 bg-[#0a0a0f]/50 rounded-2xl">
                  <h4 className="font-semibold mb-3">{gesture.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current:</span>
                      <span className="text-gray-300">{gesture.current}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Alt:</span>
                      <span className="text-cyan-400">{gesture.alternative}</span>
                    </div>
                  </div>
                  <button className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">
                    Configure
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Timing adjustments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Timing Adjustments</h2>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Delay Compensation: {delayCompensation}ms
            </label>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={delayCompensation}
              onChange={(e) => setDelayCompensation(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00e6ff ${delayCompensation / 5}%, #374151 ${delayCompensation / 5}%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Faster response</span>
              <span>More deliberate actions</span>
            </div>
            <p className="text-sm text-gray-400 mt-3">
              Add a small delay to prevent accidental triggers from involuntary movements
            </p>
          </div>
        </motion.div>

        {/* Save button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-4 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all">
            Save Accessibility Settings
          </button>
        </motion.div>
      </div>
    </div>
  );
}
