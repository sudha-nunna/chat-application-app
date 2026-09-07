import { useState } from "react";
import {
  FiTag,
  FiClock,
  FiSave,
  FiCheck,
  FiChevronDown,
  FiEdit2
} from "react-icons/fi";
import { TbSparkles } from "react-icons/tb";

export default function FlowHeader({
  agentName,
  onNameChange,
  onOpenConductor,
  onSave,
  isSaving,
  onPublish,
  isPublishing,
  lastSavedTime,
  environment = "Development",
  onEnvironmentChange
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(agentName || "Conversation Flow Agent");
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("V0");

  const handleStartEdit = () => {
    setTitleInput(agentName || "Conversation Flow Agent");
    setIsEditingTitle(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && onNameChange) {
      onNameChange(titleInput.trim());
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    } else if (e.key === "Escape") {
      setTitleInput(agentName || "Conversation Flow Agent");
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="h-14 sm:h-15 border-b border-border-primary/60 px-3 sm:px-5 flex items-center justify-between shrink-0 bg-surface-primary/95 backdrop-blur-md z-30 gap-2 sm:gap-4 w-full select-none">
      {/* Left: Agent Title, Environment Badge, Autosave Indicator */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="text-sm sm:text-base font-bold text-text-primary bg-surface-secondary px-2 py-1 rounded-lg border border-accent-primary outline-hidden min-w-[160px] max-w-[280px]"
          />
        ) : (
          <div
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 cursor-pointer group hover:bg-surface-secondary/60 px-2 py-1 rounded-lg transition"
            title="Click to rename agent"
          >
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-text-primary truncate max-w-[160px] sm:max-w-[240px] md:max-w-[320px]">
              {agentName || "Conversation Flow Agent"}
            </h1>
            <FiEdit2 className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition" />
          </div>
        )}

        {/* Environment Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEnvDropdown(!showEnvDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-secondary/70 hover:bg-surface-secondary text-text-secondary border border-border-primary/60 transition cursor-pointer"
          >
            <FiTag className="text-[11px] text-text-muted" />
            <span className="truncate max-w-[90px]">{environment}</span>
            <FiChevronDown className="text-[10px] text-text-muted" />
          </button>

          {showEnvDropdown && (
            <div className="absolute left-0 top-full mt-1 w-36 bg-surface-primary dark:bg-surface-secondary border border-border-primary rounded-xl shadow-lg py-1 z-50 animate-fadeIn">
              {["Development", "Staging", "Production"].map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => {
                    if (onEnvironmentChange) onEnvironmentChange(env);
                    setShowEnvDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition cursor-pointer flex items-center justify-between ${
                    environment === env
                      ? "text-accent-primary font-bold bg-accent-primary/10"
                      : "text-text-primary hover:bg-surface-secondary"
                  }`}
                >
                  <span>{env}</span>
                  {environment === env && <FiCheck className="text-xs" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto saved status */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-text-muted">
          <FiClock className="text-[11px]" />
          <span>Auto saved at {lastSavedTime || "20:10"}</span>
        </div>
      </div>

      {/* Right: Studio action controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Version dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVersionDropdown(!showVersionDropdown)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border-primary/50 transition cursor-pointer"
          >
            <FiClock className="text-xs text-text-muted" />
            <span>{selectedVersion}</span>
          </button>

          {showVersionDropdown && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-surface-primary dark:bg-surface-secondary border border-border-primary rounded-xl shadow-lg py-1 z-50 animate-fadeIn">
              {["V0", "V1 (Draft)", "V2 (Live)"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setSelectedVersion(v);
                    setShowVersionDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-secondary cursor-pointer"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Save Draft Button (Replaces Test) */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || isPublishing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface-primary hover:bg-surface-secondary text-text-primary border border-border-primary/70 transition cursor-pointer shadow-2xs disabled:opacity-50"
          title="Save draft setup before publish"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <FiSave className="text-xs text-text-secondary" />
              <span>Save</span>
            </>
          )}
        </button>

        {/* Conductor Button */}
        <button
          type="button"
          onClick={onOpenConductor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition cursor-pointer shadow-2xs"
        >
          <TbSparkles className="text-xs text-purple-500" />
          <span>Conductor</span>
        </button>

        {/* Publish Button */}
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing || isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          {isPublishing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <span>Publish</span>
          )}
        </button>
      </div>
    </header>
  );
}
