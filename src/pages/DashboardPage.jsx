import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCpu,
  FiPlus,
  FiFileText,
  FiCode,
  FiTrash2,
  FiEdit2,
  FiMessageSquare,
  FiMic,
  FiZap,
  FiSearch,
  FiFilter,
  FiChevronRight,
  FiKey,
  FiX,
} from "react-icons/fi";
import { Sparkles } from "lucide-react";
import { backEndCallGet, backEndCallObjDel } from "../services/authService";
import ApiModal from "../components/bots/ApiModal";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient,
} from "../hooks/useTanStackData";

const DashboardPage = () => {
  const [selectedApiBot, setSelectedApiBot] = useState(null);
  const [apiModalMode, setApiModalMode] = useState("generate");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  const navigate = useNavigate();
  const queryClient = useTanStackQueryClient();

  // Keyboard shortcut: Cmd+K / Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 1. GET Route: Fetch agents using authService's backEndCallGet & useTanStackData hook
  const { data: bots = [], isLoading: loading } = useTanStackData(
    ["agents"],
    async () => {
      try {
        const res = await backEndCallGet("/agents");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        const fallback = await backEndCallGet("/bots");
        return Array.isArray(fallback) ? fallback : fallback?.data || [];
      }
    },
  );

  const filteredBots = bots.filter((bot) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      bot.name?.toLowerCase().includes(q) ||
      bot.model?.toLowerCase().includes(q) ||
      bot.description?.toLowerCase().includes(q)
    );
  });

  // 2. DELETE Route: Delete agent mutation
  const deleteBotMutation = useTanStackMutation({
    mutationFn: async (botId) => {
      try {
        return await backEndCallObjDel("/agents", botId);
      } catch {
        return await backEndCallObjDel("/bots", botId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      console.error("Failed to delete agent:", err);
    },
  });

  const handleDeleteBot = (e, botId) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this AI Agent and all its knowledge files?",
      )
    )
      return;
    deleteBotMutation.mutate(botId);
  };

  const handleEditBot = (e, bot) => {
    e.stopPropagation();
    navigate(`/agents/${bot._id}`);
  };

  // Helper for agent type metadata & styling
  const getBotTypeMeta = (type) => {
    switch (type) {
      case "VOICE":
        return {
          label: "Voice Agent",
          badgeClass:
            "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          iconBg: "bg-cyan-500/15 text-cyan-500 border-cyan-500/25",
          dotColor: "bg-cyan-500",
          icon: <FiMic className="text-base" />,
          accentGlow: "from-cyan-500/20 via-cyan-500/5 to-transparent",
        };
      case "ACTION":
        return {
          label: "Action Agent",
          badgeClass:
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          iconBg: "bg-amber-500/15 text-amber-500 border-amber-500/25",
          dotColor: "bg-amber-500",
          icon: <FiZap className="text-base" />,
          accentGlow: "from-amber-500/20 via-amber-500/5 to-transparent",
        };
      case "AVATAR":
        return {
          label: "Avatar Agent",
          badgeClass:
            "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
          iconBg: "bg-purple-500/15 text-purple-500 border-purple-500/25",
          dotColor: "bg-purple-500",
          icon: <Sparkles className="w-4 h-4" />,
          accentGlow: "from-purple-500/20 via-purple-500/5 to-transparent",
        };
      case "CHAT":
      default:
        return {
          label: "AI Agent",
          badgeClass:
            "bg-accent-primary/10 text-accent-primary border-accent-primary/30",
          iconBg: "bg-accent-primary/15 text-accent-primary border-accent-primary/25",
          dotColor: "bg-accent-primary",
          icon: <FiMessageSquare className="text-base" />,
          accentGlow: "from-accent-primary/20 via-accent-primary/5 to-transparent",
        };
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar bg-transparent text-text-primary">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">
              Multi-Agent AI Applications
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-bold uppercase tracking-wider border border-accent-primary/30 shadow-2xs">
              {bots.length} {bots.length === 1 ? "Agent" : "Agents"} Deployed
            </span>
          </div>
          <p className="text-xs mt-1.5 text-text-muted max-w-xl leading-relaxed">
           AI-powered conversations, voice interactions, and task automation in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate("/agents/new")}
            className="flex items-center gap-2 bg-accent-primary hover:opacity-95 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl shadow-sm transition active:scale-[0.98] cursor-pointer"
          >
            <FiPlus className="text-sm" />
            <span>Create New Agent</span>
          </button>
        </div>
      </div>

      {/* Search Bar Row (Category filter tabs removed) */}
      <div className="mb-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-xs text-text-muted font-medium">
          Showing {filteredBots.length} {filteredBots.length === 1 ? "Agent" : "Agents"}
        </div>
        <div className="relative flex items-center w-full sm:w-80">
          <div className="relative flex items-center w-full bg-white dark:bg-[#0c0e18] border border-border-primary/60 dark:border-white/10 rounded-xl px-3 py-2 focus-within:border-accent-primary/70 focus-within:ring-2 focus-within:ring-accent-primary/20 transition-all shadow-inner">
            <FiSearch className="text-xs text-text-muted mr-2 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, model..."
              className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none tracking-wide"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="text-text-muted hover:text-text-primary text-xs cursor-pointer ml-1.5"
                title="Clear search"
              >
                <FiX className="text-xs" />
              </button>
            ) : (
              <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-text-muted border border-border-primary/40 dark:border-white/10 shrink-0 select-none">
                ⌘K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-xs font-medium text-text-muted">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
          <span>Loading AI Agents & Workspaces...</span>
        </div>
      ) : bots.length === 0 ? (
        /* EMPTY STATE: "No Applications / Agents Found" */
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border-primary/60 rounded-3xl p-12 text-center my-8 bg-surface-secondary/40">
          <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary text-3xl mb-4 shadow-sm">
            <FiCpu />
          </div>
          <h3 className="text-lg font-bold text-text-primary">
            No AI Agents Created Yet
          </h3>
          <p className="text-xs text-text-muted max-w-sm mt-1.5 mb-6 leading-relaxed">
            Create your first specialized agent with custom instructions, conversation flows, and tool integrations.
          </p>
          <button
            onClick={() => navigate("/agents/new")}
            className="flex items-center gap-2 bg-accent-primary text-white hover:opacity-90 text-xs font-semibold px-5 py-3 rounded-xl shadow-md transition active:scale-[0.98] cursor-pointer"
          >
            <FiPlus className="text-base" />
            <span>Create Your First Agent</span>
          </button>
        </div>
      ) : filteredBots.length === 0 ? (
        /* FILTER EMPTY STATE */
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border-primary/60 rounded-3xl p-10 text-center my-6 bg-surface-secondary/30">
          <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center text-xl mb-3">
            <FiFilter />
          </div>
          <h3 className="text-sm font-bold text-text-primary">
            No matching agents found
          </h3>
          <p className="text-xs text-text-muted mt-1 mb-4 max-w-sm leading-relaxed">
            {searchQuery
              ? `No agents matched "${searchQuery}". Try searching a different term.`
              : `You don't have any agents yet. Create one to get started.`}
          </p>
          <div className="flex items-center gap-2.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-3.5 py-1.5 rounded-xl border border-border-primary text-xs font-semibold hover:bg-surface-secondary transition cursor-pointer"
              >
                Clear Search
              </button>
            )}
            <button
              onClick={() => navigate("/agents/new")}
              className="flex items-center gap-1.5 bg-accent-primary text-white text-xs font-semibold px-4.5 py-1.5 rounded-xl shadow-sm hover:opacity-90 transition cursor-pointer"
            >
              <FiPlus className="text-xs" />
              <span>Create your first AI Agent</span>
            </button>
          </div>
        </div>
      ) : (
        /* AGENTS & APPLICATIONS GRID - ULTRA CLEAN & SENIOR DEVELOPER GRADE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBots.map((bot) => {
            const meta = getBotTypeMeta(bot.botType);

            return (
              <div
                key={bot._id}
                onClick={() => navigate(`/agents/${bot._id}`)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border-primary/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#131522]/90 backdrop-blur-xl hover:border-accent-primary/60 dark:hover:border-accent-primary/50 hover:shadow-[0_18px_38px_-12px_rgba(0,0,0,0.25)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Top Subtle Ambient Accent Glow */}
                <div
                  className={`absolute -top-12 -left-12 w-36 h-36 rounded-full bg-gradient-to-br ${meta.accentGlow} blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
                />

                {/* Top Accent Hover Line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-primary/0 to-transparent group-hover:via-accent-primary transition-all duration-500" />

                <div>
                  {/* Card Header: Avatar on Left, [First: Bot Name], [Next: Model + Aside of Model: Chat Bot Badge] */}
                  <div className="flex items-start gap-3 mb-3.5">
                    {/* Compact Avatar Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105 border mt-0.5 ${meta.iconBg}`}
                    >
                      {bot.avatarEmoji ? (
                        <span className="text-lg">{bot.avatarEmoji}</span>
                      ) : (
                        meta.icon
                      )}
                    </div>

                    {/* Main Header Info */}
                    <div className="min-w-0 flex-1">
                      {/* First: Bot Name on top with Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-[15.5px] text-text-primary group-hover:text-accent-primary transition-colors truncate leading-tight">
                          {bot.name
                            ? bot.name.charAt(0).toUpperCase() + bot.name.slice(1)
                            : "Agent"}
                        </h3>

                        {/* Top-Right Quick Actions */}
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={(e) => handleEditBot(e, bot)}
                            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition cursor-pointer"
                            title="Edit Agent Configuration"
                          >
                            <FiEdit2 className="text-xs" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteBot(e, bot._id)}
                            disabled={deleteBotMutation.isPending}
                            className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                            title="Delete Agent"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      </div>

                      {/* Next: Model Name, Aside of Model Name: Chat Bot Badge */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {/* Model Chip */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-black/5 dark:bg-white/[0.06] border border-border-primary/60 dark:border-white/10 text-text-muted whitespace-nowrap">
                          <FiCpu className="text-[10px] shrink-0 text-text-muted/70" />
                          <span>{bot.model || "Default"}</span>
                        </span>

                        {/* Aside of Model: Chat Bot Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide whitespace-nowrap border ${meta.badgeClass}`}
                        >
                          <span className="relative flex h-1.5 w-1.5">
                            <span
                              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.dotColor}`}
                            />
                            <span
                              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${meta.dotColor}`}
                            />
                          </span>
                          <span>{meta.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description - Unclipped & Clean Line Height */}
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2 min-h-[38px] mb-3.5">
                    {bot.description ||
                      "Specialized AI agent sharing application knowledge base & API tools."}
                  </p>

                  {/* Capabilities & Knowledge Stats Strip */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                    {["CHAT", "HYBRID"].includes(bot.botType || "HYBRID") && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-[11px] text-text-secondary border border-border-primary/40 font-medium">
                        <FiFileText className="text-[11px] text-accent-primary" />
                        <span>{bot.fileCount || 0} Knowledge Files</span>
                      </span>
                    )}

                    {["ACTION", "HYBRID"].includes(bot.botType || "HYBRID") && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-[11px] text-text-secondary border border-border-primary/40 font-medium">
                        <FiCode className="text-[11px] text-amber-500" />
                        <span>{bot.apiCount || bot.apis?.length || 0} API Tools</span>
                      </span>
                    )}

                    {bot.botType === "VOICE" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[11px] border border-cyan-500/25 font-medium">
                        <FiMic className="text-[11px]" />
                        <span>Real-time Audio</span>
                      </span>
                    )}

                    {bot.botType === "ACTION" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] border border-amber-500/25 font-medium">
                        <FiZap className="text-[11px]" />
                        <span>Autonomous Execution</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Integration Keys & Open Studio CTA */}
                <div className="pt-3.5 border-t border-border-primary/50 dark:border-white/[0.06] flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedApiBot(bot);
                      setApiModalMode("generate");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-accent-primary px-2.5 py-1 rounded-lg hover:bg-accent-primary/10 transition cursor-pointer"
                  >
                    <FiKey className="text-xs text-accent-primary" />
                    <span>+ API Keys</span>
                  </button>

                  <div className="inline-flex items-center gap-1 text-xs font-bold text-accent-primary group-hover:translate-x-1 transition-transform">
                    <span>Open Studio</span>
                    <FiChevronRight className="text-sm" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* API MODAL */}
      {selectedApiBot && (
        <ApiModal
          bot={selectedApiBot}
          initialMode={apiModalMode}
          onClose={() => setSelectedApiBot(null)}
          onApiUpdated={() => queryClient.invalidateQueries({ queryKey: ["bots"] })}
        />
      )}
    </div>
  );
};

export default DashboardPage;

