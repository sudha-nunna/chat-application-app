import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiCpu,
  FiMessageSquare,
  FiCode,
  FiTrash2,
  FiArrowLeft,
  FiFileText
} from "react-icons/fi";
import api from "../services/api";
import BotChatTab from "../components/bots/BotChatTab";
import BotApiTab from "../components/bots/BotApiTab";

const BotDetailPage = () => {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "apis"

  useEffect(() => {
    fetchBotDetails();
  }, [botId]);

  const fetchBotDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bots/${botId}`);
      setBot(res.data);
    } catch (err) {
      console.error("Failed to load bot details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!window.confirm(`Are you sure you want to delete '${bot.name}' and all its knowledge files?`)) return;
    try {
      await api.delete(`/bots/${botId}`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to delete bot:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">
        Loading Bot Configuration...
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-base font-bold text-slate-200">Bot Not Found</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">This AI Agent does not exist or you do not have permission.</p>
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900">
      
      {/* BOT HEADER BAR */}
      <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Back to Dashboard"
          >
            <FiArrowLeft className="text-lg" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-bold">
            <FiCpu />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100">{bot.name}</h1>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                {bot.model}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md mt-0.5">
              {bot.description || "Isolated multi-tenant RAG bot with dedicated knowledge base."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="flex items-center gap-1">
              <FiFileText className="text-blue-400" />
              <strong className="text-slate-200">{bot.fileCount || 0}</strong> Files
            </span>
            <span className="flex items-center gap-1">
              <FiCode className="text-indigo-400" />
              <strong className="text-slate-200">{bot.apiCount || 0}</strong> APIs
            </span>
          </div>

          <button
            onClick={handleDeleteBot}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
            title="Delete Bot"
          >
            <FiTrash2 className="text-base" />
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION BAR */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 px-4">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === "chat"
              ? "border-blue-500 text-blue-400 bg-blue-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FiMessageSquare />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab("apis")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === "apis"
              ? "border-blue-500 text-blue-400 bg-blue-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FiCode />
          <span>APIs ({bot.apiCount || 0})</span>
        </button>
      </div>

      {/* TAB BODY */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "chat" && <BotChatTab bot={bot} />}
        {activeTab === "apis" && <BotApiTab bot={bot} />}
      </div>

    </div>
  );
};

export default BotDetailPage;
