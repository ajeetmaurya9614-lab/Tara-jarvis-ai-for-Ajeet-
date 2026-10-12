import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/tara';
import {
  ChevronUp,
  ChevronDown,
  Volume2,
  Send,
  User,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Smartphone,
} from 'lucide-react';

interface TranscriptDrawerProps {
  messages: ChatMessage[];
  liveTranscription: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSendMessage: (text: string) => void;
  onReplayVoice: (msg: ChatMessage) => void;
  disabled?: boolean;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  messages,
  liveTranscription,
  isExpanded,
  onToggleExpand,
  onSendMessage,
  onReplayVoice,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const lastMessage = messages[messages.length - 1];

  return (
    <div
      className={`w-full transition-all duration-300 border-t border-cyan-500/20 bg-slate-950/85 backdrop-blur-xl flex flex-col z-20 ${
        isExpanded ? 'h-80 sm:h-96' : 'h-24 sm:h-28'
      }`}
    >
      {/* Top Drag Handle / Header Bar */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/10 cursor-pointer hover:bg-cyan-950/20 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold tracking-wider text-cyan-200">
            HOLOGRAPHIC LOG // संवाद सूची
          </span>
          <span className="text-[10px] font-mono text-cyan-500/70">
            ({messages.length} संदेश)
          </span>
        </div>

        <button
          aria-label={isExpanded ? 'Collapse transcript' : 'Expand transcript'}
          className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 hover:text-cyan-100"
        >
          <span>{isExpanded ? 'कम करें (Hide)' : 'पूरा देखें (Expand)'}</span>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsed Mode: Quick Live Subtitle Preview */}
      {!isExpanded && (
        <div className="px-4 py-1.5 flex-1 flex flex-col justify-center overflow-hidden">
          {liveTranscription ? (
            <div className="flex items-start gap-2 text-cyan-200 animate-pulse">
              <span className="text-xs font-mono text-cyan-400 font-bold shrink-0">YOU:</span>
              <p className="text-xs italic truncate">{liveTranscription}</p>
            </div>
          ) : lastMessage ? (
            <div className="flex items-start gap-2">
              <span
                className={`text-xs font-mono font-bold shrink-0 ${
                  lastMessage.sender === 'tara' ? 'text-teal-400' : 'text-cyan-400'
                }`}
              >
                {lastMessage.sender === 'tara' ? 'तारा:' : 'YOU:'}
              </span>
              <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                {lastMessage.text}
              </p>
            </div>
          ) : (
            <p className="text-xs font-mono text-cyan-500/60 italic text-center">
              माइक पर बोलिए या नीचे से त्वरित विषय चुनें...
            </p>
          )}
        </div>
      )}

      {/* Expanded Mode: Full Chat Stream */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
          {messages.length === 0 && !liveTranscription && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Sparkles className="w-8 h-8 text-cyan-400 mb-2 animate-bounce" />
              <h4 className="font-['Orbitron',sans-serif] text-sm text-cyan-200">
                तारा तैयार है // TARA READY
              </h4>
              <p className="text-xs text-cyan-400/70 max-w-xs mt-1">
                माइक बटन दबाकर कोई भी प्रश्न पूछें। तारा उच्च ज्ञान और मधुर हिन्दी में उत्तर देगी।
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isTara = msg.sender === 'tara';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isTara ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3 border text-xs sm:text-sm leading-relaxed ${
                    isTara
                      ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-tl-sm'
                      : 'bg-cyan-950/60 border-cyan-400/50 text-cyan-100 rounded-tr-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-cyan-500/10">
                    <span className="font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5 text-cyan-300">
                      {isTara ? (
                        <>
                          <Sparkles className="w-3 h-3 text-teal-400" />
                          <span>तारा (TARA)</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-cyan-400" />
                          <span>USER</span>
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      {isTara && (
                        <button
                          onClick={() => onReplayVoice(msg)}
                          title="Replay Voice (आवाज़ सुनें)"
                          className="p-1 rounded text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/40 transition-colors"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        title="Copy text"
                        className="p-1 rounded text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-900/40 transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap selection:bg-cyan-500 selection:text-black">
                    {msg.text}
                  </p>

                  {msg.action && (
                    <div className="mt-2 pt-2 border-t border-cyan-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-teal-300 font-mono">
                        <Smartphone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="truncate">{msg.action.description || msg.action.label}</span>
                      </div>
                      {msg.action.target &&
                        msg.action.target !== '#camera' &&
                        msg.action.target !== '#calculator' && (
                          <a
                            href={msg.action.target}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-400/40 text-[10px] text-teal-200 hover:bg-teal-500/30 flex items-center gap-1 shrink-0 font-mono font-bold"
                          >
                            <span>खोलें</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Real-time speech transcription bubble */}
          {liveTranscription && (
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] rounded-2xl p-2.5 border border-cyan-400/60 bg-cyan-950/40 text-cyan-200 text-xs italic animate-pulse">
                <span className="text-[10px] font-mono font-bold block mb-1 text-cyan-400">
                  सुनाई दे रहा है...
                </span>
                {liveTranscription}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Bottom Text Input Bar (for noisy environments or manual typing) */}
      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-cyan-500/15 bg-slate-950/95 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="तारा से कुछ भी पूछें (Type or speak in Hindi/English)..."
          disabled={disabled}
          className="flex-1 bg-slate-900/90 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-cyan-100 placeholder-cyan-500/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || disabled}
          aria-label="Send message"
          className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-slate-950 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(6,182,212,0.4)] cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
