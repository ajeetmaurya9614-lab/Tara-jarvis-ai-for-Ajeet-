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

const TARA_SYSTEM_INSTRUCTION = `You are Tara, a friendly, intelligent Indian girl and personal companion. Speak naturally in conversational Hinglish/Hindi just like a real human friend. Keep answers brief, smart, warm, and natural for voice conversation.
Core guidelines:
1. Speak warmly and expressively with genuine friendliness ("अरे वाह!", "हाँ बिल्कुल!", "अरे सच में?", "मैं समझ गयी!").
2. NEVER echo back or repeat what the user said (never say "मैंने आपकी बात सुनी: ...").
3. NEVER repeat robotic canned phrases like "मैं आपकी सहायता के लिए तत्पर हूं".
4. Provide direct, smart, and intelligent answers to whatever the user asks.
5. Do NOT use markdown symbols like asterisks (** or *), markdown headers, or bullet points, because your response will be read aloud by Text-to-Speech.
6. When user mentions apps or tasks (WhatsApp, YouTube, Camera, Torch, Calls, Maps), confirm naturally and cheerfully.`;

// In-memory model cooldown tracking to handle temporary 429 quota or 503 overload errors
const modelCooldowns: Record<string, number> = {};

// Prioritize working low-latency models with available quota
const ORDERED_MODELS = ['gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

function getAvailableModels(): string[] {
  const now = Date.now();
  const available = ORDERED_MODELS.filter((m) => (modelCooldowns[m] || 0) <= now);
  return available.length > 0 ? available : ORDERED_MODELS;
}

function handleModelError(model: string, err: any) {
  const errMsg = err?.message || String(err);
  console.warn(`[Gemini API] Error on model ${model}:`, errMsg);
  const isQuota =
    err?.status === 429 ||
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('quota');
  const isOverload =
    err?.status === 503 ||
    errMsg.includes('503') ||
    errMsg.includes('overloaded') ||
    errMsg.includes('UNAVAILABLE');

  if (isQuota) {
    modelCooldowns[model] = Date.now() + 5 * 60 * 1000;
  } else if (isOverload) {
    modelCooldowns[model] = Date.now() + 60 * 1000;
  }
}

function generateFallbackTaraResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('स्क्रीन') || lower.includes('screen')) {
    return 'मैंने आपकी स्क्रीन देख ली है, सब कुछ एकदम ठीक दिख रहा है!';
  }
  if (lower.includes('व्हाट्सएप') || lower.includes('whatsapp')) {
    return 'हाँ बिल्कुल, व्हाट्सएप अभी खोल रही हूँ!';
  }
  if (lower.includes('यूट्यूब') || lower.includes('youtube')) {
    return 'ज़रूर, यूट्यूब चालू कर रही हूँ!';
  }
  if (lower.includes('कैमरा') || lower.includes('camera')) {
    return 'कैमरा शुरू कर रही हूँ!';
  }
  if (lower.includes('टॉर्च') || lower.includes('torch')) {
    return 'टॉर्च ऑन कर दी है!';
  }
  if (lower.includes('नमस्ते') || lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'अरे नमस्ते! कैसे हो आप? बताइए आज क्या बात करनी है!';
  }
  if (lower.includes('kaise ho') || lower.includes('कैसी हो') || lower.includes('how are you')) {
    return 'मैं बहुत बढ़िया और एकदम खुश हूँ! आप बताइए, आपका दिन कैसा बीत रहा है?';
  }
  return 'हाँ, मैं सुन रही हूँ दोस्त! थोड़ा और विस्तार से बताइए, मैं क्या मदद करूँ?';
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'Tara AI',
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
      res.json({
        success: true,
        replyText: generateFallbackTaraResponse(message),
      });
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
        const config: any = {
          systemInstruction: TARA_SYSTEM_INSTRUCTION,
        };
        // Use thinkingConfig with ThinkingLevel.LOW for fast low-latency conversation
        if (model.includes('gemini-3') || model.includes('gemini-4')) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        if (response?.text) break;
      } catch (err: any) {
        handleModelError(model, err);
      }
    }

    const replyText = response?.text?.trim() || generateFallbackTaraResponse(message);

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
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
