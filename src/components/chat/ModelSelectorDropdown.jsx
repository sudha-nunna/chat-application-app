import { useState, useEffect, useRef } from "react";
import { FiChevronDown, FiCpu, FiStar, FiCheck, FiServer, FiLayers, FiZap } from "react-icons/fi";

const ModelSelectorDropdown = ({
  selectedModel = "auto",
  onSelectModel,
  userCredits,
  onOpenSelectionModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeServerTab, setActiveServerTab] = useState("all");
  const [selectedServerId, setSelectedServerId] = useState(() => localStorage.getItem("preferred_server_id") || "");
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchModels();
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchModels = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/models/available`);
      const data = await res.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        setModels(data.models);
      }
    } catch (err) {
      console.warn("Failed to load available models:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpen = () => {
    if (!isOpen && models.length === 0) {
      fetchModels();
    }
    setIsOpen(!isOpen);
  };

  const isAutoMode = !selectedModel || selectedModel === "auto" || selectedModel === "best";

  const currentModelDoc = isAutoMode
    ? {
        displayName: "Auto Cluster",
        serverName: "Any Active Node",
        promptTokenCostPer1k: 0.05,
        completionTokenCostPer1k: 0.1,
        tier: "FAST"
      }
    : models.find((m) => {
        if (selectedServerId && m.serverId) {
          return m.modelId === selectedModel && m.serverId === selectedServerId;
        }
        return m.modelId === selectedModel;
      }) || {
        displayName: selectedModel,
        serverName: "Active Server",
        promptTokenCostPer1k: 0.05,
        completionTokenCostPer1k: 0.1,
        tier: "BALANCED"
      };

  const servers = ["all", ...new Set(models.map((m) => m.serverName || m.provider || "openai"))];

  const filteredModels =
    activeServerTab === "all" || !servers.includes(activeServerTab)
      ? models
      : models.filter((m) => (m.serverName || m.provider || "openai") === activeServerTab);

  const inRate = currentModelDoc.promptTokenCostPer1k ?? 0.05;
  const outRate = currentModelDoc.completionTokenCostPer1k ?? 0.1;

  const handleItemClick = (m) => {
    const isCurrentlySelected =
      !isAutoMode &&
      m.modelId === selectedModel &&
      (!selectedServerId || !m.serverId || m.serverId === selectedServerId);

    if (isCurrentlySelected) {
      // Toggle / Deselect back to Auto Cluster (Any server can answer)
      onSelectModel("auto");
      setSelectedServerId("");
      try {
        localStorage.removeItem("preferred_model");
        localStorage.removeItem("preferred_ai_model");
        localStorage.removeItem("preferred_server_id");
      } catch {}
    } else {
      // Select specific model and its node
      onSelectModel(m.modelId);
      if (m.serverId) {
        setSelectedServerId(m.serverId);
        try {
          localStorage.setItem("preferred_server_id", m.serverId);
        } catch {}
      }
      try {
        localStorage.setItem("preferred_model", m.modelId);
        localStorage.setItem("preferred_ai_model", m.modelId);
      } catch {}
    }
    setIsOpen(false);
  };

  const handleSelectAuto = () => {
    onSelectModel("auto");
    setSelectedServerId("");
    try {
      localStorage.removeItem("preferred_model");
      localStorage.removeItem("preferred_ai_model");
      localStorage.removeItem("preferred_server_id");
    } catch {}
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left z-40" ref={dropdownRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer backdrop-blur-sm ${
          isAutoMode
            ? "border-amber-400/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            : "border-border-primary/70 bg-interactive-active/50 hover:bg-interactive-active text-text-primary"
        }`}
        title={`Selected: ${currentModelDoc.displayName} (${inRate} in • ${outRate} out per 1k)`}
      >
        {isAutoMode ? (
          <FiZap className="text-amber-400 text-xs shrink-0" />
        ) : (
          <FiCpu className="text-amber-400 text-xs shrink-0" />
        )}
        <span className="truncate max-w-[120px] sm:max-w-[160px] font-bold text-xs">
          {currentModelDoc.displayName}
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0 font-mono">
          {inRate}/1k in
        </span>
        <FiChevronDown
          className={`text-[10px] text-text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Compact Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 sm:w-92 rounded-2xl border border-border-primary bg-surface-primary dark:bg-interactive-base p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-120">
          {/* Header Bar */}
          <div className="px-2.5 py-2 border-b border-border-primary/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FiLayers className="text-amber-400 text-xs shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                AI Dispatch Options ({models.length})
              </span>
            </div>
            {onOpenSelectionModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSelectionModal();
                }}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition px-2 py-0.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20"
              >
                <FiServer className="text-[10px]" />
                <span>Switch Server</span>
              </button>
            )}
          </div>

          {/* Default Auto (Any Server) Option Card */}
          <div className="pt-2 pb-1">
            <div
              onClick={handleSelectAuto}
              onDoubleClick={handleSelectAuto}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                isAutoMode
                  ? "bg-amber-500/15 border-amber-400 text-text-primary font-bold shadow-xs ring-1 ring-amber-400/40"
                  : "bg-surface-secondary/30 border-border-primary/50 hover:border-amber-400/50 hover:bg-interactive-active/40 text-text-secondary hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400/15 flex items-center justify-center text-amber-400 shrink-0">
                  <FiZap className="text-sm" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                    <span>Auto Cluster</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                      Any Active Server
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted truncate">
                    Any online node can answer (Fastest)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-secondary border border-border-primary/40 text-amber-400 font-mono">
                  0.05 in • 0.1 out
                </span>
                {isAutoMode && <FiCheck className="text-emerald-400 text-xs font-bold" />}
              </div>
            </div>
          </div>

          {/* Active Server Filter Tabs */}
          {servers.length > 2 && (
            <div className="flex items-center gap-1 px-1 py-1.5 overflow-x-auto no-scrollbar border-b border-border-primary/30">
              {servers.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveServerTab(s)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer shrink-0 truncate max-w-[120px] ${
                    activeServerTab === s
                      ? "bg-amber-400 text-black shadow-xs"
                      : "bg-surface-secondary/40 text-text-muted hover:text-text-primary"
                  }`}
                >
                  {s === "all" ? "All Servers" : s}
                </button>
              ))}
            </div>
          )}

          {/* Model List */}
          <div className="max-h-56 overflow-y-auto py-1 space-y-1 custom-scrollbar">
            {filteredModels.length === 0 ? (
              <div className="py-4 text-center text-xs text-text-muted">
                No models found for this server.
              </div>
            ) : (
              filteredModels.map((m) => {
                const uniqueKey = m.serverId ? `${m.serverId}_${m.modelId}` : `${m.serverName || "node"}_${m.modelId}`;
                const isSelected =
                  !isAutoMode &&
                  m.modelId === selectedModel &&
                  (!selectedServerId || !m.serverId || m.serverId === selectedServerId);

                const mIn = m.promptTokenCostPer1k ?? 0.05;
                const mOut = m.completionTokenCostPer1k ?? 0.1;

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => handleItemClick(m)}
                    onDoubleClick={() => handleItemClick(m)}
                    title={isSelected ? "Click or Double-click to Deselect (returns to Auto Cluster)" : "Click to select"}
                    className={`px-2.5 py-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? "bg-interactive-active border-border-primary text-text-primary font-bold shadow-xs ring-1 ring-amber-400/40"
                        : "bg-surface-secondary/20 border-transparent hover:border-border-primary/50 hover:bg-interactive-active/40 text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {m.recommended && (
                          <FiStar className="text-amber-400 text-xs shrink-0" />
                        )}
                        <span className="truncate font-bold text-xs">
                          {m.displayName || m.modelId}
                        </span>
                        {m.isOnline && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Online" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-text-muted mt-0.5">
                        <span className="truncate">{m.serverName || "Cluster Node"}</span>
                        {m.tier && (
                          <span className="px-1 py-0.2 rounded bg-interactive-active text-[8px] font-bold uppercase tracking-wider font-mono">
                            {m.tier}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[8px] text-amber-400 font-semibold">(Click to deselect)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-secondary border border-border-primary/40 text-amber-400 font-mono">
                        {mIn} in • {mOut} out
                      </span>
                      {isSelected && (
                        <FiCheck className="text-emerald-400 text-xs font-bold" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="px-2.5 py-1.5 mt-1 border-t border-border-primary/40 bg-surface-secondary/20 rounded-b-xl flex items-center justify-between text-[10px] text-text-muted">
            <span>Minimum charge: <strong className="text-amber-400 font-mono">0.05 cr</strong></span>
            <span>Credits wallet: <strong className="text-text-primary font-mono">{userCredits ?? 100} cr</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelectorDropdown;

