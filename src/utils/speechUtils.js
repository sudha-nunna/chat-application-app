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
  cleaned = cleaned.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, "");

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
 * Select the highest-quality, most human-sounding English voice available on the device.
 * Prioritizes Neural, Premium, and Enhanced voices (macOS Ava/Samantha Enhanced, Google, Microsoft Natural).
 */
export function getBestNaturalVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const englishVoices = voices.filter((v) => v.lang && v.lang.startsWith("en"));
  if (englishVoices.length === 0) return voices[0] || null;

  // Tier 1: Apple & Edge Premium/Enhanced/Neural Human Voices (macOS / Windows / Safari / Edge)
  const tier1Keywords = [
    "Ava (Premium)",
    "Ava (Enhanced)",
    "Samantha (Enhanced)",
    "Zoe (Premium)",
    "Allison (Enhanced)",
    "Tom (Enhanced)",
    "Siri",
    "Serena (Premium)",
    "Kate (Enhanced)",
    "Oliver (Enhanced)",
    "Daniel (Enhanced)",
    "Microsoft Jenny Online (Natural)",
    "Microsoft Guy Online (Natural)",
    "Microsoft Aria Online (Natural)",
  ];

  for (const keyword of tier1Keywords) {
    const found = englishVoices.find((v) => v.name.includes(keyword));
    if (found) return found;
  }

  // Tier 2: Any voice explicitly tagged as "Enhanced", "Premium", or "Natural"
  const tier2 = englishVoices.find(
    (v) =>
      v.name.includes("Enhanced") ||
      v.name.includes("Premium") ||
      v.name.includes("Natural") ||
      v.name.includes("Neural")
  );
  if (tier2) return tier2;

  // Tier 3: Google High-Quality Voices (Chrome on Mac/Windows/Android)
  const tier3Keywords = [
    "Google US English",
    "Google UK English Female",
    "Google UK English Male",
  ];
  for (const keyword of tier3Keywords) {
    const found = englishVoices.find((v) => v.name.includes(keyword));
    if (found) return found;
  }

  // Tier 4: Standard clean system voices (Samantha, Alex, Victoria, Daniel, Karen)
  const tier4Keywords = ["Samantha", "Alex", "Victoria", "Daniel", "Karen"];
  for (const keyword of tier4Keywords) {
    const found = englishVoices.find((v) => v.name.includes(keyword));
    if (found) return found;
  }

  // Tier 5: Default en-US or any English voice
  return englishVoices.find((v) => v.lang === "en-US") || englishVoices[0];
}

/**
 * Resolves the optimal available SpeechSynthesis voice for a specified preset or gender.
 * Matches Windows Edge, Chrome, Safari, macOS, and Android speech engines across male/female personas.
 *
 * @param {Object|string} presetOrGender - Voice preset object or gender string ("male" / "female")
 * @returns {SpeechSynthesisVoice|null}
 */
export function getBestVoiceForPreset(presetOrGender) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const englishVoices = voices.filter((v) => v.lang && v.lang.startsWith("en"));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  const rawGender = typeof presetOrGender === "string"
    ? presetOrGender
    : (presetOrGender?.gender || "");
  const isMale = rawGender.toLowerCase().includes("male") && !rawGender.toLowerCase().includes("female");

  const name = typeof presetOrGender === "object" ? (presetOrGender.name || "").toLowerCase() : "";

  // 1. Exact or partial name match (e.g. Alex, Michael, Sarah, Emily, David)
  if (name) {
    const direct = pool.find((v) => v.name.toLowerCase().includes(name));
    if (direct) return direct;
  }

  if (isMale) {
    // Windows Edge / Windows Chrome / Mac / Android Male Voice signatures
    const maleSignatures = [
      "microsoft guy",
      "microsoft ryan",
      "microsoft mark",
      "microsoft david",
      "google uk english male",
      "guy online",
      "ryan online",
      "mark",
      "david",
      "alex",
      "george",
      "daniel",
      "tom",
      "oliver",
      "eric",
      "christopher",
      "james",
      "male"
    ];
    for (const sig of maleSignatures) {
      const match = pool.find((v) => v.name.toLowerCase().includes(sig));
      if (match) return match;
    }
  } else {
    // Female Voice signatures
    const femaleSignatures = [
      "microsoft jenny",
      "microsoft aria",
      "microsoft zira",
      "google us english",
      "google uk english female",
      "jenny online",
      "aria online",
      "samantha",
      "ava",
      "zoe",
      "kate",
      "serena",
      "victoria",
      "allison",
      "female"
    ];
    for (const sig of femaleSignatures) {
      const match = pool.find((v) => v.name.toLowerCase().includes(sig));
      if (match) return match;
    }
  }

  return getBestNaturalVoice();
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
 * @param {SpeechSynthesisVoice|null} [options.voice=null] - Specific SpeechSynthesisVoice instance
 * @param {string|null} [options.gender=null] - Target voice persona ("male" / "female")
 */
export function speakText(
  rawText,
  { onStart, onEnd, onError, onWordBoundary, rate = 0.96, pitch = 1.0, voice = null, gender = null } = {}
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

    const utterance = new SpeechSynthesisUtterance(currentUnit.text);
    utterance.lang = "en-US";
    utterance.rate = rate;

    // Pick specified voice or resolve best voice for target persona
    const isMale = gender === "male" || (typeof gender === "string" && gender.toLowerCase().includes("male"));
    const pickedVoice = voice || (gender ? getBestVoiceForPreset(gender) : getBestNaturalVoice());
    if (pickedVoice) {
      utterance.voice = pickedVoice;
    }

    // Calibrate pitch: If male persona requested but fallback voice is non-male, pitch down into baritone register
    let calculatedPitch = pitch;
    if (isMale) {
      const vName = (pickedVoice?.name || "").toLowerCase();
      const isKnownMale = ["guy", "ryan", "mark", "david", "male", "alex", "eric", "george", "daniel", "tom", "oliver"].some((m) => vName.includes(m));
      if (!isKnownMale) {
        calculatedPitch = Math.min(pitch * 0.82, 0.85);
      }
    }
    utterance.pitch = calculatedPitch;

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
        isSpeakingActive = false;
        if (onWordBoundary) onWordBoundary("");
        if (onEnd) onEnd();
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

  // Safe delayed startup to ensure previous cancel() completed in browser audio thread
  setTimeout(() => {
    if (!isSpeakingActive) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    // If voices haven't loaded yet on first page load in Chromium, listen for onvoiceschanged
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        if (isSpeakingActive && !activeUtterance) {
          playNextSentence();
        }
      };
      // Fallback in case voiceschanged never fires
      setTimeout(() => {
        if (isSpeakingActive && !activeUtterance) {
          playNextSentence();
        }
      }, 250);
    } else {
      playNextSentence();
    }
  }, 50);

  return {
    stop: stopSpeech,
  };
}
