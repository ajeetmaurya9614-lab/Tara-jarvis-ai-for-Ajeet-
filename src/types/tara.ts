export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type DeviceActionType =
  | 'open_app'
  | 'toggle_torch'
  | 'open_camera'
  | 'make_call'
  | 'open_maps'
  | 'open_whatsapp'
  | 'open_youtube'
  | 'open_gmail'
  | 'open_spotify'
  | 'open_calculator'
  | 'search_web'
  | 'vibrate'
  | 'analyze_screen';

export interface DeviceAction {
  type: DeviceActionType;
  appName?: string;
  target?: string;
  query?: string;
  label: string;
  description: string;
  executedAt?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tara';
  text: string;
  timestamp: number;
  audioBase64?: string;
  mimeType?: string;
  action?: DeviceAction;
  screenshotBase64?: string;
}

export interface VoiceSettings {
  engine: 'gemini' | 'browser';
  geminiVoice: 'Kore' | 'Aoede' | 'Zephyr';
  speechRate: number; // 0.8 to 1.3
  speechPitch: number; // 0.8 to 1.3
  sfxEnabled: boolean;
  autoListen: boolean; // Continuous conversation loop
  alwaysOnMic: boolean; // Don't stop listening between phrases
  strictWakeWord: boolean; // Only wake on "हे तारा" / "Hey Tara"
  silenceThreshold: number; // Milliseconds of silence before auto-submission (e.g. 750ms)
  fastResponse: boolean; // Low-latency fast response pipeline
  languageMode: 'hi-IN' | 'en-IN' | 'auto';
}

export interface SystemTelemetry {
  coreTemp: number;
  powerOutput: number;
  memoryUsage: number;
  networkLatency: number;
  protocol: string;
  uptimeSeconds: number;
  micDecibels?: number;
  isContinuousActive?: boolean;
}

export interface QuickCommand {
  label: string;
  prompt: string;
  category: 'intro' | 'science' | 'code' | 'system' | 'poetry' | 'utility' | 'device';
  icon: string;
}
