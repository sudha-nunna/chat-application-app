import { useState, useRef, useMemo } from "react";
import {
  FiPlus,
  FiSearch,
  FiChevronDown,
  FiChevronRight,
  FiMessageSquare,
  FiX,
} from "react-icons/fi";
import { TbPin } from "react-icons/tb";

const ChatSidebar = ({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isMobile,
  handleNewChat,
  setIsSearchModalOpen,
  onEnterAgentMode,
  pinnedChats = [],
  isPinnedOpen,
  setIsPinnedOpen,
  groupedRecentChats = [],
  recentChats = [],
  renderSidebarItem,
  activePopover,
  setActivePopover,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  const query = searchQuery.trim().toLowerCase();

  const filteredPinnedChats = useMemo(() => {
    if (!query) return pinnedChats;
    return pinnedChats.filter((c) =>
      (c.title || "New Conversation").toLowerCase().includes(query)
    );
  }, [pinnedChats, query]);

  const filteredGroupedRecentChats = useMemo(() => {
    if (!query) return groupedRecentChats;
    return groupedRecentChats
      .map((group) => ({
        ...group,
        items: group.items.filter((c) =>
          (c.title || "New Conversation").toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedRecentChats, query]);

  const filteredRecentChatsCount = useMemo(() => {
    if (!query) return recentChats.length;
    return filteredGroupedRecentChats.reduce(
      (acc, g) => acc + g.items.length,
      0
    );
  }, [query, recentChats.length, filteredGroupedRecentChats]);

  const hasAnyMatches =
    filteredPinnedChats.length > 0 || filteredRecentChatsCount > 0;

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

        {/* Search Conversations: Inline in sidebar without opening modal in chat area */}
        {isSidebarCollapsed && !isMobile ? (
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed?.(false);
              setTimeout(() => {
                searchInputRef.current?.focus();
              }, 150);
            }}
            className="w-full flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer text-text-muted hover:text-text-primary bg-white dark:bg-[#171923] border border-border-primary/50 hover:border-border-primary group relative"
            title="Search conversations"
          >
            <FiSearch className="text-lg shrink-0" />
            <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
              Search
            </div>
          </button>
        ) : (
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-text-muted bg-white dark:bg-[#171923] border border-border-primary/50 focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/20 transition-all">
            <FiSearch className="text-sm shrink-0 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[13px] text-text-primary placeholder:text-text-muted/80 min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="text-text-muted hover:text-text-primary p-0.5 rounded transition shrink-0 cursor-pointer"
                title="Clear search"
              >
                <FiX className="text-sm" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Chat History List */}
      <div
        className={`flex-1 relative ${
          isSidebarCollapsed && !isMobile
            ? "overflow-visible"
            : "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <div
          className={`pt-1 pb-6 space-y-4 ${
            isSidebarCollapsed && !isMobile
              ? "px-1 overflow-visible space-y-3!"
              : "px-3"
          }`}
        >
          {/* Collapsed State: Buttons expand the sidebar */}
          {isSidebarCollapsed && !isMobile ? (
            <div className="flex flex-col items-center gap-2">
              {pinnedChats.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarCollapsed?.(false);
                    setIsPinnedOpen?.(true);
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:bg-surface-secondary text-text-primary group relative"
                  title="Pinned Chats"
                >
                  <TbPin className="text-xl" />
                  <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                    Pinned Chats
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSidebarCollapsed?.(false);
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:bg-surface-secondary text-text-primary group relative"
                title="Recent Chats"
              >
                <FiMessageSquare className="text-xl" />
                <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                  Recent Chats
                </div>
              </button>
            </div>
          ) : (
            /* Expanded / Mobile View with Live Filtering */
            <>
              {/* If search query has no results */}
              {query && !hasAnyMatches ? (
                <div className="py-8 text-center px-3">
                  <p className="text-xs font-medium text-text-muted">
                    No chats matching &quot;{searchQuery}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="mt-2 text-xs text-accent-primary hover:underline cursor-pointer"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <>
                  {/* Pinned Chats */}
                  {filteredPinnedChats.length > 0 && (
                    <div>
                      <div
                        className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                        onClick={() => setIsPinnedOpen?.(!isPinnedOpen)}
                      >
                        <span>Pinned</span>
                        {isPinnedOpen ? (
                          <FiChevronDown className="text-[10px]" />
                        ) : (
                          <FiChevronRight className="text-[10px]" />
                        )}
                      </div>

                      <div
                        className={`grid transition-all duration-300 ease-in-out ${
                          isPinnedOpen || query
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-0.5">
                            {filteredPinnedChats.map((c) =>
                              renderSidebarItem(c, "chat")
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Chats */}
                  <div>
                    {recentChats.length === 0 ? (
                      <div className="text-xs text-text-muted px-3 py-2">
                        No chat history
                      </div>
                    ) : filteredGroupedRecentChats.length === 0 && query ? null : (
                      <div className="flex flex-col gap-3">
                        {filteredGroupedRecentChats.map((group, idx) => (
                          <div key={group.key} className="flex flex-col gap-0.5">
                            <h4
                              className={`text-[11.5px] font-sans font-medium text-text-muted/80 px-3 mb-1 ${
                                idx > 0 ? "mt-2" : ""
                              }`}
                            >
                              {group.label}
                            </h4>
                            {group.items.map((c) =>
                              renderSidebarItem(c, "chat")
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
