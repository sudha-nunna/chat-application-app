import React from "react";
import AvatarContainer from "../avatar/AvatarContainer";

/**
 * ThreeVisemeAvatar.jsx
 * Backward-compatibility wrapper delegating to production AvatarContainer.
 */
const ThreeVisemeAvatar = ({
  modelUrl,
  currentViseme = { viseme: "silence", shape: "rest" },
  isPlaying = false,
  isDark = true,
  onLoaded
}) => {
  const speechDataMock = isPlaying ? { text: "Speaking", visemes: [{ timeMs: 0, durationMs: 500, shape: currentViseme.shape }] } : null;

  return (
    <AvatarContainer
      modelUrl={modelUrl}
      speechData={speechDataMock}
      isAutoPlay={false}
      onSpeechEnd={onLoaded}
    />
  );
};

export default ThreeVisemeAvatar;
