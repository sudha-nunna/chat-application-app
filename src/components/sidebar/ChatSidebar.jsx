import { FiPlus, FiSearch, FiChevronDown, FiChevronRight, FiMessageSquare } from "react-icons/fi";
import { TbPin, TbRobotFace } from "react-icons/tb";

const ChatSidebar = ({
  isSidebarCollapsed,
  isMobile,
  handleNewChat,
  setIsSearchModalOpen,
  onEnterAgentMode,
  pinnedChats,
  isPinnedOpen,
  setIsPinnedOpen,
  groupedRecentChats,
  recentChats,
  renderSidebarItem,
  activePopover,
  setActivePopover
}) => {
  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {/* Top Controls: New Chat, Search */}
      <div
        className={`pt-2 pb-2 flex flex-col gap-2 shrink-0 ${
          isSidebarCollapsed ? "px-1 items-center" : "px-4"
        }`}
      >
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer bg-accent-primary text-white hover:opacity-90 font-medium shadow-sm ${
            isSidebarCollapsed ? "justify-center" : ""
          } group relative`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <FiPlus className="text-lg" />
          </div>
          {!isSidebarCollapsed && (
            <span className="opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-sm">
              New Chat
            </span>
          )}
          {isSidebarCollapsed && !isMobile && (
            <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
              New Chat
            </div>
          )}
        </button>

        {/* Search Conversations */}
        <div
          onClick={() => {
            setIsSearchModalOpen(true);
            setActivePopover(null);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-text-muted bg-white dark:bg-[#171923] border border-border-primary/50 hover:border-border-primary ${
            isSidebarCollapsed ? "justify-center px-0!" : ""
          } group relative`}
        >
          <FiSearch
            className={`shrink-0 ${isSidebarCollapsed ? "text-lg" : "text-sm"}`}
          />
          {!isSidebarCollapsed && (
            <span className="text-[13px] opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
              Search Conversations
            </span>
          )}
          {isSidebarCollapsed && !isMobile && (
            <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
              Search
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Chat History List (No My AI Agents & No History 41 v header) */}
      <div
        className={`flex-1 relative ${
          isSidebarCollapsed && !isMobile
            ? "overflow-visible"
            : "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <div
          className={`pt-1 pb-6 space-y-4 ${
            isSidebarCollapsed && !isMobile ? "px-1 overflow-visible space-y-3!" : "px-3"
          }`}
        >
          {/* Pinned Chats */}
          {pinnedChats.length > 0 && (
            <div>
              {(!isSidebarCollapsed || isMobile) && (
                <div
                  className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                  onClick={() => setIsPinnedOpen(!isPinnedOpen)}
                >
                  <span>Pinned</span>
                  {isPinnedOpen ? (
                    <FiChevronDown className="text-[10px]" />
                  ) : (
                    <FiChevronRight className="text-[10px]" />
                  )}
                </div>
              )}

              {isSidebarCollapsed && !isMobile ? (
                <div className="relative group flex justify-center">
                  <button
                    onClick={() =>
                      setActivePopover(
                        activePopover === "pinnedChats" ? null : "pinnedChats"
                      )
                    }
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      activePopover === "pinnedChats"
                        ? "bg-interactive-active text-text-primary dark:text-white"
                        : "hover:bg-surface-secondary text-text-primary"
                    } group relative`}
                  >
                    <TbPin className="text-xl" />
                    <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                      Pinned Chats
                    </div>
                  </button>
                  {activePopover === "pinnedChats" && (
                    <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                      <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">
                        Pinned
                      </div>
                      <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                        {pinnedChats.map((c) =>
                          renderSidebarItem(c, "chat", true)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isPinnedOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {pinnedChats.map((c) => renderSidebarItem(c, "chat"))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Normal Recent Chats List (Directly grouped by date, without History 41 v header) */}
          <div>
            {isSidebarCollapsed && !isMobile ? (
              <div className="relative group flex justify-center">
                <button
                  onClick={() =>
                    setActivePopover(
                      activePopover === "recentChats" ? null : "recentChats"
                    )
                  }
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    activePopover === "recentChats"
                      ? "bg-interactive-active text-text-primary dark:text-white"
                      : "hover:bg-surface-secondary text-text-primary"
                  } group relative`}
                >
                  <FiMessageSquare className="text-xl" />
                  <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                    Recent Chats
                  </div>
                </button>
                {activePopover === "recentChats" && (
                  <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                    <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">
                      Recent Chats
                    </div>
                    <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                      {recentChats.length === 0 ? (
                        <div className="text-xs text-text-primary px-3 py-2">
                          No chat history
                        </div>
                      ) : (
                        recentChats.map((c) =>
                          renderSidebarItem(c, "chat", true)
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentChats.length === 0 ? (
                  <div className="text-xs text-text-muted px-3 py-2">
                    No chat history
                  </div>
                ) : (
                  groupedRecentChats.map((group, idx) => (
                    <div key={group.key} className="flex flex-col gap-0.5">
                      <h4
                        className={`text-[11.5px] font-sans font-medium text-text-muted/80 px-3 mb-1 ${
                          idx > 0 ? "mt-2" : ""
                        }`}
                      >
                        {group.label}
                      </h4>
                      {group.items.map((c) => renderSidebarItem(c, "chat"))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
