import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Book, MessageCircle, Search, ExternalLink } from 'lucide-react';
import type { Screen } from '../App';

interface HelpTutorialsProps {
  onNavigate: (screen: Screen) => void;
}

export function HelpTutorials({ onNavigate }: HelpTutorialsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const tutorials = [
    {
      id: '1',
      title: 'Getting Started with SRIKA',
      duration: '5:32',
      category: 'Basics',
      thumbnail: '🚀',
    },
    {
      id: '2',
      title: 'Calibrating Your Body Tracking',
      duration: '8:15',
      category: 'Setup',
      thumbnail: '🎯',
    },
    {
      id: '3',
      title: 'Creating Custom Control Profiles',
      duration: '12:45',
      category: 'Advanced',
      thumbnail: '⚙️',
    },
    {
      id: '4',
      title: 'Optimizing for Fighting Games',
      duration: '10:20',
      category: 'Gaming',
      thumbnail: '🥊',
    },
    {
      id: '5',
      title: 'Using SRIKA for Fitness',
      duration: '7:50',
      category: 'Fitness',
      thumbnail: '💪',
    },
    {
      id: '6',
      title: 'Troubleshooting Common Issues',
      duration: '15:00',
      category: 'Support',
      thumbnail: '🔧',
    },
  ];

  const faqs = [
    {
      question: 'What camera specs do I need?',
      answer: 'Any webcam with 720p resolution and 30fps is sufficient. For best results, we recommend 1080p at 60fps.',
    },
    {
      question: 'Does SRIKA work in low light?',
      answer: 'SRIKA works best in well-lit environments. We recommend at least 300 lux of lighting for optimal tracking.',
    },
    {
      question: 'Can I use SRIKA with VR headsets?',
      answer: 'Yes! SRIKA is compatible with most VR headsets and can enhance your VR experience with full body tracking.',
    },
    {
      question: 'Is my data private?',
      answer: 'Absolutely. All processing happens locally on your device. No video or movement data is ever uploaded.',
    },
    {
      question: 'What games are supported?',
      answer: 'SRIKA works with any game that accepts keyboard/mouse input. We provide optimized profiles for popular titles.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('home')}
            className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold">Help & Tutorials</h1>
            <p className="text-gray-400 text-lg mt-1">Learn how to get the most out of SRIKA</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tutorials and FAQs..."
            className="w-full bg-[#1a1a2e]/80 border border-gray-700 rounded-2xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-6">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-3xl p-8 text-left hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            <Play className="w-10 h-10 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Watch Intro Video</h3>
            <p className="text-white/80">5 minute overview of SRIKA</p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl border border-cyan-500/20 rounded-3xl p-8 text-left hover:border-cyan-500/40 transition-all"
          >
            <Book className="w-10 h-10 mb-4 text-cyan-400" />
            <h3 className="text-2xl font-bold mb-2">Documentation</h3>
            <p className="text-gray-400">Complete user manual</p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl border border-cyan-500/20 rounded-3xl p-8 text-left hover:border-cyan-500/40 transition-all"
          >
            <MessageCircle className="w-10 h-10 mb-4 text-purple-400" />
            <h3 className="text-2xl font-bold mb-2">Community</h3>
            <p className="text-gray-400">Join our Discord server</p>
          </motion.button>
        </div>

        {/* Video tutorials */}
        <div>
          <h2 className="text-3xl font-bold mb-6">Video Tutorials</h2>
          <div className="grid grid-cols-3 gap-6">
            {tutorials.map((tutorial, index) => (
              <motion.div
                key={tutorial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 overflow-hidden hover:border-cyan-500/40 transition-all group cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center relative">
                  <div className="text-6xl">{tutorial.thumbnail}</div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-semibold">
                    {tutorial.duration}
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="text-xs font-semibold text-cyan-400 mb-2">{tutorial.category}</div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-cyan-400 transition-colors">
                    {tutorial.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.details
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 overflow-hidden group"
              >
                <summary className="p-6 font-semibold text-lg cursor-pointer hover:text-cyan-400 transition-colors list-none flex items-center justify-between">
                  {faq.question}
                  <span className="text-cyan-400 text-2xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                  {faq.answer}
                </div>
              </motion.details>
            ))}
          </div>
        </div>

        {/* Support links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Need More Help?</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="#"
              className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl hover:bg-[#0a0a0f]/70 transition-all group"
            >
              <div>
                <div className="font-semibold mb-1">Email Support</div>
                <div className="text-sm text-gray-400">support@srika.io</div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </a>

            <a
              href="#"
              className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl hover:bg-[#0a0a0f]/70 transition-all group"
            >
              <div>
                <div className="font-semibold mb-1">Discord Community</div>
                <div className="text-sm text-gray-400">Join 50K+ users</div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </a>

            <a
              href="#"
              className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl hover:bg-[#0a0a0f]/70 transition-all group"
            >
              <div>
                <div className="font-semibold mb-1">GitHub Issues</div>
                <div className="text-sm text-gray-400">Report bugs</div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </a>

            <a
              href="#"
              className="flex items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-2xl hover:bg-[#0a0a0f]/70 transition-all group"
            >
              <div>
                <div className="font-semibold mb-1">Feature Requests</div>
                <div className="text-sm text-gray-400">Vote on ideas</div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
