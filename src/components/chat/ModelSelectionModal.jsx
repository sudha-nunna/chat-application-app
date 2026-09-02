import { useState, useEffect } from "react";
import {
  FiServer,
  FiCheck,
  FiX,
  FiZap,
  FiShield,
  FiActivity
} from "react-icons/fi";

// Dynamic icon & badge helper based on server name / format
const getServerDetails = (serverName = "", format = "") => {
  const s = serverName.toLowerCase();
  const f = format.toLowerCase();

  if (s.includes("gemini") || f.includes("gemini")) {
    return { name: serverName, icon: "✨", badge: "Google Gemini Cloud" };
  }
  if (s.includes("glm") || s.includes("nvidia") || s.includes("zhipu") || f.includes("glm")) {
    return { name: serverName, icon: "🌐", badge: "GLM Reasoning API" };
  }
  if (s.includes("codegene") || s.includes("vllm") || f.includes("openai")) {
    return { name: serverName, icon: "⚡", badge: "vLLM / High-Speed Node" };
  }
  if (s.includes("ollama") || s.includes("llama") || f.includes("ollama")) {
    return { name: serverName, icon: "🦙", badge: "Local GPU Cluster" };
  }
  if (s.includes("groq") || f.includes("groq")) {
    return { name: serverName, icon: "🚀", badge: "Groq LPU Engine" };
  }
  return {
    name: serverName,
    icon: "🖥️",
    badge: "Active AI Server"
  };
};

const ModelSelectionModal = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  userCredits = 100
}) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServerId, setSelectedServerId] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchActiveServers();
    }
  }, [isOpen]);

  const fetchActiveServers = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/models/available`);
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        // Group distinct active servers
        const serverMap = new Map();

        data.models.forEach((m) => {
          const sId = m.serverId || m.serverName || m.provider;
          if (!serverMap.has(sId)) {
            serverMap.set(sId, {
              serverId: sId,
              serverName: m.serverName || sId,
              format: m.serverFormat || m.provider || "openai",
              defaultModelId: m.modelId,
              displayName: m.displayName,
              promptTokenCostPer1k: m.promptTokenCostPer1k ?? 0.05,
              completionTokenCostPer1k: m.completionTokenCostPer1k ?? 0.1,
              modelsCount: m.modelsCount || 1
            });
          } else {
            const existing = serverMap.get(sId);
            if (m.modelsCount) {
              existing.modelsCount = Math.max(existing.modelsCount, m.modelsCount);
            } else {
              existing.modelsCount += 1;
            }
          }
        });

        const serverList = Array.from(serverMap.values());
        setServers(serverList);

        if (serverList.length > 0) {
          // Select server matching current model or first active server
          const matching = serverList.find((s) => s.defaultModelId === selectedModel) || serverList[0];
          setSelectedServerId(matching.serverId);
        }
      }
    } catch (err) {
      console.warn("Error fetching active servers:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentServer =
    servers.find((s) => s.serverId === selectedServerId) || servers[0] || {
      serverName: "Active Server",
      promptTokenCostPer1k: 0.05,
      completionTokenCostPer1k: 0.1,
      defaultModelId: "default",
      modelsCount: 1
    };

  const handleConfirm = () => {
    if (currentServer && currentServer.defaultModelId) {
      onSelectModel(currentServer.defaultModelId);
      try {
        localStorage.setItem("preferred_model", currentServer.defaultModelId);
        localStorage.setItem("preferred_ai_model", currentServer.defaultModelId);
        localStorage.setItem("preferred_server_name", currentServer.serverName);
      } catch {}
    }
    onClose();
  };

  const inRate = currentServer?.promptTokenCostPer1k ?? 0.05;
  const outRate = currentServer?.completionTokenCostPer1k ?? 0.1;
  const minFloor = 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity bg-black/75"
        onClick={onClose}
      />

      {/* Compact Dialog Box */}
      <div className="relative w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden z-10 my-auto bg-surface-primary dark:bg-interactive-base border-border-primary text-text-primary animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between border-border-primary/60 bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold shadow-inner">
              <FiServer />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-text-primary">
                Select Active AI Server
              </h2>
              <p className="text-[10px] text-text-muted">
                {servers.length} active server{servers.length === 1 ? "" : "s"} online in cluster
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-interactive-active/40 transition cursor-pointer"
          >
            <FiX className="text-sm" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center justify-between">
              <span>Choose Active Server</span>
              <span className="text-[10px] text-amber-400 font-semibold lowercase">
                {servers.length} available
              </span>
            </label>

            {loading ? (
              <div className="py-8 text-center text-xs text-text-muted">
                Loading active cluster servers...
              </div>
            ) : servers.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted border border-dashed rounded-xl border-border-primary/60">
                No active AI servers currently available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {servers.map((s) => {
                  const meta = getServerDetails(s.serverName, s.format);
                  const isSelected = selectedServerId === s.serverId;

                  return (
                    <button
                      key={s.serverId}
                      type="button"
                      onClick={() => setSelectedServerId(s.serverId)}
                      className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-amber-400 bg-amber-500/10 text-text-primary shadow-xs ring-1 ring-amber-400/40"
                          : "border-border-primary/50 bg-surface-secondary/20 hover:border-border-primary text-text-secondary hover:text-text-primary hover:bg-surface-secondary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-lg">{meta.icon}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-secondary/80 border border-border-primary/50 text-amber-400 font-mono">
                            {s.modelsCount} {s.modelsCount === 1 ? "model" : "models"}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Online" />
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-xs font-bold truncate text-text-primary">
                          {s.serverName}
                        </div>
                        <div className="text-[10px] text-text-muted font-medium truncate mt-0.5">
                          {meta.badge}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-border-primary/30 flex items-center justify-between text-[9px] text-text-muted font-mono">
                        <span>Rate:</span>
                        <span className="font-bold text-amber-400/90">
                          {s.promptTokenCostPer1k} in • {s.completionTokenCostPer1k} out
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Token Consumption Rate Pill */}
          <div className="p-3 rounded-xl border border-border-primary/50 bg-surface-secondary/20 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-text-muted">
              <span>Selected Server:</span>
              <span className="font-bold text-text-primary">
                {currentServer.serverName}
              </span>
            </div>
            <div className="flex items-center justify-between text-text-muted">
              <span>Token Consumption Rate:</span>
              <span className="font-bold text-text-primary font-mono">
                {inRate} in • {outRate} out (per 1k tokens)
              </span>
            </div>
            <div className="flex items-center justify-between text-text-muted">
              <span>Minimum Request Charge:</span>
              <span className="font-bold text-amber-400 font-mono">
                {minFloor} cr floor
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-primary/50 bg-surface-secondary/30 flex items-center justify-between">
          <div className="text-[11px] text-text-muted">
            Wallet:{" "}
            <span className="font-bold text-amber-400 font-mono">
              {typeof userCredits === "number"
                ? userCredits.toLocaleString()
                : (userCredits || 100)}{" "}
              cr
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border-primary/60 hover:bg-interactive-active text-text-muted hover:text-text-primary text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FiCheck className="text-xs" />
              <span>Confirm & Start Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelectionModal;

