import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCpu,
  FiPlus,
  FiFileText,
  FiCode,
  FiArrowRight,
  FiTrash2,
  FiEdit2,
  FiLayers
} from "react-icons/fi";
import { NobackEndCall, backEndCallGet, backEndCallObjDel } from "../services/authService";
import CreateBotModal from "../components/bots/CreateBotModal";
import EditBotModal from "../components/bots/EditBotModal";
import ApiModal from "../components/bots/ApiModal";
import { useTheme } from "../context/ThemeContext";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient
} from "../hooks/useTanStackData";

const DashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [selectedApiBot, setSelectedApiBot] = useState(null);
  const [apiModalMode, setApiModalMode] = useState("generate");
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  // 1. GET Route: Fetch bots using authService's NobackEndCall & useTanStackData hook
  const {
    data: bots = [],
    isLoading: loading,
    refetch: fetchBots
  } = useTanStackData(
    ["bots"],
    async () => {
      const res = await backEndCallGet("/bots");
      return Array.isArray(res) ? res : res?.data || [];
    }
  );

  // 2. DELETE Route: Delete bot mutation using authService's backEndCallObjDel & useTanStackMutation hook
  const deleteBotMutation = useTanStackMutation({
    mutationFn: async (botId) => {
      return await backEndCallObjDel("/bots", botId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      console.error("Failed to delete bot:", err);
    }
  });

  const handleDeleteBot = (e, botId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this AI Agent and all its knowledge files?")) return;
    deleteBotMutation.mutate(botId);
  };

  const handleEditBot = (e, bot) => {
    e.stopPropagation();
    setEditingBot(bot);
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar ${isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}>

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Multi-Agent AI Applications</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
              Production Architecture
            </span>
          </div>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Application Workspaces &mdash; Shared Knowledge Base, Shared APIs & Specialized Agents (<span className="font-semibold text-blue-400">Chat, Voice, Avatar, Action, Hybrid</span>).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-[0.98] cursor-pointer"
          >
            <FiPlus className="text-sm" />
            <span>Create Agent / Application</span>
          </button>
        </div>
      </div>

      {/* Shared Application Architecture Overview Banner */}
      <div className={`mb-6 p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? "bg-slate-950/80 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-bold shrink-0">
            <FiLayers />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Application Workspace Shared Resources</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Agents inside the same application automatically share PDFs, vector embeddings, system rules & REST APIs without duplicate uploads.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0 font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 font-semibold">
            {bots.length} Active Agents
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">
            Shared Memory Active
          </span>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className={`flex items-center justify-center h-64 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Loading Multi-Agent Applications...
        </div>
      ) : bots.length === 0 ? (
        /* EMPTY STATE: "No Applications / Agents Found" */
        <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center my-8 ${isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-300 bg-white"
          }`}>
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 text-3xl mb-4">
            <FiCpu />
          </div>
          <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>No AI Applications Found</h3>
          <p className={`text-xs max-w-sm mt-1 mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Create your first application workspace with shared knowledge bases, REST API tools, and specialized AI agents.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            <FiPlus className="text-base" />
            <span>Create Your First Agent</span>
          </button>
        </div>
      ) : (
        /* AGENTS & APPLICATIONS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bots.map((bot) => (
            <div
              key={bot._id}
              onClick={() => navigate(`/bots/${bot._id}`)}
              className={`border rounded-2xl p-5 cursor-pointer transition shadow-lg group relative flex flex-col justify-between ${isDark
                ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl"
                }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold text-lg">
                      <FiCpu />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm transition truncate max-w-[150px] ${isDark ? "text-slate-100 group-hover:text-blue-400" : "text-slate-900 group-hover:text-blue-600"
                        }`}>
                        {bot.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                          }`}>
                          {bot.model}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          bot.botType === "VOICE" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                          bot.botType === "ACTION" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                          bot.botType === "AVATAR" ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30" :
                          bot.botType === "CHAT" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}>
                          {bot.botType === "VOICE" ? "🎙️ Voice Agent" :
                           bot.botType === "ACTION" ? "⚡ Action Agent" :
                           bot.botType === "AVATAR" ? "🎭 Avatar Agent" :
                           bot.botType === "CHAT" ? "💬 Chat Agent" : "🌐 Hybrid Agent"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleEditBot(e, bot)}
                      className={`p-1.5 transition ${isDark ? "text-slate-500 hover:text-blue-400" : "text-slate-400 hover:text-blue-600"
                        }`}
                      title="Edit Agent Capabilities & Settings"
                    >
                      <FiEdit2 className="text-sm" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteBot(e, bot._id)}
                      disabled={deleteBotMutation.isPending}
                      className={`p-1.5 transition ${isDark ? "text-slate-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-600"
                        }`}
                      title="Delete Agent"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>

                <p className={`text-xs line-clamp-2 mb-4 h-8 capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {bot.description || "Specialized AI agent sharing application knowledge base & API tools."}
                </p>
              </div>

              <div className={`pt-4 border-t flex items-center justify-between text-xs ${isDark ? "border-slate-800/80" : "border-slate-100"
                }`}>
                <div className={`flex items-center gap-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {(["CHAT", "HYBRID"].includes(bot.botType || "HYBRID")) && (
                    <span className="flex items-center gap-1">
                      <FiFileText className="text-blue-500" />
                      <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{bot.fileCount || 0}</strong> Files
                    </span>
                  )}

                  {(["ACTION", "HYBRID"].includes(bot.botType || "HYBRID")) && (
                    <span className="flex items-center gap-1">
                      <FiCode className="text-indigo-500" />
                      <strong className={isDark ? "text-slate-200" : "text-slate-800"}>
                        {bot.apiCount || bot.apis?.length || 0}
                      </strong>{" "}
                      {(bot.apiCount || bot.apis?.length || 0) === 1 ? "API" : "APIs"}
                    </span>
                  )}

                  {(["AVATAR", "VOICE"].includes(bot.botType)) && (
                    <span className="flex items-center gap-1 font-semibold text-fuchsia-400">
                      <span>🎭</span> {bot.botType === "AVATAR" ? "3D Talking Head" : "Voice Audio"}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedApiBot(bot);
                    setApiModalMode("generate");
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-400 hover:underline transition cursor-pointer"
                >
                  <FiPlus className="text-xs" />
                  <span>API Keys</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE BOT MODAL */}
      {isModalOpen && (
        <CreateBotModal
          onClose={() => setIsModalOpen(false)}
          onBotCreated={(newBot) => {
            queryClient.invalidateQueries({ queryKey: ["bots"] });
            navigate(`/bots/${newBot._id}`);
          }}
        />
      )}

      {/* EDIT BOT MODAL */}
      {editingBot && (
        <EditBotModal
          bot={editingBot}
          onClose={() => setEditingBot(null)}
          onBotUpdated={() => queryClient.invalidateQueries({ queryKey: ["bots"] })}
        />
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
