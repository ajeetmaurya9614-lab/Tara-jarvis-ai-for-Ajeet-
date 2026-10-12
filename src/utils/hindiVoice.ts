/**
 * Hindi Voice Synthesis & Audio Engine for Tara
 * Integrates Gemini Neural Audio + Browser SpeechSynthesis fallback + Audio Analyser
 */

export interface SpeechPlaybackOptions {
  rate?: number;
  pitch?: number;
  skipStop?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

let activeAudioElement: HTMLAudioElement | null = null;
let activeSourceNode: MediaElementAudioSourceNode | null = null;
let sharedAudioContext: AudioContext | null = null;
let sharedAnalyserNode: AnalyserNode | null = null;

export function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

export function getSharedAnalyser(): AnalyserNode {
  const ctx = getSharedAudioContext();
  if (!sharedAnalyserNode) {
    sharedAnalyserNode = ctx.createAnalyser();
    sharedAnalyserNode.fftSize = 256;
    sharedAnalyserNode.smoothingTimeConstant = 0.8;
  }
  return sharedAnalyserNode;
}

/**
 * Stops any ongoing speech (both HTML5 audio and browser speech synthesis)
 */
export function stopAllSpeech(): void {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Checks whether audio or browser speech synthesis is actively outputting sound
 */
export function isSpeakingAudio(): boolean {
  if (activeAudioElement && !activeAudioElement.paused && !activeAudioElement.ended) {
    return true;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Plays base64 WAV/MP3 audio returned by Gemini TTS
 * and links it to the Web Audio AnalyserNode for reactive HUD visualizer
 */
export function playGeminiAudio(
  base64Data: string,
  mimeType = 'audio/wav',
  options: SpeechPlaybackOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    stopAllSpeech();

    try {
      const audioUrl = `data:${mimeType};base64,${base64Data}`;
      const audio = new Audio(audioUrl);
      activeAudioElement = audio;

      if (options.rate) {
        audio.playbackRate = options.rate;
      }

      // Connect to analyser for reactive visualizer
      try {
        const ctx = getSharedAudioContext();
        const analyser = getSharedAnalyser();
        // MediaElementSource requires same-origin or data URL
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (analyserErr) {
        console.debug('Analyser connect warning (safe fallback):', analyserErr);
      }

      audio.onplay = () => {
        options.onStart?.();
      };

      audio.onended = () => {
        activeAudioElement = null;
        options.onEnd?.();
        resolve();
      };

      audio.onerror = (e) => {
        activeAudioElement = null;
        options.onError?.(e);
        reject(e);
      };

      audio.play().catch((playErr) => {
        console.warn('Audio play prevented by browser policy, user must interact:', playErr);
        activeAudioElement = null;
        options.onError?.(playErr);
        reject(playErr);
      });
    } catch (err) {
      options.onError?.(err);
      reject(err);
    }
  });
}

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Speaks text using the browser's Web Speech API with Hindi female voice
 */
export function speakWithBrowserHindi(
  text: string,
  options: SpeechPlaybackOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    if (!options.skipStop) {
      stopAllSpeech();
    }

    // Unpause speech synthesizer if browser throttled it
    if (window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
      } catch (_) {}
    }

    // Clean markdown symbols for natural reading
    const cleanText = text.replace(/[*#_`>]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) {
      resolve();
      return;
    }

    let hasResolved = false;
    const safeResolve = () => {
      if (!hasResolved) {
        hasResolved = true;
        resolve();
      }
    };

    // Safety timeout in case browser drops onend event
    const estimatedDurationMs = Math.max(1800, (cleanText.length * 85));
    const safetyTimeout = setTimeout(safeResolve, estimatedDurationMs + 1200);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate || 1.05;
    utterance.pitch = options.pitch || 1.1; // Slightly higher pitch for warm female tone

    // Select the best Hindi or Indian English female voice
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(
      (v) =>
        (v.lang.startsWith('hi') || v.lang.includes('IN')) &&
        (v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('lekha') ||
          v.name.toLowerCase().includes('swara') ||
          v.name.toLowerCase().includes('google हिन्दी') ||
          v.name.toLowerCase().includes('hindi'))
    ) || voices.find((v) => v.lang.startsWith('hi'))
      || voices.find((v) => v.lang.includes('en-IN') && v.name.toLowerCase().includes('female'))
      || voices.find((v) => v.lang.startsWith('en'));

    if (hindiVoice) {
      utterance.voice = hindiVoice;
    } else {
      utterance.lang = 'hi-IN';
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      clearTimeout(safetyTimeout);
      options.onEnd?.();
      safeResolve();
    };

    utterance.onerror = (e) => {
      clearTimeout(safetyTimeout);
      console.debug('Browser TTS notice:', e);
      options.onError?.(e);
      safeResolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Streaming Speech Queue: plays sentences immediately as they stream in from Gemini,
 * enabling sub-second response times without waiting for full generation.
 */
export class StreamingSpeechQueue {
  private queue: string[] = [];
  private isPlaying = false;
  private isStreamDone = false;
  private options: SpeechPlaybackOptions;
  private onAllDone?: () => void;
  private isCancelled = false;

  constructor(options: SpeechPlaybackOptions = {}, onAllDone?: () => void) {
    this.options = options;
    this.onAllDone = onAllDone;
  }

  enqueue(sentence: string) {
    if (this.isCancelled) return;
    const clean = sentence.replace(/[*#_`>]/g, ' ').trim();
    if (!clean) return;
    this.queue.push(clean);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  setStreamFinished() {
    this.isStreamDone = true;
    if (!this.isPlaying && this.queue.length === 0) {
      this.onAllDone?.();
    }
  }

  private async playNext() {
    if (this.isCancelled) return;
    if (this.queue.length === 0) {
      this.isPlaying = false;
      if (this.isStreamDone) {
        this.onAllDone?.();
      }
      return;
    }

    this.isPlaying = true;
    const nextSentence = this.queue.shift()!;
    try {
      await speakWithBrowserHindi(nextSentence, {
        rate: this.options.rate,
        pitch: this.options.pitch,
        skipStop: true,
        onStart: () => {
          this.options.onStart?.();
        },
      });
    } catch (e) {
      console.warn('Streaming queue playback warning:', e);
    }

    if (!this.isCancelled) {
      this.playNext();
    }
  }

  stop() {
    this.isCancelled = true;
    this.queue = [];
    this.isPlaying = false;
    stopAllSpeech();
  }
}


/**
 * Captures user microphone as audio Blob & base64
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<MediaStream> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    return this.stream;
  }

  stop(): Promise<{ blob: Blob; base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          this.cleanup();
          resolve({ blob: audioBlob, base64, mimeType });
        };

        reader.onerror = (err) => {
          this.cleanup();
          reject(err);
        };

        reader.readAsDataURL(audioBlob);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
