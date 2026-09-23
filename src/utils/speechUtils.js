/**
 * Utility functions for Speech Synthesis (Text-To-Speech) with natural human cadence,
 * sentence-by-sentence pacing, natural breath pauses, prioritized neural voice selection,
 * and conversational natural phonetics (US / UK / IN English clarity).
 */

// Global state for active speech queue & pause handling
let speechQueue = [];
let activeUtterance = null;
let pauseTimeoutId = null;
let activeChunkIntervalId = null;
let isSpeakingActive = false;
let activeSessionVoice = null;

/**
 * Break a sentence into readable phrase groups (4 to 8 words) with character offsets.
 * Preserves natural sentence flow and avoids excessive fragmentation.
 */
function buildSentenceChunks(sentenceText) {
  if (!sentenceText) return [];

  const words = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(sentenceText)) !== null) {
    words.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (words.length <= 8) {
    return [{ text: sentenceText, startIndex: 0, endIndex: sentenceText.length }];
  }

  const chunks = [];
  let currentSlice = [];

  for (let i = 0; i < words.length; i++) {
    currentSlice.push(words[i]);
    const word = words[i].word;
    const hasPunctuation = /[.,!?;:]$/.test(word);

    // Break chunk when reaching 6-8 words or on punctuation after 4+ words
    if (currentSlice.length >= 8 || (hasPunctuation && currentSlice.length >= 4) || i === words.length - 1) {
      chunks.push({
        text: currentSlice.map((w) => w.word).join(" "),
        startIndex: currentSlice[0].start,
        endIndex: currentSlice[currentSlice.length - 1].end,
      });
      currentSlice = [];
    }
  }

  return chunks.length > 0
    ? chunks
    : [{ text: sentenceText, startIndex: 0, endIndex: sentenceText.length }];
}

/**
 * Clean markdown symbols, code blocks, URLs, and noisy tokens so the text
 * is read out naturally and smoothly, with punctuation that guides natural pauses.
 */
export function cleanMarkdownForSpeech(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Remove fenced code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " [code snippet omitted] ");
  cleaned = cleaned.replace(/~~~[\s\S]*?~~~/g, " [code snippet omitted] ");

  // 2. Remove markdown tables completely
  cleaned = cleaned.replace(/^\s*\|?\s*[-:]+[-| :]*\s*\|?\s*$/gm, " ");
  cleaned = cleaned.replace(/^\s*\|.*?\|\s*$/gm, " ");

  // 3. Remove emojis, pictographs, dingbats
  cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, "");
  cleaned = cleaned.replace(
    /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
    ""
  );

  // 4. Handle inline code `...`
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

  // 7. Format headers ### Title -> Title.
  cleaned = cleaned.replace(/^#{1,6}\s*(.+)$/gm, (match, heading) => {
    const trimmed = heading.trim();
    if (/[.!?:]$/.test(trimmed)) return `${trimmed}\n\n`;
    return `${trimmed}.\n\n`;
  });

  // 8. Remove bold/italics markers **text**, *text*, __text__, _text_
  cleaned = cleaned.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");

  // 9. Format blockquotes > Quote -> Quote.
  cleaned = cleaned.replace(/^\s*>\s*(.+)$/gm, (match, quote) => {
    const trimmed = quote.trim();
    return /[.!?]$/.test(trimmed) ? `${trimmed}\n` : `${trimmed}.\n`;
  });

  // 10. Format bullet points and numbered lists
  cleaned = cleaned.replace(/^\s*[-*+]\s+(.+)$/gm, (match, item) => {
    const trimmed = item.trim();
    return /[.!?]$/.test(trimmed) ? `${trimmed}\n` : `${trimmed}.\n`;
  });
  cleaned = cleaned.replace(/^\s*\d+\.\s+(.+)$/gm, (match, item) => {
    const trimmed = item.trim();
    return /[.!?]$/.test(trimmed) ? `${trimmed}\n` : `${trimmed}.\n`;
  });

  // 11. Remove horizontal rules ---, ***, ___
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "\n");

  // 12. Remove dangling pipe characters
  cleaned = cleaned.replace(/\|/g, " ");

  // 13. Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // 14. Clean arrows
  cleaned = cleaned.replace(/[-=]>/g, " ");

  // 15. Normalize extra spaces per line
  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, idx, arr) => line !== "" || (idx > 0 && arr[idx - 1] !== ""))
    .join("\n")
    .trim();

  return cleaned;
}

/**
 * Preprocesses English text for natural audio rendering without modifying UI text.
 * Prevents spelling mode and ensures entire words are pronounced clearly.
 */
export function preprocessEnglishForSpeech(text) {
  if (!text || typeof text !== "string") return text;
  let t = text;

  // 1. Spoken expansions for technical frameworks & abbreviations
  t = t
    .replace(/\bAI\b/g, "Artificial Intelligence")
    .replace(/\bML\b/g, "Machine Learning")
    .replace(/\bUI\b/g, "User Interface")
    .replace(/\bUX\b/g, "User Experience")
    .replace(/\bAPI\b/g, "A P I")
    .replace(/\bNode\.js\b/gi, "Node js")
    .replace(/\bReact\.js\b/gi, "React js")
    .replace(/\bVue\.js\b/gi, "Vue js")
    .replace(/\bNext\.js\b/gi, "Next js")
    .replace(/\bExpress\.js\b/gi, "Express js")
    .replace(/\bJavaScript\b/gi, "Javascript")
    .replace(/\bTypeScript\b/gi, "Typescript")
    .replace(/\bOpenAI\b/gi, "Open AI")
    .replace(/\bChatGPT\b/gi, "Chat G P T");

  // 2. Spoken expansions for common symbols & written abbreviations
  t = t
    .replace(/\s+&\s+/g, " and ")
    .replace(/\bvs\.\s/gi, "versus ")
    .replace(/\betc\.\s/gi, "et cetera ")
    .replace(/\be\.g\.\s/gi, "for example ")
    .replace(/\bi\.e\.\s/gi, "that is ")
    .replace(/\bapprox\.\s/gi, "approximately ")
    .replace(/\bw\/\s/gi, "with ")
    .replace(/\bw\/o\s/gi, "without ");

  // 3. Contraction & punctuation sanitization (never break core words)
  t = t
    .replace(/\bcan['’]t\b/gi, "cannot")
    .replace(/\bwon['’]t\b/gi, "will not")
    .replace(/\b([a-zA-Z]+)['’]ve\b/gi, "$1 have")
    .replace(/\b([a-zA-Z]+)['’]re\b/gi, "$1 are")
    .replace(/\s*([,;:])\s*/g, "$1 ")
    .replace(/\s*—\s*/g, ", ");

  // 4. Large numbers normalization
  t = t.replace(/\b(\d{1,3}),(\d{3}),(\d{3})\b/g, (m, a, b, c) => {
    const n = parseInt(a + b + c, 10);
    return n >= 1000000 ? `${+(n / 1000000).toFixed(1)} million` : m;
  });
  t = t.replace(/\b(\d{1,3}),(\d{3})\b/g, (m, a, b) => {
    const n = parseInt(a + b, 10);
    return n >= 1000 ? `${+(n / 1000).toFixed(1)} thousand` : m;
  });
  t = t.replace(/(\d+(?:\.\d+)?)\s*%/g, "$1 percent");
  t = t.replace(/\$\s*(\d[\d,.]*)/g, (m, v) => `${v.replace(/,/g, "")} dollars`);

  // 5. Space clean-up
  t = t.replace(/\s+/g, " ").trim();

  // 6. Ensure proper ending punctuation for natural vocal cadence
  if (!/[.!?]$/.test(t)) {
    t = t + ".";
  }

  return t;
}

/**
 * Word-safe clause splitting to prevent words like 'because', 'can', or 'why'
 * from being cut across utterance boundaries.
 */
function splitLongSegment(segment, maxLen = 220) {
  if (!segment || segment.length <= maxLen) return [segment];

  const words = segment.split(/\s+/);
  const parts = [];
  let currentWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = [...currentWords, word].join(" ");

    if (candidate.length > maxLen && currentWords.length > 0) {
      parts.push(currentWords.join(" ").trim());
      currentWords = [word];
    } else {
      currentWords.push(word);
    }
  }

  if (currentWords.length > 0) {
    parts.push(currentWords.join(" ").trim());
  }

  return parts.filter(Boolean);
}

/**
 * Split cleaned text into natural sentences and clauses.
 */
export function splitIntoSentences(text) {
  if (!text || typeof text !== "string") return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const sentenceUnits = [];

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];

    const protectedLine = line
      .replace(/\b(Mr|Ms|Mrs|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\./gi, "$1_DOT_")
      .replace(/(\d+)\.(\d+)/g, "$1_DECIMAL_$2");

    const rawSegments = protectedLine.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [protectedLine];

    for (let sIdx = 0; sIdx < rawSegments.length; sIdx++) {
      let segment = rawSegments[sIdx]
        .replace(/_DOT_/g, ".")
        .replace(/_DECIMAL_/g, ".")
        .replace(/\s+/g, " ")
        .trim();

      if (!segment) continue;

      const subParts = splitLongSegment(segment, 220);

      for (let subIdx = 0; subIdx < subParts.length; subIdx++) {
        let subText = subParts[subIdx].trim();
        if (!subText) continue;

        const isLastSub = subIdx === subParts.length - 1;
        const isLastInLine = sIdx === rawSegments.length - 1 && isLastSub;
        const isLastLine = lIdx === lines.length - 1 && isLastInLine;

        if (isLastSub && !/[.!?:]$/.test(subText)) {
          subText += ".";
        }

        sentenceUnits.push({
          text: subText,
          pauseAfterMs: isLastLine ? 550 : isLastInLine ? 340 : 160,
          isParagraphEnd: isLastLine,
        });
      }
    }
  }

  return sentenceUnits;
}

/**
 * Multi-language script & locale detector.
 */
export function detectTextLanguage(text, fallbackLang = null) {
  if (!text || typeof text !== "string") return fallbackLang || "en-US";
  const str = text.trim();

  let userPref = fallbackLang;
  if (!userPref && typeof window !== "undefined" && window.localStorage) {
    userPref = window.localStorage.getItem("selected_voice_language") || window.localStorage.getItem("voice_recognition_lang");
  }

  // Native Script Ranges
  if (/[\u0C00-\u0C7F]/.test(str)) return "te-IN";
  if (/[\u0900-\u097F]/.test(str)) {
    return userPref === "mr-IN" ? "mr-IN" : "hi-IN";
  }
  if (/[\u0B80-\u0BFF]/.test(str)) return "ta-IN";
  if (/[\u0C80-\u0CFF]/.test(str)) return "kn-IN";
  if (/[\u0D00-\u0D7F]/.test(str)) return "ml-IN";
  if (/[\u0980-\u09FF]/.test(str)) return "bn-IN";
  if (/[\u0A80-\u0AFF]/.test(str)) return "gu-IN";
  if (/[\u0A00-\u0A7F]/.test(str)) return "pa-IN";
  if (/[\u0600-\u06FF]/.test(str)) {
    return userPref === "ur-IN" ? "ur-IN" : "ar-SA";
  }
  if (/[\u0400-\u04FF]/.test(str)) return "ru-RU";
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(str)) return "ja-JP";
  if (/[\uAC00-\uD7AF]/.test(str)) return "ko-KR";
  if (/[\u4E00-\u9FFF]/.test(str)) return "zh-CN";

  // Latin-Script Diacritics
  if (/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(str)) return "vi-VN";
  if (/[¿¡]/i.test(str)) return userPref && userPref.startsWith("es") ? userPref : "es-ES";
  if (/[œæ]/i.test(str)) return "fr-FR";
  if (/[äöüß]/i.test(str) && !userPref?.startsWith("sv")) return "de-DE";
  if (/[ğışĞIŞ]/i.test(str)) return "tr-TR";
  if (/[ąćęłńśźżĄĆĘŁŃŚŹŻ]/i.test(str)) return "pl-PL";
  if (/[åÅ]/i.test(str)) return "sv-SE";

  if (userPref && typeof userPref === "string") {
    return userPref;
  }

  return "en-US";
}

/**
 * Select the highest quality Neural / Natural voice available.
 */
export function getBestNaturalVoice(voiceSpec = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const targetLang = (voiceSpec.lang || voiceSpec.targetLang || "").toLowerCase().replace("_", "-");
  const langPrefix = targetLang ? targetLang.split("-")[0] : "";
  const vName = (voiceSpec.name || voiceSpec.voiceId || voiceSpec.id || "").toLowerCase();
  const gender = (voiceSpec.gender || "").toLowerCase();
  const accent = (voiceSpec.accent || "").toLowerCase();

  const isNeuralNatural = (v) => /natural|neural|online|wavenet|journey|deepmind|premium|studio/i.test(v.name);
  const isGoogleVoice = (v) => /google/i.test(v.name);
  const isRoboticLegacy = (v) => /desktop|heera|ravi|hazel|zira|david|mark|george|sapi/i.test(v.name) && !isNeuralNatural(v);

  const findByName = (nameFragment) =>
    voices.find((v) => v.name.toLowerCase().includes(nameFragment.toLowerCase()));

  // 1. Explicit voice name matching
  if (vName) {
    const exactMatch = voices.find((v) => v.name.toLowerCase().includes(vName));
    if (exactMatch) return exactMatch;
  }

  // 2. English (India)
  const isEnIn = targetLang === "en-in" || vName.includes("neerja") || vName.includes("prabhat") || accent.includes("in");
  if (isEnIn) {
    const inCandidates = [
      findByName("neerja online"),
      findByName("neerja"),
      findByName("prabhat online"),
      findByName("prabhat"),
      ...voices.filter((v) => (v.lang || "").toLowerCase().replace("_", "-") === "en-in"),
    ].filter(Boolean);

    const bestIn = inCandidates.find(isNeuralNatural) || inCandidates.find(isGoogleVoice) || inCandidates.find((v) => !isRoboticLegacy(v));
    if (bestIn) return bestIn;
  }

  // 3. English (UK)
  const isEnGb = targetLang === "en-gb" || accent.includes("uk") || accent.includes("gb");
  if (isEnGb) {
    const gbCandidates = [
      findByName("sonia online"),
      findByName("sonia"),
      findByName("ryan online"),
      findByName("ryan"),
      findByName("libby online"),
      ...voices.filter((v) => {
        const l = (v.lang || "").toLowerCase().replace("_", "-");
        return l === "en-gb" || /uk|british/i.test(v.name);
      }),
    ].filter(Boolean);

    const bestGb = gbCandidates.find(isNeuralNatural) || gbCandidates.find(isGoogleVoice) || gbCandidates.find((v) => !isRoboticLegacy(v));
    if (bestGb) return bestGb;
  }

  // 4. English (US / General)
  if (langPrefix === "en" || !targetLang) {
    let prioritizedList = [];

    if (gender === "male") {
      prioritizedList = [
        findByName("guy online"),
        findByName("guy"),
        findByName("christopher online"),
        findByName("eric online"),
        findByName("google us english male"),
        findByName("google us english"),
      ];
    } else {
      prioritizedList = [
        findByName("aria online"),
        findByName("aria"),
        findByName("jenny online"),
        findByName("jenny"),
        findByName("ava online"),
        findByName("google us english"),
      ];
    }

    for (const v of prioritizedList) {
      if (v) return v;
    }

    const englishVoices = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
    if (englishVoices.length > 0) {
      const best = englishVoices.find(isNeuralNatural) || englishVoices.find(isGoogleVoice) || englishVoices.find((v) => !isRoboticLegacy(v));
      if (best) return best;
    }
  }

  // 5. Non-English Locales
  if (targetLang) {
    const exactLangVoices = voices.filter(
      (v) => (v.lang || "").toLowerCase().replace("_", "-") === targetLang
    );
    if (exactLangVoices.length > 0) {
      const bestChoice = exactLangVoices.find(isNeuralNatural) || exactLangVoices.find(isGoogleVoice) || exactLangVoices.find((v) => !isRoboticLegacy(v));
      return bestChoice || exactLangVoices[0];
    }

    if (langPrefix) {
      const prefixLangVoices = voices.filter(
        (v) => (v.lang || "").toLowerCase().startsWith(langPrefix)
      );
      if (prefixLangVoices.length > 0) {
        const bestChoice = prefixLangVoices.find(isNeuralNatural) || prefixLangVoices.find(isGoogleVoice) || prefixLangVoices.find((v) => !isRoboticLegacy(v));
        return bestChoice || prefixLangVoices[0];
      }
    }
  }

  const fallbackNeural = voices.find(isNeuralNatural) || voices.find(isGoogleVoice) || voices.find((v) => !isRoboticLegacy(v));
  return fallbackNeural || voices[0];
}

/**
 * Lookup live SpeechSynthesisVoice reference from browser to prevent Chrome voice fallback / detachment.
 */
function resolveFreshVoice(targetVoice, targetLang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return targetVoice || null;
  }
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return targetVoice || null;

  if (targetVoice) {
    const targetURI = targetVoice.voiceURI || targetVoice.name;
    const targetName = targetVoice.name;
    if (targetURI || targetName) {
      const match = voices.find(
        (v) => (targetURI && v.voiceURI === targetURI) || (targetName && v.name === targetName)
      );
      if (match) return match;
    }
  }

  return getBestNaturalVoice({ lang: targetLang });
}

/**
 * Stop any ongoing SpeechSynthesis playback immediately.
 */
export function stopSpeech(options = {}) {
  const { clearSession = false } = options || {};
  isSpeakingActive = false;
  speechQueue = [];

  if (clearSession) {
    activeSessionVoice = null;
  }

  if (activeChunkIntervalId) {
    clearInterval(activeChunkIntervalId);
    activeChunkIntervalId = null;
  }

  if (pauseTimeoutId) {
    clearTimeout(pauseTimeoutId);
    pauseTimeoutId = null;
  }

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
    return isSpeakingActive || window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Speak given text aloud using conversational pacing, clean human pauses,
 * and high-fidelity neural voice selection.
 */
export function speakText(
  rawText,
  { onStart, onEnd, onError, onWordBoundary, rate = 1.0, pitch = 1.0, voice = null, gender = null, voiceId = null } = {}
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis is not supported in this browser.");
    if (onError) onError(new Error("SpeechSynthesis not supported"));
    return null;
  }

  stopSpeech({ clearSession: false });

  const cleanedText = cleanMarkdownForSpeech(rawText);
  if (!cleanedText) {
    if (onEnd) onEnd();
    return null;
  }

  const sentences = splitIntoSentences(cleanedText);
  if (sentences.length === 0) {
    if (onEnd) onEnd();
    return null;
  }

  const storedLang = typeof localStorage !== "undefined"
    ? (localStorage.getItem("selected_voice_language") || localStorage.getItem("voice_recognition_lang"))
    : null;
  const primaryLang = detectTextLanguage(cleanedText, storedLang);
  const isEnglish = primaryLang.startsWith("en");

  const finalPitch = typeof pitch === "number" ? pitch : 1.0;
  const finalRate = typeof rate === "number" ? rate : 1.0;

  const vId = (voiceId || (typeof voice === "object" && voice ? voice.id || voice.voiceId || voice.name : "") || "").toLowerCase();

  if (typeof voice === "object" && voice && voice.voiceURI) {
    activeSessionVoice = voice;
  } else if (!activeSessionVoice) {
    const voiceSpec = { voiceId: vId, gender, lang: primaryLang };
    activeSessionVoice = getBestNaturalVoice(voiceSpec);
  }
  const sessionVoice = activeSessionVoice;

  isSpeakingActive = true;
  speechQueue = [...sentences];
  let isFirstSentence = true;

  const playNextSentence = () => {
    if (activeChunkIntervalId) {
      clearInterval(activeChunkIntervalId);
      activeChunkIntervalId = null;
    }

    if (!isSpeakingActive || speechQueue.length === 0) {
      isSpeakingActive = false;
      activeUtterance = null;
      if (onWordBoundary) onWordBoundary("");
      if (onEnd) onEnd();
      return;
    }

    const currentUnit = speechQueue.shift();
    const sentenceChunks = buildSentenceChunks(currentUnit.text);
    let activeChunkIdx = 0;

    const updateChunk = (idx) => {
      if (idx !== activeChunkIdx && idx >= 0 && idx < sentenceChunks.length) {
        activeChunkIdx = idx;
        if (onWordBoundary) {
          onWordBoundary(sentenceChunks[idx].text);
        }
      }
    };

    const audioText = isEnglish ? preprocessEnglishForSpeech(currentUnit.text) : currentUnit.text;
    const utterance = new SpeechSynthesisUtterance(audioText);
    utterance.rate = finalRate;
    utterance.pitch = finalPitch;
    utterance.volume = 1.0;

    // Resolve fresh live SpeechSynthesisVoice reference from browser to prevent voice switching
    const freshVoice = resolveFreshVoice(sessionVoice, primaryLang);
    if (freshVoice) {
      utterance.voice = freshVoice;
      utterance.lang = freshVoice.lang || primaryLang;
    } else {
      utterance.lang = primaryLang;
    }

    let isSentenceEnded = false;
    let watchdogTimer = null;

    const cleanupUtteranceTimers = () => {
      if (activeChunkIntervalId) {
        clearInterval(activeChunkIntervalId);
        activeChunkIntervalId = null;
      }
      if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
      }
    };

    utterance.onstart = () => {
      if (!isSpeakingActive) return;
      if (isFirstSentence) {
        isFirstSentence = false;
        if (onStart) onStart();
      }
      activeChunkIdx = 0;
      if (onWordBoundary && sentenceChunks.length > 0) {
        onWordBoundary(sentenceChunks[0].text);
      }

      const startTime = Date.now();
      const charsPerMs = 65 / (finalRate || 1.0);
      const maxExpectedDurationMs = Math.max(5000, Math.round(audioText.length * charsPerMs));

      watchdogTimer = setInterval(() => {
        if (!isSpeakingActive || activeUtterance !== utterance || isSentenceEnded) {
          if (watchdogTimer) clearInterval(watchdogTimer);
          watchdogTimer = null;
          return;
        }

        if (
          typeof window !== "undefined" &&
          window.speechSynthesis &&
          window.speechSynthesis.speaking &&
          window.speechSynthesis.paused
        ) {
          try {
            window.speechSynthesis.resume();
          } catch (e) {
            /* ignore */
          }
        }

        if (Date.now() - startTime > maxExpectedDurationMs + 6000) {
          cleanupUtteranceTimers();
          if (activeUtterance === utterance && !isSentenceEnded) {
            isSentenceEnded = true;
            utterance.onend();
          }
        }
      }, 2000);

      if (sentenceChunks.length > 1) {
        let simulatedIdx = 0;
        activeChunkIntervalId = setInterval(() => {
          if (!isSpeakingActive) {
            if (activeChunkIntervalId) clearInterval(activeChunkIntervalId);
            activeChunkIntervalId = null;
            return;
          }
          if (simulatedIdx < sentenceChunks.length - 1) {
            simulatedIdx++;
            updateChunk(simulatedIdx);
          } else {
            if (activeChunkIntervalId) clearInterval(activeChunkIntervalId);
            activeChunkIntervalId = null;
          }
        }, Math.max(1200, Math.round(1600 / (finalRate || 1))));
      }
    };

    utterance.onboundary = (event) => {
      if (!isSpeakingActive) return;
      if (event.name === "word" && sentenceChunks.length > 1) {
        if (activeChunkIntervalId) {
          clearInterval(activeChunkIntervalId);
          activeChunkIntervalId = null;
        }

        const charIndex = typeof event.charIndex === "number" ? event.charIndex : 0;
        const foundIdx = sentenceChunks.findIndex(
          (c, idx) =>
            charIndex >= c.startIndex &&
            (idx === sentenceChunks.length - 1 || charIndex < sentenceChunks[idx + 1].startIndex)
        );

        if (foundIdx !== -1) {
          updateChunk(foundIdx);
        }
      }
    };

    utterance.onend = () => {
      if (isSentenceEnded) return;
      isSentenceEnded = true;
      cleanupUtteranceTimers();
      activeUtterance = null;
      if (!isSpeakingActive) return;

      if (speechQueue.length > 0) {
        pauseTimeoutId = setTimeout(() => {
          pauseTimeoutId = null;
          playNextSentence();
        }, currentUnit.pauseAfterMs || 180);
      } else {
        isSpeakingActive = false;
        if (onWordBoundary) onWordBoundary("");
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (event) => {
      if (isSentenceEnded) return;
      isSentenceEnded = true;
      cleanupUtteranceTimers();
      activeUtterance = null;
      if (event.error === "canceled" || event.error === "interrupted") {
        return;
      }
      console.warn("SpeechSynthesis sentence error:", event.error);
      if (speechQueue.length > 0 && isSpeakingActive) {
        playNextSentence();
      } else {
        isSpeakingActive = false;
        if (onWordBoundary) onWordBoundary("");
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
      isSpeakingActive = false;
      activeUtterance = null;
      if (onError) onError(e);
    }
  };

  const startPlayback = () => {
    if (!activeSessionVoice) {
      const voiceSpec = typeof voice === "object" && voice ? voice : { voiceId: vId, gender, lang: primaryLang };
      activeSessionVoice = getBestNaturalVoice(voiceSpec);
    }
    playNextSentence();
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    const onVoicesReady = () => {
      window.speechSynthesis.onvoiceschanged = null;
      if (isSpeakingActive) {
        startPlayback();
      }
    };
    window.speechSynthesis.onvoiceschanged = onVoicesReady;
  } else {
    startPlayback();
  }

  return {
    stop: stopSpeech,
  };
}
