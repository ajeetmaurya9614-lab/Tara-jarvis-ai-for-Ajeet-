import React from 'react';
import {
  Sparkles,
  Compass,
  Atom,
  Code2,
  Feather,
  Cpu,
  Timer,
  MessageCircle,
  Video,
  Flashlight,
  Camera,
  Monitor,
} from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  {
    icon: Monitor,
    label: 'स्क्रीन देखो (Multimodal)',
    text: 'हे तारा, स्क्रीन देखो',
    color: 'border-cyan-400 text-cyan-200 bg-cyan-950/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
  },
  {
    icon: Sparkles,
    label: 'तारा का परिचय',
    text: 'हे तारा! अपना परिचय दीजिए और बताइए कि आप क्या-क्या कर सकती हैं?',
    color: 'border-cyan-500/40 text-cyan-200 bg-cyan-950/30',
  },
  {
    icon: MessageCircle,
    label: 'व्हाट्सएप खोलो',
    text: 'हे तारा, व्हाट्सएप खोलो।',
    color: 'border-emerald-500/40 text-emerald-200 bg-emerald-950/30',
  },
  {
    icon: Video,
    label: 'यूट्यूब पर गाने चलाओ',
    text: 'हे तारा, यूट्यूब पर नए गाने चलाओ।',
    color: 'border-red-500/40 text-red-200 bg-red-950/30',
  },
  {
    icon: Flashlight,
    label: 'टॉर्च जलाओ',
    text: 'हे तारा, टॉर्च चालू करो।',
    color: 'border-amber-500/40 text-amber-200 bg-amber-950/30',
  },
  {
    icon: Camera,
    label: 'कैमरा खोलो',
    text: 'हे तारा, कैमरा खोलो।',
    color: 'border-cyan-500/40 text-cyan-200 bg-cyan-950/30',
  },
  {
    icon: Atom,
    label: 'ब्लैक होल और ब्रह्मांड',
    text: 'हे तारा, ब्लैक होल कैसे बनता है और इसके अंदर क्या होता है? सरल हिन्दी में समझाइए।',
    color: 'border-blue-500/40 text-blue-200 bg-blue-950/30',
  },
  {
    icon: Compass,
    label: 'ISRO और गगनयान',
    text: 'हे तारा, भारत के आगामी अंतरिक्ष मिशन जैसे गगनयान और चंद्रयान के बारे में बताइए।',
    color: 'border-indigo-500/40 text-indigo-200 bg-indigo-950/30',
  },
  {
    icon: Code2,
    label: 'Python कोडिंग',
    text: 'तारा, Python में रिकर्शन (Recursion) क्या होता है? एक छोटा उदाहरण देकर समझाइए।',
    color: 'border-emerald-500/40 text-emerald-200 bg-emerald-950/30',
  },
  {
    icon: Feather,
    label: 'प्रेरक शायरी',
    text: 'तारा, जीवन में सकारात्मक ऊर्जा और हौसले के लिए एक खूबसूरत प्रेरणादायक शायरी सुनाइए।',
    color: 'border-amber-500/40 text-amber-200 bg-amber-950/30',
  },
  {
    icon: Cpu,
    label: 'जार्विस प्रोटोकॉल',
    text: 'जार्विस प्रोटोकॉल एक्टिवेट करो तारा, और पूरे सिस्टम की स्थिति रिपोर्ट दो।',
    color: 'border-purple-500/40 text-purple-200 bg-purple-950/30',
  },
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({
  onSelectPrompt,
  disabled = false,
}) => {
  return (
    <div className="w-full px-2 py-1 select-none">
      <div className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest px-2 mb-1 flex items-center justify-between">
        <span>त्वरित वॉयस कमांड // Quick Voice Prompts</span>
        <span className="text-[9px] text-cyan-500/50">स्वाइप करें →</span>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 px-1">
        {PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => onSelectPrompt(item.text)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono backdrop-blur-sm transition-all duration-200 cursor-pointer hover:scale-102 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${item.color}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
