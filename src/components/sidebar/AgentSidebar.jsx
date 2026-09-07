import {
  FiPlus,
  FiArrowLeft,
  FiChevronDown,
  FiChevronRight,
  FiMessageSquare,
  FiTrash2,
  FiChevronLeft
} from "react-icons/fi";
import { TbPin, TbRobotFace } from "react-icons/tb";

const AgentSidebar = ({
  isSidebarCollapsed,
  isMobile,
  onExitAgentMode,
  navigate,
  currentBotId,
  activeBot,
  bots,
  pinnedBots,
  otherBots,
  isPinnedOpen,
  setIsPinnedOpen,
  isAgentsOpen,
  setIsAgentsOpen,
  botConversations = [],
  searchParams,
  handleCreateBotChat,
  handleDeleteBotConv,
  renderSidebarItem,
  activePopover,
  setActivePopover,
  setIsMobileMenuOpen
}) => {
  const currentConvId = searchParams.get("convId");

  return (
    <div className="flex flex-col h-full">
      {/* Top Controls: Return to Normal Chat & New Agent */}
      <div
        className={`pt-3 pb-3 flex flex-col gap-2.5 shrink-0 ${
          isSidebarCollapsed ? "px-1 items-center" : "px-4"
        }`}
      >
        {/* Return to Normal Chat Button */}
        <button
          type="button"
          onClick={onExitAgentMode}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-text-primary border border-border-primary/50 hover:border-border-primary ${
            isSidebarCollapsed ? "justify-center px-0!" : ""
          } group relative`}
        >
          <FiArrowLeft
            className={`shrink-0 ${isSidebarCollapsed ? "text-lg" : "text-sm"} text-text-muted group-hover:text-text-primary transition-colors`}
          />
          {!isSidebarCollapsed && (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-text-primary">
                Normal Chat
              </span>
              <span className="text-[10px] text-text-muted">Exit Agent</span>
            </div>
          )}
          {isSidebarCollapsed && !isMobile && (
            <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
              Back to Normal Chat
            </div>
          )}
        </button>

        {/* New Agent Button (Studio Builder) */}
        <button
          onClick={() => {
            navigate("/bots/new");
            setActivePopover(null);
            if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer bg-accent-primary text-white hover:opacity-90 font-semibold shadow-sm ${
            isSidebarCollapsed ? "justify-center px-0!" : ""
          } group relative`}
        >
          <FiPlus
            className={`shrink-0 ${isSidebarCollapsed ? "text-lg" : "text-base"}`}
          />
          {!isSidebarCollapsed && (
            <span className="text-xs font-semibold whitespace-nowrap overflow-hidden">
              New Agent
            </span>
          )}
          {isSidebarCollapsed && !isMobile && (
            <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
              Create New Agent
            </div>
          )}
        </button>
      </div>

      {/* Main Agent Area */}
      <div
        className={`flex-1 relative ${
          isSidebarCollapsed && !isMobile
            ? "overflow-visible"
            : "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <div
          className={`pt-1 pb-32 space-y-4 ${
            isSidebarCollapsed && !isMobile ? "px-1 overflow-visible space-y-3!" : "px-3"
          }`}
        >
          {/* CASE 1: USER IS IN SPECIFIC BOT MODE (SHOW THAT BOT'S HISTORY ONLY) */}
          {currentBotId && activeBot ? (
            <div className="space-y-3">
              {!isSidebarCollapsed || isMobile ? (
                <>
                  {/* Back to All Agents overview button */}
                  <button
                    type="button"
                    onClick={() => navigate("/bots")}
                    className="text-xs text-text-muted hover:text-text-primary transition flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-medium w-full"
                  >
                    <FiChevronLeft className="text-sm shrink-0" />
                    <span>All My Agents</span>
                  </button>

                  {/* Active Bot Card with New Chat Button */}
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#191A24] border border-border-primary/60 dark:border-white/5 shadow-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center text-sm font-semibold shrink-0 shadow-2xs">
                        {activeBot.avatarEmoji || <TbRobotFace className="text-base" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {activeBot.name}
                        </p>
                        <p className="text-[10px] text-emerald-500 font-medium">
                          Active Agent
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateBotChat(currentBotId)}
                      className="p-1.5 rounded-lg bg-accent-primary text-white hover:opacity-90 transition cursor-pointer shrink-0 shadow-xs"
                      title="Start New Conversation with this Agent"
                    >
                      <FiPlus className="text-xs" />
                    </button>
                  </div>

                  {/* That Bot's Chat History */}
                  <div className="space-y-1">
                    <div className="text-[10.5px] font-bold text-text-muted px-2 py-1 uppercase tracking-wider">
                      Agent Chat History ({botConversations.length})
                    </div>

                    {botConversations.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border-primary/60 text-center">
                        <p className="text-xs font-medium text-text-primary">
                          No previous chats
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5 mb-2">
                          Start a new session with {activeBot.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCreateBotChat(currentBotId)}
                          className="px-2.5 py-1 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1"
                        >
                          <FiPlus className="text-[11px]" />
                          <span>New Chat</span>
                        </button>
                      </div>
                    ) : (
                      botConversations.map((conv) => {
                        const isConvActive = currentConvId === conv._id;
                        return (
                          <div
                            key={conv._id}
                            onClick={() => {
                              navigate(`/bots/${currentBotId}?convId=${conv._id}`);
                              if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                            }}
                            className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                              isConvActive
                                ? "bg-accent-primary/10 text-text-primary font-semibold border border-accent-primary/30"
                                : "hover:bg-black/5 dark:hover:bg-white/5 text-text-primary/80 hover:text-text-primary"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FiMessageSquare
                                className={`text-xs shrink-0 ${
                                  isConvActive
                                    ? "text-accent-primary"
                                    : "text-text-muted"
                                }`}
                              />
                              <span className="truncate">
                                {conv.title || "Conversation"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDeleteBotConv(e, conv._id, currentBotId)
                              }
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition shrink-0 ml-1 cursor-pointer"
                              title="Delete conversation"
                            >
                              <FiTrash2 className="text-[11px]" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Collapsed View for Active Bot */
                <div className="relative group flex justify-center">
                  <button
                    onClick={() =>
                      setActivePopover(
                        activePopover === "activeBotConvs" ? null : "activeBotConvs"
                      )
                    }
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      activePopover === "activeBotConvs"
                        ? "bg-interactive-active text-text-primary dark:text-white"
                        : "hover:bg-surface-secondary text-text-primary"
                    } group relative`}
                  >
                    <TbRobotFace className="text-xl text-accent-primary" />
                    <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                      {activeBot.name}
                    </div>
                  </button>

                  {activePopover === "activeBotConvs" && (
                    <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                      <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 flex items-center justify-between shrink-0">
                        <span className="truncate">{activeBot.name}</span>
                        <button
                          onClick={() => handleCreateBotChat(currentBotId)}
                          className="text-xs font-semibold text-accent-primary hover:underline flex items-center gap-1"
                        >
                          <FiPlus className="text-xs" /> New
                        </button>
                      </div>
                      <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                        {botConversations.length === 0 ? (
                          <div className="text-xs text-text-muted px-3 py-2 text-center">
                            No chats yet
                          </div>
                        ) : (
                          botConversations.map((conv) => (
                            <div
                              key={conv._id}
                              onClick={() => {
                                setActivePopover(null);
                                navigate(
                                  `/bots/${currentBotId}?convId=${conv._id}`
                                );
                              }}
                              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-text-primary"
                            >
                              <span className="truncate flex-1">
                                {conv.title || "Conversation"}
                              </span>
                              <button
                                onClick={(e) =>
                                  handleDeleteBotConv(
                                    e,
                                    conv._id,
                                    currentBotId
                                  )
                                }
                                className="p-1 hover:text-red-500 rounded transition ml-1"
                              >
                                <FiTrash2 className="text-[10px]" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* CASE 2: ALL AGENTS OVERVIEW (NO SPECIFIC BOT SELECTED YET) */
            <div className="space-y-4">
              {/* Pinned Agents */}
              {pinnedBots.length > 0 && (
                <div>
                  {(!isSidebarCollapsed || isMobile) && (
                    <div
                      className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                      onClick={() => setIsPinnedOpen(!isPinnedOpen)}
                    >
                      <span>Pinned Agents</span>
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
                            activePopover === "pinnedBots"
                              ? null
                              : "pinnedBots"
                          )
                        }
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          activePopover === "pinnedBots"
                            ? "bg-interactive-active text-text-primary dark:text-white"
                            : "hover:bg-surface-secondary text-text-primary"
                        } group relative`}
                      >
                        <TbPin className="text-xl" />
                        <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                          Pinned Agents
                        </div>
                      </button>
                      {activePopover === "pinnedBots" && (
                        <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                          <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">
                            Pinned Agents
                          </div>
                          <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                            {pinnedBots.map((b) =>
                              renderSidebarItem(b, "bot", true)
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
                          {pinnedBots.map((b) => renderSidebarItem(b, "bot"))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* My AI Agents */}
              <div>
                {(!isSidebarCollapsed || isMobile) && (
                  <div className="flex items-center justify-between px-3 mb-1.5">
                    <div
                      className="text-xs font-semibold text-text-primary flex items-center gap-1.5 cursor-pointer hover:text-text-muted transition select-none"
                      onClick={() => setIsAgentsOpen(!isAgentsOpen)}
                    >
                      <TbRobotFace className="text-sm text-text-primary" />
                      <span>My AI Agents</span>
                      {bots.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-interactive-base/15 border border-border-primary/30 font-mono text-text-primary font-bold">
                          {bots.length}
                        </span>
                      )}
                      {isAgentsOpen ? (
                        <FiChevronDown className="text-[10px]" />
                      ) : (
                        <FiChevronRight className="text-[10px]" />
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/bots/new");
                        if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                      }}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-primary transition cursor-pointer"
                      title="Create New AI Agent"
                    >
                      <FiPlus className="text-xs" />
                    </button>
                  </div>
                )}

                {isSidebarCollapsed && !isMobile ? (
                  <div className="relative group flex justify-center">
                    <button
                      onClick={() =>
                        setActivePopover(
                          activePopover === "otherBots" ? null : "otherBots"
                        )
                      }
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        activePopover === "otherBots"
                          ? "bg-interactive-active text-text-primary dark:text-white"
                          : "hover:bg-surface-secondary text-text-primary"
                      } group relative`}
                    >
                      <TbRobotFace className="text-xl" />
                      <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                        My AI Agents
                      </div>
                    </button>
                    {activePopover === "otherBots" && (
                      <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                        <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 flex items-center justify-between shrink-0">
                          <span>My AI Agents</span>
                          <button
                            onClick={() => {
                              setActivePopover(null);
                              navigate("/bots/new");
                            }}
                            className="text-xs font-semibold text-text-primary hover:underline flex items-center gap-1"
                          >
                            <FiPlus className="text-xs" /> New
                          </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                          {otherBots.length === 0 ? (
                            <div className="text-xs text-text-primary px-3 py-2 text-center">
                              No bots created yet
                            </div>
                          ) : (
                            otherBots.map((b) =>
                              renderSidebarItem(b, "bot", true)
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isAgentsOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-0.5">
                        {otherBots.length === 0 ? (
                          <button
                            onClick={() => {
                              navigate("/bots/new");
                              if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                            }}
                            className="w-full text-left text-xs px-3 py-2 rounded-lg text-text-primary/70 hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-2 cursor-pointer"
                          >
                            <FiPlus className="text-xs shrink-0" />
                            <span>Create your first agent</span>
                          </button>
                        ) : (
                          otherBots.map((b) => renderSidebarItem(b, "bot"))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
