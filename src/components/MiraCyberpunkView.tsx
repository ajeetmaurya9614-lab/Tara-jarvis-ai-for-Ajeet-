import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Music,
  User,
  Mic,
  MicOff,
  Home,
  MessageSquare,
  Camera,
  Settings,
  Volume2,
  Sparkles,
  Wifi,
  Radio,
  Check,
  Send,
} from 'lucide-react';

interface MiraCyberpunkViewProps {
  onBackToHUD?: () => void;
}

export const MiraCyberpunkView: React.FC<MiraCyberpunkViewProps> = ({ onBackToHUD }) => {
  // State
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle');
  const [greeting, setGreeting] = useState<string>('Good morning, Ajeet');
  const [userName, setUserName] = useState<string>('Ajeet');
  const [assistantName, setAssistantName] = useState<'Tara' | 'Mira'>('Tara');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [fullMessageText, setFullMessageText] = useState<string>(
    'Hey there! Good to hear your voice. Kaise ho aap? I am your personal cyber AI, ready for anything!'
  );
  const [userSpokenText, setUserSpokenText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'mic' | 'camera' | 'settings'>('mic');
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [chatLog, setChatLog] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hey there! Good to hear your voice. Kaise ho aap?',
      time: 'Just now',
    },
  ]);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0.2);

  // Refs
  const statusRef = useRef<'idle' | 'listening' | 'speaking' | 'processing'>('idle');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const typewriterTimerRef = useRef<any>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Calculate dynamic greeting based on hour
  useEffect(() => {
    const hour = new Date().getHours();
    let greet = 'Good morning';
    if (hour >= 12 && hour < 17) greet = 'Good afternoon';
    else if (hour >= 17 && hour < 22) greet = 'Good evening';
    else if (hour >= 22 || hour < 5) greet = 'Good night';
    setGreeting(`${greet}, ${userName}`);
  }, [userName]);

  // Typewriter effect for dialogue box
  const startTypewriter = (text: string, onFinish?: () => void) => {
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    setDisplayedText('');
    let idx = 0;
    const speed = 28; // ms per char

    typewriterTimerRef.current = setInterval(() => {
      if (idx < text.length) {
        setDisplayedText(text.slice(0, idx + 1));
        idx++;
      } else {
        clearInterval(typewriterTimerRef.current);
        onFinish?.();
      }
    }, speed);
  };

  // Initial typewriter speech on mount
  useEffect(() => {
    startTypewriter(fullMessageText);
    return () => {
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    };
  }, []);

  // Ambient synth sound simulation
  const toggleAmbientMusic = () => {
    if (isMusicPlaying) {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (_) {}
        oscillatorRef.current = null;
      }
      setIsMusicPlaying(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Ambient cyber drone pad
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(146.83, ctx.currentTime); // D3 cyberpunk drone

        // LFO for breathing filter
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(15, ctx.currentTime);
        lfo.connect(osc.frequency);
        lfo.start();

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscillatorRef.current = osc;
        setIsMusicPlaying(true);
      } catch (err) {
        console.warn('Ambient synth could not start:', err);
      }
    }
  };

  // Speech Output (TTS) with Indian Female Persona
  // Load browser voices early
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const silenceTimeoutRef = useRef<any>(null);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (isAudioMuted) {
      startTypewriter(text);
      return;
    }

    setStatus('speaking');
    const cleanText = text.replace(/[*#_`>]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Pick warm Hindi / Indian English female voice
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang.startsWith('hi') && (v.name.includes('Google') || v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Swara') || v.name.includes('Lekha') || v.name.includes('Kalpana'))) ||
      voices.find((v) => v.lang.includes('IN') && (v.name.toLowerCase().includes('female') || v.name.includes('Neerja') || v.name.includes('Priya'))) ||
      voices.find((v) => v.lang.startsWith('hi')) ||
      voices.find((v) => v.lang.includes('IN')) ||
      voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (voice) utterance.voice = voice;
    else utterance.lang = 'hi-IN';

    // Lip sync / audio pulse simulation while speaking
    const pulseInterval = setInterval(() => {
      setAudioLevel(0.4 + Math.random() * 0.6);
    }, 110);

    utterance.onstart = () => {
      startTypewriter(text);
    };

    utterance.onend = () => {
      clearInterval(pulseInterval);
      setAudioLevel(0.2);
      setStatus('idle');
    };

    utterance.onerror = () => {
      clearInterval(pulseInterval);
      setAudioLevel(0.2);
      setStatus('idle');
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Process user prompt with Gemini API
  const processUserPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setStatus('idle');
      return;
    }

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    setStatus('processing');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatLog((prev) => [...prev, { sender: 'user', text: trimmed, time: timeStr }]);
    setUserSpokenText(trimmed);

    try {
      const res = await fetch('/api/tara/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: chatLog.slice(-4).map((c) => ({
            role: c.sender === 'user' ? 'user' : 'model',
            text: c.text,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.replyText || 'हाँ बिल्कुल, मैं आपकी बात समझ गयी!';
        setFullMessageText(reply);
        setChatLog((prev) => [...prev, { sender: 'ai', text: reply, time: timeStr }]);
        speakText(reply);
      } else {
        throw new Error('API request failed');
      }
    } catch {
      // Natural conversational response without canned phrases
      const reply = `अरे ${userName}! मैं सुन रही हूँ। आज आप क्या जानना या बात करना चाहते हैं?`;
      setFullMessageText(reply);
      setChatLog((prev) => [...prev, { sender: 'ai', text: reply, time: timeStr }]);
      speakText(reply);
    }
  };

  // Mic Button Click -> Toggle SpeechRecognition
  const handleMicClick = () => {
    if (status === 'speaking') {
      // User interrupts AI speaking
      window.speechSynthesis.cancel();
      setStatus('idle');
      return;
    }

    if (status === 'listening') {
      // User manually finishes speaking
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      return;
    }

    // Start Listening
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('इस ब्राउज़र में Web SpeechRecognition समर्थित नहीं है। कृपया नीचे दिए चैट बॉक्स से टाइप करें।');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

      const rec = new SpeechRecognition();
      rec.lang = 'hi-IN';
      rec.continuous = true;
      rec.interimResults = true;
      recognitionRef.current = rec;

      setStatus('listening');
      setUserSpokenText('');
      let latestTranscript = '';

      rec.onresult = (e: any) => {
        let transcript = '';
        let hasFinal = false;

        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript + ' ';
          if (e.results[i].isFinal) hasFinal = true;
        }

        const cleanTranscript = transcript.trim();
        latestTranscript = cleanTranscript;
        setUserSpokenText(cleanTranscript);

        // Reset silence timeout on every word
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        // If user stopped speaking for 1.1 seconds or isFinal triggered
        silenceTimeoutRef.current = setTimeout(() => {
          if (latestTranscript && statusRef.current === 'listening') {
            try {
              rec.stop();
            } catch (_) {}
            processUserPrompt(latestTranscript);
          }
        }, 1100);

        if (hasFinal && cleanTranscript.length > 2) {
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          try {
            rec.stop();
          } catch (_) {}
          processUserPrompt(cleanTranscript);
        }
      };

      rec.onerror = (e: any) => {
        console.debug('Recognition notice:', e?.error || e);
        if (latestTranscript && statusRef.current === 'listening') {
          processUserPrompt(latestTranscript);
        } else {
          setStatus('idle');
        }
      };

      rec.onend = () => {
        if (statusRef.current === 'listening') {
          if (latestTranscript) {
            processUserPrompt(latestTranscript);
          } else {
            setStatus('idle');
          }
        }
      };

      rec.start();
    } catch (err) {
      console.warn('Mic start error:', err);
      setStatus('idle');
    }
  };

  // Reset / Refresh dialogue
  const handleRefresh = () => {
    window.speechSynthesis.cancel();
    setStatus('idle');
    const refreshText = `Cyber connection rebooted! ऑल सिस्टम्स ग्रीन। हुक्म कीजिए ${userName}!`;
    setFullMessageText(refreshText);
    speakText(refreshText);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050508] text-white flex items-center justify-center p-2 sm:p-4 select-none font-sans overflow-x-hidden">
      {/* Background Cyber Ambient Lights */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Neon Green Glow Orb */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#00ff66]/15 rounded-full blur-[100px]" />
        {/* Cyber Purple Glow Orb */}
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#9333ea]/20 rounded-full blur-[100px]" />
        {/* Subtle Cyberpunk Scanline / Hex Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#00ff6608_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
      </div>

      {/* Main Cyber Mobile Phone Mockup Container with RGB / Neon Green & Purple Border */}
      <div className="relative w-full max-w-[420px] h-[92vh] max-h-[880px] bg-[#0a0a10]/95 backdrop-blur-2xl rounded-[44px] flex flex-col justify-between overflow-hidden shadow-[0_0_50px_rgba(0,255,102,0.25),0_0_80px_rgba(147,51,234,0.18)] border-2 border-transparent [background:linear-gradient(#0a0a10,#0a0a10)_padding-box,linear-gradient(135deg,#00ff66_0%,#9333ea_50%,#00ff66_100%)_border-box]">
        
        {/* Phone Notch / Dynamic Island */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full bg-black/80 border border-white/10 flex items-center justify-center z-50">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00ff66]/60 animate-pulse mr-2" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>

        {/* TOP HEADER SECTION */}
        <header className="relative z-20 pt-7 px-5 pb-3">
          {/* Top Bar: Title + Subtext + 4 Circular Neon Buttons */}
          <div className="flex items-start justify-between">
            {/* Title & Live Status */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider font-['Orbitron',sans-serif] text-transparent bg-clip-text bg-gradient-to-r from-[#00ff66] via-emerald-300 to-teal-400 drop-shadow-[0_0_12px_rgba(0,255,102,0.6)]">
                  {assistantName}
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#00ff66]/15 border border-[#00ff66]/40 text-[#00ff66] font-mono font-bold tracking-widest uppercase animate-pulse">
                  AI
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-ping" />
                <span className="text-[10px] font-mono tracking-widest text-[#00ff66]/80 font-semibold">
                  PERSONAL AI • LIVE
                </span>
              </div>
            </div>

            {/* 4 Circular Neon Action Buttons (Play, Refresh, Music, Profile) */}
            <div className="flex items-center gap-1.5">
              {/* 1. Play / Pause Voice */}
              <button
                onClick={() => {
                  if (status === 'speaking') {
                    window.speechSynthesis.cancel();
                    setStatus('idle');
                  } else {
                    speakText(fullMessageText);
                  }
                }}
                title={status === 'speaking' ? 'Pause Speech' : 'Play Speech'}
                className="w-8 h-8 rounded-full bg-[#00ff66]/10 border border-[#00ff66]/40 hover:border-[#00ff66] text-[#00ff66] flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_12px_rgba(0,255,102,0.6)] cursor-pointer"
              >
                {status === 'speaking' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              {/* 2. Refresh Dialogue */}
              <button
                onClick={handleRefresh}
                title="Refresh Dialogue"
                className="w-8 h-8 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/40 hover:border-[#a855f7] text-[#c084fc] flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_12px_rgba(168,85,247,0.6)] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* 3. Ambient Cyber Music Toggle */}
              <button
                onClick={toggleAmbientMusic}
                title={isMusicPlaying ? 'Stop Ambient Music' : 'Play Cyber Ambient Synth'}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                  isMusicPlaying
                    ? 'bg-[#00ff66]/30 border-[#00ff66] text-[#00ff66] shadow-[0_0_14px_rgba(0,255,102,0.8)] animate-pulse'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:border-[#00ff66]/60 hover:text-[#00ff66]'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
              </button>

              {/* 4. User Profile */}
              <button
                onClick={() => setShowProfileModal(true)}
                title="User Profile & Settings"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/20 hover:border-[#00ff66] text-gray-300 hover:text-[#00ff66] flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_12px_rgba(0,255,102,0.5)] cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Greeting Text + Status Chip */}
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-200">
                {greeting}
              </p>
              <p className="text-[11px] text-gray-400 font-mono">
                Cyber HUD • Protocol Active
              </p>
            </div>

            {/* Dynamic Status Chip */}
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-md border transition-all ${
                status === 'speaking'
                  ? 'bg-emerald-950/80 border-[#00ff66]/60 text-[#00ff66] shadow-[0_0_12px_rgba(0,255,102,0.4)] animate-pulse'
                  : status === 'listening'
                  ? 'bg-cyan-950/80 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)] animate-bounce'
                  : status === 'processing'
                  ? 'bg-purple-950/80 border-purple-400/60 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'bg-slate-900/80 border-gray-700/60 text-gray-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'speaking'
                    ? 'bg-[#00ff66] animate-ping'
                    : status === 'listening'
                    ? 'bg-cyan-400 animate-ping'
                    : status === 'processing'
                    ? 'bg-purple-400 animate-spin'
                    : 'bg-gray-500'
                }`}
              />
              <span>
                {status === 'speaking'
                  ? 'Speaking...'
                  : status === 'listening'
                  ? 'Listening...'
                  : status === 'processing'
                  ? 'Thinking...'
                  : 'Idle'}
              </span>
            </div>
          </div>
        </header>

        {/* CENTER DISPLAY: AVATAR / CHARACTER SECTION */}
        <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-1 z-10">
          {/* Avatar Aura & Concentric Cyber Rings */}
          <div className="relative flex items-center justify-center">
            {/* Outer Breathing Glow Pulse with Neon Green & Magenta Aura */}
            <div
              className={`absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full transition-all duration-700 blur-3xl pointer-events-none ${
                status === 'speaking'
                  ? 'bg-gradient-to-tr from-[#00ff66]/40 via-[#d946ef]/35 to-[#00ff66]/40 scale-120 animate-pulse'
                  : status === 'listening'
                  ? 'bg-gradient-to-tr from-cyan-400/40 via-[#d946ef]/30 to-cyan-400/40 scale-115'
                  : 'bg-gradient-to-tr from-[#00ff66]/25 via-[#9333ea]/20 to-[#00ff66]/25 scale-100'
              }`}
            />

            {/* Rotating Tech HUD Dial Ring */}
            <div
              className={`absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-[#00ff66]/30 border-dashed pointer-events-none transition-transform duration-1000 ${
                status === 'speaking' || status === 'listening' ? 'animate-spin-slow' : ''
              }`}
            />

            {/* Glowing Secondary Magenta/Purple Ring */}
            <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-[#d946ef]/40 pointer-events-none" />

            {/* Ultra-Realistic Photorealistic Portrait (NO CARTOON, NO ANIME) */}
            <div
              onClick={handleMicClick}
              className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden p-1 cursor-pointer transition-all duration-300 transform active:scale-95 shadow-[0_0_35px_rgba(0,255,102,0.4)] border-2 ${
                status === 'listening'
                  ? 'border-cyan-400 shadow-[0_0_45px_rgba(6,182,212,0.8)] scale-105'
                  : status === 'speaking'
                  ? 'border-[#00ff66] shadow-[0_0_50px_rgba(0,255,102,0.9),0_0_80px_rgba(217,70,239,0.5)] scale-105'
                  : 'border-[#00ff66]/60 hover:border-[#00ff66] hover:scale-102'
              }`}
            >
              {/* Photorealistic Portrait of a Gorgeous Indian AI Character */}
              <img
                src="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80"
                alt="Tara - Photorealistic AI Companion"
                className={`w-full h-full object-cover object-top rounded-full transition-transform duration-500 ${
                  status === 'speaking'
                    ? 'scale-105 brightness-110 contrast-105'
                    : status === 'listening'
                    ? 'scale-102 brightness-105'
                    : 'scale-100'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
                }}
              />

              {/* Cybernetic Holographic Vignette Overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Futuristic Cyber Bindi Dot with Neon Pulse */}
              <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66,0_0_16px_#00ff66] pointer-events-none animate-pulse" />

              {/* Cyber Lens Corner Accents */}
              <div className="absolute inset-2 rounded-full border border-cyan-400/30 border-dashed pointer-events-none" />

              {/* Speech Frequency Wave Bars Overlay on Portrait Bottom */}
              {status === 'speaking' && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 border border-[#00ff66]/50 backdrop-blur-md">
                  <span className="w-1 h-3 bg-[#00ff66] rounded-full animate-bounce" />
                  <span className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce delay-75" />
                  <span className="w-1 h-4 bg-fuchsia-400 rounded-full animate-bounce delay-150" />
                  <span className="w-1 h-5 bg-[#00ff66] rounded-full animate-bounce delay-100" />
                  <span className="w-1 h-2 bg-cyan-300 rounded-full animate-bounce delay-200" />
                </div>
              )}
            </div>
          </div>

          {/* Sub-status Indicator Pill */}
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-[#00ff66]/30 text-[11px] font-mono text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.2)]">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>
              {status === 'speaking'
                ? 'Speaking Audio Output'
                : status === 'listening'
                ? 'Listening to your voice...'
                : 'Tap avatar or mic to speak'}
            </span>
          </div>

          {/* LIVE SUBTITLES / GLASSMORPHIC DIALOGUE BOX WITH TYPEWRITER EFFECT */}
          <div className="w-full mt-3 px-2">
            <div className="relative p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl bg-[#0d1612]/75 border border-[#00ff66]/30 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(0,255,102,0.15)] transition-all">
              {/* Dialogue Header */}
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#00ff66]/15">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#00ff66]">
                  <Sparkles className="w-3.5 h-3.5 text-[#00ff66] animate-spin-slow" />
                  <span>{assistantName} AI</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  {status === 'speaking' ? 'LIVE SPEECH' : 'READY'}
                </span>
              </div>

              {/* User Voice Input Preview if speaking */}
              {userSpokenText && (
                <div className="mb-2 text-xs font-mono text-cyan-300 bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-500/20">
                  <span className="font-bold text-cyan-400 mr-1.5">You:</span>
                  <span className="italic">{userSpokenText}</span>
                </div>
              )}

              {/* Typewriter Spoken Text */}
              <p className="text-xs sm:text-sm font-sans text-gray-100 leading-relaxed min-h-[42px]">
                <span className="font-bold text-[#00ff66] mr-1.5">{assistantName}:</span>
                {displayedText}
                {displayedText.length < fullMessageText.length && (
                  <span className="inline-block w-1.5 h-3.5 bg-[#00ff66] ml-1 animate-pulse align-middle" />
                )}
              </p>
            </div>
          </div>
        </main>

        {/* BOTTOM CONTROLS & NAVIGATION SECTION */}
        <footer className="relative z-20 px-4 pb-5 pt-1">
          {/* Glowing Center Microphone / Wave Button */}
          <div className="relative flex justify-center -mb-5 z-30">
            <button
              onClick={handleMicClick}
              title={status === 'listening' ? 'Stop Listening' : 'Speak to AI'}
              className={`group relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 outline-none ${
                status === 'listening'
                  ? 'bg-gradient-to-tr from-cyan-500 to-[#00ff66] shadow-[0_0_35px_rgba(0,255,102,0.9),0_0_60px_rgba(6,182,212,0.7)] scale-110'
                  : status === 'speaking'
                  ? 'bg-gradient-to-tr from-[#00ff66] to-teal-400 shadow-[0_0_30px_rgba(0,255,102,0.8)] animate-pulse'
                  : 'bg-gradient-to-tr from-[#00ff66] to-emerald-400 shadow-[0_0_25px_rgba(0,255,102,0.5)] hover:scale-108 hover:shadow-[0_0_35px_rgba(0,255,102,0.8)]'
              }`}
            >
              {/* Outer Ripple Wave when listening */}
              {status === 'listening' && (
                <div className="absolute inset-0 rounded-full border-2 border-[#00ff66] animate-ping opacity-75" />
              )}

              {/* Inner Core Icon */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#050508]/85 flex items-center justify-center text-[#00ff66] group-hover:text-white transition-colors">
                {status === 'listening' ? (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-4 bg-[#00ff66] rounded-full animate-bounce" />
                    <span className="w-1 h-6 bg-cyan-400 rounded-full animate-bounce delay-100" />
                    <span className="w-1 h-3 bg-[#00ff66] rounded-full animate-bounce delay-200" />
                  </div>
                ) : (
                  <Mic className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_8px_rgba(0,255,102,0.8)]" />
                )}
              </div>
            </button>
          </div>

          {/* 5-Item Neon Bottom Navigation Bar */}
          <nav className="pt-6 pb-2 px-3 rounded-3xl bg-[#090d0b]/90 backdrop-blur-xl border border-[#00ff66]/25 flex items-center justify-around shadow-[0_8px_30px_rgba(0,0,0,0.8)]">
            {/* 1. Home */}
            <button
              onClick={() => {
                setActiveTab('home');
                if (onBackToHUD) onBackToHUD();
              }}
              title="Home / Switch View"
              className={`flex flex-col items-center gap-1 p-1.5 transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'text-[#00ff66] drop-shadow-[0_0_10px_rgba(0,255,102,0.8)] scale-110'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-mono">Home</span>
            </button>

            {/* 2. Chat Log */}
            <button
              onClick={() => setActiveTab('chat')}
              title="Chat History"
              className={`flex flex-col items-center gap-1 p-1.5 transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'text-[#00ff66] drop-shadow-[0_0_10px_rgba(0,255,102,0.8)] scale-110'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[9px] font-mono">Chat</span>
            </button>

            {/* 3. Center Mic Placeholder */}
            <div className="w-12 pointer-events-none" />

            {/* 4. Camera / Screen Context */}
            <button
              onClick={() => {
                setActiveTab('camera');
                processUserPrompt('हे तारा, स्क्रीन देखो और बताओ क्या है');
              }}
              title="Camera & Screen Look"
              className={`flex flex-col items-center gap-1 p-1.5 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'text-[#00ff66] drop-shadow-[0_0_10px_rgba(0,255,102,0.8)] scale-110'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span className="text-[9px] font-mono">Vision</span>
            </button>

            {/* 5. Settings */}
            <button
              onClick={() => {
                setActiveTab('settings');
                setShowSettingsModal(true);
              }}
              title="Settings"
              className={`flex flex-col items-center gap-1 p-1.5 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'text-[#00ff66] drop-shadow-[0_0_10px_rgba(0,255,102,0.8)] scale-110'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-mono">Setup</span>
            </button>
          </nav>
        </footer>

        {/* MODAL 1: CHAT HISTORY DRAWER */}
        {activeTab === 'chat' && (
          <div className="absolute inset-0 z-40 bg-[#0a0a10]/95 backdrop-blur-2xl flex flex-col p-4 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#00ff66]/20">
              <h3 className="font-['Orbitron',sans-serif] text-sm font-bold text-[#00ff66] flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>Cyber Dialogue Log</span>
              </h3>
              <button
                onClick={() => setActiveTab('mic')}
                className="text-gray-400 hover:text-white px-2 py-1 rounded font-mono text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs font-mono">
              {chatLog.map((c, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border max-w-[85%] ${
                    c.sender === 'user'
                      ? 'ml-auto bg-cyan-950/60 border-cyan-500/40 text-cyan-200'
                      : 'mr-auto bg-emerald-950/60 border-[#00ff66]/30 text-emerald-200'
                  }`}
                >
                  <div className="flex justify-between items-center text-[9px] opacity-70 mb-1">
                    <span>{c.sender === 'user' ? 'Ajeet' : assistantName}</span>
                    <span>{c.time}</span>
                  </div>
                  <p className="font-sans text-xs">{c.text}</p>
                </div>
              ))}
            </div>

            {/* Quick text input box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputText.trim()) {
                  processUserPrompt(inputText.trim());
                  setInputText('');
                  setActiveTab('mic');
                }
              }}
              className="flex items-center gap-2 pt-2 border-t border-[#00ff66]/20"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type in Hindi or English..."
                className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-[#00ff66]/40 text-xs text-white focus:outline-none focus:border-[#00ff66]"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-[#00ff66] text-black hover:bg-emerald-400 font-bold cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* MODAL 2: USER PROFILE / QUICK PREFERENCES */}
        {showProfileModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xs p-5 rounded-3xl bg-[#0d1612] border border-[#00ff66]/40 shadow-2xl text-xs font-mono">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-[#00ff66] text-sm">User Profile</h4>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-[10px]">Your Name:</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-black/60 border border-[#00ff66]/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-[10px]">Assistant Name Persona:</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setAssistantName('Tara')}
                      className={`py-1.5 rounded-lg border font-bold cursor-pointer ${
                        assistantName === 'Tara'
                          ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66]'
                          : 'border-white/10 text-gray-400'
                      }`}
                    >
                      Tara (तारा)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssistantName('Mira')}
                      className={`py-1.5 rounded-lg border font-bold cursor-pointer ${
                        assistantName === 'Mira'
                          ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66]'
                          : 'border-white/10 text-gray-400'
                      }`}
                    >
                      Mira (मीरा)
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="w-full py-2 rounded-xl bg-[#00ff66] text-black font-bold cursor-pointer hover:bg-emerald-400"
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: SETTINGS MODAL */}
        {showSettingsModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xs p-5 rounded-3xl bg-[#0d1612] border border-[#a855f7]/40 shadow-2xl text-xs font-mono">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-[#c084fc] text-sm">Cyber Settings</h4>
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setActiveTab('mic');
                  }}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Audio Mute (Silent subtitles):</span>
                  <input
                    type="checkbox"
                    checked={isAudioMuted}
                    onChange={(e) => setIsAudioMuted(e.target.checked)}
                    className="accent-[#00ff66] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Ambient Synth Music:</span>
                  <button
                    type="button"
                    onClick={toggleAmbientMusic}
                    className="px-2 py-1 rounded bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 cursor-pointer"
                  >
                    {isMusicPlaying ? 'Active' : 'Off'}
                  </button>
                </div>

                <div className="pt-2 border-t border-white/10">
                  {onBackToHUD && (
                    <button
                      onClick={() => {
                        setShowSettingsModal(false);
                        onBackToHUD();
                      }}
                      className="w-full mb-2 py-1.5 rounded-lg bg-cyan-950/80 text-cyan-200 border border-cyan-500/40 cursor-pointer hover:bg-cyan-900"
                    >
                      Switch to Full JARVIS HUD
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setActiveTab('mic');
                    }}
                    className="w-full py-2 rounded-xl bg-[#a855f7] text-white font-bold cursor-pointer hover:bg-purple-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
