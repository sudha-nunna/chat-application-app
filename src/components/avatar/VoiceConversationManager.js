/**
 * VoiceConversationManager.js
 * Continuous Hands-Free Microphone Listener & Speech-To-Text (STT) Manager.
 * Features:
 * - Real-time SpeechRecognition (Web Speech API) with automatic silence detection (VAD)
 * - Push-to-Talk and Continuous Hands-Free Voice Mode
 * - Acoustic Echo Cancellation & Assistant Speaking Mute Guard (anti-self-talk)
 * - Intelligent Self-Echo Detection and Suppression
 * - State callbacks: onListeningStart, onSpeechDetected, onSpeechEnded, onTranscriptComplete, onError
 */

/**
 * Checks if a candidate transcribed query is an echo of the assistant's own recent response.
 * Prevents the AI from listening to its own voice and responding in an infinite loop.
 *
 * @param {string} candidate - Recognized transcript from microphone
 * @param {string} referenceText - Assistant's recently spoken text
 * @returns {boolean} True if candidate is an echo of referenceText
 */
export function isSelfEcho(candidate, referenceText) {
  if (!candidate || !referenceText) return false;

  const clean = (str) =>
    (str || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const c = clean(candidate);
  const r = clean(referenceText);

  if (!c || !r) return false;

  // 1. Direct substring match for phrases with at least 5 characters
  if (c.length >= 5 && r.includes(c)) {
    return true;
  }

  // 2. High word overlap match (if >= 65% of words in candidate appear in reference text)
  const cWords = c.split(" ").filter((w) => w.length > 1);
  if (cWords.length >= 2) {
    let matched = 0;
    for (const w of cWords) {
      if (r.includes(w)) matched++;
    }
    if (matched / cWords.length >= 0.65) {
      return true;
    }
  }

  return false;
}

export class VoiceConversationManager {
  constructor(options = {}) {
    this.onListeningStart = options.onListeningStart || (() => {});
    this.onSpeechDetected = options.onSpeechDetected || (() => {});
    this.onSpeechEnded = options.onSpeechEnded || (() => {});
    this.onTranscriptComplete = options.onTranscriptComplete || (() => {});
    this.onBargeIn = options.onBargeIn || (() => {});
    this.onError = options.onError || (() => {});

    this.recognition = null;
    this.mediaStream = null;
    this.isListening = false;
    this.isVoiceModeActive = false;
    this.isPushToTalk = false;
    this.isAssistantSpeaking = false;
    this.lastAssistantSpokenText = "";
    this.silenceTimer = null;
    this.echoCooldownTimer = null;
    this.accumulatedTranscript = "";
    this.permissionGranted = false;
    this.lastSpeechCallbackTime = 0;

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web SpeechRecognition API is not supported in this browser environment.");
      this.onError("SpeechRecognition API not supported");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      this.isListening = true;
      this.onListeningStart();
    };

    rec.onresult = (event) => {
      // Hardware Mute Guard: If the assistant is currently speaking aloud, immediately discard all audio!
      if (this.isAssistantSpeaking) {
        return;
      }

      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      const currentText = (final || interim).trim();
      if (currentText) {
        // Double check against assistant's recently spoken text to prevent self-hearing echo
        if (isSelfEcho(currentText, this.lastAssistantSpokenText)) {
          return;
        }

        this.accumulatedTranscript = currentText;

        // Throttle high-frequency interim text updates (max 1 update per 150ms) to prevent React state thrashing
        const now = Date.now();
        if (final || now - this.lastSpeechCallbackTime > 150) {
          this.lastSpeechCallbackTime = now;
          this.onSpeechDetected(currentText);
        }

        // Reset VAD silence timer (1.2s silence triggers transcript completion)
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          this.handleSilenceDetected();
        }, 1200);
      }
    };

    rec.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("SpeechRecognition error:", event.error);
        this.onError(event.error);
      }
    };

    rec.onend = () => {
      this.isListening = false;
      this.onSpeechEnded();

      // Only restart recognition if voice mode is active, not in push-to-talk, AND assistant is NOT speaking
      if (this.isVoiceModeActive && !this.isPushToTalk && !this.isAssistantSpeaking) {
        try {
          rec.start();
        } catch (e) {
          // Ignore if already started or temporarily busy
        }
      }
    };

    this.recognition = rec;
  }

  /**
   * Informs the manager whether the AI assistant is currently speaking audio through the speakers.
   * While the assistant is speaking, microphone input is stopped/ignored so the AI doesn't hear itself.
   *
   * @param {boolean} isSpeaking - True if assistant audio is playing
   * @param {string} [spokenText=""] - Text being spoken by assistant for echo filtering
   */
  setAssistantSpeaking(isSpeaking, spokenText = "") {
    this.isAssistantSpeaking = !!isSpeaking;

    if (spokenText) {
      this.lastAssistantSpokenText = spokenText;
    }

    if (this.echoCooldownTimer) {
      clearTimeout(this.echoCooldownTimer);
      this.echoCooldownTimer = null;
    }

    if (isSpeaking) {
      // Discard current buffers and stop microphone immediately
      this.accumulatedTranscript = "";
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {}
      }
      this.isListening = false;
    } else {
      // Assistant finished speaking: Apply a 450ms acoustic dissipation cooldown before resuming hands-free listening
      this.accumulatedTranscript = "";
      this.echoCooldownTimer = setTimeout(() => {
        if (this.isVoiceModeActive && !this.isAssistantSpeaking && !this.isPushToTalk) {
          this.startListening("HANDS_FREE");
        }
      }, 450);
    }
  }

  async acquireMicrophoneStream() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (err) {
      console.warn("Failed to acquire microphone with noise suppression constraints:", err);
    }
  }

  startListening(mode = "HANDS_FREE") {
    // If assistant is currently speaking, do not start microphone until speech completes
    if (this.isAssistantSpeaking) {
      return;
    }

    this.isVoiceModeActive = true;
    this.isPushToTalk = mode === "PUSH_TO_TALK";
    this.accumulatedTranscript = "";

    this.acquireMicrophoneStream();

    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        // Recognition already active
      }
    }
  }

  stopListening() {
    this.isVoiceModeActive = false;
    this.isListening = false;

    if (this.echoCooldownTimer) {
      clearTimeout(this.echoCooldownTimer);
      this.echoCooldownTimer = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  handleSilenceDetected() {
    if (this.isAssistantSpeaking || !this.accumulatedTranscript) return;

    const finalText = this.accumulatedTranscript.trim();
    this.accumulatedTranscript = "";

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Acoustic Anti-Echo Guard: Discard if transcript is an echo of assistant's voice
    if (isSelfEcho(finalText, this.lastAssistantSpokenText)) {
      console.info("🛡️ [Voice Anti-Echo] Discarded self-echo transcript:", finalText);
      return;
    }

    // Stop recognition temporarily while AI processes & responds
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    this.onTranscriptComplete(finalText);
  }
}

export default VoiceConversationManager;
