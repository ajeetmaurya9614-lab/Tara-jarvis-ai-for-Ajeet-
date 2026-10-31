import React, { useState, useEffect, useRef } from 'react';

interface TaraReplicaViewProps {
  onSwitchView?: (mode: any) => void;
}

export const TaraReplicaView: React.FC<TaraReplicaViewProps> = ({ onSwitchView }) => {
  // States
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [speechBubbleText, setSpeechBubbleText] = useState<string>(
    'Hello Boss...! 😍\nमैं हूँ TARA AI...\nआपका Personal\nAssistant! 💖'
  );
  const [displayedSpeech, setDisplayedSpeech] = useState<string>(
    'Hello Boss...! 😍\nमैं हूँ TARA AI...\nआपका Personal\nAssistant! 💖'
  );
  const [isCustomSpeech, setIsCustomSpeech] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tools' | 'favorites' | 'profile'>('home');
  const [audioLevel, setAudioLevel] = useState<number>(0.2);

  // Modals
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello Boss...! 😍 मैं हूँ TARA AI... आपका Personal Assistant! 💖',
    },
  ]);

  // Clock
  const [currentTime, setCurrentTime] = useState<string>('6:30');

  // Refs
  const recognitionRef = useRef<any>(null);
  const typewriterTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicOscRef = useRef<any[]>([]);
  const silenceTimerRef = useRef<any>(null);
  const statusRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Update clock every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      setCurrentTime(`${h % 12 || 12}:${m < 10 ? '0' : ''}${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Preload browser voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Typewriter effect for speech bubble
  const startTypewriter = (text: string) => {
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    setDisplayedSpeech('');
    let idx = 0;
    const speed = 22;

    typewriterTimerRef.current = setInterval(() => {
      if (idx < text.length) {
        setDisplayedSpeech(text.slice(0, idx + 1));
        idx++;
      } else {
        clearInterval(typewriterTimerRef.current);
      }
    }, speed);
  };

  // Web SpeechSynthesis Output
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      startTypewriter(text);
      return;
    }

    window.speechSynthesis.cancel();
    setStatus('speaking');
    setIsCustomSpeech(true);

    const cleanText = text.replace(/[*#_`>]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.02;
    utterance.pitch = 1.15;

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

    window.speechSynthesis.speak(utterance);
  };

  // Process prompt via Gemini API
  const processUserQuery = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setStatus('idle');
      return;
    }

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setStatus('thinking');
    setUserTranscript(trimmed);
    setChatLog((prev) => [...prev, { sender: 'user', text: trimmed }]);

    try {
      const res = await fetch('/api/tara/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.replyText || 'हाँ बिल्कुल Boss! मैं आपकी बात समझ गयी।';
        setSpeechBubbleText(reply);
        setChatLog((prev) => [...prev, { sender: 'ai', text: reply }]);
        speakText(reply);
      } else {
        throw new Error('API failed');
      }
    } catch {
      const fallback = 'अरे Boss! मैं सुन रही हूँ। आज आप क्या जानना चाहते हैं?';
      setSpeechBubbleText(fallback);
      setChatLog((prev) => [...prev, { sender: 'ai', text: fallback }]);
      speakText(fallback);
    }
  };

  // Toggle Microphone
  const toggleListening = () => {
    if (status === 'speaking') {
      window.speechSynthesis.cancel();
      setStatus('idle');
      return;
    }

    if (status === 'listening') {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('इस ब्राउज़र में Web SpeechRecognition उपलब्ध नहीं है। कृपया AI Chat से टाइप करें।');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const rec = new SpeechRecognition();
      rec.lang = 'hi-IN';
      rec.continuous = true;
      rec.interimResults = true;
      recognitionRef.current = rec;

      setStatus('listening');
      setUserTranscript('');
      let latestSpoken = '';

      rec.onresult = (e: any) => {
        let transcript = '';
        let hasFinal = false;

        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript + ' ';
          if (e.results[i].isFinal) hasFinal = true;
        }

        const clean = transcript.trim();
        latestSpoken = clean;
        setUserTranscript(clean);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (latestSpoken && statusRef.current === 'listening') {
            try {
              rec.stop();
            } catch (_) {}
            processUserQuery(latestSpoken);
          }
        }, 1100);

        if (hasFinal && clean.length > 2) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          try {
            rec.stop();
          } catch (_) {}
          processUserQuery(clean);
        }
      };

      rec.onerror = () => {
        if (latestSpoken && statusRef.current === 'listening') {
          processUserQuery(latestSpoken);
        } else {
          setStatus('idle');
        }
      };

      rec.onend = () => {
        if (statusRef.current === 'listening') {
          if (latestSpoken) {
            processUserQuery(latestSpoken);
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

  // Toggle ambient music
  const toggleMusic = () => {
    if (isMusicPlaying) {
      musicOscRef.current.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch (_) {}
      });
      musicOscRef.current = [];
      setIsMusicPlaying(false);
      speakText('म्यूजिक रोक दिया गया है Boss!');
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const chordFreqs = [220, 277.18, 329.63, 440];
        musicOscRef.current = chordFreqs.map((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          return osc;
        });

        setIsMusicPlaying(true);
        speakText('लीजिए Boss! आपका पसंदीदा म्यूजिक चालू हो गया है!');
      } catch (e) {
        console.warn('Audio failed:', e);
      }
    }
  };

  // Feature Card Clicks
  const handleFeatureClick = (type: string) => {
    if (type === 'chat') {
      setShowChatModal(true);
    } else if (type === 'music') {
      toggleMusic();
    } else if (type === 'call') {
      speakText('नमस्ते Boss! मैं आपकी कॉल कनेक्ट कर रही हूँ... बताइए किससे बात करनी है?');
    } else if (type === 'flashlight') {
      setIsTorchOn((prev) => !prev);
      const msg = !isTorchOn ? 'टॉर्च चालू कर दी गई है Boss!' : 'टॉर्च बंद कर दी गई है!';
      speakText(msg);
    } else if (type === 'weather') {
      processUserQuery('आज का मौसम कैसा है?');
    } else if (type === 'more') {
      speakText('Boss, आपके लिए सभी ऐप्स और टूल्स उपलब्ध हैं! क्या खोलूँ?');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#040611] text-white flex items-center justify-center p-0 select-none overflow-x-hidden font-sans">
      
      {/* Full screen Flashlight overlay if triggered */}
      {isTorchOn && (
        <div
          onClick={() => setIsTorchOn(false)}
          className="fixed inset-0 z-50 bg-white text-black flex flex-col items-center justify-center cursor-pointer animate-in fade-in"
        >
          <div className="text-6xl mb-3 animate-bounce">🔦</div>
          <h2 className="text-2xl font-black tracking-wider">FLASHLIGHT ACTIVE</h2>
          <p className="text-sm font-semibold text-gray-600 mt-1">Tap anywhere to turn off</p>
        </div>
      )}

      {/* Main Pixel-Perfect Phone Container matching exact 1024x1536 resolution */}
      <div
        className="relative w-full max-w-[420px] aspect-[1024/1536] max-h-[98vh] overflow-hidden sm:rounded-[38px] shadow-[0_0_60px_rgba(0,240,255,0.35),0_0_90px_rgba(168,85,247,0.3)] border-0 sm:border-2 sm:border-[#2e1d5e]"
        style={{
          backgroundImage: "url('/assets/aistudio/file_00000000360882079cd43dcbc877f3c6_1f3fcb0c.png')",
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* ========================================================
            PRECISE INTERACTIVE OVERLAY LAYERS OVER EXACT SCREENSHOT
            ======================================================== */}

        {/* 1. TOP STATUS BAR OVERLAYS (6:30 Clock sync) */}
        <div className="absolute top-[1.2%] left-[3.2%] z-20 text-[12px] sm:text-[13px] font-bold text-white tracking-wide">
          {currentTime}
        </div>

        {/* 2. TOP RIGHT BUTTONS OVERLAYS (Settings & Bell with red dot) */}
        <button
          onClick={() => setShowSettingsModal(true)}
          title="Settings"
          className="absolute top-[4.6%] right-[13.8%] w-[8.8%] aspect-square rounded-full z-30 cursor-pointer opacity-0 hover:opacity-25 bg-cyan-400 transition-opacity"
        />
        <button
          onClick={() => setShowNotificationModal(true)}
          title="Notifications"
          className="absolute top-[4.6%] right-[3.2%] w-[8.8%] aspect-square rounded-full z-30 cursor-pointer opacity-0 hover:opacity-25 bg-purple-400 transition-opacity"
        />

        {/* 3. DYNAMIC SPEECH BUBBLE OVERLAY (Top-Right) */}
        <div
          onClick={() => setShowChatModal(true)}
          className={`absolute top-[14.8%] right-[2.8%] w-[33.5%] h-[15.8%] z-30 rounded-[18px] p-2 flex flex-col justify-center cursor-pointer transition-all duration-300 ${
            isCustomSpeech
              ? 'bg-[#0c102e]/95 border-2 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.6)] backdrop-blur-md'
              : 'opacity-0 hover:opacity-30 bg-purple-500/20'
          }`}
        >
          {isCustomSpeech && (
            <div className="text-[10.5px] sm:text-[12px] font-bold text-white leading-tight break-words">
              {displayedSpeech}
              {displayedSpeech.length < speechBubbleText.length && (
                <span className="inline-block w-1.5 h-3 bg-[#00ffff] ml-1 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* User voice transcription indicator over avatar */}
        {userTranscript && status === 'listening' && (
          <div className="absolute top-[32%] left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400 text-[10px] sm:text-[11px] font-mono text-cyan-200 shadow-[0_0_15px_#00ffff] max-w-[85%] truncate">
            🗣️ {userTranscript}
          </div>
        )}

        {/* 4. SOUND WAVE BARS OVERLAYS (Left & Right of Mic) */}
        {(status === 'listening' || status === 'speaking') && (
          <>
            {/* Left Wave Bars Overlay */}
            <div className="absolute top-[48.2%] left-[8%] w-[31%] h-[4.5%] z-25 flex items-center justify-end gap-[3px] pr-2 pointer-events-none">
              {[6, 10, 16, 24, 32, 26, 18, 12, 8].map((h, i) => (
                <span
                  key={`left-live-${i}`}
                  style={{
                    height: `${Math.max(4, Math.round(h * (0.5 + Math.random() * 0.9)))}px`,
                  }}
                  className="w-[2.5px] bg-[#00ffff] shadow-[0_0_8px_#00ffff] rounded-full transition-all duration-100"
                />
              ))}
            </div>

            {/* Right Wave Bars Overlay */}
            <div className="absolute top-[48.2%] right-[8%] w-[31%] h-[4.5%] z-25 flex items-center justify-start gap-[3px] pl-2 pointer-events-none">
              {[8, 12, 18, 26, 32, 24, 16, 10, 6].map((h, i) => (
                <span
                  key={`right-live-${i}`}
                  style={{
                    height: `${Math.max(4, Math.round(h * (0.5 + Math.random() * 0.9)))}px`,
                  }}
                  className="w-[2.5px] bg-[#c084fc] shadow-[0_0_8px_#c084fc] rounded-full transition-all duration-100"
                />
              ))}
            </div>
          </>
        )}

        {/* 5. CENTER MIC BUTTON HOTSPOT (Exact position over avatar chest) */}
        <button
          onClick={toggleListening}
          title={status === 'listening' ? 'Listening... Tap to stop' : 'Tap mic to talk'}
          className={`absolute top-[43.5%] left-1/2 -translate-x-1/2 w-[20.8%] aspect-square rounded-full z-40 cursor-pointer outline-none transition-all duration-300 ${
            status === 'listening'
              ? 'ring-4 ring-[#00ffff] ring-offset-2 ring-offset-black scale-108 shadow-[0_0_40px_#00ffff]'
              : status === 'speaking'
              ? 'ring-4 ring-[#d946ef] animate-pulse scale-105 shadow-[0_0_35px_#d946ef]'
              : 'opacity-0 hover:opacity-30 bg-cyan-400/30'
          }`}
        />

        {/* 6. STATUS PILL HOTSPOT ("Listening... Speak Now") */}
        <button
          onClick={toggleListening}
          title="Status Pill - Tap to toggle mic"
          className="absolute top-[52.8%] left-1/2 -translate-x-1/2 w-[40%] h-[4.2%] z-35 cursor-pointer rounded-full flex items-center justify-center"
        >
          {status !== 'idle' && (
            <div className="w-full h-full rounded-full bg-[#070a24]/95 border-2 border-[#00f0ff] shadow-[0_0_16px_rgba(0,240,255,0.7)] flex items-center justify-center gap-1.5 px-3 text-[11px] sm:text-xs font-extrabold text-white">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'listening'
                    ? 'bg-[#00ff66] shadow-[0_0_8px_#00ff66] animate-ping'
                    : status === 'thinking'
                    ? 'bg-[#c084fc] shadow-[0_0_8px_#c084fc] animate-spin'
                    : 'bg-[#00ffff] shadow-[0_0_8px_#00ffff] animate-pulse'
                }`}
              />
              <span className="truncate">
                {status === 'listening'
                  ? 'Listening... Speak Now'
                  : status === 'thinking'
                  ? 'Thinking...'
                  : 'Speaking Response...'}
              </span>
            </div>
          )}
        </button>

        {/* 7. 6-CARD GRID INTERACTIVE HOTSPOTS */}
        {/* ROW 1: AI Chat, Play Music, Call */}
        <button
          onClick={() => handleFeatureClick('chat')}
          title="AI Chat (चैट करें)"
          className="absolute top-[58.3%] left-[2.4%] w-[30.5%] h-[9%] rounded-[18px] z-30 cursor-pointer opacity-0 hover:opacity-20 active:opacity-40 bg-cyan-400 transition-opacity"
        />
        <button
          onClick={() => handleFeatureClick('music')}
          title="Play Music (संगीत चलाएं)"
          className="absolute top-[58.3%] left-[34.8%] w-[30.5%] h-[9%] rounded-[18px] z-30 cursor-pointer opacity-0 hover:opacity-20 active:opacity-40 bg-pink-500 transition-opacity"
        />
        <button
          onClick={() => handleFeatureClick('call')}
          title="Call (कॉल करें)"
          className="absolute top-[58.3%] left-[67.1%] w-[30.5%] h-[9%] rounded-[18px] z-30 cursor-pointer opacity-0 hover:opacity-20 active:opacity-40 bg-green-500 transition-opacity"
        />

        {/* ROW 2: Flashlight, Weather, More Apps */}
        <button
          onClick={() => handleFeatureClick('flashlight')}
          title="Flashlight (टॉर्च जलाएं)"
          className="absolute top-[68.3%] left-[2.4%] w-[30.5%] h-[9%] rounded-[18px] z-30 cursor-pointer opacity-0 hover:opacity-20 active:opacity-40 bg-yellow-400 transition-opacity"
        />
        <button
          onClick={() => handleFeatureClick('weather')}
          title="Weather (मौसम देखें)"
          className="absolute top-[68.3%] left-[34.8%] w-[30.5%] h-[9%] rounded-[18px] z-30 cursor-pointer opacity-0 hover:opacity-20 active:opacity-40 bg-sky-400 transition-opacity"
        />
        <button
          onClick={() => handleFeatureClick('more')}
          title="More Apps (और भी...)"
          className="absolute top-[68.3%] left-[67.1%] w-[30.5%] h-[9%] rounded-[18px] z-30 cursor-pointer opacity-0 hover:opacity-20 active:opacity-40 bg-cyan-400 transition-opacity"
        />

        {/* 8. MOTIVATION CARD HOTSPOT */}
        <button
          onClick={() => speakText('मेहनत आज की, सफलता कल की... Keep Studying... You Can Do It! 💪')}
          title="मेहनत आज की, सफलता कल की... Keep Studying..."
          className="absolute top-[78.6%] left-[2.4%] w-[95.2%] h-[9.6%] rounded-[20px] z-30 cursor-pointer opacity-0 hover:opacity-15 active:opacity-30 bg-yellow-300 transition-opacity"
        />

        {/* 9. BOTTOM NAVIGATION BAR HOTSPOTS */}
        <button
          onClick={() => setActiveTab('home')}
          title="Home"
          className="absolute top-[90%] left-0 w-[25%] h-[10%] z-30 cursor-pointer opacity-0 hover:opacity-20 bg-purple-500"
        />
        <button
          onClick={() => {
            setActiveTab('tools');
            setShowChatModal(true);
          }}
          title="Tools"
          className="absolute top-[90%] left-[25%] w-[25%] h-[10%] z-30 cursor-pointer opacity-0 hover:opacity-20 bg-cyan-500"
        />
        <button
          onClick={() => {
            setActiveTab('favorites');
            toggleMusic();
          }}
          title="Favorites"
          className="absolute top-[90%] left-[50%] w-[25%] h-[10%] z-30 cursor-pointer opacity-0 hover:opacity-20 bg-pink-500"
        />
        <button
          onClick={() => {
            setActiveTab('profile');
            setShowSettingsModal(true);
          }}
          title="Profile"
          className="absolute top-[90%] left-[75%] w-[25%] h-[10%] z-30 cursor-pointer opacity-0 hover:opacity-20 bg-emerald-500"
        />

        {/* ========================================================
            MODALS FOR INTERACTIVE FUNCTIONALITY
            ======================================================== */}

        {/* MODAL 1: AI CHAT DIALOGUE */}
        {showChatModal && (
          <div className="absolute inset-0 z-50 bg-[#070919]/96 backdrop-blur-2xl flex flex-col p-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold text-white text-sm">TARA AI Live Dialogue</h3>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs">
              {chatLog.map((c, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border max-w-[85%] leading-relaxed ${
                    c.sender === 'user'
                      ? 'ml-auto bg-cyan-950/80 border-cyan-400/50 text-cyan-200'
                      : 'mr-auto bg-purple-950/80 border-purple-400/50 text-purple-200'
                  }`}
                >
                  <strong className={c.sender === 'user' ? 'text-cyan-300 mr-1.5' : 'text-yellow-400 mr-1.5'}>
                    {c.sender === 'user' ? 'You:' : 'Tara:'}
                  </strong>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (chatInput.trim()) {
                  processUserQuery(chatInput.trim());
                  setChatInput('');
                  setShowChatModal(false);
                }
              }}
              className="flex items-center gap-2 pt-2 border-t border-purple-500/30"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="यहाँ हिंदी या इंग्लिश में लिखें..."
                className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-purple-500/40 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* MODAL 2: SETTINGS MODAL */}
        {showSettingsModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xs p-5 rounded-3xl bg-[#0c102e] border border-cyan-400/40 shadow-2xl text-xs text-white">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-cyan-300 text-sm">⚙️ TARA AI Settings</h4>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 font-sans">
                <div>
                  <label className="text-gray-400 text-[11px]">Assistant Identity:</label>
                  <div className="font-bold text-white text-sm mt-0.5">👑 TARA AI (JARVIS Assistant)</div>
                </div>

                <div>
                  <label className="text-gray-400 text-[11px]">Core AI Engine:</label>
                  <div className="font-semibold text-cyan-300 text-xs mt-0.5">Gemini 3.8 Flash (Active)</div>
                </div>

                <div>
                  <label className="text-gray-400 text-[11px]">Wake Word:</label>
                  <div className="font-semibold text-emerald-300 text-xs mt-0.5">"हे तारा" (Hey Tara)</div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: NOTIFICATIONS MODAL */}
        {showNotificationModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xs p-5 rounded-3xl bg-[#0c102e] border border-purple-400/40 shadow-2xl text-xs text-white">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-purple-300 text-sm">🔔 Notifications</h4>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
                  <div className="font-bold text-yellow-300 text-[11px]">Study Motivation</div>
                  <div className="text-[10px] text-gray-300">“मेहनत आज की, सफलता कल की... Keep Studying... You Can Do It! 💪”</div>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                  <div className="font-bold text-cyan-300 text-[11px]">TARA AI Ready</div>
                  <div className="text-[10px] text-gray-300">Voice recognition engine online and ready to assist!</div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="w-full py-1.5 rounded-xl bg-purple-600 text-white font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
