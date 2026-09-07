import { useState, useRef, useEffect } from "react";
import {
  FiX,
  FiSearch,
  FiPlay,
  FiSquare,
  FiCheck,
  FiMic,
  FiUploadCloud,
  FiPlus,
  FiChevronUp,
  FiVolume2,
  FiLoader
} from "react-icons/fi";
import { speakText, stopSpeech } from "../../utils/speechUtils";
import { VoiceRecorder } from "../../utils/voiceRecorder";
import { getJwt } from "../../services/authService";
import { STUDIO_VOICES } from "./studioConstants";

export default function SelectVoiceModal({ isOpen, onClose, selectedVoiceId, onSelectVoice }) {
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState(null);

  // Custom Voice Recording / Upload State
  const [isCreatingCustomVoice, setIsCreatingCustomVoice] = useState(false);
  const [customVoiceName, setCustomVoiceName] = useState("");
  const [customRefText, setCustomRefText] = useState("Some call me nature, others call me mother nature.");
  const [customCreationMode, setCustomCreationMode] = useState("record"); // "record" | "upload"
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [customVoices, setCustomVoices] = useState(() => {
    try {
      const saved = localStorage.getItem("studio_custom_voices");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const voiceRecorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const previewAudioRef = useRef(null);
  const activeAbortControllerRef = useRef(null);
  const audioCacheRef = useRef({});

  // Helper to reliably cancel all active audio, fetches, and browser speech
  const stopAllAudio = () => {
    if (activeAbortControllerRef.current) {
      try {
        activeAbortControllerRef.current.abort();
      } catch {
        /* ignore */
      }
      activeAbortControllerRef.current = null;
    }

    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current.onended = null;
        previewAudioRef.current.onerror = null;
      } catch {
        /* ignore */
      }
      previewAudioRef.current = null;
    }

    stopSpeech();
    setPlayingVoiceId(null);
    setLoadingVoiceId(null);
  };

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const allAvailableVoices = [...customVoices, ...STUDIO_VOICES];

  const filteredVoices = allAvailableVoices.filter((voice) => {
    const matchesSearch =
      voice.name.toLowerCase().includes(search.toLowerCase()) ||
      voice.accent.toLowerCase().includes(search.toLowerCase()) ||
      voice.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesGender =
      genderFilter === "all" ||
      (voice.gender && voice.gender.toLowerCase() === genderFilter.toLowerCase());
    return matchesSearch && matchesGender;
  });

  const handlePlayVoice = async (voice, e) => {
    e.stopPropagation();

    // If user clicks the currently loading or playing voice, stop it immediately
    if (loadingVoiceId === voice.id || playingVoiceId === voice.id) {
      stopAllAudio();
      return;
    }

    // Stop everything currently playing or loading first!
    stopAllAudio();

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

    // Create an AbortController for this request to cancel previous network calls
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    // Helper to safely play audio
    const playAudioSrc = (src) => {
      if (abortController.signal.aborted) return;
      const audio = new Audio(src);
      previewAudioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
        setLoadingVoiceId(null);
        previewAudioRef.current = null;
      };

      audio.onerror = () => {
        setLoadingVoiceId(null);
        if (abortController.signal.aborted) return;
        speakText(voice.sample || voice.name, {
          gender: voice.gender,
          onEnd: () => setPlayingVoiceId(null),
          onError: () => setPlayingVoiceId(null)
        });
      };

      audio.play().then(() => {
        setLoadingVoiceId(null);
        setPlayingVoiceId(voice.id);
      }).catch(() => {
        setLoadingVoiceId(null);
        if (abortController.signal.aborted) return;
        speakText(voice.sample || voice.name, {
          gender: voice.gender,
          onEnd: () => setPlayingVoiceId(null),
          onError: () => setPlayingVoiceId(null)
        });
      });
    };

    // 1. If voice has direct sampleUrl (e.g. from custom cloned voice)
    if (voice.sampleUrl) {
      setPlayingVoiceId(voice.id);
      const fullSrc = voice.sampleUrl.startsWith("http")
        ? voice.sampleUrl
        : `${apiUrl.replace(/\/$/, "")}${voice.sampleUrl.startsWith("/") ? "" : "/"}${voice.sampleUrl}`;
      playAudioSrc(fullSrc);
      return;
    }

    // 2. Check if we already cached this voice's preview audio URL
    if (audioCacheRef.current[voice.id]) {
      setPlayingVoiceId(voice.id);
      playAudioSrc(audioCacheRef.current[voice.id]);
      return;
    }

    // 3. Mark as loading so UI shows spinner and user knows it is generating
    setLoadingVoiceId(voice.id);

    try {
      const token = getJwt();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/agents/voice/preview`, {
        method: "POST",
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          text: voice.sample || `Hello, I am ${voice.name}`,
          voiceId: voice.id,
          voiceConfig: {
            voiceId: voice.id,
            gender: voice.gender,
            voiceSampleId: voice.voiceSampleId || null
          }
        })
      });

      if (abortController.signal.aborted) return;

      if (res.ok) {
        const data = await res.json();
        if (abortController.signal.aborted) return;

        if (data.audioUrl) {
          const fullSrc = data.audioUrl.startsWith("http")
            ? data.audioUrl
            : `${apiUrl.replace(/\/$/, "")}${data.audioUrl.startsWith("/") ? "" : "/"}${data.audioUrl}`;

          // Cache so subsequent clicks are instantaneous
          audioCacheRef.current[voice.id] = fullSrc;
          playAudioSrc(fullSrc);
          return;
        }
      }
    } catch (err) {
      if (err.name === "AbortError" || abortController.signal.aborted) {
        return; // Request was aborted cleanly, do nothing
      }
      /* Fallback to local speech */
    }

    if (abortController.signal.aborted) return;

    setLoadingVoiceId(null);
    setPlayingVoiceId(voice.id);

    // 4. Fallback to local browser TTS with appropriate persona gender
    speakText(voice.sample || `Hello, I am ${voice.name}`, {
      gender: voice.gender,
      onEnd: () => setPlayingVoiceId(null),
      onError: () => setPlayingVoiceId(null)
    });
  };

  // Start recording custom voice clip
  const handleStartRecording = async () => {
    try {
      voiceRecorderRef.current = new VoiceRecorder();
      await voiceRecorderRef.current.startRecording();
      setIsRecording(true);
      setRecordSeconds(0);
      setRecordedAudioBlob(null);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone error: " + err.message);
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (voiceRecorderRef.current) {
      const blob = await voiceRecorderRef.current.stopRecording();
      setRecordedAudioBlob(blob);
      setIsRecording(false);
    }
  };

  // Save custom voice and activate
  const handleSaveCustomVoice = async () => {
    const audioData = recordedAudioBlob || uploadedFile;
    if (!audioData) {
      alert("Please record or upload a voice audio sample first.");
      return;
    }

    setIsSavingVoice(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioData, "custom_voice.wav");
      formData.append("name", customVoiceName.trim() || "Custom Cloned Voice");
      formData.append("refText", customRefText.trim());

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
      const token = getJwt();
      const res = await fetch(`${apiUrl}/agents/voice/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await res.json();
      if (data.success && data.voice) {
        const newVoice = data.voice;
        const updatedCustomVoices = [newVoice, ...customVoices];
        setCustomVoices(updatedCustomVoices);
        localStorage.setItem("studio_custom_voices", JSON.stringify(updatedCustomVoices));

        setIsCreatingCustomVoice(false);
        setRecordedAudioBlob(null);
        setUploadedFile(null);
        setCustomVoiceName("");

        // Select the newly cloned voice!
        onSelectVoice(newVoice);
        onClose();
      } else {
        alert("Upload failed: " + (data.error || "Unknown server error"));
      }
    } catch (err) {
      alert("Error saving custom voice: " + err.message);
    } finally {
      setIsSavingVoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface-primary dark:bg-surface-secondary border border-border-primary rounded-2xl w-full max-w-4xl sm:max-w-5xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-primary/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FiMic className="text-base" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">Voice &amp; Persona Library</h2>
              <p className="text-xs text-text-muted">Select an expressive voice or clone your custom human voice via F5-TTS</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeech();
              setPlayingVoiceId(null);
              onClose();
            }}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-secondary/70 transition cursor-pointer"
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Action / Filter bar */}
        <div className="p-3 sm:p-4 border-b border-border-primary/40 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-surface-secondary/20">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
              <input
                type="text"
                placeholder="Search by voice name, accent or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-primary border border-border-primary/60 text-text-primary focus:outline-hidden focus:border-accent-primary"
              />
            </div>
            <div className="flex items-center gap-1 bg-surface-primary border border-border-primary/60 rounded-xl p-0.5 text-xs">
              {["all", "Female", "Male"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    genderFilter === g
                      ? "bg-accent-primary text-white shadow-2xs"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {g === "all" ? "All" : g}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Custom Voice Creator */}
          <button
            type="button"
            onClick={() => setIsCreatingCustomVoice(!isCreatingCustomVoice)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isCreatingCustomVoice
                ? "bg-surface-secondary border border-border-primary text-text-primary"
                : "bg-accent-primary hover:bg-accent-primary/90 text-white"
            }`}
          >
            {isCreatingCustomVoice ? (
              <>
                <FiChevronUp className="text-xs" />
                <span>Hide Voice Creator</span>
              </>
            ) : (
              <>
                <FiPlus className="text-xs" />
                <span>Clone Custom Voice (F5-TTS)</span>
              </>
            )}
          </button>
        </div>

        {/* Custom Voice Creator Panel */}
        {isCreatingCustomVoice && (
          <div className="p-4 bg-surface-secondary/40 border-b border-border-primary/40 space-y-3 animate-fadeIn shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <FiVolume2 className="text-accent-primary" />
                Create Cloned Voice Profile (Zero-Shot F5-TTS)
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCustomCreationMode("record")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    customCreationMode === "record"
                      ? "bg-accent-primary text-white"
                      : "bg-surface-primary text-text-muted hover:text-text-primary border border-border-primary/40"
                  }`}
                >
                  🎙️ Record Mic
                </button>
                <button
                  type="button"
                  onClick={() => setCustomCreationMode("upload")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    customCreationMode === "upload"
                      ? "bg-accent-primary text-white"
                      : "bg-surface-primary text-text-muted hover:text-text-primary border border-border-primary/40"
                  }`}
                >
                  📁 Upload .WAV / .MP3
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-semibold text-text-muted">Voice Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Voice, CEO Support, Alex Pro"
                  value={customVoiceName}
                  onChange={(e) => setCustomVoiceName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-primary border border-border-primary text-text-primary focus:outline-hidden focus:border-accent-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-semibold text-text-muted">
                  Reference Spoken Text (Transcript)
                </label>
                <input
                  type="text"
                  value={customRefText}
                  onChange={(e) => setCustomRefText(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-primary border border-border-primary text-text-primary focus:outline-hidden focus:border-accent-primary"
                />
              </div>
            </div>

            {/* Mode-specific input */}
            {customCreationMode === "record" ? (
              <div className="p-3 rounded-xl bg-surface-primary border border-border-primary/60 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-text-secondary block">
                    Read aloud for 6–10 seconds:
                  </span>
                  <p className="text-[11px] italic text-accent-primary">
                    &ldquo;{customRefText}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <FiSquare className="text-xs" />
                      <span>Stop ({recordSeconds}s)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-3 py-1.5 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FiMic className="text-xs" />
                      <span>{recordedAudioBlob ? "Re-record" : "Start Recording"}</span>
                    </button>
                  )}

                  {recordedAudioBlob && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <FiCheck className="text-xs" />
                      Sample ready ({recordSeconds}s)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-primary border border-border-primary/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-text-primary block">
                    Upload Clean Voice Clip (.wav or .mp3, 5-15 sec)
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {uploadedFile ? `Selected: ${uploadedFile.name}` : "24kHz mono WAV recommended"}
                  </span>
                </div>
                <label className="px-3 py-1.5 rounded-xl bg-surface-secondary hover:bg-surface-secondary/80 border border-border-primary text-text-primary text-xs font-medium cursor-pointer transition flex items-center gap-1.5">
                  <FiUploadCloud className="text-xs" />
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept="audio/wav,audio/mp3,audio/mpeg,audio/x-wav,audio/m4a"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {/* Save & Select Button */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingCustomVoice(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-text-muted hover:text-text-primary cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingVoice || (!recordedAudioBlob && !uploadedFile)}
                onClick={handleSaveCustomVoice}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isSavingVoice ? <span>Cloning with F5-TTS...</span> : <span>Save &amp; Use Voice</span>}
              </button>
            </div>
          </div>
        )}

        {/* Voice grid */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoiceId?.toLowerCase() === voice.id.toLowerCase();
            const isPlaying = playingVoiceId === voice.id;
            const isLoading = loadingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => {
                  stopAllAudio();
                  onSelectVoice(voice);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                  isSelected
                    ? "bg-accent-primary/5 border-accent-primary ring-1 ring-accent-primary shadow-xs"
                    : "bg-surface-primary hover:border-border-primary hover:shadow-2xs border-border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={voice.avatarUrl}
                      alt={voice.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-border-primary/60 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-text-primary truncate">{voice.name}</span>
                        <span className="text-xs">{voice.flag || "🎙️"}</span>
                      </div>
                      <span className="text-[11px] text-text-muted truncate block">{voice.accent}</span>
                      {isLoading && (
                        <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1 mt-0.5 animate-pulse">
                          <FiLoader className="animate-spin text-[10px]" /> Synthesizing voice...
                        </span>
                      )}
                      {isPlaying && (
                        <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                          <FiVolume2 className="text-[10px] animate-pulse" /> Playing sample...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handlePlayVoice(voice, e)}
                      className={`p-2 rounded-lg transition cursor-pointer text-xs flex items-center justify-center min-w-[30px] min-h-[30px] ${
                        isLoading
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : isPlaying
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-surface-secondary text-text-primary hover:bg-accent-primary hover:text-white"
                      }`}
                      title={
                        isLoading
                          ? "Generating voice preview..."
                          : isPlaying
                          ? "Stop audio"
                          : "Play sample"
                      }
                    >
                      {isLoading ? (
                        <FiLoader className="animate-spin text-xs" />
                      ) : isPlaying ? (
                        <FiSquare className="text-xs" />
                      ) : (
                        <FiPlay className="text-xs" />
                      )}
                    </button>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-xs">
                        <FiCheck />
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 mb-2">
                  {voice.description}
                </p>

                <div className="flex flex-wrap gap-1 mt-auto">
                  {voice.tags.map((t) => (
                    <span
                      key={t}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium ${
                        t.toLowerCase().includes("f5") || t.toLowerCase().includes("custom")
                          ? "bg-accent-primary/10 text-accent-primary border-accent-primary/30 font-bold"
                          : "bg-surface-secondary text-text-muted border-border-primary/40"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
