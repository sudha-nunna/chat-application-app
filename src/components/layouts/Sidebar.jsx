import { useState } from "react";
import { FiPlus, FiMessageSquare, FiTrash2, FiX } from "react-icons/fi";
import { NobackEndCall, backEndCallObjDel } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient
} from "../../hooks/useTanStackData";

const Sidebar = ({ currentChatId, setCurrentChatId, refreshTrigger, onChatUpdated, onCloseMobile }) => {
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  // 1. GET Route: General Threads History List using useTanStackData & NobackEndCall
  const {
    data: chats = [],
    isLoading: loading,
    refetch: fetchHistoryList
  } = useTanStackData(
    ["chats"],
    async () => {
      const res = await NobackEndCall("/chats");
      return Array.isArray(res) ? res : res?.data || [];
    }
  );

  // 2. DELETE Route: Delete Thread Mutation
  const deleteChatMutation = useTanStackMutation({
    mutationFn: async (chatId) => {
      return await backEndCallObjDel("/chats", chatId);
    },
    onSuccess: (_, chatId) => {
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (onChatUpdated) onChatUpdated();
    },
    onError: (err) => {
      console.error("Error deleting chat:", err);
    }
  });

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation thread?")) return;
    deleteChatMutation.mutate(chatId);
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className={`w-full md:w-64 shrink-0 md:min-w-[256px] md:max-w-[256px] border-r flex flex-col h-full select-none ${
      "bg-surface-secondary border-border-primary"
    }`}>
      {/* Sub-Header */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        "border-border-primary"
      }`}>
        <span className={`text-xs font-bold flex items-center gap-1.5 ${
          "text-text-primary dark:text-text-muted"
        }`}>
          <FiMessageSquare className="text-text-primary" />
          <span>General Threads</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectChat(null)}
            className="flex items-center gap-1 bg-interactive-base/20 hover:bg-interactive-base text-text-primary hover:text-white border border-border-primary/30 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
            title="New Chat Thread"
          >
            <FiPlus />
            <span>New</span>
          </button>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className={`md:hidden p-1 ${"text-text-primary hover:text-text-primary dark:hover:text-white"}`}
            >
              <FiX className="text-base" />
            </button>
          )}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {chats.length === 0 ? (
          <div className={`text-[11px] text-center py-8 ${"text-text-primary"}`}>
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
                    ? "bg-interactive-base border border-border-primary text-text-primary font-semibold dark:bg-interactive-base/20 dark:border dark:border-border-primary/30 dark:text-text-muted dark:font-semibold"
                    : "hover:bg-surface-secondary text-text-primary hover:text-text-primary dark:hover:bg-interactive-active dark:text-text-primary dark:hover:text-text-muted"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FiMessageSquare className={isActive ? "text-text-primary shrink-0" : "text-text-primary shrink-0"} />
                  <span className="truncate text-[11px]">{chat.title || "New Conversation"}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteChat(e, chat._id)}
                  disabled={deleteChatMutation.isPending}
                  className={`opacity-0 group-hover:opacity-100 p-1 hover:text-text-primary transition ${
                    "text-text-primary"
                  }`}
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