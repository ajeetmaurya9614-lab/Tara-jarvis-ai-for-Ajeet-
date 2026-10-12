import React, { useState, useRef, useEffect } from 'react';
import { DeviceAction } from '../types/tara';
import {
  Smartphone,
  MessageCircle,
  Video,
  Camera,
  PhoneCall,
  MapPin,
  Mail,
  Music,
  Flashlight,
  Calculator,
  Search,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { executeDeviceAction } from '../utils/deviceController';

interface DeviceControlHubProps {
  onExecuteAction: (action: DeviceAction) => void;
  isTorchActive?: boolean;
}

export const DeviceControlHub: React.FC<DeviceControlHubProps> = ({
  onExecuteAction,
  isTorchActive = false,
}) => {
  const [activeModal, setActiveModal] = useState<'camera' | 'calculator' | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Quick Action App Definitions
  const APPS = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      hindiName: 'व्हाट्सएप',
      icon: MessageCircle,
      color: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50',
      action: {
        type: 'open_whatsapp' as const,
        appName: 'WhatsApp',
        target: 'whatsapp://',
        label: 'WhatsApp खोलें',
        description: 'WhatsApp ऐप खोला जा रहा है',
      },
    },
    {
      id: 'youtube',
      name: 'YouTube',
      hindiName: 'यूट्यूब',
      icon: Video,
      color: 'border-red-500/50 text-red-300 bg-red-950/40 hover:bg-red-900/50',
      action: {
        type: 'open_youtube' as const,
        appName: 'YouTube',
        target: 'https://www.youtube.com',
        label: 'YouTube खोलें',
        description: 'YouTube खोला जा रहा है',
      },
    },
    {
      id: 'camera',
      name: 'Camera',
      hindiName: 'कैमरा',
      icon: Camera,
      color: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50',
      action: {
        type: 'open_camera' as const,
        appName: 'Camera',
        target: '#camera',
        label: 'HUD कैमरा खोलें',
        description: 'कैमरा सेंसर सक्रिय किया जा रहा है',
      },
    },
    {
      id: 'dialer',
      name: 'Phone',
      hindiName: 'फोन डायलर',
      icon: PhoneCall,
      color: 'border-green-500/50 text-green-300 bg-green-950/40 hover:bg-green-900/50',
      action: {
        type: 'make_call' as const,
        appName: 'Phone',
        target: 'tel:',
        label: 'फोन डायलर',
        description: 'डायलर खोला जा रहा है',
      },
    },
    {
      id: 'maps',
      name: 'Maps',
      hindiName: 'गूगल मैप्स',
      icon: MapPin,
      color: 'border-blue-500/50 text-blue-300 bg-blue-950/40 hover:bg-blue-900/50',
      action: {
        type: 'open_maps' as const,
        appName: 'Google Maps',
        target: 'https://maps.google.com/',
        label: 'Google Maps',
        description: 'नक्शा और नेविगेशन',
      },
    },
    {
      id: 'torch',
      name: isTorchActive ? 'Torch ON' : 'Torch',
      hindiName: isTorchActive ? 'टॉर्च चालू' : 'टॉर्च',
      icon: Flashlight,
      color: isTorchActive
        ? 'border-amber-400 text-amber-200 bg-amber-950/60 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
        : 'border-amber-500/50 text-amber-300 bg-amber-950/40 hover:bg-amber-900/50',
      action: {
        type: 'toggle_torch' as const,
        appName: 'Flashlight',
        target: isTorchActive ? 'off' : 'on',
        label: isTorchActive ? 'टॉर्च बंद करें' : 'टॉर्च चालू करें',
        description: 'मोबाइल फ्लैशलाइट टॉर्च',
      },
    },
    {
      id: 'spotify',
      name: 'Spotify',
      hindiName: 'म्यूजिक',
      icon: Music,
      color: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50',
      action: {
        type: 'open_spotify' as const,
        appName: 'Spotify',
        target: 'https://open.spotify.com/',
        label: 'Spotify म्यूजिक',
        description: 'संगीत और गाने',
      },
    },
    {
      id: 'calculator',
      name: 'Calculator',
      hindiName: 'कैलकुलेटर',
      icon: Calculator,
      color: 'border-purple-500/50 text-purple-300 bg-purple-950/40 hover:bg-purple-900/50',
      action: {
        type: 'open_calculator' as const,
        appName: 'Calculator',
        target: '#calculator',
        label: 'HUD कैलकुलेटर',
        description: 'क्वांटम कैलकुलेटर',
      },
    },
  ];

  // Camera stream handler
  useEffect(() => {
    if (activeModal === 'camera') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'user' } })
        .then((stream) => {
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Camera access denied:', err);
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeModal]);

  // Calculator button click
  const handleCalcPress = (btn: string) => {
    if (btn === 'C') {
      setCalcDisplay('0');
    } else if (btn === '=') {
      try {
        // Safe evaluation
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        setCalcDisplay(String(result));
      } catch {
        setCalcDisplay('ERR');
      }
    } else {
      if (calcDisplay === '0' || calcDisplay === 'ERR') {
        setCalcDisplay(btn);
      } else {
        setCalcDisplay(calcDisplay + btn);
      }
    }
  };

  return (
    <div className="w-full px-2 py-1 select-none">
      {/* Device Launcher Strip */}
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] font-mono text-cyan-400 font-semibold tracking-wider flex items-center gap-1">
          <Smartphone className="w-3 h-3 text-cyan-400" />
          <span>DEVICE APPS // फ़ोन ऐप्स कंट्रोल</span>
        </span>
        <span className="text-[9px] font-mono text-cyan-500/60">वॉयस या टैप</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 px-1">
        {APPS.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              onClick={() => {
                if (app.id === 'camera') {
                  setActiveModal('camera');
                } else if (app.id === 'calculator') {
                  setActiveModal('calculator');
                }
                onExecuteAction(app.action);
              }}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition-all duration-200 cursor-pointer active:scale-95 shadow-sm ${app.color}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{app.hindiName}</span>
            </button>
          );
        })}
      </div>

      {/* CAMERA HUD MODAL */}
      {activeModal === 'camera' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/60 bg-slate-900/95 overflow-hidden flex flex-col shadow-[0_0_40px_rgba(6,182,212,0.4)]">
            <div className="flex items-center justify-between p-3 border-b border-cyan-500/30 bg-cyan-950/50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="font-['Orbitron',sans-serif] text-xs font-bold text-cyan-200">
                  JARVIS OPTICAL SENSOR // कैमरा
                </span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-cyan-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* JARVIS Target Reticle */}
              <div className="absolute inset-4 pointer-events-none border border-cyan-400/40 rounded-xl flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-cyan-400/60 rounded-full animate-ping opacity-40" />
                <div className="absolute top-2 left-2 text-[9px] font-mono text-cyan-400">TARGET: LOCKED</div>
                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-cyan-400">RES: 1080P</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-400">TARA OPTICAL SENSOR ACTIVE</span>
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-mono font-bold"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALCULATOR HUD MODAL */}
      {activeModal === 'calculator' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-2xl border border-purple-500/60 bg-slate-900/95 overflow-hidden flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.3)]">
            <div className="flex items-center justify-between p-3 border-b border-purple-500/30 bg-purple-950/50">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-300" />
                <span className="font-['Orbitron',sans-serif] text-xs font-bold text-purple-200">
                  JARVIS CALCULATOR // कैलकुलेटर
                </span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-purple-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950/90 text-right">
              <div className="font-mono text-2xl text-purple-200 font-bold truncate">
                {calcDisplay}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 p-3 bg-slate-900 font-mono text-sm">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map(
                (btn) => (
                  <button
                    key={btn}
                    onClick={() => handleCalcPress(btn)}
                    className={`py-3 rounded-xl border text-center font-bold active:scale-95 transition-all ${
                      btn === '='
                        ? 'bg-purple-600 text-white border-purple-400 col-span-1'
                        : btn === 'C'
                        ? 'bg-red-950/60 text-red-300 border-red-500/40'
                        : '+-*/'.includes(btn)
                        ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                        : 'bg-slate-800 text-purple-100 border-slate-700'
                    }`}
                  >
                    {btn}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
