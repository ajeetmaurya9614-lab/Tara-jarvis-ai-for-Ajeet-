import React from 'react';
import { AssistantState, ChatMessage } from '../types/tara';
import {
  Mic,
  MicOff,
  Maximize2,
  Volume2,
  VolumeX,
  Monitor,
  Sparkles,
  Zap,
  Radio,
} from 'lucide-react';

interface FloatingTaraOverlayProps {
  assistantState: AssistantState;
  liveTranscription: string;
  lastMessage?: ChatMessage;
  onToggleListen: () => void;
  onExpandToFull: () => void;
  onTriggerScreenLook: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  alwaysOnMic: boolean;
}

export const FloatingTaraOverlay: React.FC<FloatingTaraOverlayProps> = ({
  assistantState,
  liveTranscription,
  lastMessage,
  onToggleListen,
  onExpandToFull,
  onTriggerScreenLook,
  sfxEnabled,
  onToggleSfx,
  alwaysOnMic,
}) => {
  const isListening = assistantState === 'listening';
  const isSpeaking = assistantState === 'speaking';
  const isThinking = assistantState === 'thinking';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 max-w-sm pointer-events-none select-none">
      {/* Speech / Caption Popup Bubble */}
      {(liveTranscription || isSpeaking || isThinking || (lastMessage && lastMessage.sender === 'tara')) && (
        <div className="pointer-events-auto w-80 max-w-[calc(100vw-2rem)] p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.2)] text-xs font-mono transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
          {/* Header Tag */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-cyan-500/15 text-[10px]">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>TARA // ओवरले</span>
            </div>
            <span className="text-cyan-400/70 text-[9px]">
              {isSpeaking ? 'स्पीकिंग' : isThinking ? 'प्रोसेसिंग...' : isListening ? 'सुन रही हूँ...' : 'वेक वर्ड: "हे तारा"'}
            </span>
          </div>

          {/* User live voice transcription */}
          {liveTranscription && (
            <div className="mb-1 text-cyan-200">
              <span className="text-[10px] text-cyan-400 font-bold mr-1">आप:</span>
              <span className="italic">{liveTranscription}</span>
            </div>
          )}

          {/* Tara speech or latest reply */}
          {!liveTranscription && lastMessage?.sender === 'tara' && (
            <div className="text-cyan-100 line-clamp-3">
              <span className="text-[10px] text-teal-400 font-bold mr-1">तारा:</span>
              <span>{lastMessage.text}</span>
            </div>
          )}

          {/* Screenshot thumbnail preview if screen was analyzed */}
          {lastMessage?.screenshotBase64 && (
            <div className="mt-2 relative rounded overflow-hidden border border-cyan-500/40 max-h-24">
              <img
                src={`data:image/jpeg;base64,${lastMessage.screenshotBase64}`}
                alt="Captured Screen Context"
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] text-cyan-300 font-mono">
                स्क्रीन फ्रेम
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating HUD Island Pill */}
      <div className="pointer-events-auto flex items-center gap-2 p-1.5 pl-3 rounded-full bg-slate-950/90 border border-cyan-500/40 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.25)]">
        {/* Wake Word Badge */}
        <div className="flex items-center gap-1.5 pr-1 border-r border-cyan-500/20">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950/60 border border-cyan-500/30">
            <Radio
              className={`w-3 h-3 ${
                isListening
                  ? 'text-cyan-300 animate-ping'
                  : alwaysOnMic
                  ? 'text-emerald-400 animate-pulse'
                  : 'text-cyan-500'
              }`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-bold tracking-wider text-cyan-200">
              "हे तारा"
            </span>
            <span className="text-[7.5px] font-mono text-cyan-400/70 uppercase">
              {isListening ? 'सक्रिय' : isSpeaking ? 'बोल रही है' : 'स्टैंडबाय'}
            </span>
          </div>
        </div>

        {/* Mini Tara Animated Character Button */}
        <button
          onClick={onToggleListen}
          title={isListening ? 'सुनना रोकें' : 'तारा से बात करें ("हे तारा")'}
          className={`relative group flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
            isListening
              ? 'bg-cyan-500/30 border-2 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.8)] scale-105'
              : isSpeaking
              ? 'bg-teal-500/30 border-2 border-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.8)] animate-pulse'
              : isThinking
              ? 'bg-purple-500/30 border-2 border-purple-300 animate-pulse'
              : 'bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]'
          }`}
        >
          {/* Mini Vector Face of Tara */}
          <svg viewBox="0 0 100 100" className="w-9 h-9 drop-shadow">
            {/* Hair Back */}
            <circle cx="50" cy="46" r="32" fill="#141018" />
            {/* Face */}
            <circle cx="50" cy="50" r="23" fill="#ebb796" />
            {/* Hair Front */}
            <path d="M 27 46 C 35 30 65 30 73 46 C 65 38 35 38 27 46 Z" fill="#1e1822" />
            {/* Bindi */}
            <circle cx="50" cy="43" r="1.8" fill="#e11d48" />
            {/* Eyes */}
            {isSpeaking ? (
              // Joyful animated eyes
              <>
                <path d="M 40 49 Q 44 47 48 49" fill="none" stroke="#1c0e18" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M 52 49 Q 56 47 60 49" fill="none" stroke="#1c0e18" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="43" cy="49" r="2.2" fill="#2d170b" />
                <circle cx="44" cy="48" r="0.8" fill="#ffffff" />
                <circle cx="57" cy="49" r="2.2" fill="#2d170b" />
                <circle cx="58" cy="48" r="0.8" fill="#ffffff" />
              </>
            )}
            {/* Mouth */}
            {isSpeaking ? (
              <ellipse cx="50" cy="62" rx="4.5" ry="3.5" fill="#bb3e54" className="animate-pulse" />
            ) : isListening ? (
              <path d="M 44 60 Q 50 66 56 60" fill="none" stroke="#bb3e54" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M 45 61 Q 50 64 55 61" fill="none" stroke="#bb3e54" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>

          {/* Indicator dot */}
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${
              isListening ? 'bg-red-500 animate-ping' : isSpeaking ? 'bg-teal-400 animate-pulse' : 'bg-cyan-400'
            }`}
          />
        </button>

        {/* Look at Screen Button ("हे तारा, स्क्रीन देखो") */}
        <button
          onClick={onTriggerScreenLook}
          title='स्क्रीन देखो ("हे तारा, स्क्रीन देखो")'
          className="p-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/60 hover:border-cyan-400 transition-all cursor-pointer flex items-center justify-center"
        >
          <Monitor className="w-3.5 h-3.5" />
        </button>

        {/* SFX Mute/Unmute */}
        <button
          onClick={onToggleSfx}
          title={sfxEnabled ? 'ध्वनि बंद करें' : 'ध्वनि चालू करें'}
          className="p-2 rounded-full border border-slate-700/60 bg-slate-900/50 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer hidden xs:flex items-center justify-center"
        >
          {sfxEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Expand to Full HUD Window */}
        <button
          onClick={onExpandToFull}
          title="फुल स्क्रीन जार्विस HUD खोलें"
          className="p-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/60 hover:border-cyan-400 transition-all cursor-pointer flex items-center justify-center"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
