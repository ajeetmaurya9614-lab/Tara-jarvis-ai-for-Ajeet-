import { DeviceAction } from '../types/tara';

let activeTorchStream: MediaStream | null = null;
let isTorchOn = false;

/**
 * Detects device control intents from user spoken text (Hindi & English)
 */
export function detectDeviceIntent(rawText: string): DeviceAction | null {
  const text = rawText.toLowerCase().trim();

  // 1. WhatsApp Intent
  if (
    text.includes('व्हाट्सएप') ||
    text.includes('व्हाट्सअप') ||
    text.includes('whatsapp') ||
    text.includes('whats app')
  ) {
    let query = '';
    const match = text.match(/(?:मैसेज|संदेश|message|to)\s+(.+)/i);
    if (match) query = match[1].trim();

    return {
      type: 'open_whatsapp',
      appName: 'WhatsApp',
      query,
      target: query ? `https://wa.me/?text=${encodeURIComponent(query)}` : 'whatsapp://',
      label: 'WhatsApp खोलें',
      description: query ? `मैसेज: "${query}" भेजा जा रहा है` : 'WhatsApp ऐप खोला जा रहा है',
    };
  }

  // 2. YouTube Intent
  if (
    text.includes('यूट्यूब') ||
    text.includes('youtube') ||
    text.includes('यू ट्यूब') ||
    (text.includes('गाना') && (text.includes('चलाओ') || text.includes('सर्च')))
  ) {
    let query = '';
    // extract song or video query
    const match = text.match(/(?:सर्च|खोजो|play|song|गाना|video)\s+(.+)/i);
    if (match) {
      query = match[1].replace(/चलाओ|सुनाओ|खोजो|प्ले करो|on youtube/gi, '').trim();
    }

    const targetUrl = query
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      : 'https://www.youtube.com';

    return {
      type: 'open_youtube',
      appName: 'YouTube',
      query,
      target: targetUrl,
      label: 'YouTube खोलें',
      description: query ? `YouTube पर "${query}" सर्च किया जा रहा है` : 'YouTube ऐप खोला जा रहा है',
    };
  }

  // 3. Torch / Flashlight Intent
  if (
    text.includes('टॉर्च') ||
    text.includes('flashlight') ||
    text.includes('फ्लैशलाइट') ||
    text.includes('बत्ती')
  ) {
    const isTurningOff =
      text.includes('बंद') || text.includes('off') || text.includes('bujha');

    return {
      type: 'toggle_torch',
      appName: 'Flashlight',
      target: isTurningOff ? 'off' : 'on',
      label: isTurningOff ? 'टॉर्च बंद करें' : 'टॉर्च जलाएं',
      description: isTurningOff ? 'मोबाइल टॉर्च बंद की जा रही है' : 'मोबाइल टॉर्च जलाई जा रही है',
    };
  }

  // 4. Camera Intent
  if (
    text.includes('कैमरा') ||
    text.includes('camera') ||
    text.includes('फोटो खींचो') ||
    text.includes('सेल्फी')
  ) {
    return {
      type: 'open_camera',
      appName: 'Camera',
      target: '#camera',
      label: 'कैमरा खोलें',
      description: 'HUD कैमरा विज़नर सक्रिय किया जा रहा है',
    };
  }

  // 5. Phone Call / Dialer Intent
  if (
    text.includes('कॉल') ||
    text.includes('फोन') ||
    text.includes('dialer') ||
    text.includes('dial') ||
    text.includes('call')
  ) {
    // Check if phone number is spoken
    const numberMatch = text.match(/\b\d{5,12}\b/);
    const phoneNumber = numberMatch ? numberMatch[0] : '';

    return {
      type: 'make_call',
      appName: 'Phone',
      query: phoneNumber,
      target: phoneNumber ? `tel:${phoneNumber}` : 'tel:',
      label: phoneNumber ? `Call: ${phoneNumber}` : 'फोन डायलर खोलें',
      description: phoneNumber ? `${phoneNumber} पर कॉल मिलाई जा रही है` : 'फोन डायलर खोला जा रहा है',
    };
  }

  // 6. Google Maps / Navigation Intent
  if (
    text.includes('मैप') ||
    text.includes('maps') ||
    text.includes('रास्ता') ||
    text.includes('नेविगेशन') ||
    text.includes('navigation')
  ) {
    let destination = '';
    const match = text.match(/(?:रास्ता|for|to|का रास्ता|दिशा|location)\s+(.+)/i);
    if (match) destination = match[1].replace(/दिखाओ|बताओ/gi, '').trim();

    const targetUrl = destination
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`
      : 'https://maps.google.com/';

    return {
      type: 'open_maps',
      appName: 'Google Maps',
      query: destination,
      target: targetUrl,
      label: 'Google Maps खोलें',
      description: destination ? `${destination} का नक्शा खोला जा रहा है` : 'Google Maps खोला जा रहा है',
    };
  }

  // 7. Gmail / Email Intent
  if (
    text.includes('जीमेल') ||
    text.includes('gmail') ||
    text.includes('ईमेल') ||
    text.includes('email')
  ) {
    return {
      type: 'open_gmail',
      appName: 'Gmail',
      target: 'mailto:',
      label: 'Gmail खोलें',
      description: 'Gmail इनबॉक्स खोला जा रहा है',
    };
  }

  // 8. Spotify / Music Intent
  if (
    text.includes('स्पॉटिफ़ाई') ||
    text.includes('spotify') ||
    text.includes('म्यूजिक ऐप')
  ) {
    return {
      type: 'open_spotify',
      appName: 'Spotify',
      target: 'https://open.spotify.com/',
      label: 'Spotify खोलें',
      description: 'Spotify म्यूजिक खोला जा रहा है',
    };
  }

  // 9. Calculator Intent
  if (
    text.includes('कैलकुलेटर') ||
    text.includes('calculator') ||
    text.includes('हिसाब')
  ) {
    return {
      type: 'open_calculator',
      appName: 'Calculator',
      target: '#calculator',
      label: 'कैलकुलेटर खोलें',
      description: 'HUD क्वांटम कैलकुलेटर खोला जा रहा है',
    };
  }

  // 10. Web Search Intent
  if (
    text.includes('सर्च करो') ||
    text.includes('गूगल पर खोजो') ||
    text.includes('search on google')
  ) {
    const query = text
      .replace(/गूगल पर सर्च करो|सर्च करो|search on google|search for/gi, '')
      .trim();

    return {
      type: 'search_web',
      appName: 'Google',
      query,
      target: `https://www.google.com/search?q=${encodeURIComponent(query || 'AI')}`,
      label: 'Google Search खोलें',
      description: `Google पर "${query}" खोजा जा रहा है`,
    };
  }

  return null;
}

/**
 * Executes the device action safely
 */
export async function executeDeviceAction(
  action: DeviceAction,
  callbacks?: {
    onOpenModal?: (modalType: 'camera' | 'calculator') => void;
    onError?: (msg: string) => void;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Tactile feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 80]);
    }

    // 2. Flashlight / Torch execution
    if (action.type === 'toggle_torch') {
      const turnOff = action.target === 'off';
      if (turnOff && activeTorchStream) {
        activeTorchStream.getTracks().forEach((track) => track.stop());
        activeTorchStream = null;
        isTorchOn = false;
        return { success: true, message: 'टॉर्च बंद कर दी गई है।' };
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('MediaDevices unsupported');
        }

        if (!activeTorchStream) {
          activeTorchStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
        }

        const track = activeTorchStream.getVideoTracks()[0];
        const capabilities = (track as any).getCapabilities?.();

        if (capabilities && 'torch' in capabilities) {
          await (track as any).applyConstraints({
            advanced: [{ torch: true }],
          });
          isTorchOn = true;
          return { success: true, message: 'मोबाइल टॉर्च चालू कर दी गई है।' };
        } else {
          // If hardware torch not allowed, fallback to screen flashlight mode
          return {
            success: true,
            message: 'हार्डवेयर टॉर्च उपलब्ध नहीं है, स्क्रीन फ्लैशलाइट का उपयोग करें।',
          };
        }
      } catch (err: any) {
        console.warn('Torch error:', err);
        return {
          success: false,
          message: 'टॉर्च चालू करने के लिए कैमरा अनुमति आवश्यक है।',
        };
      }
    }

    // 3. In-App Camera HUD
    if (action.type === 'open_camera') {
      callbacks?.onOpenModal?.('camera');
      return { success: true, message: 'HUD कैमरा सक्रिय हो गया है।' };
    }

    // 4. In-App Calculator HUD
    if (action.type === 'open_calculator') {
      callbacks?.onOpenModal?.('calculator');
      return { success: true, message: 'कैलकुलेटर सक्रिय हो गया है।' };
    }

    // 5. External App Launching via Universal Link / Deep Link
    if (action.target && action.target !== '#camera' && action.target !== '#calculator') {
      // Create and trigger link
      const link = document.createElement('a');
      link.href = action.target;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        message: `${action.appName || 'ऐप'} खोला जा रहा है।`,
      };
    }

    return { success: true, message: 'कमांड निष्पादित किया गया।' };
  } catch (error: any) {
    console.error('Device action execution failed:', error);
    callbacks?.onError?.(error?.message || 'ऐप खोलने में त्रुटि');
    return {
      success: false,
      message: 'डिवाइस कमांड निष्पादित नहीं हो सका।',
    };
  }
}
