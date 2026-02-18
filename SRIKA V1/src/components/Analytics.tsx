import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Target, Clock, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { VerticalTaskBar, PageType } from './VerticalTaskBar';
import { ProfileManager } from '../managers/ProfileManager';

interface AnalyticsProps {
  onNavigate: (screen: PageType) => void;
}

export function Analytics({ onNavigate }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const profiles = ProfileManager.getProfiles();

  const totalStats = useMemo(() => {
    const sessions = profiles.reduce((sum, p) => sum + (p.total_sessions || 0), 0);
    const hours = profiles.reduce((sum, p) => sum + (p.total_hours_used || 0), 0);
    return { sessions, hours };
  }, [profiles]);

  const accuracyData = [
    { day: 'Mon', accuracy: 82 },
    { day: 'Tue', accuracy: 85 },
    { day: 'Wed', accuracy: 88 },
    { day: 'Thu', accuracy: 90 },
    { day: 'Fri', accuracy: 87 },
    { day: 'Sat', accuracy: 92 },
    { day: 'Sun', accuracy: 94 },
  ];

  const actionData = [
    { action: 'Punch', count: 342 },
    { action: 'Kick', count: 218 },
    { action: 'Jump', count: 156 },
    { action: 'Walk', count: 523 },
    { action: 'Duck', count: 98 },
  ];

  const bodyUsageData = [
    { part: 'Right Arm', usage: 92 },
    { part: 'Left Arm', usage: 78 },
    { part: 'Right Leg', usage: 85 },
    { part: 'Left Leg', usage: 73 },
    { part: 'Core', usage: 88 },
    { part: 'Head', usage: 45 },
  ];

  const metrics = [
    { label: 'Average Accuracy', value: '89.7%', change: '+4.2%', icon: Target, color: 'cyan' },
    { label: 'Total Sessions', value: totalStats.sessions.toString(), change: '+0', icon: Activity, color: 'green' },
    { label: 'Total Time', value: `${totalStats.hours.toFixed(1)}h`, change: '+0h', icon: Clock, color: 'blue' },
    { label: 'Actions Performed', value: '1,337', change: '+342', icon: TrendingUp, color: 'purple' },
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
            <h1 className="text-4xl font-bold">Performance Analytics</h1>
            <p className="text-gray-400 text-lg mt-1">Track your motion control accuracy and usage</p>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex gap-2 bg-[#1a1a2e]/80 rounded-2xl p-1 border border-cyan-500/20">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${timeRange === range
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-${metric.color}-500/20 rounded-2xl`}>
                    <Icon className={`w-6 h-6 text-${metric.color}-400`} />
                  </div>
                  <span className="text-sm text-green-400 font-semibold">{metric.change}</span>
                </div>
                <div className="text-3xl font-bold mb-1">{metric.value}</div>
                <div className="text-sm text-gray-400">{metric.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Accuracy over time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6"
        >
          <h2 className="text-2xl font-bold mb-6">Accuracy Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={accuracyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #00e6ff33',
                  borderRadius: '12px',
                  color: '#fff'
                }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#00e6ff"
                strokeWidth={3}
                dot={{ fill: '#00e6ff', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid grid-cols-2 gap-8">
          {/* Action frequency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6"
          >
            <h2 className="text-2xl font-bold mb-6">Action Frequency</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={actionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="action" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #00e6ff33',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e6ff" />
                    <stop offset="100%" stopColor="#0066ff" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Body usage heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6"
          >
            <h2 className="text-2xl font-bold mb-6">Body Usage Heatmap</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={bodyUsageData}>
                <PolarGrid stroke="#2a2a3e" />
                <PolarAngleAxis dataKey="part" stroke="#6b7280" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                <Radar
                  name="Usage"
                  dataKey="usage"
                  stroke="#00e6ff"
                  fill="#00e6ff"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #00e6ff33',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Detection stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1a]/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-6"
        >
          <h2 className="text-2xl font-bold mb-6">Detection Statistics</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Successful Detections', value: '1,245', percentage: 93.2 },
              { label: 'Missed Detections', value: '67', percentage: 5.0 },
              { label: 'False Positives', value: '24', percentage: 1.8 },
            ].map((stat, index) => (
              <div key={index} className="bg-[#0a0a0f]/50 rounded-2xl p-6">
                <div className="text-2xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm text-gray-400 mb-3">{stat.label}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400">{stat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
