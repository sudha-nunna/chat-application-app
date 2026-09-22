/**
 * Utility functions for Speech Synthesis (Text-To-Speech) with natural human cadence,
 * sentence-by-sentence pacing, natural breath pauses, and prioritized neural voice selection.
 */

// Global state for active speech queue & pause handling
let speechQueue = [];
let activeUtterance = null;
let pauseTimeoutId = null;
let activeChunkIntervalId = null;
let isSpeakingActive = false;

/**
 * Break a sentence into readable 3 to 5 word phrase chunks with character offsets.
 * If the sentence is short (<= 6 words), it remains a single chunk.
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

  if (words.length <= 6) {
    return [{ text: sentenceText, startIndex: 0, endIndex: sentenceText.length }];
  }

  const chunks = [];
  let currentSlice = [];

  for (let i = 0; i < words.length; i++) {
    currentSlice.push(words[i]);
    const word = words[i].word;
    const hasPunctuation = /[.,!?;:]$/.test(word);

    // Break chunk when reaching 4-5 words or on punctuation
    if (currentSlice.length >= 5 || (hasPunctuation && currentSlice.length >= 3) || i === words.length - 1) {
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

  // 1. Remove all fenced code blocks (```lang ... ``` or ~~~lang ... ~~~)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " [code snippet omitted] ");
  cleaned = cleaned.replace(/~~~[\s\S]*?~~~/g, " [code snippet omitted] ");

  // 2. Remove markdown tables completely
  cleaned = cleaned.replace(/^\s*\|?\s*[-:]+[-| :]*\s*\|?\s*$/gm, " ");
  cleaned = cleaned.replace(/^\s*\|.*?\|\s*$/gm, " ");

  // 3. Remove all emojis, pictographs, symbols, and dingbats
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

  // 7. Format headers ### Title -> Title. (add period so it pauses as a distinct thought)
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

  // 10. Format bullet points (- Item) and numbered lists (1. Item) so they pause at the end
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

  // 12. Remove remaining dangling pipe characters |
  cleaned = cleaned.replace(/\|/g, " ");

  // 13. Remove HTML tags <tag>
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // 14. Clean programming symbols or noisy arrows (e.g. ->, =>, -->)
  cleaned = cleaned.replace(/[-=]>/g, " ");

  // 15. Normalize extra spaces per line, but preserve paragraph/sentence breaks
  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, idx, arr) => line !== "" || (idx > 0 && arr[idx - 1] !== ""))
    .join("\n")
    .trim();

  return cleaned;
}

/**
 * Split cleaned text into natural sentences and conversational clauses.
 * Preserves paragraph pauses, breaks long sentences at phrase boundaries,
 * and avoids splitting common abbreviations (e.g., "e.g.", "Dr.", "vs.").
 */
export function splitIntoSentences(text) {
  if (!text || typeof text !== "string") return [];

  const rawParagraphs = text.split(/\n{2,}/);
  const sentenceUnits = [];

  for (const para of rawParagraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    // Split paragraph into sentences on . ! ? followed by space or newline
    // Protect common abbreviations: Mr., Ms., Dr., Prof., e.g., i.e., vs., etc., numbers (3.14)
    const protectedPara = trimmedPara
      .replace(/\b(Mr|Ms|Mrs|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\./gi, "$1_DOT_")
      .replace(/(\d+)\.(\d+)/g, "$1_DECIMAL_$2");

    // Match sentences ending in . ! ? or end of line
    const sentenceRegex = /[^.!?\n]+[.!?]+(?:\s+|\n|$)|[^.!?\n]+$/g;
    const matches = protectedPara.match(sentenceRegex) || [protectedPara];

    for (let i = 0; i < matches.length; i++) {
      let sentence = matches[i]
        .replace(/_DOT_/g, ".")
        .replace(/_DECIMAL_/g, ".")
        .replace(/\s+/g, " ")
        .trim();

      if (!sentence) continue;

      // If a sentence is unusually long (>160 characters), split at commas or semicolons
      // so the voice breathes naturally rather than rushing
      if (sentence.length > 160 && sentence.includes(",")) {
        const subParts = sentence.split(/(?<=,)\s+/);
        let currentSub = "";
        for (const sub of subParts) {
          if (currentSub.length + sub.length < 130) {
            currentSub += (currentSub ? " " : "") + sub;
          } else {
            if (currentSub) {
              sentenceUnits.push({
                text: currentSub,
                pauseAfterMs: 140, // short comma breathing pause
                isParagraphEnd: false,
              });
            }
            currentSub = sub;
          }
        }
        if (currentSub) {
          sentenceUnits.push({
            text: currentSub,
            pauseAfterMs: i === matches.length - 1 ? 380 : 220,
            isParagraphEnd: i === matches.length - 1,
          });
        }
      } else {
        const isLastInPara = i === matches.length - 1;
        const endsWithQuestion = sentence.endsWith("?");
        const endsWithExclamation = sentence.endsWith("!");

        sentenceUnits.push({
          text: sentence,
          pauseAfterMs: isLastInPara
            ? 380 // longer pause at end of paragraph
            : endsWithQuestion || endsWithExclamation
              ? 280 // natural pause after questions / exclamations
              : 220, // conversational period pause
          isParagraphEnd: isLastInPara,
        });
      }
    }
  }

  return sentenceUnits;
}

/**
 * Multi-language script & locale detector for natural text-to-speech output.
 * Automatically detects non-English native scripts (Telugu, Hindi, Tamil, Spanish, etc.)
 * and respects user's selected voice recognition language preference.
 */
export function detectTextLanguage(text, fallbackLang = null) {
  if (!text || typeof text !== "string") return fallbackLang || "en-US";
  const str = text.trim();

  // Resolve user's stored fallback language preference from localStorage if not explicitly passed
  let userPref = fallbackLang;
  if (!userPref && typeof window !== "undefined" && window.localStorage) {
    userPref = window.localStorage.getItem("selected_voice_language");
  }

  // 1. Script Range Regex Detection for precise native script matching
  if (/[\u0C00-\u0C7F]/.test(str)) return "te-IN"; // Telugu
  if (/[\u0900-\u097F]/.test(str)) {
    return userPref === "mr-IN" ? "mr-IN" : "hi-IN"; // Marathi vs Hindi (Devanagari script)
  }
  if (/[\u0B80-\u0BFF]/.test(str)) return "ta-IN"; // Tamil
  if (/[\u0C80-\u0CFF]/.test(str)) return "kn-IN"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(str)) return "ml-IN"; // Malayalam
  if (/[\u0980-\u09FF]/.test(str)) return "bn-IN"; // Bengali
  if (/[\u0A80-\u0AFF]/.test(str)) return "gu-IN"; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(str)) return "pa-IN"; // Punjabi
  if (/[\u0600-\u06FF]/.test(str)) {
    return userPref === "ur-IN" ? "ur-IN" : "ar-SA"; // Urdu vs Arabic script
  }
  if (/[\u0400-\u04FF]/.test(str)) return "ru-RU"; // Russian / Cyrillic
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(str)) return "ja-JP"; // Japanese
  if (/[\uAC00-\uD7AF]/.test(str)) return "ko-KR"; // Korean
  if (/[\u4E00-\u9FFF]/.test(str)) return "zh-CN"; // Chinese

  // 2. Language-Specific Diacritics & Character Markers for Global Latin-Script Languages
  if (/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(str)) return "vi-VN"; // Vietnamese
  if (/[¿¡]/i.test(str)) return userPref && userPref.startsWith("es") ? userPref : "es-ES"; // Spanish
  if (/[œæ]/i.test(str)) return "fr-FR"; // French
  if (/[äöüß]/i.test(str) && !userPref?.startsWith("sv")) return "de-DE"; // German
  if (/[ğışĞIŞ]/i.test(str)) return "tr-TR"; // Turkish
  if (/[ąćęłńśźżĄĆĘŁŃŚŹŻ]/i.test(str)) return "pl-PL"; // Polish
  if (/[åÅ]/i.test(str)) return "sv-SE"; // Swedish

  // 3. Fallback to user selected voice language from catalog or default en-US
  if (userPref && typeof userPref === "string") {
    return userPref;
  }

  return "en-US";
}

/**
 * Select the highest-quality, most human-sounding voice matching requested voice parameters & target language.
 * Supports distinct male vs female, US vs UK vs AU accents, and native global locale voices (Telugu, Hindi, Tamil, Spanish, French, etc.).
 */
export function getBestNaturalVoice(voiceSpec = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const targetLang = (voiceSpec.lang || voiceSpec.targetLang || "").toLowerCase();
  const langPrefix = targetLang ? targetLang.split("-")[0] : "";

  // 1. Try exact name match if system voice matches studio name
  if (voiceSpec.name) {
    const exactMatch = voices.find((v) => v.name.toLowerCase().includes(voiceSpec.name.toLowerCase()));
    if (exactMatch) return exactMatch;
  }

  // 2. Try exact locale match first (e.g. te-IN, hi-IN, ta-IN, es-ES, fr-FR)
  if (targetLang) {
    const exactLangVoices = voices.filter(
      (v) => v.lang && v.lang.toLowerCase().replace("_", "-") === targetLang
    );
    if (exactLangVoices.length > 0) {
      const naturalChoice = exactLangVoices.find((v) =>
        /natural|neural|premium|enhanced|google|microsoft/i.test(v.name)
      );
      return naturalChoice || exactLangVoices[0];
    }

    // 3. Try language prefix match (e.g. te, hi, ta, es, fr, de, ja, zh)
    if (langPrefix && langPrefix !== "en") {
      const prefixLangVoices = voices.filter(
        (v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix)
      );
      if (prefixLangVoices.length > 0) {
        const naturalChoice = prefixLangVoices.find((v) =>
          /natural|neural|premium|enhanced|google|microsoft/i.test(v.name)
        );
        return naturalChoice || prefixLangVoices[0];
      }
    }
  }

  const voiceId = (voiceSpec.voiceId || voiceSpec.id || voiceSpec.name || "").toLowerCase();
  const gender = (voiceSpec.gender || "").toLowerCase();
  const accent = (voiceSpec.accent || "").toLowerCase();

  const isMale = gender === "male" || ["alex", "michael", "david"].includes(voiceId);
  const isUk = accent.includes("uk") || accent.includes("gb") || ["chloe", "emily", "david"].includes(voiceId);
  const isAu = accent.includes("au") || voiceId === "michael";

  const englishVoices = voices.filter((v) => v.lang && v.lang.startsWith("en"));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  // 2. Filter pool by Gender preference
  let candidates = pool;
  if (isMale) {
    const maleVoices = pool.filter((v) =>
      /male|guy|david|alex|tom|daniel|oliver|fred|george|mark|ryan|william/i.test(v.name)
    );
    if (maleVoices.length > 0) candidates = maleVoices;
  } else if (gender === "female" || ["cimo", "chloe", "sarah", "emily", "sophia"].includes(voiceId)) {
    const femaleVoices = pool.filter((v) =>
      /female|ava|samantha|zoe|allison|serena|kate|jenny|aria|zira|karen|victoria|siri/i.test(v.name)
    );
    if (femaleVoices.length > 0) candidates = femaleVoices;
  }

  // 3. Filter by Accent (UK, AU, US)
  if (isUk) {
    const ukVoices = candidates.filter((v) =>
      v.lang.includes("GB") || v.lang.includes("uk") || /uk|british|en-gb/i.test(v.name)
    );
    if (ukVoices.length > 0) return ukVoices[0];
  }
  if (isAu) {
    const auVoices = candidates.filter((v) =>
      v.lang.includes("AU") || /au|australian|en-au/i.test(v.name)
    );
    if (auVoices.length > 0) return auVoices[0];
  }

  // 4. Return top natural candidate from filtered pool
  const naturalChoice = candidates.find((v) =>
    /natural|neural|premium|enhanced|google|microsoft/i.test(v.name)
  );
  return naturalChoice || candidates[0] || voices[0];
}

/**
 * Stop any ongoing SpeechSynthesis playback and clear queued sentences immediately.
 */
export function stopSpeech() {
  isSpeakingActive = false;
  speechQueue = [];

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
 * Check if the browser is currently speaking or has queued sentences.
 */
export function isSpeechSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return isSpeakingActive || window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Speak given text aloud using sentence-by-sentence pacing, natural breath pauses,
 * dynamic word chunking, and high-fidelity voice selection to emulate human reading.
 * 
 * @param {string} rawText - The text to speak (markdown supported)
 * @param {Object} options
 * @param {Function} [options.onStart] - Callback fired when speech begins
 * @param {Function} [options.onEnd] - Callback fired when all sentences complete
 * @param {Function} [options.onError] - Callback fired on speech error
 * @param {Function} [options.onWordBoundary] - Callback fired with active subtitle text
 * @param {number} [options.rate=0.96] - Natural speech cadence (0.95 - 0.98 recommended for clear human diction)
 * @param {number} [options.pitch=1.0] - Speech pitch
 */
export function speakText(
  rawText,
  { onStart, onEnd, onError, onWordBoundary, rate = 0.96, pitch = 1.0, voice = null, gender = null, voiceId = null } = {}
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis is not supported in this browser.");
    if (onError) onError(new Error("SpeechSynthesis not supported"));
    return null;
  }

  // Cancel any ongoing speech and active queues first
  stopSpeech();

  const cleanedText = cleanMarkdownForSpeech(rawText);
  if (!cleanedText) {
    if (onEnd) onEnd();
    return null;
  }

  // Split into natural, human-sized sentences / thought units
  const sentences = splitIntoSentences(cleanedText);
  if (sentences.length === 0) {
    if (onEnd) onEnd();
    return null;
  }

  isSpeakingActive = true;
  speechQueue = [...sentences];
  let isFirstSentence = true;

  // Recursive function to play sentences one by one with human breath pauses
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

    const storedLang = typeof localStorage !== "undefined" ? localStorage.getItem("voice_recognition_lang") : null;
    const targetLang = detectTextLanguage(currentUnit.text, storedLang);

    const utterance = new SpeechSynthesisUtterance(currentUnit.text);
    utterance.lang = targetLang;

    // Dynamic voice profile pacing & pitch overrides
    const vId = (voiceId || (typeof voice === "object" && voice ? voice.id || voice.voiceId || voice.name : "") || "").toLowerCase();
    let finalRate = rate;
    let finalPitch = pitch;

    if (vId === "alex") { finalPitch = 0.92; finalRate = 1.04; }
    else if (vId === "chloe") { finalPitch = 1.0; finalRate = 0.94; }
    else if (vId === "cimo") { finalPitch = 1.05; finalRate = 1.0; }
    else if (vId === "sarah") { finalPitch = 0.98; finalRate = 0.92; }
    else if (vId === "michael") { finalPitch = 0.88; finalRate = 0.98; }
    else if (vId === "emily") { finalPitch = 1.02; finalRate = 0.95; }
    else if (vId === "david") { finalPitch = 0.82; finalRate = 0.88; }
    else if (vId === "sophia") { finalPitch = 1.08; finalRate = 0.92; }

    utterance.rate = finalRate;
    utterance.pitch = finalPitch;

    // Pick specified voice or top-tier natural matching voice for target language
    const voiceSpec = typeof voice === "object" && voice ? voice : { voiceId: vId, gender, lang: targetLang };
    const pickedVoice = (typeof voice === "object" && voice && voice.voiceURI) ? voice : getBestNaturalVoice(voiceSpec);
    if (pickedVoice) {
      utterance.voice = pickedVoice;
      if (pickedVoice.lang) utterance.lang = pickedVoice.lang;
    }

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

      // If sentence has multiple chunks, auto-advance chunks periodically as fallback
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
        }, Math.max(1100, Math.round(1500 / (rate || 1))));
      }
    };

    utterance.onboundary = (event) => {
      if (!isSpeakingActive) return;
      if (event.name === "word" && sentenceChunks.length > 1) {
        // Native onboundary is firing! Clear the timer fallback
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
      if (activeChunkIntervalId) {
        clearInterval(activeChunkIntervalId);
        activeChunkIntervalId = null;
      }
      activeUtterance = null;
      if (!isSpeakingActive) return;

      if (speechQueue.length > 0) {
        // Natural human breathing pause between sentences!
        pauseTimeoutId = setTimeout(() => {
          pauseTimeoutId = null;
          playNextSentence();
        }, currentUnit.pauseAfterMs || 220);
      } else {
        isSpeakingActive = false;
        if (onWordBoundary) onWordBoundary("");
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (event) => {
      if (activeChunkIntervalId) {
        clearInterval(activeChunkIntervalId);
        activeChunkIntervalId = null;
      }
      activeUtterance = null;
      if (event.error === "canceled" || event.error === "interrupted") {
        return;
      }
      console.warn("SpeechSynthesis sentence error:", event.error);
      if (speechQueue.length > 0 && isSpeakingActive) {
        // Continue to next sentence if one errored
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

  // If voices haven't loaded yet on first page load in Chromium, listen for onvoiceschanged
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      if (isSpeakingActive && !activeUtterance) {
        playNextSentence();
      }
    };
  }

  // Begin playback
  playNextSentence();

  return {
    stop: stopSpeech,
  };
}
