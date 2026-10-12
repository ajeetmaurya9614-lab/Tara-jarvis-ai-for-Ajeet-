import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Radio, Settings2, ShieldCheck, Zap } from 'lucide-react';

interface JarvisHUDHeaderProps {
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  autoListen: boolean;
  onToggleAutoListen: () => void;
  onOpenSettings: () => void;
  coreTemp: number;
}

export const JarvisHUDHeader: React.FC<JarvisHUDHeaderProps> = ({
  sfxEnabled,
  onToggleSfx,
  autoListen,
  onToggleAutoListen,
  onOpenSettings,
  coreTemp,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hrs}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full pt-2 pb-1 px-3 sm:px-6 border-b border-cyan-500/20 bg-slate-950/70 backdrop-blur-md z-30 select-none">
      <div className="flex items-center justify-between">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-7 h-7 rounded border border-cyan-500/40 bg-cyan-950/30">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-['Orbitron',sans-serif] font-bold text-xs sm:text-sm tracking-widest text-cyan-200">
                TARA <span className="text-[10px] text-cyan-400 font-normal font-mono">v3.8</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1 animate-ping" />
                ONLINE
              </span>
            </div>
            <div className="text-[9px] font-mono text-cyan-400/60 hidden sm:block">
              HINDI NEURAL VOICE // JARVIS INTERFACE
            </div>
          </div>
        </div>

        {/* Center: High-Tech Clock & Date */}
        <div className="flex flex-col items-center">
          <div className="font-mono text-xs sm:text-sm tracking-wider font-semibold text-cyan-300">
            {timeStr || '00:00:00'}
          </div>
          <div className="text-[9px] font-mono text-cyan-500/70 tracking-widest uppercase">
            STARK PROTOCOL
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Hands-Free Auto-Listen Toggle */}
          <button
            onClick={onToggleAutoListen}
            title={autoListen ? 'Continuous Auto-Listen Active' : 'Enable Hands-Free Auto-Listen'}
            className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border transition-all cursor-pointer ${
              autoListen
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-cyan-300'
            }`}
          >
            <Radio className={`w-3 h-3 ${autoListen ? 'animate-pulse text-cyan-400' : ''}`} />
            <span className="hidden xs:inline">{autoListen ? 'AUTO ON' : 'AUTO OFF'}</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleSfx}
            title={sfxEnabled ? 'Mute Sci-Fi SFX' : 'Enable Sci-Fi SFX'}
            className={`p-1.5 rounded border transition-all cursor-pointer ${
              sfxEnabled
                ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50'
                : 'bg-slate-900/60 border-slate-700/60 text-slate-500 hover:text-slate-300'
            }`}
          >
            {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* System Tools / Settings */}
          <button
            onClick={onOpenSettings}
            title="System Settings & Telemetry"
            className="p-1.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 transition-all cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Telemetry Micro-Bar */}
      <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-cyan-400/60 pt-1 mt-1 border-t border-cyan-500/10">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
          CORE: <span className="text-cyan-300 font-bold">{coreTemp.toFixed(1)}°C</span>
        </span>
        <span className="hidden sm:inline">
          ENGINE: <span className="text-cyan-300">GEMINI-3.8-FLASH</span>
        </span>
        <span>
          VOICE: <span className="text-teal-300 font-bold">तारा (FEMALE HINDI)</span>
        </span>
      </div>
    </header>
  );
};
