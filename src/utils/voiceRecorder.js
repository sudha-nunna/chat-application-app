/**
 * Utility class for recording microphone audio in browser using MediaRecorder API.
 * Returns audio Blob (WAV/WebM) for sending to Voice Cloning and STT backend.
 */
export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
  }

  async startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone recording is not supported in this browser.");
    }

    // Always release any previously lingering stream tracks before starting a new recording
    this.cleanup();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "audio/wav";

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  cleanup() {
    this.isRecording = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.mediaRecorder = null;

    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      this.stream = null;
    }
  }

  async stopRecording() {
    return new Promise((resolve) => {
      const releaseTracks = () => {
        this.isRecording = false;
        if (this.stream) {
          try {
            this.stream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (e) {}
            });
          } catch (e) {}
          this.stream = null;
        }
      };

      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        releaseTracks();
        return resolve(null);
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || "audio/wav",
        });
        releaseTracks();
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = () => {
        releaseTracks();
        resolve(null);
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        releaseTracks();
        resolve(null);
      }
    });
  }
}
