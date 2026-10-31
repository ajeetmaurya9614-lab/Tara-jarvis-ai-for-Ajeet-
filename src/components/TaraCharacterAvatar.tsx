import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AssistantState } from '../types/tara';
import { Mic, Volume2, Sparkles, Heart, Activity } from 'lucide-react';

interface TaraCharacterAvatarProps {
  state: AssistantState;
  analyserNode: AnalyserNode | null;
  onToggleListen: () => void;
  isListening: boolean;
  isContinuous?: boolean;
  liveTranscription?: string;
  onClickAvatar?: () => void;
}

export const TaraCharacterAvatar: React.FC<TaraCharacterAvatarProps> = ({
  state,
  analyserNode,
  onToggleListen,
  isListening,
  isContinuous = false,
  liveTranscription = '',
  onClickAvatar,
}) => {
  // Blinking control
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [mouthOpenness, setMouthOpenness] = useState<number>(0); // 0 (closed) to 1 (wide open)
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0 to 1
  const [headTilt, setHeadTilt] = useState<number>(0); // degrees
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const blinkTimerRef = useRef<any>(null);
  const audioDataRef = useRef<Uint8Array>(new Uint8Array(128));

  // Natural Blinking Cycle (every 3-5 seconds, with occasional quick double blink)
  useEffect(() => {
    let isCancelled = false;

    const triggerBlink = () => {
      if (isCancelled) return;
      setIsBlinking(true);

      setTimeout(() => {
        if (isCancelled) return;
        setIsBlinking(false);

        // 20% chance of an adorable human double blink
        if (Math.random() < 0.25) {
          setTimeout(() => {
            if (isCancelled) return;
            setIsBlinking(true);
            setTimeout(() => {
              if (isCancelled) return;
              setIsBlinking(false);
            }, 110);
          }, 140);
        }

        // Schedule next blink in 2.8 to 5.2 seconds
        const nextDelay = 2800 + Math.random() * 2400;
        blinkTimerRef.current = setTimeout(triggerBlink, nextDelay);
      }, 140);
    };

    const initialDelay = 1800 + Math.random() * 2000;
    blinkTimerRef.current = setTimeout(triggerBlink, initialDelay);

    return () => {
      isCancelled = true;
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Audio frequency & dynamic lip-sync / expression loop
  useEffect(() => {
    let lastTime = performance.now();
    let speechPhase = 0;

    const updateFrame = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      let currentAudio = 0;

      if (analyserNode && (state === 'speaking' || state === 'listening')) {
        analyserNode.getByteFrequencyData(audioDataRef.current as any);
        let sum = 0;
        // Focus on vocal speech frequencies (indices 4 to 32)
        const range = Math.min(32, audioDataRef.current.length);
        for (let i = 4; i < range; i++) {
          sum += audioDataRef.current[i];
        }
        currentAudio = Math.min(1, (sum / (range - 4)) / 140);
      } else if (state === 'speaking') {
        // Fallback natural speech rhythm oscillator if analyser hasn't received bytes yet
        speechPhase += dt * 14;
        const baseSine = Math.sin(speechPhase);
        const secondHarmonic = Math.sin(speechPhase * 2.3);
        const speechEnvelope = Math.max(0, (baseSine * 0.6 + secondHarmonic * 0.4));
        currentAudio = speechEnvelope * 0.75 + 0.15;
      } else if (state === 'listening') {
        // Subtle receptive pulsation
        currentAudio = 0.15 + Math.sin(time / 280) * 0.08;
      } else {
        // Idle calm breathing
        currentAudio = 0.05 + Math.sin(time / 600) * 0.03;
      }

      setAudioLevel(currentAudio);

      // Smooth mouth openness calculation for lifelike lip sync
      if (state === 'speaking') {
        // Rapid expressive speech articulation
        setMouthOpenness((prev) => {
          const target = Math.max(0.12, Math.min(0.95, currentAudio * 1.25));
          return prev + (target - prev) * 0.45;
        });
      } else if (state === 'listening') {
        // Warm attentive slight smile with slightly parted lips
        setMouthOpenness(0.08);
      } else {
        // Closed / natural smile
        setMouthOpenness((prev) => prev * 0.8);
      }

      // Responsive head tilt:
      // When listening, tilt head attentively to one side like a friend listening to you!
      if (state === 'listening') {
        setHeadTilt(-3.5);
      } else if (state === 'thinking') {
        setHeadTilt(2.5);
      } else if (state === 'speaking') {
        // Gentle lively conversational head nod
        setHeadTilt(Math.sin(time / 320) * 1.8);
      } else {
        setHeadTilt(Math.sin(time / 1200) * 0.8);
      }

      animFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserNode, state]);

  // Handle tap
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickAvatar) {
      onClickAvatar();
    } else {
      onToggleListen();
    }
  };

  // State styling & theme
  const theme = useMemo(() => {
    switch (state) {
      case 'listening':
        return {
          glow: 'from-cyan-500/40 via-sky-500/20 to-transparent',
          border: 'border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.45)]',
          auraColor: '#06b6d4',
          earringGlow: '#22d3ee',
          bindiColor: '#f43f5e',
          badgeText: 'सुन रही हूँ... बोलिए!',
          badgeSub: 'Listening • Tap to submit',
          badgeBg: 'bg-cyan-950/80 border-cyan-400/50 text-cyan-200',
        };
      case 'speaking':
        return {
          glow: 'from-teal-500/40 via-emerald-500/20 to-transparent',
          border: 'border-teal-400 shadow-[0_0_40px_rgba(20,184,166,0.5)]',
          auraColor: '#14b8a6',
          earringGlow: '#2dd4bf',
          bindiColor: '#f43f5e',
          badgeText: 'तारा बोल रही है...',
          badgeSub: 'Speaking • Tap to interrupt',
          badgeBg: 'bg-teal-950/80 border-teal-400/50 text-teal-200',
        };
      case 'thinking':
        return {
          glow: 'from-purple-500/40 via-indigo-500/20 to-transparent',
          border: 'border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.45)]',
          auraColor: '#a855f7',
          earringGlow: '#c084fc',
          bindiColor: '#fb7185',
          badgeText: 'सोच रही हूँ...',
          badgeSub: 'Processing with AI...',
          badgeBg: 'bg-purple-950/80 border-purple-400/50 text-purple-200',
        };
      default: // idle
        return {
          glow: 'from-cyan-500/20 via-sky-900/10 to-transparent',
          border: 'border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.25)]',
          auraColor: '#0891b2',
          earringGlow: '#06b6d4',
          bindiColor: '#e11d48',
          badgeText: 'तारा ऑनलाइन है',
          badgeSub: 'टैप करें या बोलें "हे तारा"',
          badgeBg: 'bg-slate-900/80 border-cyan-500/30 text-cyan-300',
        };
    }
  }, [state]);

  // Derived mouth SVG parameters for lip-sync
  // Base coordinates: mouth center is at (100, 136)
  const mouthY = 136;
  const mouthHalfWidth = 14 + mouthOpenness * 4; // 14 to 18
  const mouthHeight = Math.max(1.5, mouthOpenness * 14); // 1.5px (closed) to 14px (wide open)

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Outer Holographic Energy Aura & Ambient Wave Glow */}
      <div
        className={`absolute w-72 h-72 sm:w-84 sm:h-84 rounded-full pointer-events-none transition-all duration-700 bg-radial ${theme.glow} blur-2xl opacity-60 scale-105`}
        style={{
          transform: `scale(${1 + audioLevel * 0.25})`,
        }}
      />

      {/* Reactive Concentric Sound Rings when Listening / Speaking */}
      {(state === 'listening' || state === 'speaking') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-64 h-64 sm:w-76 sm:h-76 rounded-full border border-cyan-400/30 animate-ping opacity-25"
            style={{ animationDuration: state === 'speaking' ? '1.5s' : '2s' }}
          />
          <div
            className="w-72 h-72 sm:w-88 sm:h-88 rounded-full border border-teal-400/20 animate-pulse opacity-40"
            style={{ animationDuration: '2.5s' }}
          />
        </div>
      )}

      {/* Main Interactive Character Medallion Container */}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="तारा अवतार - बोलने के लिए टैप करें"
        className={`group relative w-56 h-56 sm:w-68 sm:h-68 rounded-full p-2.5 flex items-center justify-center cursor-pointer transition-all duration-300 transform active:scale-95 outline-none focus:ring-2 focus:ring-cyan-400/50 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#020617] border-2 ${theme.border}`}
      >
        {/* Holographic Dial Ring (JARVIS HUD tech fusion) */}
        <div className="absolute inset-1 rounded-full border border-cyan-500/20 border-dashed animate-spin-slow pointer-events-none" />

        {/* Dynamic Audio EQ Arc surrounding Avatar */}
        <svg
          viewBox="0 0 220 220"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* Subtle perimeter circular grid */}
          <circle
            cx="110"
            cy="110"
            r="104"
            fill="none"
            stroke={theme.auraColor}
            strokeWidth="1.5"
            strokeDasharray="4 8"
            opacity="0.35"
          />

          {/* Sound wave segments that light up with audio */}
          {Array.from({ length: 32 }).map((_, i) => {
            const angle = (i / 32) * Math.PI * 2;
            const barLen = 3 + (i % 3 === 0 ? audioLevel * 12 : audioLevel * 6);
            const r1 = 100;
            const r2 = r1 + barLen;
            const x1 = 110 + Math.cos(angle) * r1;
            const y1 = 110 + Math.sin(angle) * r1;
            const x2 = 110 + Math.cos(angle) * r2;
            const y2 = 110 + Math.sin(angle) * r2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={theme.auraColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.3 + audioLevel * 0.7}
              />
            );
          })}
        </svg>

        {/* 2D Animated Indian Girl Vector Character SVG */}
        <div
          className="relative w-full h-full flex items-center justify-center transition-transform duration-300"
          style={{
            transform: `rotate(${headTilt}deg) translateY(${Math.sin(Date.now() / 800) * 1.5}px)`,
          }}
        >
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
          >
            <defs>
              {/* Indian Skin Tone Gradient: Warm golden bronze / olive complexion */}
              <linearGradient id="taraSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f7d0b3" />
                <stop offset="55%" stopColor="#ebb796" />
                <stop offset="100%" stopColor="#dda582" />
              </linearGradient>

              {/* Neck Shadow for 3D Depth */}
              <linearGradient id="neckGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c88e6a" />
                <stop offset="100%" stopColor="#dca583" />
              </linearGradient>

              {/* Luxurious Dark Indian Hair Gradient */}
              <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e1822" />
                <stop offset="50%" stopColor="#141018" />
                <stop offset="100%" stopColor="#0b080f" />
              </linearGradient>

              {/* Hair Highlight Strand Gradient */}
              <linearGradient id="hairHighlight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3d2c45" />
                <stop offset="50%" stopColor="#533c60" />
                <stop offset="100%" stopColor="#1e1822" />
              </linearGradient>

              {/* Lip Gradient: Natural warm rose tint */}
              <linearGradient id="lipGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d86376" />
                <stop offset="100%" stopColor="#bb3e54" />
              </linearGradient>

              {/* Cheek Soft Blush Gradient */}
              <radialGradient id="cheekBlush" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </radialGradient>

              {/* Eye Iris Gradient: Deep warm hazel / mocha eyes */}
              <radialGradient id="irisGrad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#5c3a21" />
                <stop offset="60%" stopColor="#382113" />
                <stop offset="100%" stopColor="#1c0f08" />
              </radialGradient>

              {/* Sci-Fi Collar / Kurti Gradient */}
              <linearGradient id="dressGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0369a1" />
                <stop offset="50%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* 1. Hair Background (Flowing behind shoulders) */}
            <path
              d="M 50 85 C 40 120 42 165 52 188 C 65 192 135 192 148 188 C 158 165 160 120 150 85 C 138 48 62 48 50 85 Z"
              fill="url(#hairGrad)"
            />

            {/* 2. Shoulders & Indian Neckline / Kurti Collar */}
            <path
              d="M 45 195 C 55 170 75 162 100 162 C 125 162 145 170 155 195 Z"
              fill="url(#dressGrad)"
            />
            {/* Delicate Kurti Trim / Sci-Fi collar glow */}
            <path
              d="M 80 168 Q 100 180 120 168"
              fill="none"
              stroke={theme.auraColor}
              strokeWidth="2"
              opacity="0.8"
            />

            {/* 3. Neck */}
            <path
              d="M 86 138 L 86 166 C 86 168 114 168 114 166 L 114 138 Z"
              fill="url(#neckGrad)"
            />
            {/* Throat hollow shadow */}
            <path
              d="M 96 158 Q 100 161 104 158"
              fill="none"
              stroke="#b57a55"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* 4. Ears with Traditional Glowing Jhumka / Earrings */}
            {/* Left Ear */}
            <path
              d="M 64 105 C 60 100 58 114 65 120 C 67 122 68 115 67 108 Z"
              fill="#e7af8c"
            />
            {/* Left Earring (Holographic Indian Jhumka that pulses with speech) */}
            <g
              transform={`translate(61, 122) scale(${1 + audioLevel * 0.3})`}
              className="transition-transform duration-100"
            >
              <circle cx="2" cy="2" r="2.5" fill="#facc15" />
              <path
                d="M -1 6 C 0 3 4 3 5 6 Z"
                fill="#facc15"
                stroke={theme.earringGlow}
                strokeWidth="0.8"
              />
              <circle
                cx="2"
                cy="9"
                r="1.5"
                fill={theme.earringGlow}
                className="animate-pulse"
              />
            </g>

            {/* Right Ear */}
            <path
              d="M 136 105 C 140 100 142 114 135 120 C 133 122 132 115 133 108 Z"
              fill="#e7af8c"
            />
            {/* Right Earring (Holographic Indian Jhumka) */}
            <g
              transform={`translate(136, 122) scale(${1 + audioLevel * 0.3})`}
              className="transition-transform duration-100"
            >
              <circle cx="2" cy="2" r="2.5" fill="#facc15" />
              <path
                d="M -1 6 C 0 3 4 3 5 6 Z"
                fill="#facc15"
                stroke={theme.earringGlow}
                strokeWidth="0.8"
              />
              <circle
                cx="2"
                cy="9"
                r="1.5"
                fill={theme.earringGlow}
                className="animate-pulse"
              />
            </g>

            {/* 5. Head / Face Oval Structure */}
            <path
              d="M 68 95 C 66 128 78 152 100 152 C 122 152 134 128 132 95 C 130 68 70 68 68 95 Z"
              fill="url(#taraSkin)"
            />

            {/* Rosy Cheek Blush */}
            <circle cx="80" cy="120" r="13" fill="url(#cheekBlush)" />
            <circle cx="120" cy="120" r="13" fill="url(#cheekBlush)" />

            {/* 6. Traditional Indian Bindi (Sacred Crimson with AI Glow) */}
            <g transform="translate(100, 89)">
              <circle
                cx="0"
                cy="0"
                r="2.8"
                fill={theme.bindiColor}
                stroke="#ffe4e6"
                strokeWidth="0.5"
              />
              {/* Subtle holographic glow surrounding bindi */}
              <circle
                cx="0"
                cy="0"
                r="4.5"
                fill="none"
                stroke={theme.auraColor}
                strokeWidth="0.6"
                opacity={0.6 + audioLevel * 0.4}
              />
            </g>

            {/* 7. Expressive Eyebrows */}
            {/* Left Eyebrow */}
            <path
              d={
                state === 'listening'
                  ? 'M 72 90 Q 82 84 92 88' // Raised in curious attentiveness
                  : state === 'thinking'
                  ? 'M 72 88 Q 82 86 92 90' // Thoughtful
                  : 'M 72 90 Q 82 86 92 89' // Normal natural arch
              }
              fill="none"
              stroke="#26171e"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {/* Right Eyebrow */}
            <path
              d={
                state === 'listening'
                  ? 'M 108 88 Q 118 84 128 90'
                  : state === 'thinking'
                  ? 'M 108 90 Q 118 86 128 88'
                  : 'M 108 89 Q 118 86 128 90'
              }
              fill="none"
              stroke="#26171e"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="transition-all duration-300"
            />

            {/* 8. Almond-Shaped Eyes & Blinking Animation */}
            {/* Left Eye */}
            <g transform="translate(82, 102)">
              {isBlinking ? (
                // Closed Eyelid when Blinking
                <path
                  d="M -10 1 Q 0 6 10 1"
                  fill="none"
                  stroke="#26171e"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  {/* Eye Sclera (White) */}
                  <path
                    d="M -11 0 Q 0 -6 11 0 Q 0 6 -11 0 Z"
                    fill="#fcfcfd"
                    stroke="#d4b5a2"
                    strokeWidth="0.5"
                  />
                  {/* Iris */}
                  <circle
                    cx={state === 'thinking' ? 1.5 : 0}
                    cy={state === 'thinking' ? -1.5 : 0}
                    r="4.8"
                    fill="url(#irisGrad)"
                  />
                  {/* Pupil */}
                  <circle
                    cx={state === 'thinking' ? 1.5 : 0}
                    cy={state === 'thinking' ? -1.5 : 0}
                    r="2.2"
                    fill="#0a0505"
                  />
                  {/* Light Reflection Sparkle (Anime / Disney realistic style) */}
                  <circle
                    cx={state === 'thinking' ? 2.5 : 1.2}
                    cy={state === 'thinking' ? -2.5 : -1.4}
                    r="1.4"
                    fill="#ffffff"
                  />
                  <circle
                    cx={state === 'thinking' ? 0.4 : -1.2}
                    cy={state === 'thinking' ? -0.5 : 1.2}
                    r="0.7"
                    fill="#ffffff"
                    opacity="0.8"
                  />
                  {/* Upper Eyelash / Eyeliner (Indian Kajal style) */}
                  <path
                    d="M -12 -0.5 Q 0 -7 12 -0.8"
                    fill="none"
                    stroke="#1c0e18"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  {/* Winged Kajal Flick */}
                  <path
                    d="M 11 -0.6 L 14 -2.2"
                    fill="none"
                    stroke="#1c0e18"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </>
              )}
            </g>

            {/* Right Eye */}
            <g transform="translate(118, 102)">
              {isBlinking ? (
                <path
                  d="M -10 1 Q 0 6 10 1"
                  fill="none"
                  stroke="#26171e"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <path
                    d="M -11 0 Q 0 -6 11 0 Q 0 6 -11 0 Z"
                    fill="#fcfcfd"
                    stroke="#d4b5a2"
                    strokeWidth="0.5"
                  />
                  <circle
                    cx={state === 'thinking' ? 1.5 : 0}
                    cy={state === 'thinking' ? -1.5 : 0}
                    r="4.8"
                    fill="url(#irisGrad)"
                  />
                  <circle
                    cx={state === 'thinking' ? 1.5 : 0}
                    cy={state === 'thinking' ? -1.5 : 0}
                    r="2.2"
                    fill="#0a0505"
                  />
                  <circle
                    cx={state === 'thinking' ? 2.5 : 1.2}
                    cy={state === 'thinking' ? -2.5 : -1.4}
                    r="1.4"
                    fill="#ffffff"
                  />
                  <circle
                    cx={state === 'thinking' ? 0.4 : -1.2}
                    cy={state === 'thinking' ? -0.5 : 1.2}
                    r="0.7"
                    fill="#ffffff"
                    opacity="0.8"
                  />
                  <path
                    d="M -12 -0.8 Q 0 -7 12 -0.5"
                    fill="none"
                    stroke="#1c0e18"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M -11 -0.6 L -14 -2.2"
                    fill="none"
                    stroke="#1c0e18"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </>
              )}
            </g>

            {/* 9. Cute Dainty Nose & Soft Shadow */}
            <g transform="translate(100, 116)">
              {/* Nose Bridge line */}
              <path
                d="M -1 -9 Q -0.5 -2 -1 3 Q -2 5 0 6 Q 2 5 1 3"
                fill="none"
                stroke="#c98a62"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              {/* Nostril curve */}
              <path
                d="M -3 5 Q 0 7 3 5"
                fill="none"
                stroke="#ad6c43"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Traditional subtle golden nose stud (nathni dot) */}
              <circle cx="-3.5" cy="4.5" r="0.9" fill="#facc15" />
            </g>

            {/* 10. Dynamic Lip-Sync Mouth & Expressive Smile */}
            <g transform={`translate(100, ${mouthY})`}>
              {state === 'speaking' && mouthOpenness > 0.18 ? (
                // Speaking: Animated Open Mouth with Teeth and Tongue
                <>
                  {/* Inner Mouth Cavity */}
                  <path
                    d={`M ${-mouthHalfWidth} 0 C ${-mouthHalfWidth * 0.7} ${-mouthHeight * 0.5} ${mouthHalfWidth * 0.7} ${-mouthHeight * 0.5} ${mouthHalfWidth} 0 C ${mouthHalfWidth * 0.8} ${mouthHeight} ${-mouthHalfWidth * 0.8} ${mouthHeight} ${-mouthHalfWidth} 0 Z`}
                    fill="#6b1d2f"
                  />
                  {/* Upper Teeth Row */}
                  <path
                    d={`M ${-mouthHalfWidth * 0.65} 0 C ${-mouthHalfWidth * 0.4} ${-mouthHeight * 0.25} ${mouthHalfWidth * 0.4} ${-mouthHeight * 0.25} ${mouthHalfWidth * 0.65} 0 L ${mouthHalfWidth * 0.65} ${Math.min(3, mouthHeight * 0.35)} L ${-mouthHalfWidth * 0.65} ${Math.min(3, mouthHeight * 0.35)} Z`}
                    fill="#f8fafc"
                  />
                  {/* Tongue */}
                  {mouthHeight > 6 && (
                    <ellipse
                      cx="0"
                      cy={mouthHeight * 0.65}
                      rx={mouthHalfWidth * 0.45}
                      ry={mouthHeight * 0.28}
                      fill="#e11d48"
                      opacity="0.85"
                    />
                  )}
                  {/* Upper Lip Outline */}
                  <path
                    d={`M ${-mouthHalfWidth} 0 Q 0 ${-mouthHeight * 0.6} ${mouthHalfWidth} 0`}
                    fill="none"
                    stroke="url(#lipGrad)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  {/* Lower Lip Outline */}
                  <path
                    d={`M ${-mouthHalfWidth} 0 Q 0 ${mouthHeight * 1.1} ${mouthHalfWidth} 0`}
                    fill="none"
                    stroke="url(#lipGrad)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </>
              ) : state === 'listening' ? (
                // Listening: Sweet, warm, welcoming open smile
                <>
                  <path
                    d="M -13 0 Q 0 8 13 0 Q 0 11 -13 0 Z"
                    fill="#f8fafc"
                  />
                  {/* Upper Lip with Cupid's Bow */}
                  <path
                    d="M -13 -0.5 Q -6 -2 0 -0.5 Q 6 -2 13 -0.5"
                    fill="none"
                    stroke="url(#lipGrad)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  {/* Plump Lower Lip */}
                  <path
                    d="M -13 0 Q 0 10 13 0"
                    fill="none"
                    stroke="url(#lipGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  {/* Dimple corners */}
                  <circle cx="-14" cy="-1" r="0.8" fill="#c97b66" />
                  <circle cx="14" cy="-1" r="0.8" fill="#c97b66" />
                </>
              ) : (
                // Idle / Thinking: Soft pleasant gentle resting smile
                <>
                  <path
                    d="M -12 0 Q -5 -1.2 0 -0.2 Q 5 -1.2 12 0"
                    fill="none"
                    stroke="url(#lipGrad)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M -12 0 Q 0 6.5 12 0"
                    fill="none"
                    stroke="url(#lipGrad)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  {/* Dimple corners */}
                  <circle cx="-13" cy="-0.5" r="0.7" fill="#b96a55" />
                  <circle cx="13" cy="-0.5" r="0.7" fill="#b96a55" />
                </>
              )}
            </g>

            {/* 11. Front Hair Strands, Bangs & Parting */}
            {/* Forehead Hairline & Side Fringe */}
            <path
              d="M 68 85 C 72 65 92 56 100 58 C 108 56 128 65 132 85 C 122 75 106 72 100 74 C 94 72 78 75 68 85 Z"
              fill="url(#hairGrad)"
            />
            {/* Elegant side hair strands framing cheeks */}
            <path
              d="M 67 86 C 63 105 64 125 70 138 C 66 120 64 100 68 86 Z"
              fill="url(#hairGrad)"
            />
            <path
              d="M 133 86 C 137 105 136 125 130 138 C 134 120 136 100 132 86 Z"
              fill="url(#hairGrad)"
            />
            {/* Hair highlight curve on crown */}
            <path
              d="M 80 66 Q 100 60 120 66"
              fill="none"
              stroke="url(#hairHighlight)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.8"
            />
          </svg>
        </div>

        {/* Center Floating Mic / Audio Indicator Pill on Avatar Bottom */}
        <div
          className={`absolute bottom-1 px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 transition-all duration-300 shadow-md ${
            state === 'listening'
              ? 'bg-cyan-500 text-slate-950 font-bold scale-110 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
              : state === 'speaking'
              ? 'bg-teal-500 text-slate-950 font-bold scale-105 shadow-[0_0_15px_rgba(45,212,191,0.6)]'
              : 'bg-slate-900/90 text-cyan-300 border border-cyan-500/40 group-hover:border-cyan-300 group-hover:scale-105'
          }`}
        >
          {state === 'listening' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>सुन रही हूँ</span>
            </>
          ) : state === 'speaking' ? (
            <>
              <Volume2 className="w-3 h-3 animate-bounce" />
              <span>बोल रही हूँ</span>
            </>
          ) : state === 'thinking' ? (
            <>
              <Sparkles className="w-3 h-3 text-purple-300 animate-spin" />
              <span>सोच रही हूँ</span>
            </>
          ) : (
            <>
              <Mic className="w-3 h-3 text-cyan-400" />
              <span>टैप करें</span>
            </>
          )}
        </div>
      </button>

      {/* Interactive Expression Status Badge Below Character */}
      <div className="mt-3 flex flex-col items-center text-center max-w-sm px-4">
        <div
          className={`px-3.5 py-1 rounded-full text-xs font-mono border backdrop-blur-md transition-all duration-300 flex items-center gap-2 shadow-lg ${theme.badgeBg}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'listening'
                ? 'bg-cyan-400 animate-ping'
                : state === 'speaking'
                ? 'bg-teal-400 animate-pulse'
                : state === 'thinking'
                ? 'bg-purple-400 animate-spin'
                : 'bg-cyan-400'
            }`}
          />
          <span className="font-bold">{theme.badgeText}</span>
          <span className="text-[10px] opacity-75 hidden sm:inline">• {theme.badgeSub}</span>
        </div>

        {/* Live speech transcription hint when user speaks */}
        {liveTranscription ? (
          <div className="mt-2 text-xs font-mono text-cyan-200 bg-slate-900/80 border border-cyan-500/30 px-3 py-1.5 rounded-xl shadow-md max-w-xs animate-in fade-in">
            <span className="text-cyan-400 font-bold mr-1.5">आप:</span>
            <span className="italic">"{liveTranscription}"</span>
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] font-mono text-cyan-400/70">
            {state === 'speaking'
              ? 'टैप करके बीच में रोकें (Tap to interrupt)'
              : state === 'listening'
              ? 'बोलने के बाद स्वतः प्रोसेस होगा'
              : 'अवतार पर टैप करें या बोलें "हे तारा" (Hey Tara)'}
          </p>
        )}
      </div>
    </div>
  );
};
