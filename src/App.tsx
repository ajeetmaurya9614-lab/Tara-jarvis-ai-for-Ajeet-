/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AssistantState,
  ChatMessage,
  VoiceSettings,
  SystemTelemetry,
  DeviceAction,
} from './types/tara';
import { JarvisArcReactor } from './components/JarvisArcReactor';
import { JarvisHUDHeader } from './components/JarvisHUDHeader';
import { DeviceControlHub } from './components/DeviceControlHub';
import { QuickPrompts } from './components/QuickPrompts';
import { TranscriptDrawer } from './components/TranscriptDrawer';
import { SystemToolsModal } from './components/SystemToolsModal';
import { FloatingTaraOverlay } from './components/FloatingTaraOverlay';
import { playJarvisSfx } from './utils/soundEffects';
import {
  playGeminiAudio,
  speakWithBrowserHindi,
  stopAllSpeech,
  getSharedAnalyser,
  VoiceRecorder,
  StreamingSpeechQueue,
  isSpeakingAudio,
} from './utils/hindiVoice';
import {
  detectDeviceIntent,
  executeDeviceAction,
} from './utils/deviceController';
import {
  containsStrictWakeWord,
  parseWakeWordAndCommand,
  isScreenContextCommand,
} from './utils/wakeWord';
import { captureDisplayFrame } from './utils/screenCapture';
import { Volume2, ShieldAlert } from 'lucide-react';

export default function App() {
  // Assistant states
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveTranscription, setLiveTranscription] = useState<string>('');
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTorchActive, setIsTorchActive] = useState<boolean>(false);

  // Floating Overlay mode state (multitasking while other apps remain usable)
  const [isFloatingOverlay, setIsFloatingOverlay] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tara_floating_overlay') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tara_floating_overlay', String(isFloatingOverlay));
    } catch {}
  }, [isFloatingOverlay]);

  // Voice & System Configuration with optimized defaults
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    engine: 'browser', // Default to high-speed unlimited device Hindi voice (prevents 429 quota exhaustion)
    geminiVoice: 'Kore',
    speechRate: 1.1,
    speechPitch: 1.1,
    sfxEnabled: true,
    autoListen: true, // Auto loop conversation
    alwaysOnMic: true, // Listen continuously in background for wake word
    strictWakeWord: true, // Strict Wake Word: triggers ONLY on "हे तारा" or "Hey Tara"
    silenceThreshold: 750, // Ultra-fast sub-second silence tolerance for immediate response!
    fastResponse: true, // Ultra-fast sub-second response
    languageMode: 'hi-IN',
  });

  // Telemetry state
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    coreTemp: 38.4,
    powerOutput: 98,
    memoryUsage: 34,
    networkLatency: 42,
    protocol: 'MARK-VII',
    uptimeSeconds: 0,
    isContinuousActive: true,
  });

  // Refs for recording, continuous recognition, and streaming speech
  const speechQueueRef = useRef<StreamingSpeechQueue | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isAiSpeakingRef = useRef<boolean>(false);
  const isWakeTriggeredRef = useRef<boolean>(false);
  const assistantStateRef = useRef<AssistantState>('idle');
  const autoListenTimeoutRef = useRef<any>(null);
  const speechDoneTimeoutRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const finalTranscriptBufferRef = useRef<string>('');

  // Keep assistantStateRef synchronized
  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  // Setup AnalyserNode on first interaction
  useEffect(() => {
    try {
      const analyser = getSharedAnalyser();
      setAnalyserNode(analyser);
    } catch (e) {
      console.debug('Web Audio Analyser init deferred until gesture');
    }

    // Telemetry tick
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        uptimeSeconds: prev.uptimeSeconds + 1,
        coreTemp: 38 + Math.sin(Date.now() / 4000) * 0.8,
        networkLatency: Math.floor(35 + Math.random() * 15),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Update Settings handler
  const handleUpdateSettings = (newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings((prev) => ({ ...prev, ...newSettings }));
  };

  /**
   * Instantly stops microphone and speech recognition.
   * Nullifies event handlers so onend cannot trigger an auto-restart loop while AI is speaking.
   */
  const stopMicrophoneImmediately = useCallback(() => {
    isListeningRef.current = false;
    clearTimeout(speechDoneTimeoutRef.current);

    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.onend = null; // Detach onend handler to prevent unwanted restart
        rec.onerror = null;
        rec.stop();
      } catch (_) {}
    }

    if (recorderRef.current) {
      try {
        recorderRef.current.stop().catch(() => {});
      } catch (_) {}
    }
  }, []);

  /**
   * Speak response using configured voice engine (Gemini Neural or Browser Fallback)
   */
  const speakTaraResponse = useCallback(
    async (text: string, cachedAudioBase64?: string) => {
      // Rule 1: Immediately stop microphone when AI begins speaking!
      isAiSpeakingRef.current = true;
      stopMicrophoneImmediately();
      setAssistantState('speaking');
      playJarvisSfx('speak', voiceSettings.sfxEnabled);

      const handleSpeechEnd = () => {
        // Rule 3: Only when AI completely finishes speaking (onend triggered), allow mic restart!
        isAiSpeakingRef.current = false;
        setAssistantState('idle');
        if (voiceSettings.alwaysOnMic || voiceSettings.autoListen) {
          clearTimeout(autoListenTimeoutRef.current);
          autoListenTimeoutRef.current = setTimeout(() => {
            if (
              !isAiSpeakingRef.current &&
              !isSpeakingAudio() &&
              assistantStateRef.current !== 'speaking'
            ) {
              startListeningRef.current();
            }
          }, 150);
        }
      };

      // Case 1: Pre-synthesized audio from server
      if (cachedAudioBase64 && voiceSettings.engine === 'gemini') {
        try {
          await playGeminiAudio(cachedAudioBase64, 'audio/wav', {
            rate: voiceSettings.speechRate,
            onEnd: handleSpeechEnd,
            onError: async () => {
              // Fallback to fast browser TTS if audio playback fails
              await speakWithBrowserHindi(text, {
                rate: voiceSettings.speechRate,
                pitch: voiceSettings.speechPitch,
                onEnd: handleSpeechEnd,
              });
            },
          });
          return;
        } catch (e) {
          console.warn('Gemini audio playback error, falling back to browser speech:', e);
        }
      }

      // Case 2: If fastResponse mode or Browser TTS selected, speak immediately with 0 delay!
      if (voiceSettings.engine === 'browser') {
        try {
          await speakWithBrowserHindi(text, {
            rate: voiceSettings.speechRate,
            pitch: voiceSettings.speechPitch,
            onEnd: handleSpeechEnd,
          });
          return;
        } catch (err) {
          console.warn('Browser TTS failed:', err);
        }
      }

      // Case 3: On-demand synthesis via /api/tara/tts with fast browser fallback
      if (voiceSettings.engine === 'gemini') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for ultra-fast voice

          const ttsRes = await fetch('/api/tara/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              voiceName: voiceSettings.geminiVoice,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (ttsRes.ok) {
            const ttsData = await ttsRes.json();
            if (ttsData.audioBase64) {
              await playGeminiAudio(ttsData.audioBase64, 'audio/wav', {
                rate: voiceSettings.speechRate,
                onEnd: handleSpeechEnd,
                onError: async () => {
                  await speakWithBrowserHindi(text, {
                    rate: voiceSettings.speechRate,
                    pitch: voiceSettings.speechPitch,
                    onEnd: handleSpeechEnd,
                  });
                },
              });
              return;
            }

            if (ttsData.fallbackToBrowser) {
              // Automatically switch to device voice for subsequent turns to prevent rate-limit delays
              setVoiceSettings((prev) => ({ ...prev, engine: 'browser' }));
              await speakWithBrowserHindi(text, {
                rate: voiceSettings.speechRate,
                pitch: voiceSettings.speechPitch,
                onEnd: handleSpeechEnd,
              });
              return;
            }
          }
        } catch (e) {
          console.warn('Gemini TTS fetch failed/aborted, immediate browser fallback:', e);
        }
      }

      // Fallback: Immediate Browser SpeechSynthesis with Hindi female voice
      try {
        await speakWithBrowserHindi(text, {
          rate: voiceSettings.speechRate,
          pitch: voiceSettings.speechPitch,
          onEnd: handleSpeechEnd,
        });
      } catch (err) {
        console.warn('All TTS failed:', err);
        handleSpeechEnd();
      }
    },
    [voiceSettings]
  );

  /**
   * Multitasking Screen Context: Analyzes real-time screenshot display with Gemini Multimodal
   * Triggered when user commands "हे तारा, स्क्रीन देखो" (Hey Tara, look at my screen)
   */
  const handleScreenContextLook = useCallback(
    async (userSpokenQuery?: string) => {
      // 1. Immediately stop microphone & any current speech
      isAiSpeakingRef.current = true;
      stopMicrophoneImmediately();
      stopAllSpeech();
      setAssistantState('thinking');
      playJarvisSfx('think', voiceSettings.sfxEnabled);
      setLiveTranscription('');

      const cleanQuery = userSpokenQuery?.trim() || 'हे तारा, स्क्रीन देखो';

      try {
        // 2. Capture real-time display frame via Web Screen API or seamless window snapshot fallback
        const frame = await captureDisplayFrame();

        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: cleanQuery,
          timestamp: Date.now(),
          screenshotBase64: frame.base64Data,
        };
        setMessages((prev) => [...prev, userMsg]);

        // 3. Send screenshot + prompt to /api/tara/analyze-screen
        const res = await fetch('/api/tara/analyze-screen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: frame.base64Data,
            prompt: cleanQuery,
            history: messages.slice(-4).map((m) => ({ role: m.sender, text: m.text })),
          }),
        });

        const data = res.ok ? await res.json() : null;
        const replyText =
          data?.replyText || 'मैंने आपकी स्क्रीन का अवलोकन कर लिया है। स्क्रीन पर सक्रिय सामग्री सामान्य है।';

        const isFullDisplay = frame.source === 'display_media';
        const taraMsg: ChatMessage = {
          id: `tara-${Date.now()}`,
          sender: 'tara',
          text: replyText,
          timestamp: Date.now(),
          screenshotBase64: frame.base64Data,
          action: {
            type: 'analyze_screen',
            label: isFullDisplay ? 'स्क्रीन विश्लेषण (डिस्प्ले)' : 'स्क्रीन विश्लेषण (विंडो व्यू)',
            description: isFullDisplay ? 'लाइव डिस्प्ले विज़न विश्लेषण संपन्न' : 'सक्रिय विंडो एवं HUD का विज़न विश्लेषण संपन्न',
          },
        };

        setMessages((prev) => [...prev, taraMsg]);
        setErrorMessage(null);

        // 4. Speak response aloud in warm Hindi
        await speakTaraResponse(replyText);
      } catch (err: any) {
        console.warn('Screen context analysis info/fallback:', err);
        const failText = 'स्क्रीन को पूरी तरह कैप्चर करने में क्षणिक रुकावट आई, परंतु मैं सक्रिय हूँ। आप मुझसे बोलकर भी पूछ सकते हैं!';

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'tara',
            text: failText,
            timestamp: Date.now(),
          },
        ]);
        await speakTaraResponse(failText);
      }
    },
    [messages, speakTaraResponse, stopMicrophoneImmediately, voiceSettings]
  );

  /**
   * Process user message (with instantaneous device intent execution & fast response)
   */
  const processUserMessage = useCallback(
    async (userText: string, audioBase64?: string) => {
      const cleanInput = userText.trim();
      if (!cleanInput) return;

      // Rule 1: Immediately stop microphone as soon as AI begins processing & speaking!
      isAiSpeakingRef.current = true;
      stopMicrophoneImmediately();
      stopAllSpeech();
      setAssistantState('thinking');
      playJarvisSfx('think', voiceSettings.sfxEnabled);
      setLiveTranscription('');

      // Check if user text begins with wake word and extract payload
      const parsedWake = parseWakeWordAndCommand(cleanInput);
      const effectiveInput = parsedWake.isWakeWord && parsedWake.command ? parsedWake.command : cleanInput;

      // Handle standalone wake word prompt ("हे तारा" / "Hey Tara" without following command)
      if (parsedWake.isWakeWord && !parsedWake.command) {
        const greetText = 'जी हुक्म! मैं तारा हूँ, आपकी बात सुन रही हूँ। आज्ञा दीजिए!';
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: cleanInput,
          timestamp: Date.now(),
        };
        const taraMsg: ChatMessage = {
          id: `tara-${Date.now()}`,
          sender: 'tara',
          text: greetText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg, taraMsg]);
        await speakTaraResponse(greetText);
        return;
      }

      // 0. MULTITASKING SCREEN CONTEXT ("हे तारा, स्क्रीन देखो" / "स्क्रीन देखो")
      if (isScreenContextCommand(effectiveInput) || isScreenContextCommand(cleanInput)) {
        await handleScreenContextLook(cleanInput);
        return;
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: cleanInput,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      // 1. FAST DEVICE INTENT DETECTION (0ms delay!)
      const deviceAction = detectDeviceIntent(effectiveInput) || detectDeviceIntent(cleanInput);

      if (deviceAction) {
        // Execute the action immediately
        executeDeviceAction(deviceAction);

        if (deviceAction.type === 'toggle_torch') {
          setIsTorchActive((prev) => !prev);
        }

        // Formulate Tara's immediate affirmative confirmation
        let confirmText = 'जी हुक्म, कार्य निष्पादित किया जा रहा है!';
        if (deviceAction.type === 'open_whatsapp') {
          confirmText = 'जी सर, व्हाट्सएप खोला जा रहा है!';
        } else if (deviceAction.type === 'open_youtube') {
          confirmText = deviceAction.query
            ? `जी, यूट्यूब पर "${deviceAction.query}" चलाया जा रहा है!`
            : 'जी, यूट्यूब चालू किया जा रहा है!';
        } else if (deviceAction.type === 'open_camera') {
          confirmText = 'कैमरा सेंसर सक्रिय किया जा रहा है!';
        } else if (deviceAction.type === 'toggle_torch') {
          confirmText = deviceAction.target === 'off' ? 'मोबाइल टॉर्च बंद कर दी गई है।' : 'मोबाइल टॉर्च चालू कर दी गई है!';
        } else if (deviceAction.type === 'make_call') {
          confirmText = deviceAction.query ? `${deviceAction.query} पर कॉल मिलाई जा रही है!` : 'फोन डायलर खोला जा रहा है!';
        } else if (deviceAction.type === 'open_maps') {
          confirmText = deviceAction.query ? `Google Maps पर ${deviceAction.query} का रास्ता दिखाया जा रहा है!` : 'Google Maps खोला जा रहा है!';
        } else if (deviceAction.type === 'open_spotify') {
          confirmText = 'Spotify म्यूजिक खोला जा रहा है। आनंद लीजिए!';
        } else if (deviceAction.type === 'open_calculator') {
          confirmText = 'क्वांटम कैलकुलेटर सक्रिय किया गया है!';
        } else if (deviceAction.type === 'search_web') {
          confirmText = `Google पर "${deviceAction.query}" सर्च किया जा रहा है!`;
        }

        const taraMsg: ChatMessage = {
          id: `tara-${Date.now()}`,
          sender: 'tara',
          text: confirmText,
          timestamp: Date.now(),
          action: deviceAction,
        };

        setMessages((prev) => [...prev, taraMsg]);
        setErrorMessage(null);
        await speakTaraResponse(confirmText);
        return;
      }

      // 2. REAL-TIME STREAMING VIA GEMINI (stream: true / SSE)
      try {
        const taraMsgId = `tara-${Date.now()}`;

        // Add empty Tara placeholder immediately for 0ms visual responsiveness
        setMessages((prev) => [
          ...prev,
          {
            id: taraMsgId,
            sender: 'tara',
            text: '',
            timestamp: Date.now(),
          },
        ]);

        // Stop any active speech and setup progressive sentence streaming
        if (speechQueueRef.current) {
          speechQueueRef.current.stop();
        }

        const queue = new StreamingSpeechQueue(
          {
            rate: voiceSettings.speechRate,
            pitch: voiceSettings.speechPitch,
            onStart: () => {
              // Rule 1: When AI starts speaking (Text-to-Speech active), immediately stop microphone!
              isAiSpeakingRef.current = true;
              stopMicrophoneImmediately();
              setAssistantState('speaking');
            },
          },
          () => {
            // Rule 3: When AI completely finishes speaking (SpeechSynthesis onend triggers),
            // ONLY THEN restart the microphone! Mic and AI speaking must never run together!
            isAiSpeakingRef.current = false;
            setAssistantState('idle');
            if (voiceSettings.alwaysOnMic || voiceSettings.autoListen) {
              clearTimeout(autoListenTimeoutRef.current);
              autoListenTimeoutRef.current = setTimeout(() => {
                if (
                  !isAiSpeakingRef.current &&
                  !isSpeakingAudio() &&
                  assistantStateRef.current !== 'speaking'
                ) {
                  startListeningRef.current();
                }
              }, 150);
            }
          }
        );
        speechQueueRef.current = queue;

        const res = await fetch('/api/tara/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: cleanInput,
            history: messages.slice(-6).map((m) => ({
              role: m.sender,
              text: m.text,
            })),
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Server returned ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let streamBuffer = '';
        let fullText = '';
        let sentenceBuffer = '';
        let hasSwitchedToSpeaking = false;
        let hasQueuedFirstWords = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split('\n');
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                fullText += parsed.text;
                sentenceBuffer += parsed.text;

                if (!hasSwitchedToSpeaking) {
                  hasSwitchedToSpeaking = true;
                  setAssistantState('speaking');
                }

                // Update text word-by-word on screen in real time with ZERO delay!
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === taraMsgId ? { ...m, text: fullText } : m
                  )
                );

                // Check clause/sentence boundary (Hindi पूर्णविराम '।', '?', '!', comma ',', or newline)
                const boundaryMatch = sentenceBuffer.match(/([^\n।?!,]+[।?!,]|\n+)/);
                if (boundaryMatch && boundaryMatch[1]) {
                  const completedPhrase = boundaryMatch[1].trim();
                  if (completedPhrase) {
                    hasQueuedFirstWords = true;
                    queue.enqueue(completedPhrase);
                  }
                  sentenceBuffer = sentenceBuffer.slice(
                    boundaryMatch.index! + boundaryMatch[0].length
                  );
                } else if (!hasQueuedFirstWords) {
                  // Instant response: Speak the very first 2 words immediately without waiting!
                  const words = sentenceBuffer.trim().split(/\s+/);
                  if (words.length >= 2) {
                    const firstChunk = words.slice(0, 2).join(' ');
                    hasQueuedFirstWords = true;
                    queue.enqueue(firstChunk);
                    const idx = sentenceBuffer.indexOf(firstChunk);
                    sentenceBuffer = sentenceBuffer.slice(idx + firstChunk.length).trim();
                  }
                }
              }
            } catch (parseErr) {
              console.debug('SSE parse warning:', parseErr);
            }
          }
        }

        // Flush any remaining tokens in sentence buffer
        if (sentenceBuffer.trim()) {
          queue.enqueue(sentenceBuffer.trim());
        }
        queue.setStreamFinished();
        setErrorMessage(null);
      } catch (error: any) {
        console.error('Error in streaming Tara response:', error);
        isAiSpeakingRef.current = false;
        setAssistantState('idle');
        playJarvisSfx('alert', voiceSettings.sfxEnabled);
        setErrorMessage(error?.message || 'कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।');

        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'tara',
          text: 'क्षमा करें, संपर्क में समस्या आई। कृपया पुनः बोलें।',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);

        if (voiceSettings.alwaysOnMic || voiceSettings.autoListen) {
          clearTimeout(autoListenTimeoutRef.current);
          autoListenTimeoutRef.current = setTimeout(() => {
            if (!isAiSpeakingRef.current && !isSpeakingAudio()) {
              startListeningRef.current();
            }
          }, 400);
        }
      }
    },
    [messages, stopMicrophoneImmediately, voiceSettings]
  );

  /**
   * Start listening with Continuous Mic & Mutual Exclusion (never runs while AI speaks)
   */
  const startListening = useCallback(async () => {
    // CRITICAL: Mic and AI speaking must never run together!
    // If AI is currently speaking or synthesizing, do NOT start microphone!
    if (
      isAiSpeakingRef.current ||
      assistantStateRef.current === 'speaking' ||
      assistantStateRef.current === 'thinking' ||
      isSpeakingAudio()
    ) {
      return;
    }

    clearTimeout(autoListenTimeoutRef.current);
    clearTimeout(speechDoneTimeoutRef.current);
    stopAllSpeech();
    isAiSpeakingRef.current = false;
    playJarvisSfx('listen', voiceSettings.sfxEnabled);
    setAssistantState('listening');
    setLiveTranscription('');
    accumulatedTranscriptRef.current = '';
    finalTranscriptBufferRef.current = '';
    isListeningRef.current = true;

    // 1. Web Speech API with auto-reconnection and buffering
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.abort();
          } catch (_) {}
          recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = voiceSettings.languageMode === 'en-IN' ? 'en-IN' : 'hi-IN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          // Rule 1 Guard: If AI has started speaking, immediately discard mic sound and shut down recognition
          if (
            isAiSpeakingRef.current ||
            assistantStateRef.current === 'speaking' ||
            isSpeakingAudio()
          ) {
            try {
              recognition.stop();
            } catch (_) {}
            return;
          }

          let interim = '';
          let newlyFinalized = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              newlyFinalized += transcript + ' ';
            } else {
              interim += transcript;
            }
          }

          if (newlyFinalized) {
            finalTranscriptBufferRef.current += newlyFinalized;
          }

          const combined = (finalTranscriptBufferRef.current + interim).trim();
          if (combined) {
            // 1. Strict Wake Word Filter:
            // Assistant must trigger ONLY when user says "हे तारा" or "Hey Tara".
            // Ignore other names or generic greetings to avoid accidental triggers!
            if (voiceSettings.strictWakeWord && !isWakeTriggeredRef.current) {
              const hasWake = containsStrictWakeWord(combined);
              if (!hasWake) {
                // Ignore background conversations / other names
                clearTimeout(speechDoneTimeoutRef.current);
                setLiveTranscription('वेक वर्ड "हे तारा" की प्रतीक्षा...');
                return;
              }

              // Strict wake word DETECTED!
              isWakeTriggeredRef.current = true;
              playJarvisSfx('wake', voiceSettings.sfxEnabled);
              setAssistantState('listening');

              const parsed = parseWakeWordAndCommand(combined);
              if (parsed.command) {
                // User spoke command immediately with "हे तारा" (e.g. "हे तारा, स्क्रीन देखो")
                setLiveTranscription(parsed.command);
                accumulatedTranscriptRef.current = parsed.command;

                const isCommandOrQuestion =
                  /[।?!]/.test(parsed.command) ||
                  /(खोलो|चलाओ|बताओ|सुनाओ|दिखाओ|कॉल|लगाओ|सर्च|जलाओ|बंद|करो|है|open|play|call|search|tell|screen|स्क्रीन)/i.test(
                    parsed.command
                  );

                const debounceMs = isCommandOrQuestion ? 350 : (voiceSettings.silenceThreshold || 750);
                clearTimeout(speechDoneTimeoutRef.current);
                speechDoneTimeoutRef.current = setTimeout(() => {
                  if (isListeningRef.current && accumulatedTranscriptRef.current.trim()) {
                    stopListeningAndSubmit();
                  }
                }, debounceMs);
                return;
              } else {
                // User said only "हे तारा" to get Tara's attention
                setLiveTranscription('"हे तारा" सक्रिय... बोलिए');
                accumulatedTranscriptRef.current = '';
                finalTranscriptBufferRef.current = '';
                clearTimeout(speechDoneTimeoutRef.current);
                speechDoneTimeoutRef.current = setTimeout(() => {
                  if (isListeningRef.current) {
                    stopListeningAndSubmit();
                  }
                }, 3500);
                return;
              }
            }

            // 2. Active Command Session:
            setLiveTranscription(combined);
            accumulatedTranscriptRef.current = combined;

            // Voice Activity Detection (VAD) Pause Debounce:
            // Fast 350ms for command/question endings, otherwise silenceThreshold
            const isCommandOrQuestion =
              /[।?!]/.test(combined) ||
              /(खोलो|चलाओ|बताओ|सुनाओ|दिखाओ|कॉल|लगाओ|सर्च|जलाओ|बंद|करो|है|open|play|call|search|tell|screen|स्क्रीन)/i.test(
                combined
              );

            const debounceMs = isCommandOrQuestion ? 350 : (voiceSettings.silenceThreshold || 750);

            clearTimeout(speechDoneTimeoutRef.current);
            speechDoneTimeoutRef.current = setTimeout(() => {
              if (isListeningRef.current && accumulatedTranscriptRef.current.trim()) {
                stopListeningAndSubmit();
              }
            }, debounceMs);
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error === 'no-speech') {
            // Keep microphone alive on silence, do not shut off
            return;
          }
          if (e.error === 'not-allowed') {
            setErrorMessage('माइक्रोफोन अनुमति अस्वीकृत है। कृपया सेटिंग्स में अनुमति दें।');
            isListeningRef.current = false;
            setAssistantState('idle');
          }
        };

        // Rule 2: onend (auto-restart) event condition:
        // अगर AI अभी बोल रहा है, तो माइक्रोफोन रीस्टार्ट नहीं होना चाहिए!
        recognition.onend = () => {
          if (
            isAiSpeakingRef.current ||
            assistantStateRef.current === 'speaking' ||
            assistantStateRef.current === 'thinking' ||
            isSpeakingAudio()
          ) {
            return;
          }

          // Only restart if microphone is in listening mode and AI is NOT speaking:
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (_) {
              setTimeout(() => {
                if (
                  isListeningRef.current &&
                  !isAiSpeakingRef.current &&
                  assistantStateRef.current !== 'speaking' &&
                  !isSpeakingAudio()
                ) {
                  try {
                    recognition.start();
                  } catch (startErr) {
                    try {
                      startListeningRef.current();
                    } catch (_) {}
                  }
                }
              }, 50);
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (recErr) {
        console.warn('Speech recognition start failed:', recErr);
      }
    }
  }, [stopMicrophoneImmediately, voiceSettings]);

  // Keep ref up to date
  startListeningRef.current = startListening;

  /**
   * Stop listening and submit captured voice
   */
  const stopListeningAndSubmit = useCallback(async () => {
    stopMicrophoneImmediately();

    let audioBase64: string | undefined;
    if (recorderRef.current) {
      try {
        const audioData = await recorderRef.current.stop();
        audioBase64 = audioData.base64;
      } catch (recErr) {
        console.debug('Recorder stop debug:', recErr);
      }
    }

    const raw = (
      accumulatedTranscriptRef.current || finalTranscriptBufferRef.current
    ).trim();

    isWakeTriggeredRef.current = false;

    if (raw) {
      const parsed = parseWakeWordAndCommand(raw);
      const commandToRun = parsed.isWakeWord && parsed.command ? parsed.command : raw;
      processUserMessage(commandToRun, audioBase64);
    } else {
      isAiSpeakingRef.current = false;
      setAssistantState('idle');
      playJarvisSfx('standby', voiceSettings.sfxEnabled);
      setLiveTranscription('');
      if (voiceSettings.alwaysOnMic) {
        setTimeout(() => {
          if (
            !isAiSpeakingRef.current &&
            !isSpeakingAudio() &&
            assistantStateRef.current !== 'speaking'
          ) {
            startListeningRef.current();
          }
        }, 120);
      }
    }
  }, [processUserMessage, stopMicrophoneImmediately, voiceSettings.alwaysOnMic, voiceSettings.sfxEnabled]);

  /**
   * Toggle Listen (Tap on the Arc Reactor Core)
   */
  const handleToggleListen = () => {
    if (assistantState === 'speaking' || assistantState === 'thinking' || isAiSpeakingRef.current) {
      // User tapped while Tara is speaking/thinking -> interrupt immediately
      if (speechQueueRef.current) {
        speechQueueRef.current.stop();
        speechQueueRef.current = null;
      }
      stopAllSpeech();
      isAiSpeakingRef.current = false;
      isWakeTriggeredRef.current = false;
      stopMicrophoneImmediately();
      setAssistantState('idle');
      playJarvisSfx('tap', voiceSettings.sfxEnabled);
      return;
    }

    if (assistantState === 'listening') {
      // User tapped while listening -> finish and process immediately
      stopListeningAndSubmit();
    } else {
      // User explicitly tapped while idle -> armed for immediate command!
      isWakeTriggeredRef.current = true;
      startListening();
    }
  };

  /**
   * Execute Action from Device Control Hub
   */
  const handleExecuteDeviceAction = (action: DeviceAction) => {
    playJarvisSfx('tap', voiceSettings.sfxEnabled);
    processUserMessage(action.label);
  };

  /**
   * Test Voice Trigger
   */
  const handleTestVoice = () => {
    const testText =
      'नमस्ते! मैं तारा हूँ, आपकी पर्सनल एआई असिस्टेंट। जार्विस सिस्टम पूर्णतः सक्रिय और डिवाइस ऐप्स नियंत्रण के लिए तैयार है।';
    speakTaraResponse(testText);
  };

  if (isFloatingOverlay) {
    return (
      <div className="relative min-h-screen w-full bg-[#030712]/30 backdrop-blur-[2px] text-cyan-100 flex flex-col justify-between p-3 sm:p-4 font-sans select-none overflow-hidden">
        {/* Subtle high-tech grid hint */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        {/* Minimal Floating Top Banner */}
        <header className="relative z-10 flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-950/85 border border-cyan-500/30 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-['Orbitron',sans-serif] text-xs font-bold text-cyan-200">
              TARA // बैकग्राउंड फ्लोटिंग ओवरले
            </span>
            <span className="text-[9.5px] font-mono text-cyan-300 border border-cyan-400/50 px-1.5 py-0.5 rounded bg-cyan-950/80 shadow-[0_0_8px_rgba(6,182,212,0.3)] hidden sm:inline">
              वेक वर्ड: "हे तारा" (Hey Tara)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleScreenContextLook('हे तारा, स्क्रीन देखो')}
              title='स्क्रीन देखो ("हे तारा, स्क्रीन देखो")'
              className="px-2.5 py-1 rounded text-xs font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/60 hover:border-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
            >
              <span>स्क्रीन देखो</span>
            </button>
            <button
              onClick={() => {
                setIsFloatingOverlay(false);
                playJarvisSfx('tap', voiceSettings.sfxEnabled);
              }}
              className="px-2.5 py-1 rounded text-xs font-mono bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/30 transition-all cursor-pointer font-bold"
            >
              पूर्ण HUD खोलें (Expand)
            </button>
          </div>
        </header>

        {/* Multitasking Context Area */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
          <div className="p-5 sm:p-6 rounded-3xl border border-cyan-500/25 bg-slate-950/60 backdrop-blur-md max-w-md shadow-2xl">
            <div className="w-12 h-12 mx-auto mb-2.5 rounded-full border border-cyan-400/50 flex items-center justify-center bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse">
              <span className="text-cyan-300 font-mono text-xs font-bold">तारा</span>
            </div>
            <h2 className="text-sm font-['Orbitron',sans-serif] font-bold text-cyan-200 tracking-wider">
              मल्टीटास्किंग बैकग्राउंड मोड सक्रिय
            </h2>
            <p className="text-xs text-cyan-300/80 mt-1 font-mono">
              आपकी अन्य ऍप्लिकेशन्स खुली और उपयोग योग्य हैं।
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                🗣️ "हे तारा, स्क्रीन देखो"
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                🗣️ "हे तारा, व्हाट्सएप खोलो"
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                🗣️ "हे तारा, मौसम कैसा है?"
              </span>
            </div>
          </div>
        </main>

        {/* Floating Interactive Tara Widget */}
        <FloatingTaraOverlay
          assistantState={assistantState}
          liveTranscription={liveTranscription}
          lastMessage={messages[messages.length - 1]}
          onToggleListen={handleToggleListen}
          onExpandToFull={() => {
            setIsFloatingOverlay(false);
            playJarvisSfx('tap', voiceSettings.sfxEnabled);
          }}
          onTriggerScreenLook={() => handleScreenContextLook('हे तारा, स्क्रीन देखो')}
          sfxEnabled={voiceSettings.sfxEnabled}
          onToggleSfx={() => handleUpdateSettings({ sfxEnabled: !voiceSettings.sfxEnabled })}
          alwaysOnMic={voiceSettings.alwaysOnMic}
        />

        {/* System Settings & Telemetry Modal */}
        <SystemToolsModal
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            playJarvisSfx('tap', voiceSettings.sfxEnabled);
          }}
          voiceSettings={voiceSettings}
          onUpdateSettings={handleUpdateSettings}
          telemetry={telemetry}
          onTestVoice={handleTestVoice}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#030712] text-cyan-100 overflow-hidden font-sans">
      {/* Background Holographic Hex Grid & Glow FX */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.12)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />
      </div>

      {/* Top Sci-Fi Header with Screen Look and Overlay triggers */}
      <JarvisHUDHeader
        sfxEnabled={voiceSettings.sfxEnabled}
        onToggleSfx={() =>
          handleUpdateSettings({ sfxEnabled: !voiceSettings.sfxEnabled })
        }
        autoListen={voiceSettings.alwaysOnMic}
        onToggleAutoListen={() => {
          const next = !voiceSettings.alwaysOnMic;
          handleUpdateSettings({ alwaysOnMic: next, autoListen: next });
          playJarvisSfx('tap', voiceSettings.sfxEnabled);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          playJarvisSfx('tap', voiceSettings.sfxEnabled);
        }}
        coreTemp={telemetry.coreTemp}
        onToggleFloatingOverlay={() => {
          setIsFloatingOverlay(true);
          playJarvisSfx('tap', voiceSettings.sfxEnabled);
        }}
        onTriggerScreenLook={() => {
          handleScreenContextLook('हे तारा, स्क्रीन देखो');
        }}
        isFloatingOverlay={isFloatingOverlay}
      />

      {/* Main Center Area: Holographic Arc Reactor */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-1 z-10 w-full max-w-lg mx-auto">
        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="w-full mb-2 px-3 py-2 rounded-xl border border-red-500/40 bg-red-950/60 text-red-200 text-xs font-mono flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-100 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Central JARVIS Arc Reactor Component */}
        <JarvisArcReactor
          state={assistantState}
          analyserNode={analyserNode}
          onToggleListen={handleToggleListen}
          isListening={assistantState === 'listening'}
          isContinuous={voiceSettings.alwaysOnMic}
        />

        {/* Live Speaking Caption Pill */}
        {assistantState === 'speaking' && (
          <div className="mt-2 px-4 py-1.5 rounded-full border border-teal-500/40 bg-teal-950/60 text-teal-200 text-xs font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(45,212,191,0.3)] animate-pulse">
            <Volume2 className="w-3.5 h-3.5 text-teal-300" />
            <span>टैप करके रोकें (Tap Core to Interrupt)</span>
          </div>
        )}
      </main>

      {/* Bottom Section: Device Control Hub + Quick Voice Prompts + Transcript Drawer */}
      <footer className="w-full flex flex-col z-20">
        {/* Phone Apps Control Bar */}
        <DeviceControlHub
          onExecuteAction={handleExecuteDeviceAction}
          isTorchActive={isTorchActive}
        />

        {/* Voice Command Chips */}
        <QuickPrompts
          onSelectPrompt={(prompt) => {
            playJarvisSfx('tap', voiceSettings.sfxEnabled);
            processUserMessage(prompt);
          }}
          disabled={assistantState === 'thinking'}
        />

        {/* Holographic Log Drawer */}
        <TranscriptDrawer
          messages={messages}
          liveTranscription={liveTranscription}
          isExpanded={isDrawerExpanded}
          onToggleExpand={() => {
            playJarvisSfx('tap', voiceSettings.sfxEnabled);
            setIsDrawerExpanded(!isDrawerExpanded);
          }}
          onSendMessage={(text) => {
            playJarvisSfx('tap', voiceSettings.sfxEnabled);
            processUserMessage(text);
          }}
          onReplayVoice={(msg) => {
            speakTaraResponse(msg.text, msg.audioBase64);
          }}
          disabled={assistantState === 'thinking'}
        />
      </footer>

      {/* System Settings & Telemetry Modal */}
      <SystemToolsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          playJarvisSfx('tap', voiceSettings.sfxEnabled);
        }}
        voiceSettings={voiceSettings}
        onUpdateSettings={handleUpdateSettings}
        telemetry={telemetry}
        onTestVoice={handleTestVoice}
      />
    </div>
  );
}
