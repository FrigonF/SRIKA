import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageType } from './VerticalTaskBar';
import { useSrika } from '../context/SrikaContext';
import { CalibrationManager } from '../managers/CalibrationManager';
import type { NormalizedLandmarkList } from '@mediapipe/pose';

interface BodyCalibrationProps {
  onNavigate: (screen: PageType) => void;
}

const calibrationSteps = [
  {
    title: 'Stand Straight',
    instruction: 'Stand facing the camera with your arms at your sides. Keep your body relaxed and natural.',
    pose: 'stand',
  },
  {
    title: 'Raise Your Arms',
    instruction: 'Slowly raise both arms to shoulder height, forming a T-shape. Hold this position steady.',
    pose: 'arms-raised',
  },
  {
    title: 'Walk in Place',
    instruction: 'March in place, lifting your knees to hip height. Maintain a steady rhythm for 5 seconds.',
    pose: 'walk',
  },
  {
    title: 'Strike Detection',
    instruction: 'Perform a forward punch with your right hand, then left hand. Follow with kicks if applicable.',
    pose: 'punch',
  },
];

// Helper function to calculate angle between three points
const calculateAngle = (a: any, b: any, c: any): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
};

// Pose validation functions
const validateStandStraight = (landmarks: NormalizedLandmarkList): number => {
  if (!landmarks || landmarks.length < 33) return 0;

  const leftShoulder = landmarks[11];
  const leftElbow = landmarks[13];
  const leftWrist = landmarks[15];
  const rightShoulder = landmarks[12];
  const rightElbow = landmarks[14];
  const rightWrist = landmarks[16];

  // Check if arms are roughly straight down (angle close to 180°)
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  // Check if wrists are below hips
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const wristsLow = leftWrist.y > leftHip.y && rightWrist.y > rightHip.y;

  const leftScore = Math.min(100, (leftArmAngle / 180) * 100);
  const rightScore = Math.min(100, (rightArmAngle / 180) * 100);
  const positionScore = wristsLow ? 100 : 50;

  return (leftScore + rightScore + positionScore) / 3;
};

const validateTPose = (landmarks: NormalizedLandmarkList): number => {
  if (!landmarks || landmarks.length < 33) return 0;

  const leftShoulder = landmarks[11];
  const leftWrist = landmarks[15];
  const rightShoulder = landmarks[12];
  const rightWrist = landmarks[16];

  // Check if arms are horizontal (Y values similar)
  const leftArmHorizontal = Math.abs(leftShoulder.y - leftWrist.y);
  const rightArmHorizontal = Math.abs(rightShoulder.y - rightWrist.y);

  // Check if arms are extended (X distance from shoulders)
  const leftArmExtended = Math.abs(leftShoulder.x - leftWrist.x);
  const rightArmExtended = Math.abs(rightShoulder.x - rightWrist.x);

  const leftHorizontalScore = Math.max(0, 100 - leftArmHorizontal * 500);
  const rightHorizontalScore = Math.max(0, 100 - rightArmHorizontal * 500);
  const leftExtendedScore = Math.min(100, leftArmExtended * 400);
  const rightExtendedScore = Math.min(100, rightArmExtended * 400);

  return (leftHorizontalScore + rightHorizontalScore + leftExtendedScore + rightExtendedScore) / 4;
};

const validateWalk = (landmarks: NormalizedLandmarkList): number => {
  if (!landmarks || landmarks.length < 33) return 0;

  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[27];

  // Check if at least one knee is raised
  const leftKneeRaised = leftKnee.y < leftHip.y - 0.1;
  const rightKneeRaised = rightKnee.y < rightHip.y - 0.1;

  if (leftKneeRaised || rightKneeRaised) {
    return 100;
  }

  // Partial score if knees are slightly raised
  const leftRaiseAmount = Math.max(0, (leftHip.y - leftKnee.y) * 500);
  const rightRaiseAmount = Math.max(0, (rightHip.y - rightKnee.y) * 500);

  return Math.max(leftRaiseAmount, rightRaiseAmount);
};

const validatePunch = (landmarks: NormalizedLandmarkList): number => {
  if (!landmarks || landmarks.length < 33) return 0;

  const leftShoulder = landmarks[11];
  const leftWrist = landmarks[15];
  const rightShoulder = landmarks[12];
  const rightWrist = landmarks[16];
  const nose = landmarks[0];

  // Check if either wrist is extended forward (beyond nose X position)
  const leftPunchExtended = leftWrist.x < nose.x - 0.1;
  const rightPunchExtended = rightWrist.x > nose.x + 0.1;

  if (leftPunchExtended || rightPunchExtended) {
    return 100;
  }

  // Partial score based on extension
  const leftExtension = Math.max(0, (leftShoulder.x - leftWrist.x) * 300);
  const rightExtension = Math.max(0, (rightWrist.x - rightShoulder.x) * 300);

  return Math.max(leftExtension, rightExtension);
};

export function BodyCalibration({ onNavigate }: BodyCalibrationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepComplete, setStepComplete] = useState<boolean[]>(new Array(calibrationSteps.length).fill(false));
  const [poseMatchScore, setPoseMatchScore] = useState(0);
  const [holdTime, setHoldTime] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const context = useSrika();
  const { poseLandmarks } = context;
  const currentStepData = calibrationSteps[currentStep];

  // Required hold time in seconds
  const REQUIRED_HOLD_TIME = 2.5;
  const MATCH_THRESHOLD = 75; // 75% match required

  // Validate current pose
  useEffect(() => {
    if (!poseLandmarks) {
      setPoseMatchScore(0);
      return;
    }

    let score = 0;
    switch (currentStepData.pose) {
      case 'stand':
        score = validateStandStraight(poseLandmarks);
        break;
      case 'arms-raised':
        score = validateTPose(poseLandmarks);
        break;
      case 'walk':
        score = validateWalk(poseLandmarks);
        break;
      case 'punch':
        score = validatePunch(poseLandmarks);
        break;
    }

    setPoseMatchScore(Math.round(score));

    // Check if pose is held
    if (score >= MATCH_THRESHOLD) {
      setIsHolding(true);
    } else {
      setIsHolding(false);
      setHoldTime(0);
    }
  }, [poseLandmarks, currentStepData.pose]);

  // Hold timer
  useEffect(() => {
    if (!isHolding) return;

    const interval = setInterval(() => {
      setHoldTime((prev) => {
        const newTime = prev + 0.1;
        if (newTime >= REQUIRED_HOLD_TIME) {
          handleAutoAdvance();
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isHolding, currentStep]);

  const handleAutoAdvance = () => {
    setStepComplete((prev) => {
      const newState = [...prev];
      newState[currentStep] = true;
      return newState;
    });

    if (currentStep < calibrationSteps.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setHoldTime(0);
        setIsHolding(false);
      }, 500);
    } else {
      // Save calibration
      if (poseLandmarks) {
        CalibrationManager.save(poseLandmarks);
        console.log('[Calibration] Completed and saved!');
      }
      setTimeout(() => onNavigate('dashboard'), 1000);
    }
  };

  const handleManualNext = () => {
    handleAutoAdvance();
  };

  const handleSkip = () => {
    // Create a dummy calibration to mark as valid
    if (poseLandmarks) {
      CalibrationManager.save(poseLandmarks);
    }
    onNavigate('dashboard');
  };

  const progressPercentage = ((currentStep + 1) / calibrationSteps.length) * 100;
  const holdPercentage = (holdTime / REQUIRED_HOLD_TIME) * 100;

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#0a0a0f] via-[#0f111a] to-[#0a0a0f] overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex-1 mx-8">
            <h1 className="text-3xl font-bold mb-2">Body Calibration</h1>
            <p className="text-gray-400 text-sm">Step {currentStep + 1} of {calibrationSteps.length}</p>
          </div>

          {/* Progress bar */}
          <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Main content */}
        <motion.div
          key={currentStep}
          className="grid grid-cols-2 gap-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left: Instructions */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8">
              <h2 className="text-2xl font-bold mb-4">{currentStepData.title}</h2>
              <p className="text-gray-300 text-lg leading-relaxed">{currentStepData.instruction}</p>

              {/* Match indicator */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Pose Match</span>
                  <span className={`text-sm font-bold ${poseMatchScore >= MATCH_THRESHOLD ? 'text-green-400' : 'text-cyan-400'}`}>
                    {poseMatchScore}%
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${poseMatchScore >= MATCH_THRESHOLD ? 'bg-green-500' : 'bg-cyan-500'}`}
                    animate={{ width: `${poseMatchScore}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>

              {/* Hold timer */}
              {isHolding && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Hold Position</span>
                    <span className="text-sm font-bold text-green-400">
                      {holdTime.toFixed(1)}s / {REQUIRED_HOLD_TIME}s
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      animate={{ width: `${holdPercentage}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-blue-500/20 p-6">
              <h3 className="font-semibold mb-3">💡 Tips for Best Results</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Ensure your entire body is visible in the frame</li>
                <li>• Stand 6-8 feet away from the camera</li>
                <li>• Wear fitted clothing for better detection</li>
                <li>• Keep movements smooth and deliberate</li>
              </ul>
            </div>
          </div>

          {/* Right: Live camera feed */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6">
              <h3 className="text-xl font-semibold mb-4">Live Camera Feed</h3>

              {/* Camera preview - shows actual skeleton */}
              <div className="aspect-[3/4] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden relative">
                {!poseLandmarks ? (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">Camera Inactive</p>
                      <p className="text-sm">Click START button to begin</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detection status */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
                      <div className={`${poseMatchScore >= MATCH_THRESHOLD ? 'bg-green-500/20 border-green-500/50' : 'bg-cyan-500/20 border-cyan-500/50'} border px-4 py-2 rounded-full flex items-center gap-2`}>
                        <div className={`w-2 h-2 ${poseMatchScore >= MATCH_THRESHOLD ? 'bg-green-400' : 'bg-cyan-400'} rounded-full animate-pulse`} />
                        <span className={`text-sm font-medium ${poseMatchScore >= MATCH_THRESHOLD ? 'text-green-400' : 'text-cyan-400'}`}>
                          {poseMatchScore >= MATCH_THRESHOLD ? 'Match!' : 'Detecting'}
                        </span>
                      </div>
                      <div className="bg-[#0a0a0f]/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                        {poseMatchScore}%
                      </div>
                    </div>

                    {/* Completion indicator */}
                    {stepComplete[currentStep] && (
                      <motion.div
                        className="absolute bottom-4 left-4 right-4 z-10"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <div className="bg-green-500/20 border border-green-500/50 px-6 py-3 rounded-2xl flex items-center justify-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <span className="font-semibold text-green-400">Position Captured!</span>
                        </div>
                      </motion.div>
                    )}

                    {/* Instruction overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center text-white/80 bg-black/40 backdrop-blur-sm px-6 py-3 rounded-2xl">
                        <p className="text-sm font-medium">{currentStepData.title}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Detection stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-4 text-center">
                <div className="text-sm text-gray-400 mb-1">Keypoints</div>
                <div className="text-2xl font-bold text-cyan-400">{poseLandmarks ? '33/33' : '0/33'}</div>
              </div>
              <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-4 text-center">
                <div className="text-sm text-gray-400 mb-1">Accuracy</div>
                <div className={`text-2xl font-bold ${poseMatchScore >= MATCH_THRESHOLD ? 'text-green-400' : 'text-cyan-400'}`}>
                  {poseMatchScore}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-4 text-center">
                <div className="text-sm text-gray-400 mb-1">Status</div>
                <div className={`text-2xl font-bold ${poseMatchScore >= MATCH_THRESHOLD ? 'text-green-400' : 'text-blue-400'}`}>
                  {poseMatchScore >= MATCH_THRESHOLD ? 'Ready' : 'Adjust'}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <button
              onClick={handleManualNext}
              disabled={poseMatchScore < MATCH_THRESHOLD}
              className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${poseMatchScore >= MATCH_THRESHOLD
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg hover:shadow-cyan-500/50'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
            >
              {currentStep === calibrationSteps.length - 1 ? 'Complete Calibration' : 'Next Step'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 text-gray-400 hover:text-white transition-colors"
            >
              Skip Calibration
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
