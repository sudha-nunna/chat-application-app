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
      <div className={`flex-1 flex items-center justify-center text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"
        }`}>
        Loading Bot Configuration...
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h3 className={`text-base font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Bot Not Found</h3>
        <p className={`text-xs mt-1 mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          This AI Agent does not exist or you do not have permission.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
        >
          <FiArrowLeft /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}>

      {/* BOT HEADER BAR */}
      <div className={`p-4 md:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
        }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className={`p-2 rounded-lg transition ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            title="Back to Dashboard"
          >
            <FiArrowLeft className="text-lg" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 text-xl font-bold">
            <FiCpu />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{bot.name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                }`}>
                {bot.model}
              </span>
            </div>
            <p className={`text-xs truncate max-w-md mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {bot.description || "Isolated multi-tenant RAG bot with dedicated knowledge base."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-3 text-xs px-3 py-1.5 rounded-lg border ${isDark ? "text-slate-400 bg-slate-900 border-slate-800" : "text-slate-600 bg-slate-100 border-slate-200"
            }`}>
            <span className="flex items-center gap-1">
              <FiFileText className="text-blue-500" />
              <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{bot.fileCount || 0}</strong> Files
            </span>
            {bot.rulesConfig?.rulesCount !== undefined && (
              <span className="flex items-center gap-1">
                <span className="text-amber-400">📜</span>
                <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{bot.rulesConfig.rulesCount}</strong> Rules
              </span>
            )}
            <span className="flex items-center gap-1">
              <FiCode className="text-indigo-500" />
              <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{bot.apiCount || 0}</strong> APIs
            </span>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className={`p-2 rounded-lg transition ${isDark ? "text-slate-400 hover:text-blue-400 hover:bg-slate-800" : "text-slate-500 hover:text-blue-600 hover:bg-slate-100"
              }`}
            title="Edit Bot Settings"
          >
            <FiEdit2 className="text-base" />
          </button>

          <button
            onClick={handleDeleteBot}
            className={`p-2 rounded-lg transition ${isDark ? "text-slate-500 hover:text-rose-400 hover:bg-rose-950/40" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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

      {/* TAB NAVIGATION BAR */}
      <div className={`flex border-b px-4 ${isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-100/60"
        }`}>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${activeTab === "chat"
              ? "border-blue-500 text-blue-500 bg-blue-500/10"
              : isDark ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
        >
          <FiMessageSquare />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${activeTab === "knowledge"
              ? "border-blue-500 text-blue-500 bg-blue-500/10"
              : isDark ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
        >
          <FiFileText />
          <span>Knowledge ({bot.fileCount || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("apis")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${activeTab === "apis"
              ? "border-blue-500 text-blue-500 bg-blue-500/10"
              : isDark ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
        >
          <FiCode />
          <span>APIs ({bot.apiCount || 0})</span>
        </button>
      </div>

      {/* TAB BODY */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "chat" && <BotChatTab bot={bot} />}
        {activeTab === "knowledge" && <BotKnowledgeTab bot={bot} />}
        {activeTab === "apis" && <BotApiTab bot={bot} />}
      </div>

    </div>
  );
};

export default BotDetailPage;
