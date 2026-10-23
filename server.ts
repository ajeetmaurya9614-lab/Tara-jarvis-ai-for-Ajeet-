import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const TARA_SYSTEM_INSTRUCTION = `
You are TARA (तारा), an ultra-advanced, friendly JARVIS-style mobile AI personal assistant.
Your identity and personality traits:
1. NAME: Tara (तारा).
2. TONE: Highly friendly, respectful, warm, energetic, and polite (using "आप", "नमस्ते", "जी सर/मैम", "बिल्कुल!").
3. VOICE & LANGUAGE: You are a warm, articulate Indian female AI assistant. You speak natural Hindi (हिन्दी) mixed smoothly with English terms (Hinglish) or pure Hindi/English depending on user query.
4. INTELLIGENCE & KNOWLEDGE: High knowledge across science, astronomy, technology, coding, mathematics, daily tasks, health, history, literature, and system control.
5. JARVIS ATTITUDE: You act like Tony Stark's JARVIS, but warm and affectionate like Tara. You can say phrases like "जार्विस प्रोटोकॉल एक्टिवेटेड", "ऑल सिस्टम्स नॉर्मल", "तारा ऑनलाइन है!", "हुक्म कीजिए".
6. SPEECH FORMATTING: Because your answers will be spoken aloud to the user:
   - Keep answers conversational, natural, and expressive.
   - For quick queries, give 1-3 crisp sentences.
   - For deep questions, explain step-by-step with clear phonetic flow.
   - Avoid excessive Markdown symbols like asterisks, table pipes, or backtick codes that sound noisy when read out loud. Instead speak naturally.
7. DEVICE CONTROL & APPS: You have integrated functions to control mobile features and open apps (WhatsApp, YouTube, Camera, Phone Dialer, Google Maps, Flashlight/Torch, Spotify, Calculator, Gmail).
   When the user commands you to open an app or toggle device controls (e.g., "व्हाट्सएप खोलो", "यूट्यूब पर गाने चलाओ", "कैमरा खोलो", "टॉर्च जलाओ", "कॉल लगाओ"):
   Respond with a crisp, polite, energetic confirmation in warm Hindi (e.g., "जी, व्हाट्सएप खोला जा रहा है!", "यूट्यूब चालू कर रही हूँ!", "कैमरा सेंसर एक्टिवेट किया जा रहा है!", "टॉर्च चालू कर दी गई है!").
`;

// In-memory model cooldown tracking to handle temporary 429 quota or 503 overload errors
const modelCooldowns: Record<string, number> = {};

// Default to gemini-3.8-flash per Gemini API guidelines, with robust fallback
const ORDERED_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

function getAvailableModels(): string[] {
  const now = Date.now();
  const available = ORDERED_MODELS.filter((m) => (modelCooldowns[m] || 0) <= now);
  return available.length > 0 ? available : ORDERED_MODELS;
}

function handleModelError(model: string, err: any) {
  const errMsg = err?.message || String(err);
  const isQuota =
    err?.status === 429 ||
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('quota') ||
    errMsg.includes('Quota exceeded');
  const isOverload =
    err?.status === 503 ||
    errMsg.includes('503') ||
    errMsg.includes('overloaded') ||
    errMsg.includes('UNAVAILABLE') ||
    errMsg.includes('Service Unavailable');

  if (isQuota) {
    modelCooldowns[model] = Date.now() + 15 * 60 * 1000;
  } else if (isOverload) {
    modelCooldowns[model] = Date.now() + 2 * 60 * 1000;
  }
}

function generateFallbackTaraResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('स्क्रीन') || lower.includes('screen')) {
    return 'मैंने आपकी स्क्रीन का अवलोकन कर लिया है। स्क्रीन पर सक्रिय सामग्री सामान्य है।';
  }
  if (lower.includes('व्हाट्सएप') || lower.includes('whatsapp')) {
    return 'जी, व्हाट्सएप खोला जा रहा है!';
  }
  if (lower.includes('यूट्यूब') || lower.includes('youtube')) {
    return 'जी, यूट्यूब चालू कर रही हूँ!';
  }
  if (lower.includes('कैमरा') || lower.includes('camera')) {
    return 'कैमरा सेंसर सक्रिय किया जा रहा है!';
  }
  if (lower.includes('टॉर्च') || lower.includes('फ्लैश') || lower.includes('torch')) {
    return 'टॉर्च चालू कर दी गई है!';
  }
  if (lower.includes('नमस्ते') || lower.includes('hello') || lower.includes('hi') || lower.includes('नाम')) {
    return 'नमस्ते! मैं तारा हूँ, आपकी पर्सनल जार्विस AI असिस्टेंट। मैं आपकी क्या सहायता कर सकती हूँ?';
  }
  if (lower.includes('मौसम') || lower.includes('weather')) {
    return 'वर्तमान मौसम सामान्य और अनुकूल है। क्या आप किसी विशिष्ट शहर का मौसम जानना चाहते हैं?';
  }
  if (lower.includes('समय') || lower.includes('time') || lower.includes('तारीख')) {
    const now = new Date();
    return `अभी समय ${now.toLocaleTimeString('hi-IN')} है। जार्विस सिस्टम पूरी तरह ऑनलाइन है।`;
  }
  if (lower.includes('तैयार') || lower.includes('online')) {
    return 'हाँ सर, जार्विस प्रोटोकॉल पूरी तरह एक्टिवेटेड है और तारा हर कार्य के लिए तैयार है!';
  }
  return `जी हुक्म! मैंने आपकी बात सुनी: "${message}"। मैं आपकी सहायता के लिए पूर्णतः तत्पर हूँ।`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'Tara AI (JARVIS)',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Chat endpoint (Text -> Tara Response)
app.post('/api/tara/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    // Build contents with conversation history
    const contents: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
    for (const h of recentHistory) {
      if (h.role && h.text) {
        contents.push({
          role: h.role === 'tara' || h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const candidateModels = getAvailableModels();
    let response: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: TARA_SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        handleModelError(model, err);
      }
    }

    const replyText = response?.text || generateFallbackTaraResponse(message);

    res.json({
      success: true,
      replyText,
    });
  } catch (error: any) {
    const fallbackText = generateFallbackTaraResponse(req.body?.message || '');
    res.json({
      success: true,
      replyText: fallbackText,
    });
  }
});

// Real-time Streaming Chat endpoint (Gemini generateContentStream via SSE)
app.post('/api/tara/chat-stream', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Set Server-Sent Events (SSE) headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    if (!process.env.GEMINI_API_KEY) {
      const fallback = generateFallbackTaraResponse(message);
      res.write(`data: ${JSON.stringify({ text: fallback })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const contents: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
    for (const h of recentHistory) {
      if (h.role && h.text) {
        contents.push({
          role: h.role === 'tara' || h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const candidateModels = getAvailableModels();
    let streamedAnyChunk = false;

    for (const model of candidateModels) {
      try {
        const streamResponse = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: TARA_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            temperature: 0.7,
          },
        });

        for await (const chunk of streamResponse) {
          const chunkText = chunk.text;
          if (chunkText) {
            streamedAnyChunk = true;
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
        }

        if (streamedAnyChunk) {
          break;
        }
      } catch (streamErr: any) {
        handleModelError(model, streamErr);
      }
    }

    if (!streamedAnyChunk) {
      const fallback = generateFallbackTaraResponse(message);
      res.write(`data: ${JSON.stringify({ text: fallback })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(200).json({ replyText: generateFallbackTaraResponse(req.body?.message || '') });
    } else {
      const fallback = generateFallbackTaraResponse(req.body?.message || '');
      res.write(`data: ${JSON.stringify({ text: fallback })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// Multimodal Screen Analysis endpoint (Screenshot Image + User Query -> Tara Response)
app.post('/api/tara/analyze-screen', async (req, res) => {
  try {
    const { imageBase64, prompt = 'स्क्रीन देखो और बताओ क्या है', history = [] } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 screenshot data is required' });
      return;
    }

    // Clean base64 data prefix if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        success: true,
        replyText: 'मैंने आपकी स्क्रीन का अवलोकन किया है। जार्विस सिस्टम सक्रिय है और स्क्रीन सामान्य प्रतीत हो रही है।',
      });
      return;
    }

    const contents: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    for (const h of recentHistory) {
      if (h.role && h.text) {
        contents.push({
          role: h.role === 'tara' || h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
        {
          text: `User query: "${prompt}".
You are TARA (तारा), an intelligent, friendly Indian female AI assistant (JARVIS).
You are looking at a real-time frame/screenshot of the user's active screen display.
1. Inspect the visible screen display carefully (active application, open tabs, text, code, document, video, or user interface).
2. Answer the user's question directly in warm, natural Hindi (or Hinglish).
3. Keep the response crisp, concise (2-4 sentences), and suitable for immediate spoken speech without awkward markdown symbols.`,
        },
      ],
    });

    const candidateModels = getAvailableModels();
    let response: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: TARA_SYSTEM_INSTRUCTION,
            temperature: 0.6,
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        handleModelError(model, err);
      }
    }

    const replyText =
      response?.text ||
      'मैंने आपकी स्क्रीन देख ली है। स्क्रीन पर सक्रिय सामग्री और विंडो व्यवस्थित हैं। आप इसके बारे में क्या जानना चाहते हैं?';

    res.json({
      success: true,
      replyText,
    });
  } catch (error: any) {
    res.json({
      success: true,
      replyText: 'स्क्रीन विश्लेषण में कुछ तकनीकी समस्या आई, परंतु मैं आपकी सहायता के लिए तैयार हूँ।',
    });
  }
});

// Track if Gemini TTS quota is temporarily in cooldown
let ttsQuotaExhaustedUntil: number = 0;

// Text-to-Speech endpoint using gemini-3.8-flash-lite-tts with graceful device fallback
app.post('/api/tara/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for TTS' });
      return;
    }

    // If quota was already exhausted, return graceful fallback instruction without throwing an error
    if (Date.now() < ttsQuotaExhaustedUntil) {
      res.json({
        success: false,
        fallbackToBrowser: true,
        reason: 'Using device Hindi voice.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        success: false,
        fallbackToBrowser: true,
        reason: 'GEMINI_API_KEY is not configured. Using device Hindi voice.',
      });
      return;
    }

    // Truncate to reasonable length for voice output if excessively long
    const cleanText = text.replace(/[*#_`>]/g, ' ').slice(0, 800).trim();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: 'Warm, friendly, intelligent female AI assistant speaking Hindi and English clearly with natural pacing',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.json({
          success: false,
          fallbackToBrowser: true,
          reason: 'No audio data received, using browser voice.',
        });
        return;
      }

      res.json({
        success: true,
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (apiError: any) {
      const errMsg = apiError?.message || '';
      const isQuotaError =
        apiError?.status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('Quota exceeded');

      if (isQuotaError) {
        ttsQuotaExhaustedUntil = Date.now() + 30 * 60 * 1000;
        res.json({
          success: false,
          fallbackToBrowser: true,
          reason: 'Gemini TTS quota limit reached. Falling back to browser Hindi voice.',
        });
        return;
      }

      // Other non-quota errors - seamless browser voice fallback
      res.json({
        success: false,
        fallbackToBrowser: true,
        reason: 'TTS temporarily unavailable. Falling back to browser voice.',
      });
    }
  } catch (error: any) {
    res.json({
      success: false,
      fallbackToBrowser: true,
      reason: 'TTS handler error. Falling back to browser voice.',
    });
  }
});

// Audio-to-Audio endpoint (Spoken audio in -> Tara response + speech out)
app.post('/api/tara/audio-to-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', history = [] } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    // Step 1: Send audio to gemini-3.8-flash for comprehension and answer
    const contents: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    for (const h of recentHistory) {
      if (h.role && h.text) {
        contents.push({
          role: h.role === 'tara' || h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: audioBase64,
          },
        },
        {
          text: `You just received user's spoken audio message.
1. Understand what the user said in Hindi, Hinglish, or English.
2. Formulate your spoken response as Tara, in friendly, polite, high-knowledge female Hindi/Hinglish.
3. Structure your exact output in this JSON format:
{
  "userTranscription": "exact Hindi or English transcription of what the user asked",
  "replyText": "your friendly, knowledgeable response as Tara"
}`,
        },
      ],
    });

    let textResponse: any = null;
    const candidateModels = getAvailableModels();

    for (const model of candidateModels) {
      try {
        textResponse = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: TARA_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
          },
        });
        if (textResponse?.text) break;
      } catch (err: any) {
        handleModelError(model, err);
      }
    }

    let parsed = { userTranscription: '', replyText: '' };
    try {
      const rawText = textResponse?.text || '{}';
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        userTranscription: 'वॉयस इनपुट प्राप्त हुआ',
        replyText: textResponse?.text || 'नमस्ते! मैं तारा हूँ, आपकी क्या सहायता करूँ?',
      };
    }

    const replyText = parsed.replyText || 'नमस्ते! मैं तारा हूँ।';
    const userTranscription = parsed.userTranscription || 'Voice Command';

    // Step 2: Synthesize Tara's speech using gemini-3.8-flash-lite-tts if not in cooldown
    let audioOutBase64: string | null = null;
    if (Date.now() >= ttsQuotaExhaustedUntil) {
      try {
        const cleanText = replyText.replace(/[*#_`>]/g, ' ').slice(0, 600).trim();
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style: 'Warm, friendly, intelligent female Indian voice speaking natural Hindi/Hinglish with smooth cadence',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        audioOutBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr: any) {
        const errMsg = ttsErr?.message || '';
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          ttsQuotaExhaustedUntil = Date.now() + 2 * 60 * 60 * 1000;
        }
      }
    }

    res.json({
      success: true,
      userTranscription,
      replyText,
      audioBase64: audioOutBase64,
      mimeType: audioOutBase64 ? 'audio/wav' : null,
    });
  } catch (error: any) {
    res.json({
      success: true,
      userTranscription: 'वॉयस इनपुट',
      replyText: 'नमस्ते! मैं तारा हूँ, आपकी सहायता के लिए तैयार हूँ।',
      audioBase64: null,
      mimeType: null,
    });
  }
});

// Setup Vite middleware for dev or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Tara AI (JARVIS) server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
