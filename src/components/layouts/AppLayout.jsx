import { useState, useEffect, useRef } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import {
  FiGrid,
  FiMessageSquare,
  FiPlus,
  FiBook,
  FiFileText,
  FiClock,
  FiLayers,
  FiLink,
  FiSun,
  FiMoon,
  FiLogOut,
  FiUser,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiSearch,
  FiMenu,
  FiX,
  FiCreditCard,
  FiServer,
  FiMoreHorizontal,
  FiShare,
  FiEdit2,
  FiArchive,
  FiTrash2,
  FiCheck,
  FiSidebar,
  FiEdit,
  FiSettings,
  FiLifeBuoy,
  FiZap,
  FiMessageCircle,
} from "react-icons/fi";
import { TbPin, TbPinnedOff, TbRobotFace } from "react-icons/tb";
import {
  backEndCallGet,
  NobackEndCall,
  backEndCallObjDel,
  NobackEndCallObj,
  fetchUsageSummary,
} from "../../services/authService";
import CreateBotModal from "../bots/CreateBotModal";
import AuthModal from "../auth/AuthModal";
import PlanBadge from "../subscription/PlanBadge";
import SubscriptionModal from "../subscription/SubscriptionModal";
import CreditsModal from "../subscription/CreditsModal";
import FloatingExternalBotWidget from "../global/FloatingExternalBotWidget";
import UserAvatar from "../common/UserAvatar";
import { useTheme } from "../../context/ThemeContext";
import { useSubscription } from "../../context/SubscriptionContext";
import {
  useTanStackData,
  useTanStackQueryClient,
  useTanStackMutation,
} from "../../hooks/useTanStackData";

const AppLayout = ({ children }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const {
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    isCreditsModalOpen,
    setIsCreditsModalOpen,
  } = useSubscription();
  const [authToken, setAuthToken] = useState(() =>
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("token"),
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("codegene_sidebar_width");
    return saved ? Math.max(200, Math.min(520, parseInt(saved, 10))) : 280;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const isResizingRef = useRef(false);

  const handleMouseDownResize = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(200, Math.min(520, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (upEvent) => {
      isResizingRef.current = false;
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      const finalWidth = Math.max(200, Math.min(520, upEvent.clientX));
      localStorage.setItem("codegene_sidebar_width", finalWidth.toString());
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleDoubleClickReset = () => {
    setSidebarWidth(280);
    localStorage.setItem("codegene_sidebar_width", "280");
  };
  const [tempClosed, setTempClosed] = useState(false);
  const [activePopover, setActivePopover] = useState(null);

  useEffect(() => {
    const handleOpenModal = () => setIsCreateModalOpen(true);
    window.addEventListener("open-create-bot-modal", handleOpenModal);
    return () =>
      window.removeEventListener("open-create-bot-modal", handleOpenModal);
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Search Modal State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useTanStackQueryClient();
  const [searchParams] = useSearchParams();
  const activeChatId = searchParams.get("chatId");

  // Collapsible Sections State
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const [isRecentsOpen, setIsRecentsOpen] = useState(true);
  const [isAgentsOpen, setIsAgentsOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat");
  const [expandedBotId, setExpandedBotId] = useState(null);

  // Inline Editing State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  useEffect(() => {
    setIsCreditsModalOpen(false);
    setIsUpgradeModalOpen(false);

    if (location.pathname.startsWith("/chat") || location.pathname === "/" || location.pathname.startsWith("/usage")) {
      setActiveSidebarTab("chat");
    } else if (location.pathname.startsWith("/bots")) {
      setActiveSidebarTab("agents");
    } else if (location.pathname.startsWith("/dashboard")) {
      setActiveSidebarTab("dashboard");
    } else if (location.pathname.startsWith("/subscription")) {
      setActiveSidebarTab("subscription");
    } else if (location.pathname.startsWith("/admin/servers")) {
      setActiveSidebarTab("servers");
    }

    if (
      location.pathname !== "/" &&
      location.pathname !== "/login" &&
      !location.pathname.startsWith("/auth/")
    ) {
      localStorage.setItem(
        "lastActivePath",
        location.pathname + location.search,
      );
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleToggleMobileSidebar = () => {
      setIsMobileMenuOpen((prev) => !prev);
    };

    window.addEventListener("toggleMobileSidebar", handleToggleMobileSidebar);

    return () => {
      window.removeEventListener(
        "toggleMobileSidebar",
        handleToggleMobileSidebar,
      );
    };
  }, []);

  const [pinnedItemIds, setPinnedItemIds] = useState(() => {
    try {
      const saved = localStorage.getItem("pinnedChats");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activeDropdownItem, setActiveDropdownItem] = useState(null);
  const [activeDropdownType, setActiveDropdownType] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("pinnedChats", JSON.stringify(pinnedItemIds));
  }, [pinnedItemIds]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (!event.target.closest(".three-dots-btn")) {
          setOpenDropdownId(null);
          setActiveDropdownItem(null);
        }
      }
      if (
        !event.target.closest(".profile-dropdown") &&
        !event.target.closest(".profile-btn")
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchModalOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    const syncAuth = () => {
      const currentToken = localStorage.getItem("token");
      setAuthToken(currentToken);
      setIsAuthenticated(!!currentToken);

      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      if (currentToken) {
        queryClient.invalidateQueries({ queryKey: ["bots"] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        backEndCallGet("/auth/me")
          .then((res) => {
            if (res?.success && res?.user) {
              setUser(res.user);
              localStorage.setItem("user", JSON.stringify(res.user));
            }
          })
          .catch(() => { });
      }
    };

    syncAuth();

    window.addEventListener("auth-change", syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener("auth-change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, [location.pathname, queryClient]);

  // Fetch Bots
  const { data: bots = [] } = useTanStackData(
    ["bots"],
    async () => {
      const res = await backEndCallGet("/bots");
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!authToken },
  );

  // Fetch real-time Usage Summary for Credits
  const { data: usageData } = useTanStackData(
    ["usage"],
    async () => {
      if (!authToken) return null;
      const res = await backEndCallGet("/usage/summary");
      return res?.data || res || null;
    },
    { enabled: !!authToken }
  );

  const activeCredits = usageData?.user?.credits ?? user?.credits ?? 0;

  // Fetch Chats
  const { data: chats = [] } = useTanStackData(
    ["chats"],
    async () => {
      if (!authToken) return [];
      const res = await backEndCallGet("/chats");
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!authToken },
  );

  useEffect(() => {
    if (usageData?.user?.credits !== undefined && user) {
      if (user.credits !== usageData.user.credits) {
        const updatedUser = { ...user, credits: usageData.user.credits };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    }
  }, [usageData, user]);

  // Fetch Bot Conversations
  const { data: botConversations = [] } = useTanStackData(
    ["botConversations", expandedBotId],
    async () => {
      if (!expandedBotId || !authToken) return [];
      const res = await NobackEndCall(`/bots/${expandedBotId}/conversations`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!expandedBotId && !!authToken },
  );

  // Delete Mutation
  const deleteChatMutation = useTanStackMutation({
    mutationFn: async (chatId) => {
      return await backEndCallObjDel("/chats", chatId);
    },
    onSuccess: (_, chatId) => {
      setPinnedItemIds((prev) => prev.filter((id) => id !== chatId));
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (activeChatId === chatId) handleNewChat();
    },
  });

  // Rename Mutation
  const renameChatMutation = useTanStackMutation({
    mutationFn: async ({ chatId, title }) => {
      return await NobackEndCallObj(`/chats/${chatId}`, { title }, "put");
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["chats"], (oldChats) => {
        if (!Array.isArray(oldChats)) return oldChats;
        return oldChats.map((c) =>
          c._id === variables.chatId
            ? { ...c, title: variables.title, updatedAt: new Date().toISOString() }
            : c
        );
      });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setEditingItemId(null);
    },
    onError: (err) => {
      console.error("Failed to rename chat:", err);
      setEditingItemId(null);
    },
  });

  // Rename Bot Mutation
  const renameBotMutation = useTanStackMutation({
    mutationFn: async ({ botId, name }) => {
      return await NobackEndCallObj(`/bots/${botId}`, { name }, "put");
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["bots"], (oldBots) => {
        if (!Array.isArray(oldBots)) return oldBots;
        return oldBots.map((b) =>
          b._id === variables.botId ? { ...b, name: variables.name } : b
        );
      });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      setEditingItemId(null);
    },
    onError: (err) => {
      console.error("Failed to rename bot:", err);
      setEditingItemId(null);
    },
  });

  const handleDeleteItem = (e, id, type, item) => {
    e.stopPropagation();
    if (type === "chat") {
      setDeleteModalItem({
        id,
        type,
        title: item?.title || "this conversation",
      });
    } else {
      alert("Bot deletion must be done from the bot settings page.");
    }
    setOpenDropdownId(null);
  };

  const handleRenameSubmit = (e, id, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitleValue.trim()) {
      if (type === "chat") {
        renameChatMutation.mutate({ chatId: id, title: editTitleValue });
      } else {
        renameBotMutation.mutate({ botId: id, name: editTitleValue });
      }
    } else {
      setEditingItemId(null);
    }
  };

  const togglePin = (e, id) => {
    e.stopPropagation();
    setPinnedItemIds((prev) =>
      prev.includes(id)
        ? prev.filter((pinnedId) => pinnedId !== id)
        : [...prev, id],
    );
    setOpenDropdownId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    queryClient.clear();
    window.location.href = "/";
  };

  const handleBotCreated = (newBot) => {
    queryClient.invalidateQueries({ queryKey: ["bots"] });
    navigate(`/bots/${newBot._id}`);
  };

  const handleNewChat = () => {
    setIsUpgradeModalOpen(false);
    setIsCreditsModalOpen(false);
    setActiveSidebarTab("chat");
    setIsMobileMenuOpen(false);
    setIsSearchModalOpen(false);
    setActivePopover(null);
    setTempClosed(true);

    navigate("/chat", {
      replace: true,
      state: { newChat: true, resetChat: true, timestamp: Date.now() },
    });
    window.dispatchEvent(new CustomEvent("new-chat-action"));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("new-chat-action"));
    }, 10);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("new-chat-action"));
    }, 80);
  };

  const handleSelectItem = (id, type) => {
    setIsUpgradeModalOpen(false);
    setIsCreditsModalOpen(false);
    if (type === "chat") {
      if (id) {
        navigate(`/chat?chatId=${id}`);
      } else {
        handleNewChat();
        return;
      }
    } else if (type === "bot") {
      navigate(`/bots/${id}`);
    }
    setIsMobileMenuOpen(false);
    setIsSearchModalOpen(false);
  };

  const isGoogleCallbackRoute = location.pathname.startsWith("/auth/google");

  const pinnedChats = chats.filter((c) => pinnedItemIds.includes(c._id));
  const recentChats = chats.filter((c) => !pinnedItemIds.includes(c._id));

  const getChatDate = (c) => {
    if (!c) return new Date();
    const rawDate = c.updatedAt || c.createdAt || c.timestamp;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (c._id && typeof c._id === "string" && c._id.length === 24) {
      const timestamp = parseInt(c._id.substring(0, 8), 16) * 1000;
      if (!isNaN(timestamp)) return new Date(timestamp);
    }
    return new Date();
  };

  const groupedRecentChats = (() => {
    const groups = [
      { key: "today", label: "Today", items: [] },
      { key: "yesterday", label: "Yesterday", items: [] },
      { key: "previous7Days", label: "Previous 7 days", items: [] },
      { key: "previous30Days", label: "Previous 30 days", items: [] },
      { key: "older", label: "Older", items: [] },
    ];

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOf7Days = new Date(startOfToday);
    startOf7Days.setDate(startOf7Days.getDate() - 7);

    const startOf30Days = new Date(startOfToday);
    startOf30Days.setDate(startOf30Days.getDate() - 30);

    const sorted = [...recentChats].sort((a, b) => {
      return getChatDate(b) - getChatDate(a);
    });

    sorted.forEach((c) => {
      const chatDate = getChatDate(c);
      if (chatDate >= startOfToday) {
        groups[0].items.push(c);
      } else if (chatDate >= startOfYesterday) {
        groups[1].items.push(c);
      } else if (chatDate >= startOf7Days) {
        groups[2].items.push(c);
      } else if (chatDate >= startOf30Days) {
        groups[3].items.push(c);
      } else {
        groups[4].items.push(c);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  })();

  const pinnedBots = bots.filter((b) => pinnedItemIds.includes(b._id));
  const otherBots = bots.filter((b) => !pinnedItemIds.includes(b._id));

  const filteredSearchChats = chats.filter(
    (c) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false,
  );
  const filteredSearchBots = bots.filter(
    (b) => b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false,
  );

  const renderSidebarItem = (item, type, inPopover = false) => {
    const isChat = type === "chat";
    const isActive =
      !isCreateModalOpen &&
      (isChat
        ? activeChatId === item._id
        : location.pathname === `/bots/${item._id}`);
    const isDropdownOpen = openDropdownId === item._id;
    const isEditing = editingItemId === item._id;
    const isPinned = pinnedItemIds.includes(item._id);

    const title = isChat ? item.title || "New Conversation" : item.name;
    const collapseUI = isSidebarCollapsed && !inPopover && !isMobileMenuOpen;

    return (
      <div className="flex flex-col w-full">
        <div
          key={item._id}
          onClick={() => !isEditing && handleSelectItem(item._id, type)}
          title={title}
          className={`group relative flex items-center justify-between py-2 rounded-lg cursor-pointer text-[13px] font-normal transition-colors duration-150 select-none border-none outline-none ${collapseUI ? "px-0 justify-center" : "px-2.5"} ${isActive
            ? "bg-black/5 dark:bg-white/[0.08] text-text-primary dark:text-white font-medium shadow-2xs"
            : "hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-text-primary dark:text-text-muted hover:text-text-primary dark:hover:text-white"
            }`}
        >
          <div
            className={`flex items-center gap-1 w-full relative ${collapseUI ? "justify-center pr-0" : "pr-12"}`}
          >
            {!isChat ? (
              <div
                className={`min-w-5 h-5 rounded-full border inline-flex items-center justify-center shrink-0 ${isActive ? "border-border-primary/50 bg-interactive-base text-text-primary dark:text-white dark:border-white" : "border-border-primary/50 bg-interactive-base text-text-primary dark:text-white"}`}
                onClick={(e) => {
                  if (!collapseUI && type === "bot") {
                    e.stopPropagation();
                    setExpandedBotId(
                      expandedBotId === item._id ? null : item._id,
                    );
                  }
                }}
              >
                <TbRobotFace className="text-[12px]" />
              </div>
            ) : (
              <div className="w-4 h-5 inline-flex items-center justify-center shrink-0">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-text-primary" : "bg-text-muted/40 group-hover:bg-text-muted/60 transition-colors"}`}
                ></div>
              </div>
            )}

            {isEditing && !collapseUI ? (
              <form
                onSubmit={(e) => handleRenameSubmit(e, item._id, type)}
                className="w-full flex items-center gap-2"
              >
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setEditingItemId(null);
                    }
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full bg-transparent outline-none border-b border-text-muted/30 text-sm`}
                />
                <button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 hover:text-white transition"
                >
                  <FiCheck className="text-xs" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItemId(null);
                  }}
                  className="p-1 hover:text-white transition"
                >
                  <FiX className="text-xs" />
                </button>
              </form>
            ) : !collapseUI ? (
              <>
                <span className="truncate flex-1">{title}</span>
                <div
                  className={`absolute right-0 top-0 bottom-0 w-8 bg-gradien-to-l to-transparent pointer-events-none ${isActive
                    ? "from-interactive-base dark:from-interactive-active"
                    : "from-white dark:from-surface-secondary group-hover:from-surface-secondary dark:group-hover:from-interactive-active/80"
                    }`}
                ></div>
              </>
            ) : null}
          </div>

          {!isEditing && !collapseUI && (
            <div
              className={`absolute right-2 flex items-center ${isDropdownOpen ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"} transition`}
            >
              {type === "bot" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedBotId(
                      expandedBotId === item._id ? null : item._id,
                    );
                  }}
                  className={`p-1 mr-0.5 rounded-md hover:text-black dark:hover:text-white transition cursor-pointer ${isActive ? "text-text-muted" : "text-text-primary"}`}
                >
                  {expandedBotId === item._id ? (
                    <FiChevronDown className="text-[14px]" />
                  ) : (
                    <FiChevronRight className="text-[14px]" />
                  )}
                </button>
              )}

              <button
                onClick={(e) => togglePin(e, item._id)}
                className={`p-1 mr-0.5 rounded-md hover:text-black dark:hover:text-white transition cursor-pointer ${isActive ? "text-text-muted" : "text-text-primary"}`}
                title={isPinned ? "Unpin" : "Pin"}
              >
                {isPinned ? (
                  <TbPinnedOff className="text-[14px]" />
                ) : (
                  <TbPin className="text-[14px]" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDropdownOpen) {
                    setOpenDropdownId(null);
                    setActiveDropdownItem(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuWidth = 170;
                    let left = rect.left - 4;
                    if (left + menuWidth > window.innerWidth - 12) {
                      left = window.innerWidth - menuWidth - 12;
                    }
                    if (left < 12) left = 12;

                    let top = rect.bottom + 4;
                    const menuHeight = type === "bot" ? 170 : 135;
                    if (top + menuHeight > window.innerHeight - 12) {
                      top = Math.max(12, rect.top - menuHeight - 4);
                    }

                    setDropdownPos({ top, left });
                    setOpenDropdownId(item._id);
                    setActiveDropdownItem(item);
                    setActiveDropdownType(type);
                  }
                }}
                className={`three-dots-btn p-1 rounded-md hover:text-black dark:hover:text-white transition cursor-pointer ${isActive ? "text-text-muted" : "text-text-primary"}`}
              >
                <FiMoreHorizontal />
              </button>
            </div>
          )}
        </div>

        {/* Render expanded bot conversations */}
        {!collapseUI && type === "bot" && (
          <div
            className={`grid transition-all duration-300 ease-in-out ${expandedBotId === item._id ? "grid-rows-[1fr] opacity-100 mt-1 mb-2" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
              <div className="pl-6 pr-2 py-1 space-y-0.5 border-l-2 border-text-muted/30 dark:border-border-primary/80 ml-4">
                {expandedBotId === item._id &&
                  (botConversations.length === 0 ? (
                    <div className="text-[11px] text-text-primary/70 italic p-1">
                      No chats yet
                    </div>
                  ) : (
                    botConversations.map((conv) => (
                      <div
                        key={conv._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bots/${item._id}?convId=${conv._id}`);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition ${activeChatId === conv._id ||
                          searchParams.get("convId") === conv._id
                          ? "bg-black/5 dark:bg-interactive-active text-text-primary font-medium"
                          : "hover:bg-surface-secondary text-text-primary/80 hover:text-text-primary"
                          }`}
                      >
                        <FiMessageSquare className="shrink-0 text-[10px]" />
                        <span className="truncate flex-1">
                          {conv.title || "New Conversation"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalItem({
                              id: conv._id,
                              type: "botConversation",
                              botId: item._id,
                              title: conv.title || "New Conversation",
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition ml-auto"
                          title="Delete Conversation"
                        >
                          <FiTrash2 className="text-[10px]" />
                        </button>
                      </div>
                    ))
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrimarySidebar = () => (
    <>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-6">
          <img
            src="/mini-logo2.png"
            alt="Nexora Logo"
            className={`w-9 h-9 object-contain shrink-0 ${isDark ? "invert" : ""}`}
          />
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
            <span className="text-[13px] font-bold text-text-muted leading-tight">
              NEXORA
            </span>
            <span className="text-[10px] font-medium text-text-primary leading-tight">
              Multi-Tenant AI Agents
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => {
              setIsUpgradeModalOpen(false);
              setIsCreditsModalOpen(false);
              setIsSearchModalOpen(true);
              setTempClosed(true);
            }}
            className="w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <FiSearch className="text-lg" />
            </div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Search
            </span>
          </button>
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "chat" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <FiMessageSquare className="text-lg" />
            </div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Chat
            </span>
          </button>
          {/* <button
            onClick={() => {
              setIsUpgradeModalOpen(false);
              setIsCreditsModalOpen(false);
              setActiveSidebarTab("agents");
              navigate("/bots");
              setTempClosed(true);
            }}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "agents" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <TbRobotFace className="text-lg" />
            </div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              AI Agents
            </span>
          </button> */}
        </div>

        <div className="my-4 border-t border-border-primary/30 mx-2"></div>

        <div className="space-y-1">
          <button
            onClick={() => {
              setIsUpgradeModalOpen(false);
              setIsCreditsModalOpen(false);
              setActiveSidebarTab("dashboard");
              navigate("/dashboard");
              setTempClosed(true);
            }}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "dashboard" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <FiGrid className="text-lg" />
            </div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Dashboard
            </span>
          </button>
          <button
            onClick={() => {
              setIsUpgradeModalOpen(false);
              setIsCreditsModalOpen(false);
              setActiveSidebarTab("subscription");
              navigate("/subscription");
              setTempClosed(true);
            }}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "subscription" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <FiCreditCard className="text-lg" />
            </div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Subscription
            </span>
          </button>
          <button
            onClick={() => {
              setIsUpgradeModalOpen(false);
              setIsCreditsModalOpen(false);
              setActiveSidebarTab("servers");
              navigate("/admin/servers");
              setTempClosed(true);
            }}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "servers" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <FiServer className="text-lg" />
            </div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              AI Servers
            </span>
          </button>
        </div>
      </div>

      <div className="mt-auto px-2 py-4 border-t border-border-primary/40 relative">
        {isProfileDropdownOpen && (
          <div
            ref={profileDropdownRef}
            className={`profile-dropdown absolute bottom-full left-4 mb-2 rounded-2xl shadow-2xl border py-2 text-sm z-[100] bg-surface-dropdown border-border-primary text-text-primary w-[220px]`}
          >
            <div className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition rounded-lg mx-1 mb-1">
              <div className="flex items-center gap-3">
                <UserAvatar
                  user={user}
                  className="w-8 h-8 text-[12px]"
                  borderClassName="border border-border-primary"
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold truncate tracking-wide">
                    {user?.name || "User Name"}
                  </span>
                </div>
              </div>
              <FiChevronRight className="text-text-primary/70 text-sm" />
            </div>

            <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
            >
              {isDark ? (
                <FiSun className="text-sm" />
              ) : (
                <FiMoon className="text-sm" />
              )}{" "}
              Appearance
            </button>

            <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileDropdownOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
            >
              <FiLogOut className="text-sm" /> Log out
            </button>
          </div>
        )}

        <div
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          className={`profile-btn p-1.5 rounded-xl transition hover:bg-surface-secondary dark:hover:bg-surface-dropdown bg-transparent flex items-center justify-center group-hover:justify-start cursor-pointer w-full`}
        >
          <div className="flex items-center shrink-0">
            <UserAvatar
              user={user}
              className="w-8 h-8 text-[13px]"
              borderClassName="border border-border-primary/50"
            />
          </div>

          <div className="flex-col whitespace-nowrap overflow-hidden ml-3 hidden group-hover:flex transition-opacity duration-300">
            <p className="text-[13px] font-bold truncate tracking-wide text-text-primary">
              {user?.name || "User Name"}
            </p>
            <p className="text-[12px] text-text-primary/70 truncate">
              {typeof activeCredits === "number" ? activeCredits.toFixed(2) : activeCredits} Credits
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/subscription");
            }}
            className="ml-auto px-3 py-1 rounded-full border border-border-primary/50 text-[11px] font-bold hover:bg-white/5 transition shadow-sm hidden group-hover:block shrink-0 cursor-pointer"
          >
            Upgrade
          </button>
        </div>
      </div>
    </>
  );

  const renderMobileBottomNav = () => (
    <div className="items-center hidden justify-around w-full h-16 bg-surface-primary border-t border-border-primary/50 shrink-0 px-2 pb-safe">
      {[
        {
          id: "chat",
          icon: FiMessageSquare,
          onClick: handleNewChat,
        },
        /* {
          id: "agents",
          icon: TbRobotFace,
          onClick: () => {
            setIsUpgradeModalOpen(false);
            setIsCreditsModalOpen(false);
            setActiveSidebarTab("agents");
            navigate("/bots");
            setIsMobileMenuOpen(false);
          },
        }, */
        {
          id: "dashboard",
          icon: FiGrid,
          onClick: () => {
            setIsUpgradeModalOpen(false);
            setIsCreditsModalOpen(false);
            setActiveSidebarTab("dashboard");
            navigate("/dashboard");
            setIsMobileMenuOpen(false);
          },
        },
        {
          id: "subscription",
          icon: FiCreditCard,
          onClick: () => {
            setIsUpgradeModalOpen(false);
            setIsCreditsModalOpen(false);
            setActiveSidebarTab("subscription");
            navigate("/subscription");
            setIsMobileMenuOpen(false);
          },
        },
        {
          id: "servers",
          icon: FiServer,
          onClick: () => {
            setIsUpgradeModalOpen(false);
            setIsCreditsModalOpen(false);
            setActiveSidebarTab("servers");
            navigate("/admin/servers");
            setIsMobileMenuOpen(false);
          },
        },
      ].map((item) => {
        const isActive = activeSidebarTab === item.id;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`p-3 rounded-xl flex items-center justify-center transition-all ${isActive
              ? "bg-interactive-base/20 text-text-primary dark:bg-interactive-active/40 dark:text-white"
              : "text-text-primary hover:bg-surface-secondary dark:text-text-muted dark:hover:text-text-primary"
              }`}
          >
            <item.icon className="text-xl" />
          </button>
        );
      })}
    </div>
  );

  const renderSecondarySidebar = (isMobile = false) => {
    return (
      <>
        {activePopover && (
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover(null);
            }}
          />
        )}
        <div
          style={!isMobile && !isSidebarCollapsed ? { width: `${sidebarWidth}px` } : undefined}
          className={`flex flex-col h-full ${isSidebarCollapsed && !isMobile ? "overflow-visible px-1" : "overflow-hidden"} ${isResizingSidebar ? "transition-none" : "transition-all duration-300"} bg-surface-secondary shrink-0 select-none relative ${isMobile ? "w-full" : isSidebarCollapsed ? "w-[65px] border-r border-border-primary z-[60]" : "border-r border-border-primary z-20"}`}
        >
          {isMobile ? (
            <div className="p-4 border-b border-border-primary/40 flex items-center gap-3 shrink-0 relative">
              <div
                className="profile-btn flex items-center justify-between w-full cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileDropdownOpen(!isProfileDropdownOpen);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-accent-primary rounded-xl flex items-center justify-center shrink-0">
                    <img
                      src="/mini-logo2.png"
                      alt="Codegene Logo"
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <span className="text-[18px] font-serif font-medium text-text-primary leading-tight flex items-start gap-0.5 tracking-tight">
                    Codegene
                    <sup className="text-[9px] mt-1 font-sans text-text-muted font-semibold tracking-wider">
                      AI
                    </sup>
                  </span>
                </div>
                <FiChevronDown className="text-text-primary/70 text-lg shrink-0 group-hover:text-text-primary transition-colors" />
              </div>

              {isProfileDropdownOpen && (
                <div
                  ref={profileDropdownRef}
                  className="profile-dropdown absolute top-[calc(100%-4px)] left-4 right-4 mt-2 rounded-2xl shadow-2xl border py-2 text-sm z-[100] bg-surface-dropdown border-border-primary text-text-primary"
                >
                  <div className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition rounded-lg mx-1 mb-1">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={user}
                        className="w-8 h-8 text-[12px]"
                        borderClassName="border border-border-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold truncate tracking-wide">
                          {user?.name || "User Name"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      navigate("/subscription");
                    }}
                    className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
                  >
                    <FiZap className="text-sm" /> Upgrade plan
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTheme();
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
                  >
                    {isDark ? (
                      <FiSun className="text-sm" />
                    ) : (
                      <FiMoon className="text-sm" />
                    )}{" "}
                    Appearance
                  </button>

                  <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
                  >
                    <FiLogOut className="text-sm" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`p-4 border-b border-border-primary/40 flex items-center shrink-0 ${isSidebarCollapsed ? "justify-center px-2!" : "justify-between"}`}
            >
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-accent-primary rounded-xl flex items-center justify-center shrink-0">
                    <img
                      src="/mini-logo2.png"
                      alt="Codegene Logo"
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <span className="text-[18px] font-serif font-medium text-text-primary leading-tight flex items-start gap-0.5 tracking-tight">
                    Codegene
                    <sup className="text-[9px] mt-1 font-sans text-text-muted font-semibold tracking-wider">
                      AI
                    </sup>
                  </span>
                </div>
              )}
              <div
                className={`flex gap-1 ${isSidebarCollapsed ? "w-full justify-center" : ""}`}
              >
                <button
                  onClick={() => {
                    setIsSidebarCollapsed(!isSidebarCollapsed);
                    setTempClosed(true);
                  }}
                  className={`rounded-lg hover:bg-surface-secondary text-text-primary transition cursor-pointer group relative flex items-center justify-center ${isSidebarCollapsed ? "w-8 h-8 p-1" : "p-1.5"}`}
                >
                  {isSidebarCollapsed ? (
                    <>
                      <img
                        src="/mini-logo2.png"
                        alt="Nexora Logo"
                        className={`w-9 h-9 object-contain shrink-0 group-hover:opacity-0 transition-opacity absolute ${isDark ? "" : "invert"}`}
                      />
                      <FiSidebar className="text-lg opacity-0 group-hover:opacity-100 transition-opacity absolute" />
                    </>
                  ) : (
                    <FiSidebar className="text-sm" />
                  )}
                  {isSidebarCollapsed && !isMobile && (
                    <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                      Toggle Sidebar
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          <div
            className={`pt-3 pb-3 flex flex-col gap-3 shrink-0 ${isSidebarCollapsed ? "px-1 items-center" : "px-4"}`}
          >
            <button
              onClick={handleNewChat}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer bg-accent-primary text-white hover:opacity-90 font-medium shadow-sm ${isSidebarCollapsed ? "justify-center" : ""} group relative`}
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <FiPlus className="text-lg" />
              </div>
              {!isSidebarCollapsed && (
                <span className="opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
                  New Chat
                </span>
              )}
              {isSidebarCollapsed && !isMobile && (
                <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                  New Chat
                </div>
              )}
            </button>
            <div
              onClick={() => {
                setIsSearchModalOpen(true);
                setActivePopover(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer text-text-muted bg-white dark:bg-[#171923] border border-border-primary/50 hover:border-border-primary ${isSidebarCollapsed ? "justify-center px-0!" : ""} group relative`}
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
            {/* <button
                onClick={() => {
                  setActiveSidebarTab("subscription");
                  navigate("/subscription");
                  setActivePopover(null);
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "subscription" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"} ${isSidebarCollapsed ? "justify-center" : ""} group relative`}
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <FiCreditCard className="text-lg" />
                </div>
                {!isSidebarCollapsed && (
                  <span className="text-sm font-medium opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
                    Subscription
                  </span>
                )}
                {isSidebarCollapsed && !isMobile && (
                  <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                    Subscription
                  </div>
                )}
              </button> */}
          </div>

          <div
            className={`flex-1 relative ${isSidebarCollapsed && !isMobile ? "overflow-visible" : "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"}`}
          >
            {(activeSidebarTab === "chat" || activeSidebarTab === "agents" || activeSidebarTab === "subscription") && (
              <>
                <div
                  className={`pt-2 pb-32 space-y-6 ${isSidebarCollapsed && !isMobile ? "px-1 overflow-visible space-y-3!" : "px-3"}`}
                >
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
                                activePopover === "pinnedChats"
                                  ? null
                                  : "pinnedChats",
                              )
                            }
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "pinnedChats" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"} group relative`}
                          >
                            <TbPin className="text-xl" />
                            {isSidebarCollapsed && !isMobile && (
                              <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                                Pinned Chats
                              </div>
                            )}
                          </button>
                          {activePopover === "pinnedChats" && (
                            <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                              <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">
                                Pinned
                              </div>
                              <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                                {pinnedChats.map((c) =>
                                  renderSidebarItem(c, "chat", true),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${isPinnedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-0.5">
                              {pinnedChats.map((c) =>
                                renderSidebarItem(c, "chat"),
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* activeSidebarTab === "agents" && pinnedBots.length > 0 && (
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
                                activePopover === "pinnedBots"
                                  ? null
                                  : "pinnedBots",
                              )
                            }
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "pinnedBots" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"} group relative`}
                          >
                            <TbPin className="text-xl" />
                            {isSidebarCollapsed && !isMobile && (
                              <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                                Pinned Agents
                              </div>
                            )}
                          </button>
                          {activePopover === "pinnedBots" && (
                            <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                              <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">
                                Pinned
                              </div>
                              <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                                {pinnedBots.map((b) =>
                                  renderSidebarItem(b, "bot", true),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${isPinnedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-0.5">
                              {pinnedBots.map((b) =>
                                renderSidebarItem(b, "bot"),
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )} */}

                  {true && (
                    <div className="mt-2">
                      {isSidebarCollapsed && !isMobile ? (
                        <div className="relative group flex justify-center">
                          <button
                            onClick={() =>
                              setActivePopover(
                                activePopover === "recentChats"
                                  ? null
                                  : "recentChats",
                              )
                            }
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "recentChats" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"} group relative`}
                          >
                            <FiMessageCircle className="text-xl" />
                            {isSidebarCollapsed && !isMobile && (
                              <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                                Recent Chats
                              </div>
                            )}
                          </button>
                          {activePopover === "recentChats" && (
                            <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                              <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">
                                Recents
                              </div>
                              <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                                {recentChats.length === 0 ? (
                                  <div className="text-xs text-text-primary px-3 py-2">
                                    No recent chats
                                  </div>
                                ) : (
                                  recentChats.map((c) =>
                                    renderSidebarItem(c, "chat", true),
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 mt-2">
                          {recentChats.length === 0 ? (
                            <div className="text-xs text-text-primary px-3 py-2">
                              No recent chats
                            </div>
                          ) : (
                            groupedRecentChats.map((group, idx) => (
                              <div
                                key={group.key}
                                className="flex flex-col gap-0.5"
                              >
                                <h4
                                  className={`text-[11.5px] font-sans font-medium text-text-muted/80 px-3 mb-1 ${idx > 0 ? "mt-2.5" : ""}`}
                                >
                                  {group.label}
                                </h4>
                                {group.items.map((c) =>
                                  renderSidebarItem(c, "chat"),
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* activeSidebarTab === "agents" && (
                    <div>
                      {(!isSidebarCollapsed || isMobile) && (
                        <div
                          className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                          onClick={() => setIsAgentsOpen(!isAgentsOpen)}
                        >
                          <span>My AI Agents</span>
                          {isAgentsOpen ? (
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
                                activePopover === "otherBots"
                                  ? null
                                  : "otherBots",
                              )
                            }
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "otherBots" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"} group relative`}
                          >
                            <TbRobotFace className="text-xl" />
                            {isSidebarCollapsed && !isMobile && (
                              <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                                My AI Agents
                              </div>
                            )}
                          </button>
                          {activePopover === "otherBots" && (
                            <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                              <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">
                                My AI Agents
                              </div>
                              <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                                {otherBots.length === 0 ? (
                                  <div className="text-xs text-text-primary px-3 py-2">
                                    No bots created yet
                                  </div>
                                ) : (
                                  otherBots.map((b) =>
                                    renderSidebarItem(b, "bot", true),
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${isAgentsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-0.5">
                              {otherBots.length === 0 ? (
                                <div className="text-xs text-text-primary px-3 py-2">
                                  No bots created yet
                                </div>
                              ) : (
                                otherBots.map((b) =>
                                  renderSidebarItem(b, "bot"),
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )} */}
                </div>
              </>
            )}
          </div>

          {/* Profile Dropdown at bottom of sidebar (Desktop only) */}
          {!isMobile && (
            <div className="mt-auto px-2 py-4 border-t border-border-primary/40 relative">
              {isProfileDropdownOpen && (
                <div
                  ref={profileDropdownRef}
                  className={`profile-dropdown absolute bottom-full left-4 mb-2 rounded-2xl shadow-2xl border py-2 text-sm z-[100] bg-surface-dropdown border-border-primary text-text-primary w-[220px]`}
                >
                  <div className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition rounded-lg mx-1 mb-1">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={user}
                        className="w-8 h-8 text-[12px]"
                        borderClassName="border border-border-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold truncate tracking-wide">
                          {user?.name || "Nunna Sudha"}
                        </span>
                      </div>
                    </div>
                    <FiChevronRight className="text-text-primary/70 text-sm" />
                  </div>

                  <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      navigate("/subscription");
                    }}
                    className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
                  >
                    <FiZap className="text-sm" /> Upgrade plan
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      navigate("/usage");
                    }}
                    className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
                  >
                    <FiCreditCard className="text-sm" /> Credits usage
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTheme();
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
                  >
                    {isDark ? (
                      <FiSun className="text-sm" />
                    ) : (
                      <FiMoon className="text-sm" />
                    )}{" "}
                    Appearance
                  </button>

                  <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3"
                  >
                    <FiLogOut className="text-sm" /> Log out
                  </button>
                </div>
              )}

              <div
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`profile-btn p-1.5 rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5 bg-transparent flex items-center cursor-pointer w-full group ${
                  isSidebarCollapsed ? "px-0 justify-center" : "justify-between"
                }`}
                title="Profile & Settings"
              >
                <div className="flex items-center min-w-0">
                  <div className="flex items-center shrink-0">
                    <UserAvatar
                      user={user}
                      className="w-8 h-8 text-[12px]"
                      borderClassName="border border-border-primary/50"
                    />
                  </div>

                  {!isSidebarCollapsed && (
                    <div className="flex-col whitespace-nowrap overflow-hidden ml-2.5 flex transition-opacity duration-300 items-start leading-none min-w-0">
                      <p className="text-[13px] font-normal truncate text-text-primary">
                        {user?.name || "User"}
                      </p>
                      <p className="text-[12px] text-text-muted truncate leading-tight mt-0.5">
                        {typeof activeCredits === "number" ? activeCredits.toFixed(2) : activeCredits} Credits
                      </p>
                    </div>
                  )}
                </div>

                {!isSidebarCollapsed && (
                  <div className="shrink-0 ml-auto pl-2 text-text-muted">
                    <FiChevronUp
                      className={`w-4 h-4 transition-transform duration-200 group-hover:text-text-primary ${
                        isProfileDropdownOpen ? "rotate-180 text-text-primary" : ""
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Draggable resize border handle */}
          {!isMobile && !isSidebarCollapsed && (
            <div
              onMouseDown={handleMouseDownResize}
              onDoubleClick={handleDoubleClickReset}
              className={`absolute top-0 -right-1 w-[8px] h-full cursor-col-resize z-50 group transition-all flex items-center justify-center ${isResizingSidebar
                ? "bg-accent-primary/20"
                : "hover:bg-accent-primary/10"
                }`}
              title="Drag left/right to adjust sidebar width (Double-click to reset)"
            >
              <div
                className={`w-[2px] h-full transition-colors ${isResizingSidebar
                  ? "bg-accent-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                  : "bg-transparent group-hover:bg-accent-primary"
                  }`}
              />
            </div>
          )}
        </div>
      </>
    );
  };

  if (location.pathname === "/") {
    if (isAuthenticated) {
      return <Navigate to="/chat" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated && !isGoogleCallbackRoute) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-surface-primary text-text-primary">
        <AuthModal onAuthSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-surface-primary text-text-primary`}
    >
      {/* Main Sidebar (Desktop) */}
      <div className="hidden md:flex h-full z-30 relative">
        {renderSecondarySidebar()}
      </div>

      <div
        className={`md:hidden fixed inset-0 z-50 flex transition-all duration-300 ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
      >
        <div
          className={`fixed inset-0 bg-accent-primary/10 transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
        <div
          className={`relative w-[320px] max-w-[85vw] h-full shadow-2xl flex flex-col bg-surface-secondary overflow-hidden transform transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
            {renderSecondarySidebar(true)}
          </div>
          {renderMobileBottomNav()}
        </div>
      </div>

      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative bg-dotted">
        {isUpgradeModalOpen && location.pathname !== "/subscription" ? (
          <SubscriptionModal />
        ) : isCreditsModalOpen && location.pathname !== "/usage" ? (
          <CreditsModal />
        ) : (
          children
        )}
      </main>

      {/* <FloatingExternalBotWidget /> */}

      {isCreateModalOpen && (
        <CreateBotModal
          onClose={() => setIsCreateModalOpen(false)}
          onBotCreated={handleBotCreated}
        />
      )}

      {/* Global Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-32">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSearchModalOpen(false)}
          ></div>

          <div
            className={`relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${"bg-surface-primary border border-border-primary text-text-primary"}`}
          >
            <div
              className={`flex items-center px-4 py-3 border-b ${"border-border-primary"}`}
            >
              <FiSearch className="text-xl text-text-primary mr-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chats, agents, or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-base placeholder:text-text-muted"
              />
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="p-1.5 ml-2 rounded-lg hover:bg-interactive-active transition"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
              {!searchQuery && (
                <div className="p-8 text-center text-sm text-text-primary">
                  Start typing to search your chats and agents...
                </div>
              )}

              {searchQuery && filteredSearchBots.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-3 py-1 mb-1">
                    AI Agents
                  </div>
                  {filteredSearchBots.map((bot) => (
                    <div
                      key={bot._id}
                      onClick={() => handleSelectItem(bot._id, "bot")}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${"hover:bg-surface-secondary dark:hover:bg-interactive-active"}`}
                    >
                      <div className="w-6 h-6 rounded-md bg-interactive-base flex items-center justify-center text-text-primary dark:text-white shrink-0">
                        <TbRobotFace className="text-sm" />
                      </div>
                      <span className="text-sm font-medium">{bot.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && filteredSearchChats.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-3 py-1 mb-1">
                    Conversations
                  </div>
                  {filteredSearchChats.map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => handleSelectItem(chat._id, "chat")}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${"hover:bg-surface-secondary dark:hover:bg-interactive-active"}`}
                    >
                      <div className="w-6 h-6 rounded-md border border-border-primary flex items-center justify-center text-text-primary shrink-0">
                        <FiMessageSquare className="text-xs" />
                      </div>
                      <span className="text-sm font-medium">
                        {chat.title || "New Conversation"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery &&
                filteredSearchBots.length === 0 &&
                filteredSearchChats.length === 0 && (
                  <div className="p-8 text-center text-sm text-text-primary">
                    No results found for "{searchQuery}"
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Global Root-Level Dropdown to prevent clipping */}
      {openDropdownId && activeDropdownItem && (
        <div
          ref={dropdownRef}
          className="fixed z-[999] w-42 rounded-xl shadow-xl border py-1.5 px-1 text-sm bg-surface-dropdown border-border-primary text-text-primary backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {activeDropdownType === "bot" && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const currentBotId = activeDropdownItem._id;
                try {
                  const res = await NobackEndCallObj(
                    `/bots/${currentBotId}/conversations`,
                    {
                      title: "New Conversation",
                    },
                    "post",
                  );
                  const newConvId = res?._id || res?.data?._id;
                  setOpenDropdownId(null);
                  setActiveDropdownItem(null);
                  setExpandedBotId(currentBotId);
                  queryClient.invalidateQueries({
                    queryKey: ["botConversations", currentBotId],
                  });
                  navigate(`/bots/${currentBotId}?convId=${newConvId}`);
                  setIsMobileMenuOpen(false);
                } catch (err) {
                  console.error("Failed to create new conversation:", err);
                }
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center gap-2.5 text-[13px] font-medium cursor-pointer"
            >
              <FiPlus className="text-sm" /> New Chat
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditTitleValue(
                activeDropdownType === "chat"
                  ? activeDropdownItem.title || "New Conversation"
                  : activeDropdownItem.name,
              );
              setEditingItemId(activeDropdownItem._id);
              setOpenDropdownId(null);
              setActiveDropdownItem(null);
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-2.5 text-[13px] font-medium"
          >
            <FiEdit2 className="text-sm" /> Rename
          </button>
          <button
            onClick={(e) => {
              togglePin(e, activeDropdownItem._id);
              setActiveDropdownItem(null);
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-2.5 text-[13px] font-medium"
          >
            {pinnedItemIds.includes(activeDropdownItem._id) ? (
              <>
                <TbPinnedOff className="text-sm" /> Unpin
              </>
            ) : (
              <>
                <TbPin className="text-sm" /> Pin
              </>
            )}
          </button>
          <div className="h-px bg-border-primary/40 my-1"></div>
          <button
            onClick={(e) => {
              handleDeleteItem(
                e,
                activeDropdownItem._id,
                activeDropdownType,
                activeDropdownItem,
              );
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 transition cursor-pointer flex items-center gap-2.5 text-[13px] font-medium"
          >
            <FiTrash2 className="text-sm" /> Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setDeleteModalItem(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface-primary dark:bg-[#1a1b26] border border-border-primary dark:border-white/10 p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <FiTrash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  Delete Chat?
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-sm text-text-muted my-4 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-medium text-text-primary">
                "{deleteModalItem.title || "this conversation"}"
              </span>
              ?
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-primary bg-surface-secondary hover:bg-black/5 dark:hover:bg-white/5 border border-border-primary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteModalItem;
                  setDeleteModalItem(null);
                  if (target.type === "chat") {
                    deleteChatMutation.mutate(target.id);
                  } else if (target.type === "botConversation") {
                    try {
                      await backEndCallObjDel(
                        `/bots/${target.botId}/conversations`,
                        target.id,
                      );
                      queryClient.invalidateQueries({
                        queryKey: ["botConversations", target.botId],
                      });
                      if (searchParams.get("convId") === target.id) {
                        navigate(`/bots/${target.botId}`);
                      }
                    } catch (err) {
                      console.error("Failed to delete conversation:", err);
                    }
                  }
                }}
                disabled={deleteChatMutation.isPending || deleteChatMutation.isLoading}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {deleteChatMutation.isPending || deleteChatMutation.isLoading
                  ? "Deleting..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
