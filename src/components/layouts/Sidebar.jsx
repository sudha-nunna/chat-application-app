import { useEffect, useState } from "react";
import api from "../../services/api";

const Sidebar = ({ currentChatId, setCurrentChatId, refreshTrigger, onChatUpdated }) => {
  const [chats, setChats] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchHistoryList();
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch(e) {}
    }
  }, [refreshTrigger]);

  const fetchHistoryList = async () => {
    try {
      const res = await api.get("/chats");
      setChats(res.data);
    } catch (err) {
      console.error("Failed to load history list", err);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation(); // Stop changing current active chat layout selection
    if (!window.confirm("Delete this conversation permanent log record?")) return;
    try {
      await api.delete(`/chats/${chatId}`);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
      onChatUpdated();
    } catch (err) {
      console.error("Error deleting historical entity item:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
  };

  return (
    <div className="w-64 bg-[#1e293b] flex flex-col justify-between border-r border-slate-700 p-4 h-full">
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* User Context & Action Row */}
        <div className="flex flex-col gap-2 mb-6 pb-4 border-b border-slate-700">
          {user && (
            <div className="text-slate-200 text-sm font-medium px-1 truncate">
              User: <span className="text-green-400 font-semibold">{user.name}</span>
            </div>
          )}
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={() => setCurrentChatId(null)}
              className="flex-1 bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              + New Chat
            </button>
            <button 
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-rose-600 text-white px-3 py-2.5 rounded-lg text-xs transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* History Stream List */}
        <h3 className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-3 px-1">Recent History</h3>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => setCurrentChatId(chat._id)}
              className={`p-3 rounded-lg text-sm cursor-pointer transition font-normal flex justify-between items-center group relative ${
                currentChatId === chat._id
                  ? "bg-slate-700 text-white shadow-md font-medium"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="truncate pr-4 flex-1">{chat.title}</span>
              <button
                onClick={(e) => handleDeleteChat(e, chat._id)}
                className="text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-1 text-xs font-bold absolute right-2 bg-inherit rounded"
                title="Delete Chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;