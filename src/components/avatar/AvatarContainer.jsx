import React, { useEffect, useRef, useState, useCallback } from "react";
import AvatarStateMachine, { AVATAR_STATES } from "./AvatarStateMachine";
import AudioController from "./AudioController";
import AvatarRenderer from "./AvatarRenderer";
import AvatarErrorBoundary from "./AvatarErrorBoundary";

/**
 * AvatarContainer.jsx
 * Master container orchestrating 3D digital human state machine, speech audio, visemes, and camera framing.
 */
export const AvatarContainer = ({
  modelUrl,
  speechData = null,
  avatarConfig = {},
  isAutoPlay = true,
  onSpeechEnd,
  currentVisemeOverride = null,
  isPlaying = false,
  avatarStateOverride = null,
  className = ""
}) => {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  const [avatarState, setAvatarState] = useState(AVATAR_STATES.IDLE);
  const [currentViseme, setCurrentViseme] = useState("rest");
  const [cursorTarget, setCursorTarget] = useState({ x: 0, y: 0 });
  const [loadingModel, setLoadingModel] = useState(true);

  // Auto-dismiss loading spinner after 3.5s max so UI is never stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingModel(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const stateMachineRef = useRef(
    new AvatarStateMachine(AVATAR_STATES.IDLE, (newState) => {
      setAvatarState(newState);
    })
  );

  const audioControllerRef = useRef(
    new AudioController(
      (shape) => setCurrentViseme(shape),
      (state) => stateMachineRef.current.transitionTo(state),
      () => {
        if (onSpeechEnd) onSpeechEnd();
      }
    )
  );

  // Sync external avatarStateOverride / isPlaying if passed from parent player
  useEffect(() => {
    if (avatarStateOverride) {
      stateMachineRef.current.transitionTo(avatarStateOverride);
    } else if (isPlaying) {
      stateMachineRef.current.transitionTo(AVATAR_STATES.SPEAKING);
    }
  }, [avatarStateOverride, isPlaying]);

  // Sync external currentVisemeOverride if passed from parent player
  useEffect(() => {
    if (currentVisemeOverride) {
      setCurrentViseme(currentVisemeOverride);
    }
  }, [currentVisemeOverride]);

  // Trigger speech playback whenever speechData prop changes
  useEffect(() => {
    if (speechData) {
      audioControllerRef.current.playSpeech(speechData);
    } else {
      audioControllerRef.current.stopSpeech();
      stateMachineRef.current.transitionTo(AVATAR_STATES.IDLE);
    }

    return () => {
      audioControllerRef.current.stopSpeech();
    };
  }, [speechData]);

  // Handle Mouse Hover Gaze Tracking
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setCursorTarget({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y))
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursorTarget({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full min-h-[220px] flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 ${className}`}
    >
      <AvatarErrorBoundary>
        <AvatarRenderer
          modelUrl={modelUrl || avatarConfig?.faceModelUrl || avatarConfig?.avatar3DModel}
          avatarState={avatarState}
          currentViseme={currentViseme}
          sentimentText={speechData?.text || ""}
          cursorTarget={cursorTarget}
          onLoaded={() => setLoadingModel(false)}
          animRef={animRef}
        />
      </AvatarErrorBoundary>

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-white text-xs gap-2 z-10">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading 3D Digital Human Avatar...</span>
        </div>
      )}

      {/* Live State Badge Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-semibold">
        <span
          className={`w-2 h-2 rounded-full ${
            avatarState === AVATAR_STATES.SPEAKING
              ? "bg-rose-500 animate-ping"
              : avatarState === AVATAR_STATES.THINKING
              ? "bg-amber-400 animate-pulse"
              : avatarState === AVATAR_STATES.LISTENING
              ? "bg-emerald-400 animate-pulse"
              : "bg-blue-400"
          }`}
        />
        <span className="uppercase tracking-wider font-mono">{avatarState}</span>
      </div>
    </div>
  );
};

export default AvatarContainer;
