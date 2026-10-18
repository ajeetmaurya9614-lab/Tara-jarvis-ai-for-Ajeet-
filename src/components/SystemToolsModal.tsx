import React, { useState, useEffect } from 'react';
import { VoiceSettings, SystemTelemetry } from '../types/tara';
import {
  X,
  Volume2,
  Sliders,
  Cpu,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  Shield,
  Activity,
  Zap,
} from 'lucide-react';

interface SystemToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceSettings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  telemetry: SystemTelemetry;
  onTestVoice: () => void;
}

export const SystemToolsModal: React.FC<SystemToolsModalProps> = ({
  isOpen,
  onClose,
  voiceSettings,
  onUpdateSettings,
  telemetry,
  onTestVoice,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'diagnostics' | 'timer'>('voice');
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerInitial, setTimerInitial] = useState<number>(300); // 5 min default

  // Simple countdown timer
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  if (!isOpen) return null;

  const startTimerWithPreset = (secs: number) => {
    setTimerInitial(secs);
    setTimerSeconds(secs);
    setTimerRunning(true);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="font-['Orbitron',sans-serif] text-xs sm:text-sm font-bold text-cyan-200 tracking-wider">
              TARA // SYSTEM PROTOCOLS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400/80 hover:text-cyan-200 hover:bg-cyan-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-500/20 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 text-xs font-mono font-medium tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'voice'
                ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/40'
                : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>VOICE & AUDIO</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex-1 py-2 text-xs font-mono font-medium tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'diagnostics'
                ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/40'
                : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>DIAGNOSTICS</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex-1 py-2 text-xs font-mono font-medium tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'timer'
                ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/40'
                : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>HUD TIMER</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono flex-1">
          {/* TAB 1: VOICE SETTINGS */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              {/* Voice Engine Selection */}
              <div>
                <label className="block text-[11px] text-cyan-300 mb-1 font-semibold">
                  VOICE SYNTHESIS ENGINE // आवाज़ का प्रकार
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => onUpdateSettings({ engine: 'browser' })}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      voiceSettings.engine === 'browser'
                        ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-cyan-200'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-cyan-300">DEVICE HINDI (RECOM)</span>
                      {voiceSettings.engine === 'browser' && <Check className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      अनलिमिटेड मुफ्त, 0 कोटा सीमा, त्वरित प्रतिक्रिया
                    </span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ engine: 'gemini' })}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      voiceSettings.engine === 'gemini'
                        ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-cyan-200'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-teal-300">GEMINI CLOUD</span>
                      {voiceSettings.engine === 'gemini' && <Check className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      क्लाउड न्यूरल (फ्री टीयर सीमा पार होने पर स्वतः डिवाइस वॉइस)
                    </span>
                  </button>
                </div>
              </div>

              {/* Pitch & Rate Controls */}
              <div className="space-y-3 p-3 rounded-xl border border-cyan-500/20 bg-slate-950/40">
                <div>
                  <div className="flex justify-between text-[11px] text-cyan-300 mb-1">
                    <span>SPEECH SPEED (गति):</span>
                    <span className="font-bold">{voiceSettings.speechRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.1"
                    value={voiceSettings.speechRate}
                    onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-cyan-300 mb-1">
                    <span>FEMALE VOICE PITCH (टोन):</span>
                    <span className="font-bold">{voiceSettings.speechPitch.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.1"
                    value={voiceSettings.speechPitch}
                    onChange={(e) => onUpdateSettings({ speechPitch: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 cursor-pointer hover:bg-cyan-950/40">
                  <div>
                    <div className="text-cyan-200 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Strict Wake Word: "हे तारा" (Hey Tara)</span>
                    </div>
                    <div className="text-[10px] text-cyan-400/80">
                      असिस्टेंट केवल "हे तारा" या "Hey Tara" बोलने पर ही सक्रिय होगा। अन्य बातों पर ट्रिगर नहीं होगा।
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceSettings.strictWakeWord ?? true}
                    onChange={(e) => onUpdateSettings({ strictWakeWord: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-500/20 bg-slate-950/30 cursor-pointer hover:bg-slate-950/50">
                  <div>
                    <div className="text-cyan-200 font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Always-On Continuous Mic (लगातार सुनना)</span>
                    </div>
                    <div className="text-[10px] text-cyan-500/70">
                      माइक्रोफोन बैकग्राउंड में चालू रहेगा और "हे तारा" बोलने पर तुरंत उत्तर देगा
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceSettings.alwaysOnMic}
                    onChange={(e) => onUpdateSettings({ alwaysOnMic: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                {/* Silence Pause Tolerance Slider */}
                <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-slate-950/30">
                  <div className="flex justify-between text-[11px] text-cyan-300 mb-1">
                    <span>PAUSE TOLERANCE (बोलने में ठहराव समय):</span>
                    <span className="font-bold text-teal-300">
                      {(voiceSettings.silenceThreshold / 1000).toFixed(1)} सेकंड
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="3500"
                    step="250"
                    value={voiceSettings.silenceThreshold}
                    onChange={(e) =>
                      onUpdateSettings({ silenceThreshold: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-cyan-500/60 mt-1">
                    <span>1.0s (तेज़ प्रतिक्रिया)</span>
                    <span>2.0s (सामान्य)</span>
                    <span>3.5s (लंबा ठहराव, बिना कटे)</span>
                  </div>
                </div>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-500/20 bg-slate-950/30 cursor-pointer hover:bg-slate-950/50">
                  <div>
                    <div className="text-cyan-200 font-medium">Fast Response Mode (त्वरित उत्तर)</div>
                    <div className="text-[10px] text-cyan-500/70">
                      बिना देरी के तुरंत बोलना शुरू करना (कम विलंबता)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceSettings.fastResponse}
                    onChange={(e) => onUpdateSettings({ fastResponse: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-500/20 bg-slate-950/30 cursor-pointer hover:bg-slate-950/50">
                  <div>
                    <div className="text-cyan-200 font-medium">Auto-Conversation Loop (बातचीत जारी रखें)</div>
                    <div className="text-[10px] text-cyan-500/70">
                      उत्तर देने के बाद तारा अपने आप पुनः सुनने लगेगी
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceSettings.autoListen}
                    onChange={(e) => onUpdateSettings({ autoListen: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-500/20 bg-slate-950/30 cursor-pointer hover:bg-slate-950/50">
                  <div>
                    <div className="text-cyan-200 font-medium">JARVIS Holographic Sound Effects</div>
                    <div className="text-[10px] text-cyan-500/70">
                      ध्वनि प्रभाव (Chimes & Sonar pings)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceSettings.sfxEnabled}
                    onChange={(e) => onUpdateSettings({ sfxEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Test Voice Button */}
              <button
                onClick={onTestVoice}
                className="w-full py-2.5 rounded-xl border border-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-100 font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-cyan-300" />
                <span>तारा की आवाज़ का परीक्षण करें (Test Voice)</span>
              </button>
            </div>
          )}

          {/* TAB 2: SYSTEM DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl border border-cyan-500/20 bg-slate-950/40">
                  <div className="text-[10px] text-cyan-500/70">QUANTUM CORE TEMP</div>
                  <div className="text-lg font-bold text-cyan-300 mt-0.5">
                    {telemetry.coreTemp.toFixed(1)}°C
                  </div>
                  <div className="text-[9px] text-emerald-400">NOMINAL</div>
                </div>

                <div className="p-3 rounded-xl border border-cyan-500/20 bg-slate-950/40">
                  <div className="text-[10px] text-cyan-500/70">POWER OUTPUT</div>
                  <div className="text-lg font-bold text-cyan-300 mt-0.5">
                    {telemetry.powerOutput}%
                  </div>
                  <div className="text-[9px] text-cyan-400">ARC REACTOR ACTIVE</div>
                </div>

                <div className="p-3 rounded-xl border border-cyan-500/20 bg-slate-950/40">
                  <div className="text-[10px] text-cyan-500/70">NEURAL LATENCY</div>
                  <div className="text-lg font-bold text-cyan-300 mt-0.5">
                    {telemetry.networkLatency} ms
                  </div>
                  <div className="text-[9px] text-emerald-400">OPTIMAL</div>
                </div>

                <div className="p-3 rounded-xl border border-cyan-500/20 bg-slate-950/40">
                  <div className="text-[10px] text-cyan-500/70">AI MODEL</div>
                  <div className="text-sm font-bold text-teal-300 mt-1">
                    GEMINI-3.8
                  </div>
                  <div className="text-[9px] text-cyan-400">FLASH MULTIMODAL</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-cyan-500/20 bg-slate-950/40 space-y-2">
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                  ACTIVE JARVIS PROTOCOLS
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Hindi Neural Speech Synthesis:</span>
                  <span className="text-emerald-400 font-bold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Web Speech Recognition (hi-IN):</span>
                  <span className="text-emerald-400 font-bold">READY</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Web Audio Frequency Analyser:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Stark Security Protocol:</span>
                  <span className="text-emerald-400 font-bold">ENCRYPTED</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HUD TIMER */}
          {activeTab === 'timer' && (
            <div className="flex flex-col items-center justify-center p-2 space-y-4">
              <div className="relative w-44 h-44 rounded-full border-2 border-cyan-500/40 flex flex-col items-center justify-center bg-slate-950/70 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <div className="text-[10px] text-cyan-400 tracking-widest uppercase">
                  JARVIS COUNTDOWN
                </div>
                <div className="font-['Orbitron',sans-serif] text-3xl font-bold text-cyan-200 mt-1">
                  {formatTimer(timerSeconds || timerInitial)}
                </div>
                <div className="text-[10px] text-cyan-500/70 mt-1">
                  {timerRunning ? 'TIMING...' : 'STANDBY'}
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2">
                {[60, 180, 300, 600].map((s) => (
                  <button
                    key={s}
                    onClick={() => startTimerWithPreset(s)}
                    className="px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 text-xs font-mono"
                  >
                    {s / 60}m
                  </button>
                ))}
              </div>

              {/* Start/Stop Controls */}
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={() => {
                    if (!timerRunning && timerSeconds === 0) {
                      setTimerSeconds(timerInitial);
                    }
                    setTimerRunning(!timerRunning);
                  }}
                  className={`flex-1 py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                    timerRunning
                      ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                      : 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{timerRunning ? 'PAUSE' : 'START'}</span>
                </button>

                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(timerInitial);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
