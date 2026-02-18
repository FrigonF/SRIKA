import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Settings2 } from 'lucide-react';
import { Slider } from './ui/slider';
import { ProfileManager, GameProfile } from '../managers/ProfileManager';

interface PresetSettingsDialogProps {
    profile: GameProfile;
    onClose: () => void;
}

// In a real scenario, this schema would be fetched from preset.json or the bridge.
// For now, we'll hardcode the schemas for official presets since they are well-defined.
const SETTINGS_SCHEMAS: Record<string, any[]> = {
    'asphalt9': [
        {
            id: 'steerSensitivity',
            label: 'Steering Sensitivity',
            type: 'range',
            min: 0.05,
            max: 1.0,
            step: 0.01,
            default: 0.35
        },
        {
            id: 'curvePower',
            label: 'Steering Curve (Realism)',
            type: 'range',
            min: 1.0,
            max: 3.0,
            step: 0.1,
            default: 1.4
        }
    ]
};

export function PresetSettingsDialog({ profile, onClose }: PresetSettingsDialogProps) {
    const schema = SETTINGS_SCHEMAS[profile.id] || [];
    const [values, setValues] = useState<Record<string, any>>(profile.settings || {});

    const handleSave = () => {
        const updatedProfile = { ...profile, settings: values };
        ProfileManager.saveProfile(updatedProfile);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-lg bg-gray-950/80 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] premium-glass"
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <Settings2 className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">{profile.name} Settings</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Configure preset parameters</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {schema.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest italic opacity-50">No configurable settings for this preset.</p>
                        </div>
                    ) : (
                        schema.map(item => (
                            <div key={item.id} className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{item.label}</label>
                                    <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                                        {values[item.id] !== undefined ? values[item.id] : item.default}
                                    </span>
                                </div>

                                {item.type === 'range' && (
                                    <Slider
                                        min={item.min}
                                        max={item.max}
                                        step={item.step}
                                        value={[values[item.id] !== undefined ? values[item.id] : item.default]}
                                        onValueChange={(val: number[]) => setValues(prev => ({ ...prev, [item.id]: val[0] }))}
                                        className="py-4"
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-black/20 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-gray-900 border border-white/5 text-gray-500 font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:bg-gray-800 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
