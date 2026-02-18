import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Gamepad2, Swords, Target, Clock, Trash2, AlertCircle } from 'lucide-react';
import { ProfileManager, GameProfile } from '../managers/ProfileManager';
import { PageType } from './VerticalTaskBar';
import { useEngine } from '../context/EngineContext';

interface GameProfilesProps {
  onNavigate: (screen: PageType) => void;
}

export function GameProfiles({ onNavigate }: GameProfilesProps) {
  const [profiles, setProfiles] = useState<GameProfile[]>([]);
  const { engineMode, setEngineMode, trialStatus } = useEngine();
  const activeProfile = ProfileManager.getActive();

  useEffect(() => {
    setProfiles(ProfileManager.getProfiles());
    const handleUpdate = () => setProfiles(ProfileManager.getProfiles());
    window.addEventListener('srika-active-profile-changed', handleUpdate);
    return () => window.removeEventListener('srika-active-profile-changed', handleUpdate);
  }, []);

  const stats = useMemo(() => {
    const totalProfiles = profiles.length;
    const activeMappings = profiles.reduce((sum, p) => sum + p.mappings.length, 0);
    const totalHours = profiles.reduce((sum, p) => sum + (p.total_hours_used || 0), 0);
    const uniqueGames = new Set(profiles.map(p => p.game_name)).size;

    return [
      { label: 'Total Profiles', value: totalProfiles.toString(), color: 'cyan' },
      { label: 'Active Mappings', value: activeMappings.toString(), color: 'green' },
      { label: 'Hours Used', value: totalHours.toFixed(1), color: 'blue' },
      { label: 'Games Supported', value: uniqueGames.toString(), color: 'purple' },
    ];
  }, [profiles]);

  const handleActivate = (id: string) => {
    if (trialStatus.isExpired) return;
    ProfileManager.setActive(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      ProfileManager.deleteProfile(id, engineMode, setEngineMode).then(() => {
        setProfiles(ProfileManager.getProfiles());
      });
    }
  };



  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      {/* Trial Banner */}
      {trialStatus.isExpired && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-8 flex items-center gap-4 text-red-200"
        >
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <div className="font-bold">Trial Expired</div>
            <div className="text-sm opacity-80">Your 30-day trial has ended. Please upgrade to continue using SRIKA.</div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold">Game Profiles</h1>
            <p className="text-gray-400 text-lg mt-1">Manage your control configurations</p>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6"
            >
              <div className="text-sm text-gray-400 mb-2">{stat.label}</div>
              <div className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Profiles grid */}
        <div className="grid grid-cols-2 gap-6">
          {profiles.map((profile, index) => {
            const isActive = activeProfile?.id === profile.id;
            const Icon = profile.category === 'Fighting' ? Swords : profile.category === 'Racing' ? Target : Gamepad2;
            const color = profile.isOfficial ? 'from-cyan-600 to-blue-600' : 'from-purple-600 to-indigo-600';

            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className={`group bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border ${isActive ? 'border-cyan-500 ring-2 ring-cyan-500/50' : 'border-cyan-500/20'} overflow-hidden hover:border-cyan-500/40 transition-all`}
              >
                {/* Header with gradient */}
                <div className={`relative h-28 bg-gradient-to-br ${color} p-6 flex items-center justify-between`}>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-1">{profile.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <Gamepad2 className="w-4 h-4" />
                      <span>{profile.mappings.length} mappings</span>
                      {profile.isOfficial && <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase">Official</span>}
                    </div>
                  </div>
                  <Icon className="w-12 h-12 opacity-50" />
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{(profile.total_hours_used || 0).toFixed(2)} hrs</span>
                    </div>
                    <div className="text-sm text-gray-400 text-right">
                      <span>{profile.total_sessions || 0} sessions</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    {!profile.isOfficial && (
                      <button
                        onClick={() => handleDelete(profile.id)}
                        className="flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-semibold text-sm transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => handleActivate(profile.id)}
                      disabled={isActive || trialStatus.isExpired}
                      className={`col-span-${profile.isOfficial ? '2' : '1'} flex items-center justify-center gap-2 py-3 ${isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : trialStatus.isExpired ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'} rounded-xl font-semibold text-sm hover:shadow-lg transition-all`}
                    >
                      {isActive ? 'Active' : trialStatus.isExpired ? 'Trial Ended' : 'Activate'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Templates section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Profile Templates</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: 'Racing', icon: '🏎️' },
              { name: 'Sports', icon: '⚽' },
              { name: 'Rhythm', icon: '🎵' },
              { name: 'Custom', icon: '⚙️' },
            ].map((template, index) => (
              <div key={index} className="relative group">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="w-full bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 opacity-50 cursor-not-allowed transition-all text-center"
                >
                  <div className="text-4xl mb-3">{template.icon}</div>
                  <div className="font-semibold text-gray-500">{template.name}</div>
                </motion.button>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-2xl backdrop-blur-sm">
                  <span className="text-cyan-400 font-bold text-sm uppercase tracking-wider">Coming Soon</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div >
  );
}
