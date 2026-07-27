import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiCpu,
  FiPlus,
  FiFileText,
  FiCode,
  FiArrowRight,
  FiTrash2,
  FiLayers
} from "react-icons/fi";
import api from "../services/api";
import CreateBotModal from "../components/bots/CreateBotModal";

const DashboardPage = () => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
   
  useEffect(() => {
    fetchBots();
  }, []);


  const fetchBots = async () => {
    try {
      setLoading(true);
      const res = await api.get("/bots");
      console.log("Fetched bots:", res.data);
      setBots(res.data);
    } catch (err) {
      console.error("Failed to load bots:", err);
    } finally {
      setLoading(false);
    }
  };
  

  const handleDeleteBot = async (e, botId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this AI Agent and all its knowledge files?")) return;

    try {
      await api.delete(`/bots/${botId}`);
      fetchBots();
    } catch (err) {
      console.error("Failed to delete bot:", err);
    }
  };
  

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8 custom-scrollbar">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">AI Agent Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Manage multi-tenant isolated AI agents, RAG knowledge bases, and API integrations.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-[0.98]"
        >
          <FiPlus className="text-sm" />
          <span>Create Bot</span>
        </button>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-xs font-medium">
          Loading AI Agents...
        </div>
      ) : bots.length === 0 ? (
        /* EMPTY STATE: "No Bots Found" */
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center my-8 bg-slate-950/40">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-3xl mb-4">
            <FiCpu />
          </div>
          <h3 className="text-lg font-bold text-slate-100">No Bots Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
            You haven't created any AI Agents yet. Create your first isolated agent with custom knowledge files and API integrations.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition"
          >
            <FiPlus className="text-base" />
            <span>Create Your First Bot</span>
          </button>
        </div>
      ) : (
        /* BOTS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bots.map((bot) => (
            <div
              key={bot._id}
              onClick={() => navigate(`/bots/${bot._id}`)}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 cursor-pointer transition shadow-lg group relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                      <FiCpu />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition truncate max-w-[150px]">
                        {bot.name}
                      </h3>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                        {bot.model}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteBot(e, bot._id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    title="Delete Bot"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 h-8">
                  {bot.description || "Isolated multi-tenant RAG agent with dedicated knowledge base."}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="flex items-center gap-1">
                    <FiFileText className="text-blue-400" />
                    <strong className="text-slate-200">{bot.fileCount || 0}</strong> Files
                  </span>
                  <span className="flex items-center gap-1">
                    <FiCode className="text-indigo-400" />
                    <strong className="text-slate-200">{bot.apiCount || 0}</strong> APIs
                  </span>
                </div>

                <div className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-1 transition">
                  <span>Open</span>
                  <FiArrowRight />
                </div>
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
            fetchBots();
            navigate(`/bots/${newBot._id}`);
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
