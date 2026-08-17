import React, { useState, useEffect, useRef } from "react";
import { FiVolume2, FiVolumeX, FiPlay, FiPause, FiUser } from "react-icons/fi";
import AvatarContainer from "../avatar/AvatarContainer";

const DEFAULT_FACE_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";

const VisemeAvatarPlayer = ({ speechData, avatarConfig = {}, isAutoPlay = true, onSpeechEnd, isExternalMuted = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(isExternalMuted);
  const [currentViseme, setCurrentViseme] = useState({ viseme: "silence", shape: "rest" });
  const [progress, setProgress] = useState(0);

  const audioRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    setIsMuted(isExternalMuted);
  }, [isExternalMuted]);

  const faceUrl = avatarConfig?.faceImageUrl || avatarConfig?.avatarImage || avatarConfig?.faceVideoUrl || avatarConfig?.avatarVideo || speechData?.avatarImage || DEFAULT_FACE_AVATAR;

  const hasCustom2DImage = Boolean((avatarConfig?.faceImageUrl || avatarConfig?.avatarImage) && avatarConfig?.avatarProvider === "LOCAL_VISEME");
  const hasCustomVideo = Boolean((avatarConfig?.faceVideoUrl || avatarConfig?.avatarVideo) && avatarConfig?.avatarProvider === "VIDEO_AVATAR");

  const isVideoAvatar = hasCustomVideo;
  const is3DAvatar = avatarConfig?.avatarProvider === "THREE_3D" || (!hasCustom2DImage && !hasCustomVideo);
  let model3DUrl = avatarConfig?.faceModelUrl || avatarConfig?.avatar3DModel || "/models/viverse_avatar_model_210287.vrm";
  if (!model3DUrl) {
    model3DUrl = "/models/viverse_avatar_model_210287.vrm";
  }

  useEffect(() => {
    if (!speechData) return;

    // Trigger Web Speech API TTS for spoken vocal playback
    let synthUtterance = null;
    if (typeof window !== "undefined" && window.speechSynthesis && speechData.text && !isMuted) {
      try {
        window.speechSynthesis.cancel();
        const textToSpeak = speechData.text.replace(/[*_#`~]/g, " ").trim();
        if (textToSpeak) {
          synthUtterance = new SpeechSynthesisUtterance(textToSpeak);
          synthUtterance.rate = 1.0;
          synthUtterance.pitch = 1.0;
          synthUtterance.onstart = () => setIsPlaying(true);
          synthUtterance.onend = () => {
            setIsPlaying(false);
            setCurrentViseme({ viseme: "silence", shape: "rest" });
            setProgress(100);
            if (onSpeechEnd) onSpeechEnd();
          };
          if (isAutoPlay) {
            window.speechSynthesis.speak(synthUtterance);
          }
        }
      } catch (err) {
        console.warn("SpeechSynthesis error:", err);
      }
    }

    if (speechData.audioUrl) {
      const audio = new Audio(speechData.audioUrl);
      audioRef.current = audio;
      audio.muted = isMuted;

      const handleEnded = () => {
        if (!synthUtterance) {
          setIsPlaying(false);
          setCurrentViseme({ viseme: "silence", shape: "rest" });
          setProgress(100);
          if (onSpeechEnd) onSpeechEnd();
        }
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);

      if (isAutoPlay && !synthUtterance) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.warn("Auto-play prevented by browser policy:", e.message);
            setIsPlaying(false);
          });
        }
      }

      return () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (audio) {
          audio.pause();
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("play", handlePlay);
          audio.removeEventListener("pause", handlePause);
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }
  }, [speechData]);

  // Synchronize speech timestamp with visemes array for real-time mouth morph lip sync animation
  useEffect(() => {
    let playStartMs = Date.now();

    const updateSync = () => {
      if (isPlaying) {
        let currentTimeMs = 0;
        if (audioRef.current && audioRef.current.currentTime > 0) {
          currentTimeMs = audioRef.current.currentTime * 1000;
          const durationMs = audioRef.current.duration ? audioRef.current.duration * 1000 : 1;
          setProgress(Math.min((currentTimeMs / durationMs) * 100, 100));
        } else {
          currentTimeMs = Date.now() - playStartMs;
          const targetDuration = speechData?.durationMs || 3000;
          setProgress(Math.min((currentTimeMs / targetDuration) * 100, 100));
        }

        if (speechData && Array.isArray(speechData.visemes) && speechData.visemes.length > 0) {
          const matched = speechData.visemes.find(
            (v) => currentTimeMs >= v.timeMs && currentTimeMs <= v.timeMs + v.durationMs
          );
          if (matched) {
            setCurrentViseme(matched);
          } else {
            setCurrentViseme({ viseme: "silence", shape: "rest" });
          }
        } else if (isPlaying) {
          // Dynamic speech viseme cadence generator matching audio playback
          const cycleMs = currentTimeMs % 900;
          let shape = "rest";
          let viseme = "silence";
          if (cycleMs < 150) { shape = "A"; viseme = "ah"; }
          else if (cycleMs < 350) { shape = "E"; viseme = "ee"; }
          else if (cycleMs < 550) { shape = "O"; viseme = "oh"; }
          else if (cycleMs < 750) { shape = "U"; viseme = "oo"; }
          else if (cycleMs < 850) { shape = "M"; viseme = "mm"; }
          setCurrentViseme({ viseme, shape });
        }
      }
      animFrameRef.current = requestAnimationFrame(updateSync);
    };

    if (isPlaying) {
      playStartMs = Date.now();
      animFrameRef.current = requestAnimationFrame(updateSync);
    } else {
      setCurrentViseme({ viseme: "silence", shape: "rest" });
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speechData]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Viseme mouth morph scale parameters based on active mouth shape ("A", "E", "O", "M", "rest")
  const getMouthTransform = (shape) => {
    switch (shape) {
      case "A":
        return { scaleX: 1.15, scaleY: 1.1, borderRadius: "45%" };
      case "E":
        return { scaleX: 1.35, scaleY: 0.6, borderRadius: "30%" };
      case "O":
        return { scaleX: 0.75, scaleY: 1.25, borderRadius: "50%" };
      case "U":
        return { scaleX: 0.65, scaleY: 0.8, borderRadius: "50%" };
      case "M":
        return { scaleX: 0.95, scaleY: 0.15, borderRadius: "20%" };
      case "F":
        return { scaleX: 1.05, scaleY: 0.35, borderRadius: "35%" };
      case "L":
        return { scaleX: 1.1, scaleY: 0.8, borderRadius: "40%" };
      default:
        return { scaleX: 1.0, scaleY: 0.25, borderRadius: "50%" };
    }
  };

  const mouthTransform = getMouthTransform(currentViseme.shape);

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/60 shadow-xl group">
      {/* Avatar Container */}
      <div className="relative w-full h-56 bg-slate-950 flex items-center justify-center overflow-hidden">
        {is3DAvatar ? (
          <AvatarContainer
            modelUrl={model3DUrl}
            speechData={null}
            avatarConfig={avatarConfig}
            isAutoPlay={isAutoPlay}
            onSpeechEnd={onSpeechEnd}
            currentVisemeOverride={currentViseme.shape}
            isPlaying={isPlaying}
            avatarStateOverride={isPlaying ? "SPEAKING" : "IDLE"}
          />
        ) : isVideoAvatar ? (
          <video
            src={faceUrl}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={faceUrl}
              alt="AI Video Avatar"
              className="w-full h-full object-cover filter brightness-[0.98] contrast-[1.02]"
              onError={(e) => { e.target.src = DEFAULT_FACE_AVATAR; }}
            />
            {/* Photorealistic Anatomical Lip & Teeth Sync Overlay */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75 ease-out flex flex-col items-center justify-center overflow-hidden"
              style={{
                top: "67%",
                width: "32px",
                height: isPlaying && currentViseme.shape !== "rest" ? "18px" : "3px",
                transform: `translateX(-50%) scale(${mouthTransform.scaleX}, ${mouthTransform.scaleY})`,
                backgroundColor: currentViseme.shape === "rest" ? "rgba(15, 23, 42, 0.5)" : "#1c0606",
                borderRadius: mouthTransform.borderRadius,
                borderTop: isPlaying && currentViseme.shape !== "rest" ? "2px solid #b91c1c" : "none",
                borderBottom: isPlaying && currentViseme.shape !== "rest" ? "2px solid #991b1b" : "none"
              }}
            >
              {isPlaying && currentViseme.shape !== "rest" && (
                <>
                  <div className="w-4/5 h-[3px] bg-slate-100/90 rounded-sm mb-0.5 shadow-sm" />
                  <div className="w-3/5 h-[3px] bg-rose-600/80 rounded-full mt-auto" />
                </>
              )}
            </div>
          </div>
        )}

        {/* Live Speaking Indicator Overlay */}
        {isPlaying && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/85 backdrop-blur-md text-white text-xs font-semibold shadow-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Speaking...</span>
          </div>
        )}

        {/* Audio Waveform Animation when playing */}
        {isPlaying && (
          <div className="absolute bottom-3 right-3 flex items-end gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
            <span className="w-1 bg-red-400 rounded-full animate-[bounce_0.8s_infinite_100ms]" style={{ height: "12px" }} />
            <span className="w-1 bg-red-400 rounded-full animate-[bounce_0.8s_infinite_300ms]" style={{ height: "18px" }} />
            <span className="w-1 bg-red-400 rounded-full animate-[bounce_0.8s_infinite_200ms]" style={{ height: "10px" }} />
            <span className="w-1 bg-red-400 rounded-full animate-[bounce_0.8s_infinite_400ms]" style={{ height: "15px" }} />
          </div>
        )}
      </div>

      {/* Progress Bar & Audio Player Controls */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
        <button
          onClick={togglePlayPause}
          className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-transform active:scale-95 shadow-md flex items-center justify-center"
          title={isPlaying ? "Pause Speech" : "Play Speech"}
        >
          {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} className="ml-0.5" />}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-500 to-amber-500 h-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Viseme: {currentViseme.shape}</span>
            <span>{isPlaying ? "Playing" : "Paused"}</span>
          </div>
        </div>

        <button
          onClick={toggleMute}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
        </button>
      </div>
    </div>
  );
};

export default VisemeAvatarPlayer;
