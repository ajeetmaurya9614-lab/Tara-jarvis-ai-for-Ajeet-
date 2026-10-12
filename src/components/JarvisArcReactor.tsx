import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/tara';
import { Mic, MicOff, Volume2, Sparkles, Activity } from 'lucide-react';

interface JarvisArcReactorProps {
  state: AssistantState;
  analyserNode: AnalyserNode | null;
  onToggleListen: () => void;
  isListening: boolean;
  isContinuous?: boolean;
}

export const JarvisArcReactor: React.FC<JarvisArcReactorProps> = ({
  state,
  analyserNode,
  onToggleListen,
  isListening,
  isContinuous = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rotAngleRef = useRef<number>(0);
  const counterRotRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dataArray = new Uint8Array(128);

    const render = () => {
      // Dynamic rotation speed based on state
      const rotSpeed = state === 'thinking' ? 0.04 : state === 'speaking' ? 0.02 : 0.006;
      rotAngleRef.current += rotSpeed;
      counterRotRef.current -= rotSpeed * 0.7;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) * 0.75;

      ctx.clearRect(0, 0, width, height);

      let avgFreq = 0;
      if (analyserNode && (state === 'listening' || state === 'speaking')) {
        analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        avgFreq = sum / dataArray.length;
      } else {
        // Idle ambient subtle breathing
        avgFreq = Math.sin(Date.now() / 350) * 8 + 12;
      }

      // Background radial glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.1,
        centerX,
        centerY,
        radius * 1.3
      );

      if (state === 'listening') {
        glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        glowGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.2)');
        glowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      } else if (state === 'thinking') {
        glowGrad.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
        glowGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.2)');
        glowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      } else if (state === 'speaking') {
        glowGrad.addColorStop(0, 'rgba(45, 212, 191, 0.55)');
        glowGrad.addColorStop(0.5, 'rgba(20, 184, 166, 0.25)');
        glowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      } else {
        glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
        glowGrad.addColorStop(0.5, 'rgba(8, 145, 178, 0.08)');
        glowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw Radial Audio Bars (64 segments)
      const barCount = 48;
      const angleStep = (Math.PI * 2) / barCount;
      const baseRadius = radius * 0.72;

      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep + rotAngleRef.current;
        const freqIndex = Math.floor((i / barCount) * (dataArray.length / 2));
        const val = analyserNode ? (dataArray[freqIndex] || 0) : Math.sin(i * 0.4 + Date.now() / 400) * 15 + 20;

        const barHeight = Math.max(4, (val / 255) * (radius * 0.45));
        const innerX = centerX + Math.cos(angle) * baseRadius;
        const innerY = centerY + Math.sin(angle) * baseRadius;
        const outerX = centerX + Math.cos(angle) * (baseRadius + barHeight);
        const outerY = centerY + Math.sin(angle) * (baseRadius + barHeight);

        ctx.strokeStyle =
          state === 'speaking'
            ? `rgba(45, 212, 191, ${0.4 + (val / 255) * 0.6})`
            : state === 'listening'
            ? `rgba(6, 182, 212, ${0.4 + (val / 255) * 0.6})`
            : state === 'thinking'
            ? `rgba(192, 132, 252, ${0.3 + (val / 255) * 0.5})`
            : 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();
      }

      // Draw Rotating Geometric HUD Arcs
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(counterRotRef.current);

      // Segmented outer ring
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary fine tick ring
      ctx.setLineDash([2, 8]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, analyserNode]);

  // Handle high resolution canvas for retina/mobile screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  const stateLabel = {
    idle: 'TARA READY • तारा ऑनलाइन',
    listening: 'LISTENING... • बोलिए',
    thinking: 'COMPUTING... • सोच रही हूँ',
    speaking: 'SPEAKING • तारा बोल रही है',
  }[state];

  const stateBadgeColor = {
    idle: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40 shadow-cyan-950/50',
    listening: 'border-cyan-400 text-cyan-200 bg-cyan-900/60 shadow-cyan-500/30 animate-pulse',
    thinking: 'border-purple-400 text-purple-200 bg-purple-900/60 shadow-purple-500/30 animate-pulse',
    speaking: 'border-teal-400 text-teal-200 bg-teal-900/60 shadow-teal-500/30',
  }[state];

  return (
    <div className="relative flex flex-col items-center justify-center my-auto py-2 select-none">
      {/* Reactor Canvas & SVG Rings Container */}
      <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
        {/* Dynamic Background Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* Outer Rotating SVG Gyro Rings */}
        <div
          className={`absolute inset-0 pointer-events-none transition-transform duration-1000 ${
            state === 'thinking' ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_24s_linear_infinite]'
          }`}
        >
          <svg className="w-full h-full" viewBox="0 0 200 200">
            {/* Holographic arc segments */}
            <circle
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="0.8"
              strokeDasharray="40 20 10 15 60 30"
              opacity="0.6"
            />
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.6"
              strokeDasharray="15 8 5 8"
              opacity="0.4"
            />
            {/* North-South-East-West Markers */}
            <path d="M 100 2 L 100 8 M 100 192 L 100 198 M 2 100 L 8 100 M 192 100 L 198 100" stroke="#00f0ff" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Counter-rotating Inner Gyro Ring */}
        <div
          className={`absolute inset-6 pointer-events-none ${
            state === 'thinking' ? 'animate-[spin_6s_linear_infinite_reverse]' : 'animate-[spin_18s_linear_infinite_reverse]'
          }`}
        >
          <svg className="w-full h-full" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.8"
              strokeDasharray="25 15 5 10"
              opacity="0.5"
            />
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="#a855f7"
              strokeWidth="0.6"
              strokeDasharray="12 12"
              opacity={state === 'thinking' ? '0.8' : '0.2'}
            />
          </svg>
        </div>

        {/* Central Interactive Arc Core Button */}
        <button
          onClick={onToggleListen}
          aria-label={isListening ? 'Stop listening' : 'Start speaking with Tara'}
          className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 focus:outline-none shadow-2xl ${
            state === 'listening'
              ? 'bg-gradient-to-br from-cyan-600/90 to-blue-700/90 scale-105 shadow-[0_0_50px_rgba(6,182,212,0.8)] border border-cyan-300'
              : state === 'thinking'
              ? 'bg-gradient-to-br from-purple-700/80 to-indigo-800/80 scale-100 shadow-[0_0_45px_rgba(168,85,247,0.7)] border border-purple-400'
              : state === 'speaking'
              ? 'bg-gradient-to-br from-teal-600/90 to-cyan-800/90 scale-105 shadow-[0_0_50px_rgba(45,212,191,0.8)] border border-teal-300'
              : 'bg-gradient-to-br from-cyan-950/90 via-slate-900/95 to-cyan-900/80 hover:scale-102 hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] border border-cyan-500/50'
          }`}
        >
          {/* Inner Glowing Hexagon / Core Pattern */}
          <div className="absolute inset-2 rounded-full border border-cyan-400/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.3)_0%,_transparent_70%)]" />
          </div>

          {/* Central Animated Icon */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            {state === 'listening' ? (
              <>
                <Mic className="w-8 h-8 text-cyan-100 animate-bounce" />
                <span className="text-[10px] font-mono tracking-widest text-cyan-200 mt-1 uppercase font-semibold">
                  Muting...
                </span>
              </>
            ) : state === 'thinking' ? (
              <>
                <Sparkles className="w-8 h-8 text-purple-200 animate-spin" />
                <span className="text-[10px] font-mono tracking-widest text-purple-200 mt-1 uppercase font-semibold">
                  Thinking
                </span>
              </>
            ) : state === 'speaking' ? (
              <>
                <Volume2 className="w-8 h-8 text-teal-100 animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-teal-200 mt-1 uppercase font-semibold">
                  Speaking
                </span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 mt-1 uppercase font-semibold">
                  Tap to Speak
                </span>
              </>
            )}
          </div>

          {/* Touch Ripple Ring */}
          <div className="absolute -inset-1 rounded-full border border-cyan-400/20 pointer-events-none" />
        </button>
      </div>

      {/* State Telemetry Badge */}
      <div
        className={`mt-4 px-4 py-1.5 rounded-full border text-xs font-mono font-medium tracking-wider flex items-center gap-2 backdrop-blur-md shadow-lg transition-all duration-300 ${stateBadgeColor}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            state === 'listening'
              ? 'bg-cyan-400 animate-ping'
              : state === 'thinking'
              ? 'bg-purple-400 animate-ping'
              : state === 'speaking'
              ? 'bg-teal-400 animate-ping'
              : 'bg-cyan-400'
          }`}
        />
        <span>{stateLabel}</span>
      </div>

      {/* Continuous Mode Indicator & Audio Activity Wave */}
      {state === 'listening' && (
        <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-[10px] font-mono text-cyan-300 animate-fadeIn">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>{isContinuous ? 'अनवरत सुनना सक्रिय (Continuous On)' : 'आवाज़ रिकॉर्ड हो रही है'}</span>
          <div className="flex items-center gap-0.5 ml-1">
            <span className="w-0.5 h-2 bg-cyan-400 animate-[pulse_0.4s_infinite]" />
            <span className="w-0.5 h-3.5 bg-cyan-300 animate-[pulse_0.6s_infinite]" />
            <span className="w-0.5 h-2.5 bg-cyan-400 animate-[pulse_0.5s_infinite]" />
            <span className="w-0.5 h-1.5 bg-cyan-500 animate-[pulse_0.7s_infinite]" />
          </div>
        </div>
      )}

      {/* Subtext Prompt */}
      <p className="text-[11px] font-mono text-cyan-400/70 mt-1.5 text-center px-4 max-w-xs">
        {state === 'idle'
          ? 'बोलने के लिए टैप करें या सवाल पूछें'
          : state === 'listening'
          ? isContinuous
            ? 'तारा लगातार सुन रही है • बोलते रहें या टैप करें'
            : 'आपकी आवाज़ सुनी जा रही है • बीच में न रुकें'
          : state === 'thinking'
          ? 'तारा तुरंत उत्तर तैयार कर रही है...'
          : 'तारा जवाब दे रही है • बीच में रोकने के लिए टैप करें'}
      </p>
    </div>
  );
};
