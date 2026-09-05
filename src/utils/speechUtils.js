/**
 * Utility functions for Speech Synthesis (Text-To-Speech) and Speech Recognition.
 */

/**
 * Clean markdown symbols, code blocks, URLs, and noisy tokens so the text
 * is read out naturally and smoothly by Web Speech API.
 */
export function cleanMarkdownForSpeech(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Remove all fenced code blocks (```lang ... ``` or ~~~lang ... ~~~)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");
  cleaned = cleaned.replace(/~~~[\s\S]*?~~~/g, " ");

  // 2. Remove markdown tables completely (headers, separator rows | --- | --- |, and data rows | a | b |)
  cleaned = cleaned.replace(/^\s*\|?\s*[-:]+[-| :]*\s*\|?\s*$/gm, " ");
  cleaned = cleaned.replace(/^\s*\|.*?\|\s*$/gm, " ");

  // 3. Remove all emojis, pictographs, symbols, and dingbats
  cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, "");
  cleaned = cleaned.replace(
    /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
    ""
  );

  // 4. Handle inline code `...`
  // If it looks like code syntax with programming symbols, omit it; otherwise keep plain identifier
  cleaned = cleaned.replace(/`([^`]+)`/g, (match, inner) => {
    if (/[=;{}()<>[\]|&+\-/*%$#@\\]/.test(inner)) {
      return " ";
    }
    return inner;
  });

  // 5. Remove markdown links [title](url) -> title
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 6. Remove standalone URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");

  // 7. Remove headers ###, ##, #
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // 8. Remove bold/italics markers **text**, *text*, __text__, _text_
  cleaned = cleaned.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");

  // 9. Remove blockquotes >
  cleaned = cleaned.replace(/^\s*>\s*/gm, "");

  // 10. Remove bullet lists -, *, + and numbered lists 1.
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

  // 11. Remove horizontal rules ---, ***, ___
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");

  // 12. Remove remaining dangling pipe characters | (from any unformatted tables)
  cleaned = cleaned.replace(/\|/g, " ");

  // 13. Remove HTML tags <tag>
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // 14. Remove common programming symbols or noisy arrows (e.g. ->, =>, -->)
  cleaned = cleaned.replace(/[-=]>/g, " ");

  // 15. Normalize multiple newlines and spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Global reference to currently active utterance to prevent garbage collection bugs
 * in Chromium browsers.
 */
let activeUtterance = null;

/**
 * Stop any ongoing SpeechSynthesis playback immediately.
 */
export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.warn("speechSynthesis cancel error:", e);
    }
  }
  activeUtterance = null;
}

/**
 * Check if the browser is currently speaking.
 */
export function isSpeechSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Speak given text aloud using the browser's Web Speech API.
 * 
 * @param {string} rawText - The text to speak (can include markdown)
 * @param {Object} options
 * @param {Function} options.onStart - Callback fired when speech starts
 * @param {Function} options.onEnd - Callback fired when speech completes
 * @param {Function} options.onError - Callback fired on speech error
 * @param {number} [options.rate=1.0] - Speech rate (0.1 to 10)
 * @param {Function} [options.onWordBoundary] - Callback fired with current 3-6 word spoken chunk
 * @param {number} [options.pitch=1.0] - Speech pitch (0 to 2)
 */
export function speakText(
  rawText,
  { onStart, onEnd, onError, onWordBoundary, rate = 1.0, pitch = 1.0 } = {}
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis is not supported in this browser.");
    if (onError) onError(new Error("SpeechSynthesis not supported"));
    return null;
  }

  // Always cancel any currently active speech first
  stopSpeech();

  const textToSpeak = cleanMarkdownForSpeech(rawText);
  if (!textToSpeak) {
    if (onEnd) onEnd();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = pitch;

  // Tokenize words with their character offsets in textToSpeak
  const wordTokens = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(textToSpeak)) !== null) {
    wordTokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Group tokens into stable subtitle chunks (3 to 6 words)
  // that stay on-screen until all words in the chunk are completed.
  const chunks = [];
  let currentSlice = [];

  for (let i = 0; i < wordTokens.length; i++) {
    currentSlice.push(wordTokens[i]);
    const word = wordTokens[i].word;
    const hasPunctuation = /[.,!?;:]$/.test(word);

    // Break chunk when reaching 5 words, or if at least 3 words and hit punctuation
    if (currentSlice.length >= 5 || (hasPunctuation && currentSlice.length >= 3)) {
      chunks.push({
        text: currentSlice.map((t) => t.word).join(" "),
        startIndex: currentSlice[0].start,
        endIndex: currentSlice[currentSlice.length - 1].end,
      });
      currentSlice = [];
    }
  }

  if (currentSlice.length > 0) {
    chunks.push({
      text: currentSlice.map((t) => t.word).join(" "),
      startIndex: currentSlice[0].start,
      endIndex: currentSlice[currentSlice.length - 1].end,
    });
  }

  let activeChunkIndex = 0;

  // Prefer a natural-sounding English voice if available
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Daniel"))
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
  }

  utterance.onstart = () => {
    if (onWordBoundary && chunks.length > 0) {
      activeChunkIndex = 0;
      onWordBoundary(chunks[0].text);
    }
    if (onStart) onStart();
  };

  utterance.onboundary = (event) => {
    if (event.name === "word" && chunks.length > 0) {
      const charIndex = typeof event.charIndex === "number" ? event.charIndex : 0;
      // Find the chunk index that covers this charIndex
      const foundIdx = chunks.findIndex(
        (c, idx) =>
          charIndex >= c.startIndex &&
          (idx === chunks.length - 1 || charIndex < chunks[idx + 1].startIndex)
      );

      if (foundIdx !== -1 && foundIdx !== activeChunkIndex) {
        activeChunkIndex = foundIdx;
        if (onWordBoundary) {
          onWordBoundary(chunks[foundIdx].text);
        }
      }
    }
  };

  utterance.onend = () => {
    activeUtterance = null;
    if (onWordBoundary) onWordBoundary("");
    if (onEnd) onEnd();
  };

  utterance.onerror = (event) => {
    activeUtterance = null;
    if (onWordBoundary) onWordBoundary("");
    // Don't treat user cancellations or interruptions as uncaught errors
    if (event.error !== "canceled" && event.error !== "interrupted") {
      console.warn("SpeechSynthesis error:", event.error);
      if (onError) onError(event);
    }
  };

  activeUtterance = utterance;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("speechSynthesis speak failed:", e);
    activeUtterance = null;
    if (onError) onError(e);
  }

  return utterance;
}
