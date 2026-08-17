/**
 * VoiceConversationManager.js
 * Continuous Hands-Free Microphone Listener & Speech-To-Text (STT) Manager.
 * Features:
 * - Real-time SpeechRecognition (Web Speech API) with automatic silence detection (VAD)
 * - Push-to-Talk and Continuous Hands-Free Voice Mode
 * - Echo cancellation, noise suppression, and auto gain control
 * - State callbacks: onListeningStart, onSpeechDetected, onSpeechEnded, onTranscriptComplete, onError
 */
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
    this.silenceTimer = null;
    this.accumulatedTranscript = "";
    this.permissionGranted = false;

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

    this.lastSpeechCallbackTime = 0;

    rec.onresult = (event) => {
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
        // Trigger Barge-In Speech Interruption if avatar is currently speaking
        if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          this.onBargeIn();
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
      console.warn("SpeechRecognition error:", event.error);
      if (event.error !== "no-speech") {
        this.onError(event.error);
      }
    };

    rec.onend = () => {
      this.isListening = false;
      this.onSpeechEnded();

      // If continuous Hands-Free voice mode is active and not stopped intentionally, restart recognition
      if (this.isVoiceModeActive && !this.isPushToTalk) {
        try {
          rec.start();
        } catch (e) {
          // Ignore if already started
        }
      }
    };

    this.recognition = rec;
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
    this.isVoiceModeActive = true;
    this.isPushToTalk = mode === "PUSH_TO_TALK";
    this.accumulatedTranscript = "";

    this.acquireMicrophoneStream();

    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("SpeechRecognition start exception:", e);
      }
    }
  }

  stopListening() {
    this.isVoiceModeActive = false;
    this.isListening = false;

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
    if (!this.accumulatedTranscript) return;

    const finalText = this.accumulatedTranscript;
    this.accumulatedTranscript = "";

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Stop recognition temporarily while AI processes & speaks
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    this.onTranscriptComplete(finalText);
  }
}

export default VoiceConversationManager;
