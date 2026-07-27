import { useEffect, useState } from "react";
import { FiPlus, FiMessageSquare, FiTrash2, FiX } from "react-icons/fi";
import api from "../../services/api";

const Sidebar = ({ currentChatId, setCurrentChatId, refreshTrigger, onChatUpdated, onCloseMobile }) => {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    fetchHistoryList();
  }, [refreshTrigger]);

  const fetchHistoryList = async () => {
    try {
      const res = await api.get("/chats");
      setChats(res.data || []);
    } catch (err) {
      console.error("Failed to load history list", err);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation thread?")) return;
    try {
      await api.delete(`/chats/${chatId}`);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
      if (onChatUpdated) onChatUpdated();
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-full md:w-64 shrink-0 md:min-w-[256px] md:max-w-[256px] bg-slate-950 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Sub-Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <FiMessageSquare className="text-blue-400" />
          <span>General Threads</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectChat(null)}
            className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
            title="New Chat Thread"
          >
            <FiPlus />
            <span>New</span>
          </button>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 text-slate-400 hover:text-white"
            >
              <FiX className="text-base" />
            </button>
          )}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {chats.length === 0 ? (
          <div className="text-[11px] text-slate-500 text-center py-8">
            No history threads yet.<br />Start asking questions!
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = currentChatId === chat._id;
            return (
              <div
                key={chat._id}
                onClick={() => handleSelectChat(chat._id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${
                  isActive
                    ? "bg-blue-600/15 border border-blue-500/30 text-blue-300 font-semibold"
                    : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FiMessageSquare className={isActive ? "text-blue-400 shrink-0" : "text-slate-600 shrink-0"} />
                  <span className="truncate text-[11px]">{chat.title || "General Chat"}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteChat(e, chat._id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Delete Thread"
                >
                  <FiTrash2 className="text-xs" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;