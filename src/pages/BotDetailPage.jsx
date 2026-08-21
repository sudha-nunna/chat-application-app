import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiCpu,
  FiMessageSquare,
  FiCode,
  FiTrash2,
  FiArrowLeft,
  FiFileText,
  FiEdit2
} from "react-icons/fi";
import { NobackEndCall, backEndCallObjDel } from "../services/authService";
import BotChatTab from "../components/bots/BotChatTab";
import BotApiTab from "../components/bots/BotApiTab";
import BotKnowledgeTab from "../components/bots/BotKnowledgeTab";
import BotAvatarTab from "../components/bots/BotAvatarTab";
import EditBotModal from "../components/bots/EditBotModal";
import { useTheme } from "../context/ThemeContext";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient
} from "../hooks/useTanStackData";

const BotDetailPage = () => {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "knowledge" | "apis"
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  // 1. GET Route: Fetch Bot Details using authService & useTanStackData
  const {
    data: bot = null,
    isLoading: loading,
    refetch: fetchBotDetails
  } = useTanStackData(
    ["bot", botId],
    async () => {
      const res = await NobackEndCall(`/bots/${botId}`);
      return res?.data || res;
    },
    { enabled: !!botId }
  );

  // Auto-set default active tab to primary Studio Chat experience for all bot types
  useEffect(() => {
    if (bot?.botType) {
      setActiveTab("chat");
    }
  }, [bot?._id, bot?.botType]);

  // 2. DELETE Route: Delete bot mutation using authService & useTanStackMutation
  const deleteBotMutation = useTanStackMutation({
    mutationFn: async () => {
      return await backEndCallObjDel("/bots", botId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      navigate("/dashboard");
    },
    onError: (err) => {
      console.error("Failed to delete bot:", err);
    }
  });

  const handleDeleteBot = () => {
    if (!bot) return;
    if (!window.confirm(`Are you sure you want to delete '${bot.name}' and all its knowledge files?`)) return;
    deleteBotMutation.mutate();
  };

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center text-xs font-medium ${isDark ? "text-text-primary" : "text-text-primary"
        }`}>
        Loading Bot Configuration...
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h3 className={`text-base font-bold ${isDark ? "text-text-muted" : "text-text-primary"}`}>Bot Not Found</h3>
        <p className={`text-xs mt-1 mb-4 ${isDark ? "text-text-primary" : "text-text-primary"}`}>
          This AI Agent does not exist or you do not have permission.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
        >
          <FiArrowLeft /> Back to Dashboard
        </button>
      </div>
    );
  }

  const currentBotType = bot?.botType || "HYBRID";

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${"bg-transparent text-text-primary"
      }`}>

      {/* BOT HEADER BAR */}
      <div className={` p-2 md:p-3 md:p-5 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-2 lg:gap-4 ${isDark ? "border-border-primary bg-interactive-base" : "border-border-primary bg-white"
        }`}>
        <div className="flex items-start sm:items-center gap-3 w-full xl:w-auto min-w-0">
          <button
            onClick={() => navigate("/dashboard")}
            className={`shrink-0 p-2 rounded-lg transition ${isDark ? "text-text-primary hover:text-white hover:bg-interactive-active" : "text-text-primary hover:text-text-primary hover:bg-surface-secondary"
              }`}
            title="Back to Dashboard"
          >
            <FiArrowLeft className="text-lg" />
          </button>

          <div className="shrink-0 w-10 h-10 rounded-xl bg-interactive-base/20 border border-border-primary/30 flex items-center justify-center text-text-primary text-xl font-bold">
            <FiCpu />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`text-base font-bold truncate max-w-full ${isDark ? "text-text-muted" : "text-text-primary"}`}>{bot.name}</h1>
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${"bg-surface-primary text-text-primary"
                }`}>
                {bot.model}
              </span>
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-semibold border ${
                currentBotType === "VOICE" ? "bg-interactive-base/10 text-text-primary border-border-primary/30" :
                currentBotType === "ACTION" ? "bg-amber-900/10 text-amber-800 border-amber-800/30" :
                currentBotType === "AVATAR" ? "bg-interactive-base/10 text-text-primary border-border-primary/30" :
                currentBotType === "CHAT" ? "bg-interactive-base/10 text-text-primary border-border-primary/30" :
                "bg-interactive-base/10 text-text-primary border-border-primary/30"
              }`}>
                {currentBotType === "VOICE" ? "🎙️ Voice Agent" :
                 currentBotType === "ACTION" ? "⚡ Action Agent" :
                 currentBotType === "AVATAR" ? "🎭 Avatar Agent" :
                 currentBotType === "CHAT" ? "💬 Knowledge Chatbot" : "🌐 Hybrid Assistant"}
              </span>
            </div>
            <p className={`text-xs truncate max-w-full mt-0.5 ${isDark ? "text-text-primary" : "text-text-primary"}`}>
              {bot.description || "Isolated multi-tenant RAG bot with dedicated knowledge base."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar w-full xl:w-auto pb-1">
          <div className={`shrink-0 flex items-center gap-3 text-xs px-3 py-1.5 rounded-lg border ${isDark ? "text-text-primary bg-interactive-active border-border-primary" : "text-text-primary bg-surface-secondary border-border-primary"
            }`}>
            {(["CHAT", "HYBRID"].includes(currentBotType)) && (
              <span className="flex items-center gap-1">
                <FiFileText className="text-text-primary" />
                <strong className={isDark ? "text-text-muted" : "text-text-primary"}>{bot.fileCount || 0}</strong> Files
              </span>
            )}

            {(["ACTION", "HYBRID"].includes(currentBotType)) && (
              <span className="flex items-center gap-1">
                <FiCode className="text-text-primary" />
                <strong className={isDark ? "text-text-muted" : "text-text-primary"}>{bot.apiCount || 0}</strong> APIs
              </span>
            )}

            {(["AVATAR", "VOICE"].includes(currentBotType)) && (
              <span className="flex items-center gap-1">
                <span className="text-text-primary">🎭</span>
                <strong className={isDark ? "text-text-muted" : "text-text-primary"}>
                  {currentBotType === "AVATAR" ? (bot.avatarProvider || "3D VRM Canvas") : (bot.voiceProfile?.voiceId || "Voice Enabled")}
                </strong>
              </span>
            )}

            {bot.rulesConfig?.rulesCount !== undefined && (
              <span className="flex items-center gap-1">
                <span className="text-amber-800">📜</span>
                <strong className={isDark ? "text-text-muted" : "text-text-primary"}>{bot.rulesConfig.rulesCount}</strong> Rules
              </span>
            )}
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 bg-interactive-base/10 hover:bg-interactive-base/20 text-text-primary border border-border-primary/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            title="Upgrade Agent Capabilities (Enable Voice, Avatar, REST Actions)"
          >
            <FiEdit2 className="text-xs" />
            <span>Upgrade Capabilities</span>
          </button>

          <button
            onClick={handleDeleteBot}
            className={`shrink-0 p-2 rounded-lg transition ${isDark ? "text-text-primary hover:text-text-primary hover:bg-interactive-base/40" : "text-text-primary hover:text-text-primary hover:bg-interactive-base"
              }`}
            title="Delete Bot"
          >
            <FiTrash2 className="text-base" />
          </button>
        </div>
      </div>

      {/* EDIT BOT MODAL */}
      {isEditModalOpen && (
        <EditBotModal
          bot={bot}
          onClose={() => setIsEditModalOpen(false)}
          onBotUpdated={() => fetchBotDetails()}
        />
      )}

      {/* TAB NAVIGATION BAR (Dynamic based on botType) */}
      <div className={`flex border-b px-4 text-nowrap overflow-x-auto overflow-y-hidden ${isDark ? "border-border-primary bg-interactive-base/60" : "border-border-primary bg-surface-secondary/60"
        }`}>
        {/* Primary Studio Chat Tab */}
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${activeTab === "chat"
              ? "border-border-primary text-text-primary bg-interactive-base/10"
              : isDark ? "border-transparent text-text-primary hover:text-text-muted" : "border-transparent text-text-primary hover:text-text-primary"
            }`}
        >
          <FiMessageSquare />
          <span>
            {currentBotType === "AVATAR" ? "🎭 3D Avatar Chat Studio" :
             currentBotType === "VOICE" ? "🎙️ Voice Chat Studio" :
             currentBotType === "ACTION" ? "⚡ Action Tool Studio" :
             currentBotType === "CHAT" ? "💬 Knowledge Chat" : "🌐 Assistant Chat"}
          </span>
        </button>

        {/* Avatar & Voice Settings Tab */}
        {(["AVATAR", "VOICE", "HYBRID"].includes(currentBotType)) && (
          <button
            onClick={() => setActiveTab("avatar")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${activeTab === "avatar"
                ? "border-border-primary text-text-primary bg-interactive-base/10"
                : isDark ? "border-transparent text-text-primary hover:text-text-muted" : "border-transparent text-text-primary hover:text-text-primary"
              }`}
          >
            <FiCpu />
            <span>{currentBotType === "VOICE" ? "Voice Settings" : "Avatar & Voice Config"}</span>
          </button>
        )}

        {/* Knowledge Tab (Only for Chat & Hybrid Bots) */}
        {(["CHAT", "HYBRID"].includes(currentBotType)) && (
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${activeTab === "knowledge"
                ? "border-border-primary text-text-primary bg-interactive-base/10"
                : isDark ? "border-transparent text-text-primary hover:text-text-muted" : "border-transparent text-text-primary hover:text-text-primary"
              }`}
          >
            <FiFileText />
            <span>Knowledge Base ({bot.fileCount || 0})</span>
          </button>
        )}

        {/* APIs Tab (Only for Action & Hybrid Bots) */}
        {(["ACTION", "HYBRID"].includes(currentBotType)) && (
          <button
            onClick={() => setActiveTab("apis")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${activeTab === "apis"
                ? "border-border-primary text-text-primary bg-interactive-base/10"
                : isDark ? "border-transparent text-text-primary hover:text-text-muted" : "border-transparent text-text-primary hover:text-text-primary"
              }`}
          >
            <FiCode />
            <span>API Tools ({bot.apiCount || 0})</span>
          </button>
        )}
      </div>

      {/* TAB BODY */}
      <div className="flex-1 overflow-hidden flex flex-col overflow-y-auto">
        {activeTab === "chat" && <BotChatTab bot={bot} />}
        {activeTab === "knowledge" && <BotKnowledgeTab bot={bot} />}
        {activeTab === "apis" && <BotApiTab bot={bot} />}
        {activeTab === "avatar" && <BotAvatarTab bot={bot} onBotUpdated={() => fetchBotDetails()} />}
      </div>

    </div>
  );
};

export default BotDetailPage;
