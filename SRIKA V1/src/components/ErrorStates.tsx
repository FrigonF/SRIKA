import { motion } from 'motion/react';
import { AlertTriangle, Camera, Sun, User, RefreshCw, Settings } from 'lucide-react';
import type { Screen } from '../App';

interface ErrorStatesProps {
  onNavigate: (screen: Screen) => void;
}

export function ErrorStates({ onNavigate }: ErrorStatesProps) {
  const errors = [
    {
      icon: Camera,
      title: 'Camera Not Detected',
      description: 'No camera was found on your system. Please connect a camera and try again.',
      color: 'red',
      suggestions: [
        'Check if your camera is properly connected',
        'Make sure camera permissions are enabled',
        'Try restarting the application',
        'Check if another application is using the camera',
      ],
      actions: [
        { label: 'Retry Detection', primary: true },
        { label: 'Camera Settings', primary: false },
      ],
    },
    {
      icon: Sun,
      title: 'Low Light Warning',
      description: 'The current lighting conditions are too dark for accurate body tracking.',
      color: 'yellow',
      suggestions: [
        'Turn on additional lights in the room',
        'Move closer to a window or light source',
        'Adjust camera exposure settings',
        'Consider using external lighting',
      ],
      actions: [
        { label: 'Continue Anyway', primary: false },
        { label: 'Adjust Settings', primary: true },
      ],
    },
    {
      icon: User,
      title: 'Body Not Fully Visible',
      description: 'Parts of your body are outside the camera frame. Full body visibility is required.',
      color: 'orange',
      suggestions: [
        'Step back from the camera',
        'Ensure your entire body is in frame',
        'Adjust camera angle or position',
        'Check for obstructions in front of the camera',
      ],
      actions: [
        { label: 'Recalibrate', primary: true },
        { label: 'Skip Calibration', primary: false },
      ],
    },
    {
      icon: AlertTriangle,
      title: 'Tracking Lost',
      description: 'Body tracking has been interrupted. Movement detection is currently unavailable.',
      color: 'red',
      suggestions: [
        'Ensure you are in the camera view',
        'Check for proper lighting',
        'Avoid rapid or erratic movements',
        'Make sure the camera is not obstructed',
      ],
      actions: [
        { label: 'Resume Tracking', primary: true },
        { label: 'Return to Home', primary: false },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2">Error States & Troubleshooting</h1>
        <p className="text-gray-400 text-lg">Preview of various error conditions and their solutions</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-2 gap-8">
        {errors.map((error, index) => {
          const Icon = error.icon;
          const colorMap = {
            red: {
              bg: 'from-red-500/20 to-red-600/20',
              border: 'border-red-500/50',
              icon: 'text-red-400',
              button: 'from-red-500 to-red-600',
              shadow: 'shadow-red-500/50',
            },
            yellow: {
              bg: 'from-yellow-500/20 to-yellow-600/20',
              border: 'border-yellow-500/50',
              icon: 'text-yellow-400',
              button: 'from-yellow-500 to-yellow-600',
              shadow: 'shadow-yellow-500/50',
            },
            orange: {
              bg: 'from-orange-500/20 to-orange-600/20',
              border: 'border-orange-500/50',
              icon: 'text-orange-400',
              button: 'from-orange-500 to-orange-600',
              shadow: 'shadow-orange-500/50',
            },
          };

          const colors = colorMap[error.color as keyof typeof colorMap];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${colors.bg} backdrop-blur-xl rounded-3xl border-2 ${colors.border} p-8`}
            >
              {/* Icon and title */}
              <div className="flex items-start gap-4 mb-6">
                <div className={`p-4 bg-[#0a0a0f]/50 rounded-2xl ${colors.border} border`}>
                  <Icon className={`w-8 h-8 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{error.title}</h2>
                  <p className="text-gray-300">{error.description}</p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className={colors.icon}>💡</span>
                  Suggestions:
                </h3>
                <ul className="space-y-2">
                  {error.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className={`${colors.icon} mt-0.5`}>•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {error.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => onNavigate('home')}
                    className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
                      action.primary
                        ? `bg-gradient-to-r ${colors.button} hover:shadow-lg ${colors.shadow}`
                        : 'bg-white/5 hover:bg-white/10 border border-gray-700'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Full screen error example */}
      <div className="max-w-6xl mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-6">Full Screen Error Example</h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-12 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            <AlertTriangle className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-4xl font-bold mb-4">Connection Interrupted</h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            The connection to your camera has been lost. Please check your camera and try reconnecting.
          </p>

          <div className="flex justify-center gap-4">
            <button 
              onClick={() => onNavigate('camera-setup')}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Reconnect Camera
            </button>
            <button 
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
            >
              <Settings className="w-5 h-5" />
              Open Settings
            </button>
          </div>

          {/* Additional info */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <p className="text-sm text-gray-500 mb-4">Need more help?</p>
            <div className="flex justify-center gap-6 text-sm">
              <button 
                onClick={() => onNavigate('help')}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View Troubleshooting Guide
              </button>
              <span className="text-gray-700">•</span>
              <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Back button */}
      <div className="max-w-6xl mx-auto mt-8">
        <button
          onClick={() => onNavigate('home')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
