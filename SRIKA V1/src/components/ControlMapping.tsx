import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Edit2, Save } from 'lucide-react';
import type { Screen } from '../App';

interface ControlMappingProps {
  onNavigate: (screen: Screen) => void;
}

interface Mapping {
  id: string;
  bodyPart: string;
  action: string;
  key: string;
  sensitivity: number;
  cooldown: number;
}

export function ControlMapping({ onNavigate }: ControlMappingProps) {
  const [mappings, setMappings] = useState<Mapping[]>([
    { id: '1', bodyPart: 'Right Hand Punch', action: 'Attack', key: 'J', sensitivity: 75, cooldown: 200 },
    { id: '2', bodyPart: 'Left Hand Punch', action: 'Secondary Attack', key: 'K', sensitivity: 75, cooldown: 200 },
    { id: '3', bodyPart: 'Jump', action: 'Jump', key: 'Space', sensitivity: 60, cooldown: 500 },
    { id: '4', bodyPart: 'Forward Walk', action: 'Move Forward', key: 'W', sensitivity: 50, cooldown: 0 },
    { id: '5', bodyPart: 'Backward Walk', action: 'Move Back', key: 'S', sensitivity: 50, cooldown: 0 },
    { id: '6', bodyPart: 'Right Kick', action: 'Special Move', key: 'L', sensitivity: 80, cooldown: 300 },
  ]);

  const [selectedMapping, setSelectedMapping] = useState<string | null>(mappings[0].id);

  const selectedMappingData = mappings.find(m => m.id === selectedMapping);

  const updateMapping = (id: string, field: keyof Mapping, value: any) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const deleteMapping = (id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id));
    if (selectedMapping === id) {
      setSelectedMapping(mappings[0]?.id || null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('home')}
            className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold">Control Mapping</h1>
            <p className="text-gray-400 text-lg mt-1">Map body movements to keyboard inputs</p>
          </div>
        </div>

        <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 rounded-2xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all">
          <Save className="w-5 h-5" />
          Save Profile
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
        {/* Left: Body model */}
        <div className="col-span-5">
          <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8 sticky top-8">
            <h2 className="text-2xl font-bold mb-6">Body Interaction Points</h2>

            {/* Body visualization */}
            <div className="relative bg-[#0a0a0f]/50 rounded-2xl p-12 flex justify-center">
              <svg className="w-64 h-106" viewBox="0 0 100 150">
                {/* Body skeleton */}
                <circle cx="50" cy="15" r="8" fill="none" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="50" y1="23" x2="50" y2="35" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="30" y1="35" x2="70" y2="35" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="50" y1="35" x2="50" y2="70" stroke="#2a2a3e" strokeWidth="2" />

                {/* Arms */}
                <line x1="30" y1="35" x2="15" y2="50" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="15" y1="50" x2="5" y2="65" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="70" y1="35" x2="85" y2="50" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="85" y1="50" x2="95" y2="65" stroke="#2a2a3e" strokeWidth="2" />

                {/* Legs */}
                <line x1="40" y1="70" x2="35" y2="100" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="35" y1="100" x2="30" y2="130" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="60" y1="70" x2="65" y2="100" stroke="#2a2a3e" strokeWidth="2" />
                <line x1="65" y1="100" x2="70" y2="130" stroke="#2a2a3e" strokeWidth="2" />

                {/* Interactive points */}
                {/* Right Hand */}
                <g className="cursor-pointer" onClick={() => setSelectedMapping('1')}>
                  <circle cx="95" cy="65" r="6" fill={selectedMapping === '1' ? '#00e6ff' : '#4a4a6e'} className="transition-all" />
                  <circle cx="95" cy="65" r="10" fill="none" stroke={selectedMapping === '1' ? '#00e6ff' : 'transparent'} strokeWidth="2" className="transition-all">
                    <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="95" y="80" textAnchor="middle" fill="#00e6ff" fontSize="8" fontWeight="bold">J</text>
                </g>

                {/* Left Hand */}
                <g className="cursor-pointer" onClick={() => setSelectedMapping('2')}>
                  <circle cx="5" cy="65" r="6" fill={selectedMapping === '2' ? '#00e6ff' : '#4a4a6e'} className="transition-all" />
                  <circle cx="5" cy="65" r="10" fill="none" stroke={selectedMapping === '2' ? '#00e6ff' : 'transparent'} strokeWidth="2" className="transition-all">
                    <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="5" y="80" textAnchor="middle" fill="#00e6ff" fontSize="8" fontWeight="bold">K</text>
                </g>

                {/* Head/Jump */}
                <g className="cursor-pointer" onClick={() => setSelectedMapping('3')}>
                  <circle cx="50" cy="15" r="6" fill={selectedMapping === '3' ? '#00e6ff' : '#4a4a6e'} className="transition-all" />
                  <text x="50" y="5" textAnchor="middle" fill="#00e6ff" fontSize="8" fontWeight="bold">SPC</text>
                </g>

                {/* Body center - Forward */}
                <g className="cursor-pointer" onClick={() => setSelectedMapping('4')}>
                  <circle cx="50" cy="50" r="6" fill={selectedMapping === '4' ? '#00e6ff' : '#4a4a6e'} className="transition-all" />
                  <text x="50" y="58" textAnchor="middle" fill="#00e6ff" fontSize="8" fontWeight="bold">W</text>
                </g>

                {/* Right Leg */}
                <g className="cursor-pointer" onClick={() => setSelectedMapping('6')}>
                  <circle cx="70" cy="130" r="6" fill={selectedMapping === '6' ? '#00e6ff' : '#4a4a6e'} className="transition-all" />
                  <text x="70" y="145" textAnchor="middle" fill="#00e6ff" fontSize="8" fontWeight="bold">L</text>
                </g>
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 bg-cyan-400 rounded-full" />
                <span className="text-gray-400">Active mapping points</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 bg-gray-600 rounded-full" />
                <span className="text-gray-400">Available points</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mapping list and controls */}
        <div className="col-span-7 space-y-6">
          {/* Mappings list */}
          <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Active Mappings</h2>
              <button className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-cyan-500/30 transition-all">
                <Plus className="w-4 h-4" />
                Add Mapping
              </button>
            </div>

            <div className="space-y-3">
              {mappings.map((mapping) => (
                <motion.div
                  key={mapping.id}
                  onClick={() => setSelectedMapping(mapping.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedMapping === mapping.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-[#0a0a0f]/30 hover:border-gray-600'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{mapping.bodyPart}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-400">{mapping.action}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Key: <span className="text-cyan-400 font-mono">{mapping.key}</span></span>
                        <span>•</span>
                        <span>Sensitivity: {mapping.sensitivity}%</span>
                        <span>•</span>
                        <span>Cooldown: {mapping.cooldown}ms</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMapping(mapping.id);
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Edit controls */}
          {selectedMappingData && (
            <motion.div
              key={selectedMapping}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6"
            >
              <h2 className="text-2xl font-bold mb-6">Edit Mapping</h2>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Body Movement</label>
                    <input
                      type="text"
                      value={selectedMappingData.bodyPart}
                      onChange={(e) => updateMapping(selectedMapping!, 'bodyPart', e.target.value)}
                      className="w-full bg-[#0a0a0f]/50 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Action Name</label>
                    <input
                      type="text"
                      value={selectedMappingData.action}
                      onChange={(e) => updateMapping(selectedMapping!, 'action', e.target.value)}
                      className="w-full bg-[#0a0a0f]/50 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Keyboard Mapping</label>
                  <input
                    type="text"
                    value={selectedMappingData.key}
                    onChange={(e) => updateMapping(selectedMapping!, 'key', e.target.value)}
                    className="w-full bg-[#0a0a0f]/50 border border-gray-700 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="Press a key..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Sensitivity: {selectedMappingData.sensitivity}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedMappingData.sensitivity}
                    onChange={(e) => updateMapping(selectedMapping!, 'sensitivity', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #00e6ff ${selectedMappingData.sensitivity}%, #374151 ${selectedMappingData.sensitivity}%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Less sensitive</span>
                    <span>More sensitive</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Cooldown: {selectedMappingData.cooldown}ms
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={selectedMappingData.cooldown}
                    onChange={(e) => updateMapping(selectedMapping!, 'cooldown', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #00e6ff ${selectedMappingData.cooldown / 10}%, #374151 ${selectedMappingData.cooldown / 10}%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>No delay</span>
                    <span>1000ms delay</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
