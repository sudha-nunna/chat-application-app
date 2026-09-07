import { TbRobotFace } from "react-icons/tb";
import { FiMessageSquare } from "react-icons/fi";

const ModeTransitionOverlay = ({ targetMode, isVisible }) => {
  if (!isVisible) return null;

  const isAgent = targetMode === "agents";

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-black/20 dark:bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in zoom-in-95">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/95 dark:bg-[#191A24]/95 border border-border-primary/60 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
            isAgent
              ? "bg-accent-primary text-white shadow-md shadow-accent-primary/30 animate-pulse"
              : "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
          }`}
        >
          {isAgent ? <TbRobotFace /> : <FiMessageSquare />}
        </div>
        <div>
          <p className="text-xs font-bold text-text-primary">
            {isAgent ? "Entering Agent Mode" : "Switching to General Chat"}
          </p>
          <p className="text-[10px] text-text-muted">
            {isAgent
              ? "Loading AI Studio & Knowledge Agents..."
              : "Returning to conversations..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModeTransitionOverlay;
