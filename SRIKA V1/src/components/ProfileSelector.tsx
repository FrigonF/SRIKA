import { useState, useEffect } from 'react';
import { Gamepad2, Car } from 'lucide-react';
import { ProfileManager, GameProfile } from '../managers/ProfileManager';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from './ui/select';
import { cn } from './ui/utils';

export function ProfileSelector() {
    const [profiles, setProfiles] = useState<GameProfile[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    const refresh = () => {
        setProfiles(ProfileManager.getProfiles());
        const active = ProfileManager.getActive();
        setActiveId(active?.id || null);
    };

    useEffect(() => {
        refresh();

        const handleSync = () => refresh();
        window.addEventListener('srika-profiles-ready', handleSync);
        window.addEventListener('srika-active-profile-changed', handleSync);

        return () => {
            window.removeEventListener('srika-profiles-ready', handleSync);
            window.removeEventListener('srika-active-profile-changed', handleSync);
        };
    }, []);

    const activeProfile = profiles.find(p => p.id === activeId);

    const handleSelect = (id: string) => {
        ProfileManager.setActive(id);
    };

    return (
        <Select value={activeId || ""} onValueChange={handleSelect}>
            <SelectTrigger
                className="w-auto min-w-[160px] bg-white/[0.05] border-white/20 hover:bg-white/[0.1] transition-all h-9 px-3 gap-2 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"
            >
                <div className="flex items-center gap-2">
                    {activeProfile?.category === 'Racing' ? (
                        <Car className="w-4 h-4 text-cyan-400" strokeWidth={2} />
                    ) : (
                        <Gamepad2 className="w-4 h-4 text-cyan-400" strokeWidth={2} />
                    )}
                    <span className="font-bold tracking-tight text-gray-300" style={{ fontSize: '15px' }}>
                        {activeProfile?.name || 'Loading...'}
                    </span>
                </div>
            </SelectTrigger>
            <SelectContent className="bg-white/[0.08] backdrop-blur-[40px] border-white/20 text-white min-w-[200px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                {profiles.map((profile) => (
                    <SelectItem
                        key={profile.id}
                        value={profile.id}
                        className="hover:bg-cyan-500/10 focus:bg-cyan-500/10 focus:text-cyan-400 transition-colors py-2.5"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded flex items-center justify-center bg-black/40",
                                activeId === profile.id ? "text-cyan-400" : "text-gray-500"
                            )}>
                                {profile.category === 'Racing' ? (
                                    <Car className="w-4 h-4" />
                                ) : (
                                    <Gamepad2 className="w-4 h-4" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-tight uppercase">
                                    {profile.name}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    {profile.category || 'Fighting'}
                                </span>
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
