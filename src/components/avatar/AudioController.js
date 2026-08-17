/**
 * AudioController.js
 * Manages audio playback, Web Speech API synthesis, viseme timeline extraction, and real-time audio amplitude analysis.
 */

export class AudioController {
  constructor(onVisemeUpdate = null, onStateUpdate = null, onSpeechEnd = null) {
    this.onVisemeUpdate = onVisemeUpdate;
    this.onStateUpdate = onStateUpdate;
    this.onSpeechEnd = onSpeechEnd;

    this.audioElement = null;
    this.speechUtterance = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.speechData = null;
    this.playStartTime = 0;
    this.rafId = null;

    // Web Audio API Analyzer for audio-driven amplitude viseme generation
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.audioSourceNode = null;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.audioElement) this.audioElement.muted = muted;
    if (typeof window !== "undefined" && window.speechSynthesis && muted) {
      window.speechSynthesis.cancel();
    }
  }

  playSpeech(speechData) {
    this.stopSpeech();
    if (!speechData) return;

    this.speechData = speechData;
    this.isPlaying = true;
    if (this.onStateUpdate) this.onStateUpdate("SPEAKING");

    // Mode A: SpeechSynthesis (Text-to-Speech)
    if (typeof window !== "undefined" && window.speechSynthesis && speechData.text && !speechData.audioUrl) {
      try {
        window.speechSynthesis.cancel();
        const textToSpeak = speechData.text.replace(/[*_#`~]/g, " ").trim();
        if (textToSpeak) {
          const utter = new SpeechSynthesisUtterance(textToSpeak);
          utter.rate = 1.0;
          utter.pitch = 1.0;
          utter.onstart = () => {
            this.playStartTime = performance.now();
            this.startVisemeLoop();
          };
          utter.onend = () => {
            this.handlePlaybackEnd();
          };
          utter.onerror = () => {
            this.handlePlaybackEnd();
          };
          this.speechUtterance = utter;
          if (!this.isMuted) {
            window.speechSynthesis.speak(utter);
          } else {
            this.startVisemeLoop();
          }
        }
      } catch (err) {
        console.warn("AudioController SpeechSynthesis warning:", err);
      }
    }

    // Mode B: Audio URL Playback (Pre-rendered audio file / ElevenLabs / AWS Polly)
    if (speechData.audioUrl) {
      try {
        const audio = new Audio(speechData.audioUrl);
        audio.muted = this.isMuted;
        this.audioElement = audio;

        audio.addEventListener("ended", () => this.handlePlaybackEnd());
        audio.addEventListener("pause", () => {
          if (this.isPlaying) this.isPlaying = false;
        });

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.playStartTime = performance.now();
              this.startVisemeLoop();
            })
            .catch((e) => {
              console.warn("Audio playback prevented by browser:", e);
              this.startVisemeLoop();
            });
        }
      } catch (e) {
        console.warn("Audio instantiation error:", e);
      }
    }

    if (!speechData.audioUrl && !speechData.text) {
      this.startVisemeLoop();
    }
  }

  startVisemeLoop() {
    this.playStartTime = performance.now();

    const updateLoop = () => {
      if (!this.isPlaying) return;

      let currentTimeMs = 0;
      if (this.audioElement && this.audioElement.currentTime > 0) {
        currentTimeMs = this.audioElement.currentTime * 1000;
      } else {
        currentTimeMs = performance.now() - this.playStartTime;
      }

      // Check if pre-calculated visemes array exists
      if (this.speechData && Array.isArray(this.speechData.visemes) && this.speechData.visemes.length > 0) {
        const matched = this.speechData.visemes.find(
          (v) => currentTimeMs >= v.timeMs && currentTimeMs <= v.timeMs + v.durationMs
        );
        if (matched && this.onVisemeUpdate) {
          this.onVisemeUpdate(matched.shape || "rest");
        } else if (this.onVisemeUpdate) {
          this.onVisemeUpdate("rest");
        }
      } else {
        // Dynamic procedural viseme cadence matching speech duration
        const cycle = currentTimeMs % 850;
        let shape = "rest";
        if (cycle < 140) shape = "A";
        else if (cycle < 320) shape = "E";
        else if (cycle < 500) shape = "O";
        else if (cycle < 680) shape = "U";
        else if (cycle < 780) shape = "M";

        if (this.onVisemeUpdate) this.onVisemeUpdate(shape);
      }

      const totalDuration = this.speechData?.durationMs || (this.speechData?.text ? this.speechData.text.length * 75 : 3000);
      if (currentTimeMs >= totalDuration && !this.audioElement && !this.speechUtterance) {
        this.handlePlaybackEnd();
        return;
      }

      this.rafId = requestAnimationFrame(updateLoop);
    };

    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(updateLoop);
  }

  handlePlaybackEnd() {
    this.isPlaying = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.onVisemeUpdate) this.onVisemeUpdate("rest");
    if (this.onStateUpdate) this.onStateUpdate("IDLE");
    if (this.onSpeechEnd) this.onSpeechEnd();
  }

  stopSpeech() {
    this.isPlaying = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    if (this.onVisemeUpdate) this.onVisemeUpdate("rest");
    if (this.onStateUpdate) this.onStateUpdate("IDLE");
  }

  dispose() {
    this.stopSpeech();
  }
}

export default AudioController;
