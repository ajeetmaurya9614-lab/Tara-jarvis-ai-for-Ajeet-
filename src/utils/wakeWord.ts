/**
 * Strict Wake Word detection for "हे तारा" (Hey Tara).
 * Enforces that Tara triggers ONLY on "हे तारा" / "Hey Tara",
 * strictly ignoring other names or generic greetings to avoid accidental triggers.
 */

// Strict Wake Word regex: matches "हे तारा" (Hindi) or "hey tara" / "hay tara" / "he tara" (phonetic / English transcription)
export const STRICT_WAKE_WORD_REGEX = /(?:हे\s*तारा|hey\s+tara|hay\s+tara|he\s+tara)/i;

/**
 * Checks whether user speech strictly contains the wake word "हे तारा" or "Hey Tara"
 */
export function containsStrictWakeWord(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim();

  // 1. Direct regex match
  if (STRICT_WAKE_WORD_REGEX.test(clean)) {
    return true;
  }

  // 2. Hindi phrase variation check (e.g., 'हे तारा', 'हेतारा')
  if (clean.includes('हे तारा') || clean.includes('हेतारा')) {
    return true;
  }

  // 3. English phrase variations
  if (clean.includes('hey tara') || clean.includes('hay tara') || clean.includes('he tara')) {
    return true;
  }

  return false;
}

/**
 * Extracts the user command that immediately follows "हे तारा" / "Hey Tara".
 * Example:
 *  "हे तारा, स्क्रीन देखो" -> { isWakeWord: true, command: "स्क्रीन देखो" }
 *  "हे तारा आज का मौसम क्या है" -> { isWakeWord: true, command: "आज का मौसम क्या है" }
 *  "हे तारा" -> { isWakeWord: true, command: "" }
 *  "नमस्ते क्या हाल है" -> { isWakeWord: false, command: "" }
 */
export function parseWakeWordAndCommand(text: string): {
  isWakeWord: boolean;
  command: string;
} {
  if (!text || typeof text !== 'string') {
    return { isWakeWord: false, command: '' };
  }

  const clean = text.trim();
  const match = clean.match(/(?:हे\s*तारा|hey\s+tara|hay\s+tara|he\s+tara)[,:\s]*(.*)/i);

  if (!match) {
    // Check if it's "हेतारा"
    const hetaraMatch = clean.match(/(?:हेतारा)[,:\s]*(.*)/i);
    if (hetaraMatch) {
      return {
        isWakeWord: true,
        command: (hetaraMatch[1] || '').trim(),
      };
    }
    return { isWakeWord: false, command: '' };
  }

  return {
    isWakeWord: true,
    command: (match[1] || '').trim(),
  };
}

/**
 * Checks if the spoken voice command is requesting screen inspection/analysis
 * e.g., "स्क्रीन देखो", "स्क्रीन पर क्या है", "look at my screen", "check screen"
 */
export function isScreenContextCommand(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase();

  return (
    clean.includes('स्क्रीन देखो') ||
    clean.includes('स्क्रीन चेक करो') ||
    clean.includes('स्क्रीन पर क्या है') ||
    clean.includes('स्क्रीन समझो') ||
    clean.includes('डिस्प्ले देखो') ||
    clean.includes('मेरी स्क्रीन देखो') ||
    clean.includes('look at my screen') ||
    clean.includes('look at screen') ||
    clean.includes('check my screen') ||
    clean.includes('see my screen') ||
    clean.includes('what is on my screen') ||
    clean.includes('what on my screen')
  );
}
