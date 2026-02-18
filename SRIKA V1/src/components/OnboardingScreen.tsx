import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Play, Activity, Shield, Gamepad2, Heart, Accessibility, Sparkles } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Motion-Based Control',
      description: 'Control your games and applications using natural body movements. No controllers, no keyboard — just you.',
      icon: Activity,
      features: [
        'Real-time skeleton tracking',
        'Sub-20ms latency',
        'Works with any camera'
      ]
    },
    {
      title: 'Privacy-First Technology',
      description: 'All processing happens locally on your device. Your movements never leave your computer.',
      icon: Shield,
      features: [
        'Local processing only',
        'No cloud uploads',
        'Complete privacy control'
      ]
    },
    {
      title: 'Built For Everyone',
      description: 'From gaming to fitness, accessibility to VR — SRIKA adapts to your needs.',
      icon: Sparkles,
      features: [
        'Gaming & eSports',
        'Fitness & Training',
        'Accessibility Support',
        'VR & AR Integration'
      ]
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-8">
        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          SRIKA
        </div>
        <button 
          onClick={handleSkip}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl w-full"
        >
          <div className="grid grid-cols-2 gap-16 items-center">
            {/* Left: Illustration */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl p-16 border border-cyan-500/20 flex items-center justify-center">
                <Icon className="w-32 h-32 text-cyan-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <h2 className="text-5xl font-bold mb-6 leading-tight">
                {currentStepData.title}
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                {currentStepData.description}
              </p>
              <ul className="space-y-4 mb-12">
                {currentStepData.features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-center gap-3 text-lg"
                  >
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                    <span className="text-gray-300">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-8 flex justify-between items-center">
        {/* Progress dots */}
        <div className="flex gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentStep 
                  ? 'w-8 bg-cyan-400' 
                  : 'w-2 bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="group flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
        >
          {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
