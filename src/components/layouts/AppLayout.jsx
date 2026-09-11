import { useState, useEffect, useRef, useCallback } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import {
  FiGrid,
  FiServer,
  FiMessageSquare,
  FiPlus,
  FiSun,
  FiMoon,
  FiLogOut,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiX,
  FiCreditCard,
  FiMoreHorizontal,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiSidebar,
  FiZap,
} from "react-icons/fi";
import { TbPin, TbPinnedOff, TbRobotFace } from "react-icons/tb";
import axios from "axios";
import {
  backEndCallGet,
  NobackEndCall,
  backEndCallObjDel,
  NobackEndCallObj,
  getJwt,
} from "../../services/authService";
import CreateBotModal from "../bots/CreateBotModal";
import AuthModal from "../auth/AuthModal";
import SubscriptionModal from "../subscription/SubscriptionModal";
import CreditsModal from "../subscription/CreditsModal";
import UserAvatar from "../common/UserAvatar";
import { useTheme } from "../../context/ThemeContext";
import { useSubscription } from "../../context/SubscriptionContext";
import {
  useTanStackData,
  useTanStackQueryClient,
  useTanStackMutation,
} from "../../hooks/useTanStackData";
import ChatSidebar from "../sidebar/ChatSidebar";
import AgentSidebar from "../sidebar/AgentSidebar";
import ModeTransitionOverlay from "../sidebar/ModeTransitionOverlay";

const AppLayout = ({ children }) => {
  const { isDark, toggleTheme } = useTheme();
  const {
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    isCreditsModalOpen,
    setIsCreditsModalOpen,
  } = useSubscription();
  const [authToken, setAuthToken] = useState(() =>
    getJwt() || localStorage.getItem("token"),
  );
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!(getJwt() || localStorage.getItem("token")),
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
  const [isAgentsOpen, setIsAgentsOpen] = useState(true);
  const [expandedBotId, setExpandedBotId] = useState(null);

  // Inline Editing State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  const isAgentRoute =
    location.pathname.startsWith("/agents") ||
    location.pathname.startsWith("/bots") ||
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/home") ||
    location.pathname.startsWith("/knowledge-base") ||
    location.pathname.startsWith("/phone-numbers") ||
    location.pathname.startsWith("/batch-call") ||
    location.pathname.startsWith("/call-history") ||
    location.pathname.startsWith("/contacts") ||
    location.pathname.startsWith("/analytics") ||
    location.pathname.startsWith("/live-monitoring") ||
    location.pathname.startsWith("/ai-qa") ||
    location.pathname.startsWith("/alerting") ||
    location.pathname.startsWith("/integrations") ||
    location.pathname.startsWith("/settings");

  const activeSidebarTab = isAgentRoute
    ? "agents"
    : location.pathname.startsWith("/subscription")
      ? "subscription"
      : location.pathname.startsWith("/admin/servers")
        ? "servers"
        : "chat";

  useEffect(() => {
    setIsCreditsModalOpen(false);
    setIsUpgradeModalOpen(false);

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
  }, [location.pathname, location.search, setIsCreditsModalOpen, setIsUpgradeModalOpen]);

  const [isModeTransitioning, setIsModeTransitioning] = useState(false);
  const [transitionTargetMode, setTransitionTargetMode] = useState("agents");

  const handleEnterAgentMode = () => {
    setTransitionTargetMode("agents");
    setIsModeTransitioning(true);
    setTimeout(() => {
      navigate("/agents");
      setTimeout(() => {
        setIsModeTransitioning(false);
      }, 350);
    }, 120);
  };

  const handleExitAgentMode = () => {
    setTransitionTargetMode("chat");
    setIsModeTransitioning(true);
    setTimeout(() => {
      navigate("/chat");
      setTimeout(() => {
        setIsModeTransitioning(false);
      }, 350);
    }, 120);
  };

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

  useEffect(() => {
    const handleSetSidebarCollapsed = (e) => {
      setIsSidebarCollapsed(Boolean(e.detail?.collapsed));
    };

    window.addEventListener("setSidebarCollapsed", handleSetSidebarCollapsed);
    return () => window.removeEventListener("setSidebarCollapsed", handleSetSidebarCollapsed);
  }, []);

  // Auto-collapse sidebar on Agent Studio flow editor routes to maximize canvas space
  const isStudioRoute = Boolean(
    location.pathname.match(/^\/(agents|bots)\/[^/]+/) ||
    location.pathname === "/agents/new" ||
    location.pathname === "/bots/new"
  );

  useEffect(() => {
    if (isStudioRoute) {
      const timer = setTimeout(() => {
        setIsSidebarCollapsed(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isStudioRoute]);

  const [pinnedItemIds, setPinnedItemIds] = useState(user?.pinnedItemIds || []);

  useEffect(() => {
    if (user && user.pinnedItemIds) {
      setPinnedItemIds(user.pinnedItemIds);
    }
  }, [user?.pinnedItemIds]);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activeDropdownItem, setActiveDropdownItem] = useState(null);
  const [activeDropdownType, setActiveDropdownType] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

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
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
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
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      if (currentToken) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["bots"] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        
        backEndCallGet("/auth/me")
          .then((res) => {
            if (res?.success && res?.user) {
              setUser(res.user);
              const newUserStr = JSON.stringify(res.user);
              if (localStorage.getItem("user") !== newUserStr) {
                localStorage.setItem("user", newUserStr);
              }
            }
          })
          .catch(() => { });
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === "user" && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch {
          // ignore parse error
        }
      } else if (e.key === "token") {
        syncAuth();
      }
    };

    syncAuth();

    window.addEventListener("auth-change", syncAuth);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("auth-change", syncAuth);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [location.pathname, queryClient]);

  // Fetch Bots
  const { data: bots = [] } = useTanStackData(
    ["bots"],
    async () => {
      const res = await backEndCallGet("/bots");
      return Array.isArray(res) ? res : res?.data || res?.bots || [];
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
    if (usageData?.user?.credits !== undefined && user && user.credits !== usageData.user.credits) {
      const updatedCredits = usageData.user.credits;
      queueMicrotask(() => {
        setUser((prev) => {
          if (!prev || prev.credits === updatedCredits) return prev;
          const updatedUser = { ...prev, credits: updatedCredits };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          return updatedUser;
        });
      });
    }
  }, [usageData?.user?.credits, user]);

  const currentBotId = (() => {
    if (
      location.pathname.startsWith("/agents/") ||
      location.pathname.startsWith("/bots/")
    ) {
      const parts = location.pathname.split("/");
      const id = parts[2];
      return id && id !== "new" ? id : null;
    }
    return null;
  })();

  const activeBotId = currentBotId || expandedBotId;

  // Fetch Bot Conversations
  const { data: botConversations = [] } = useTanStackData(
    ["botConversations", activeBotId],
    async () => {
      if (!activeBotId || !authToken) return [];
      const res = await NobackEndCall(`/bots/${activeBotId}/conversations`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!activeBotId && !!authToken },
  );

  const activeBot = bots.find((b) => b._id === currentBotId);

  const handleCreateBotChat = async (targetBotId = currentBotId) => {
    if (!targetBotId) return;
    try {
      const res = await NobackEndCallObj(
        `/bots/${targetBotId}/conversations`,
        { title: "New Conversation" },
        "post",
      );
      const newConvId = res?._id || res?.data?._id;
      queryClient.invalidateQueries({
        queryKey: ["botConversations", targetBotId],
      });
      if (newConvId) {
        navigate(`/bots/${targetBotId}?convId=${newConvId}`);
      } else {
        navigate(`/bots/${targetBotId}`);
      }
      setIsMobileMenuOpen(false);
    } catch (err) {
      console.error("Failed to create new conversation:", err);
    }
  };

  const handleDeleteBotConv = async (e, convId, targetBotId = currentBotId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    // Optimistic instant removal (0ms latency)
    queryClient.setQueryData(["botConversations", targetBotId], (oldConvs) => {
      if (!Array.isArray(oldConvs)) return [];
      return oldConvs.filter((c) => c._id !== convId);
    });
    if (searchParams.get("convId") === convId) {
      navigate(`/bots/${targetBotId}`);
    }
    try {
      await backEndCallObjDel(`/bots/${targetBotId}/conversations`, convId);
    } catch (err) {
      console.error("Failed to delete bot conversation:", err);
      queryClient.invalidateQueries({
        queryKey: ["botConversations", targetBotId],
      });
    }
  };

  // Delete Mutation with Instant Optimistic UI Reflection
  const deleteChatMutation = useTanStackMutation({
    mutationFn: async (chatId) => {
      return await backEndCallObjDel("/chats", chatId);
    },
    onMutate: async (chatId) => {
      // 1. Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      // 2. Snapshot previous chats
      const previousChats = queryClient.getQueryData(["chats"]);
      // 3. Optimistically remove deleted chat immediately (0ms latency)
      queryClient.setQueryData(["chats"], (oldChats) => {
        if (!Array.isArray(oldChats)) return [];
        return oldChats.filter((c) => c._id !== chatId);
      });
      // 4. Instantly unpin if pinned
      setPinnedItemIds((prev) => prev.filter((id) => id !== chatId));
      // 5. Instantly reset active chat view if currently viewing
      if (activeChatId === chatId) {
        handleNewChat();
      }
      return { previousChats };
    },
    onError: (err, chatId, context) => {
      // Rollback on network failure
      if (context?.previousChats) {
        queryClient.setQueryData(["chats"], context.previousChats);
      }
      console.error("Failed to delete chat:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
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

  const togglePin = async (e, id) => {
    e.stopPropagation();
    
    // Optimistic UI update
    let newPinnedIds;
    setPinnedItemIds((prev) => {
      newPinnedIds = prev.includes(id)
        ? prev.filter((pinnedId) => pinnedId !== id)
        : [...prev, id];
      return newPinnedIds;
    });
    setOpenDropdownId(null);

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/auth/pins`,
        { pinnedItemIds: newPinnedIds },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      // Update local user context if necessary, or let query invalidation handle it
      if (user) {
        const updatedUser = { ...user, pinnedItemIds: newPinnedIds };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Failed to sync pins to server", error);
    }
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

  const handleNewChat = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setIsCreditsModalOpen(false);
    setIsMobileMenuOpen(false);
    setIsSearchModalOpen(false);
    setActivePopover(null);

    const navTimestamp = Date.now();
    navigate("/chat", {
      replace: true,
      state: { newChat: true, resetChat: true, timestamp: navTimestamp },
    });
    window.dispatchEvent(new CustomEvent("new-chat-action"));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("new-chat-action"));
    }, 10);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("new-chat-action"));
    }, 80);
  }, [navigate, setIsCreditsModalOpen, setIsUpgradeModalOpen]);

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
                  className={`w-full bg-transparent outline-none border-b border-text-muted/30 text-sm text-text-primary`}
                />
                <button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  title="Confirm rename"
                  className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-500/10 active:scale-95 transition cursor-pointer shrink-0"
                >
                  <FiCheck className="text-sm stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItemId(null);
                  }}
                  title="Cancel rename"
                  className="p-1 rounded-md text-text-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition cursor-pointer shrink-0"
                >
                  <FiX className="text-sm stroke-[2.5]" />
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



  const renderMobileBottomNav = () => (
    <div className="items-center hidden justify-around w-full h-16 bg-surface-primary border-t border-border-primary/50 shrink-0 px-2 pb-safe">
      {[
        {
          id: "chat",
          icon: FiMessageSquare,
          onClick: handleNewChat,
        },
        // {
        //   id: "agents",
        //   icon: TbRobotFace,
        //   onClick: () => {
        //     setIsUpgradeModalOpen(false);
        //     setIsCreditsModalOpen(false);
        //     navigate("/agents");
        //     setIsMobileMenuOpen(false);
        //   },
        // },
        {
          id: "dashboard",
          icon: FiGrid,
          onClick: () => {
            setIsUpgradeModalOpen(false);
            setIsCreditsModalOpen(false);
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
          
          <div
            className={`p-4 border-b border-border-primary/40 flex items-center shrink-0 ${isSidebarCollapsed && !isMobile ? "justify-center px-2!" : "justify-between"}`}
          >
            {(!isSidebarCollapsed || isMobile) && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-accent-primary rounded-xl flex items-center justify-center shrink-0">
                  <img
                    src="/mini-logo2.png"
                    alt="Codegene Logo"
                    className="w-5 h-5 object-contain"
                  />
                </div>
                <div className="flex items-baseline min-w-0">
                  <span className="text-[18px] font-serif font-medium text-text-primary leading-tight tracking-tight truncate">
                    Codegene
                  </span>
                  <span className="text-[9px] font-sans text-text-muted font-bold tracking-wider shrink-0 ml-0.5 -translate-y-2">
                    AI
                  </span>
                </div>
              </div>
            )}
            
            <div
              className={`flex gap-1 shrink-0 ${isSidebarCollapsed && !isMobile ? "w-full justify-center" : ""}`}
            >
              {!isMobile ? (
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
                  {isSidebarCollapsed && (
                    <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                      Toggle Sidebar
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg hover:bg-surface-secondary text-text-primary transition cursor-pointer p-1.5"
                >
                  <FiX className="text-xl" />
                </button>
              )}
            </div>
          </div>
          {/* Gemini-style Segmented Switcher: [ Chat | Agent ] */}
          {/* <div
            className={`pt-2.5 pb-1 shrink-0 ${
              isSidebarCollapsed && !isMobile ? "px-1" : "px-4"
            }`}
          >
            {isSidebarCollapsed && !isMobile ? (
              <div className="flex flex-col gap-1.5 w-full items-center">
                <button
                  type="button"
                  onClick={handleExitAgentMode}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
                    activeSidebarTab !== "agents"
                      ? "bg-accent-primary text-white shadow-sm font-semibold"
                      : "text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                  }`}
                  title="Chat Mode"
                >
                  <FiMessageSquare className="text-base" />
                  <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                    Chat Mode
                  </div>
                </button> */}

                {/* <button
                  type="button"
                  onClick={handleEnterAgentMode}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
                    activeSidebarTab === "agents"
                      ? "bg-accent-primary text-white shadow-sm font-semibold"
                      : "text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                  }`}
                  title="Agent Mode"
                >
                  <TbRobotFace className="text-base" />
                  <div className="absolute left-[calc(100%+12px)] px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-[13px] font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                    Agent Mode
                  </div>
                </button> */}
              {/* </div>
            ) : (
              <div className="w-full bg-black/5 dark:bg-[#131520] p-1 rounded-xl border border-border-primary/60 dark:border-white/[0.08] flex items-center gap-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"> */}
                {/* Chat Tab */}
                {/* <button
                  type="button"
                  onClick={handleExitAgentMode}
                  className={`group flex-1 py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                    activeSidebarTab !== "agents"
                      ? "bg-white dark:bg-[#1f2334] text-text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border border-border-primary/50 dark:border-white/10 font-semibold"
                      : "text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 font-medium"
                  }`}
                >
                  <FiMessageSquare
                    className={`text-sm shrink-0 transition-colors ${
                      activeSidebarTab !== "agents"
                        ? "text-accent-primary"
                        : "text-text-muted group-hover:text-text-primary"
                    }`}
                  />
                  <span className="tracking-tight">Chat</span>
                </button> */}

                {/* Agent Tab */}
                {/* <button
                  type="button"
                  onClick={handleEnterAgentMode}
                  className={`group flex-1 py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                    activeSidebarTab === "agents"
                      ? "bg-white dark:bg-[#1f2334] text-text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border border-accent-primary/30 font-semibold"
                      : "text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 font-medium"
                  }`}
                >
                  <TbRobotFace
                    className={`text-base shrink-0 transition-colors ${
                      activeSidebarTab === "agents"
                        ? "text-accent-primary"
                        : "text-text-muted group-hover:text-accent-primary"
                    }`}
                  />
                  <span className="tracking-tight">Agent</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none shrink-0 transition-all ${
                      activeSidebarTab === "agents"
                        ? "bg-gradient-to-r from-accent-primary to-violet-500 text-white shadow-xs"
                        : "bg-accent-primary/10 text-accent-primary border border-accent-primary/20"
                    }`}
                  >
                    AI
                  </span>
                </button> */}
              {/* </div>
            )}
          </div> */}

          {/* Main Sidebar Content Area (takes remaining space, enables internal scrolling) */}
          <div className={`flex-1 min-h-0 flex flex-col ${isSidebarCollapsed && !isMobile ? "overflow-visible" : "overflow-hidden"}`}>
            {activeSidebarTab === "agents" ? (
              <AgentSidebar
                isSidebarCollapsed={isSidebarCollapsed}
                isMobile={isMobile}
                onExitAgentMode={handleExitAgentMode}
                navigate={navigate}
                currentBotId={currentBotId}
                activeBot={activeBot}
                bots={bots}
                pinnedBots={pinnedBots}
                otherBots={otherBots}
                isPinnedOpen={isPinnedOpen}
                setIsPinnedOpen={setIsPinnedOpen}
                isAgentsOpen={isAgentsOpen}
                setIsAgentsOpen={setIsAgentsOpen}
                botConversations={botConversations}
                searchParams={searchParams}
                handleCreateBotChat={handleCreateBotChat}
                handleDeleteBotConv={handleDeleteBotConv}
                renderSidebarItem={renderSidebarItem}
                activePopover={activePopover}
                setActivePopover={setActivePopover}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
              />
            ) : (
              <ChatSidebar
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                isMobile={isMobile}
                handleNewChat={handleNewChat}
                setIsSearchModalOpen={setIsSearchModalOpen}
                onEnterAgentMode={handleEnterAgentMode}
                pinnedChats={pinnedChats}
                isPinnedOpen={isPinnedOpen}
                setIsPinnedOpen={setIsPinnedOpen}
                groupedRecentChats={groupedRecentChats}
                recentChats={recentChats}
                renderSidebarItem={renderSidebarItem}
                activePopover={activePopover}
                setActivePopover={setActivePopover}
              />
            )}
          </div>

          {/* Profile Dropdown at bottom of sidebar */}
          <div className="mt-auto px-2 py-3 border-t border-border-primary/40 relative shrink-0 z-30 bg-surface-secondary">
            {isProfileDropdownOpen && (
              <div
                ref={profileDropdownRef}
                className="profile-dropdown absolute bottom-full left-4 mb-2 rounded-2xl shadow-2xl border py-2 text-sm z-[100] bg-surface-dropdown border-border-primary text-text-primary w-[220px]"
              >
                <div
                  onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); setIsMobileMenuOpen(false); navigate("/usage"); }}
                  className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition rounded-lg mx-1 mb-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={user} className="w-8 h-8 text-[12px]" borderClassName="border border-border-primary" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold truncate tracking-wide">{user?.name || "Nunna Sudha"}</span>
                      <span className="text-[11.5px] text-text-muted truncate leading-tight mt-0.5 font-normal flex items-center gap-1">
                        <span className="font-medium text-accent-primary">{typeof activeCredits === "number" ? activeCredits.toFixed(2) : activeCredits}</span>{" "}Credits
                      </span>
                    </div>
                  </div>
                  <FiChevronRight className="text-text-primary/70 text-sm shrink-0" />
                </div>
                <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>
                <button onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); setIsMobileMenuOpen(false); navigate("/subscription"); }} className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiZap className="text-sm" /> Upgrade plan
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); setIsMobileMenuOpen(false); navigate("/usage"); }} className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiCreditCard className="text-sm" /> Credits usage
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleTheme(); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  {isDark ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}{" "}Appearance
                </button>
                <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>
                <button onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2.5 font-normal hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiLogOut className="text-sm" /> Log out
                </button>
              </div>
            )}
            <div
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className={`profile-btn p-1.5 rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5 bg-transparent flex items-center cursor-pointer w-full group ${isSidebarCollapsed ? "px-0 justify-center" : "justify-between"}`}
              title="Profile & Settings"
            >
              <div className="flex items-center min-w-0">
                <div className="flex items-center shrink-0">
                  <UserAvatar user={user} className="w-8 h-8 text-[12px]" borderClassName="border border-border-primary/50" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-col whitespace-nowrap overflow-hidden ml-2.5 flex transition-opacity duration-300 items-start leading-none min-w-0">
                    <p className="text-[13px] font-normal truncate text-text-primary">{user?.name || "User"}</p>
                    <p className="text-[12px] text-text-muted truncate leading-tight mt-0.5">{typeof activeCredits === "number" ? activeCredits.toFixed(2) : activeCredits} Credits</p>
                  </div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <div className="shrink-0 ml-auto pl-2 text-text-muted">
                  <FiChevronUp className={`w-4 h-4 transition-transform duration-200 group-hover:text-text-primary ${isProfileDropdownOpen ? "rotate-180 text-text-primary" : ""}`} />
                </div>
              )}
            </div>
          </div>

          {/* Draggable resize border handle (desktop only) */}
          {!isMobile && !isSidebarCollapsed && (
            <div
              onMouseDown={handleMouseDownResize}
              onDoubleClick={handleDoubleClickReset}
              className={`absolute top-0 -right-1 w-[8px] h-full cursor-col-resize z-50 group transition-all flex items-center justify-center ${isResizingSidebar ? "bg-accent-primary/20" : "hover:bg-accent-primary/10"}`}
              title="Drag left/right to adjust sidebar width (Double-click to reset)"
            >
              <div className={`w-[2px] h-full transition-colors ${isResizingSidebar ? "bg-accent-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-transparent group-hover:bg-accent-primary"}`} />
            </div>
          )}
        </div>
      </>
    );
  };

  if (location.pathname === "/") {
    if (isAuthenticated) return <Navigate to="/chat" replace />;
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated && !isGoogleCallbackRoute) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-surface-primary text-text-primary">
        <AuthModal onAuthSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  const isSharedRoute = location.pathname.startsWith("/share/");
  if (isSharedRoute) {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden bg-surface-primary text-text-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-surface-primary text-text-primary">
      <ModeTransitionOverlay isVisible={isModeTransitioning} targetMode={transitionTargetMode} />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full z-30 relative">
        {renderSecondarySidebar()}
      </div>

      {/* Mobile Sidebar Overlay */}
      <div className={`md:hidden fixed inset-0 z-50 flex transition-all duration-300 ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
        <div
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {/* Sidebar panel — narrower on mobile: 260px / max 75vw */}
        <div className={`relative w-[260px] max-w-[75vw] h-full shadow-2xl flex flex-col bg-surface-secondary overflow-hidden transform transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
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

      {isCreateModalOpen && (
        <CreateBotModal
          onClose={() => setIsCreateModalOpen(false)}
          onBotCreated={handleBotCreated}
        />
      )}

      {/* Global Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-32">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSearchModalOpen(false)}></div>
          <div className={`relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${"bg-surface-primary border border-border-primary text-text-primary"}`}>
            <div className={`flex items-center px-4 py-3 border-b ${"border-border-primary"}`}>
              <FiSearch className="text-xl text-text-primary mr-3" />
              <input ref={searchInputRef} type="text" placeholder="Search chats, agents, or messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none text-base placeholder:text-text-muted" />
              <button onClick={() => setIsSearchModalOpen(false)} className="p-1.5 ml-2 rounded-lg hover:bg-interactive-active transition"><FiX className="text-lg" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
              {!searchQuery && <div className="p-8 text-center text-sm text-text-primary">Start typing to search your chats and agents...</div>}
              {searchQuery && filteredSearchBots.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-3 py-1 mb-1">AI Agents</div>
                  {filteredSearchBots.map((bot) => (
                    <div key={bot._id} onClick={() => handleSelectItem(bot._id, "bot")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${"hover:bg-surface-secondary dark:hover:bg-interactive-active"}`}>
                      <div className="w-6 h-6 rounded-md bg-interactive-base flex items-center justify-center text-text-primary dark:text-white shrink-0"><TbRobotFace className="text-sm" /></div>
                      <span className="text-sm font-medium">{bot.name ? (bot.name.charAt(0).toUpperCase() + bot.name.slice(1)) : "Bot"}</span>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && filteredSearchChats.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-3 py-1 mb-1">Conversations</div>
                  {filteredSearchChats.map((chat) => (
                    <div key={chat._id} onClick={() => handleSelectItem(chat._id, "chat")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${"hover:bg-surface-secondary dark:hover:bg-interactive-active"}`}>
                      <div className="w-6 h-6 rounded-md border border-border-primary flex items-center justify-center text-text-primary shrink-0"><FiMessageSquare className="text-xs" /></div>
                      <span className="text-sm font-medium">{chat.title || "New Conversation"}</span>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && filteredSearchBots.length === 0 && filteredSearchChats.length === 0 && (
                <div className="p-8 text-center text-sm text-text-primary">No results found for "{searchQuery}"</div>
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
                  const res = await NobackEndCallObj(`/bots/${currentBotId}/conversations`, { title: "New Conversation" }, "post");
                  const newConvId = res?._id || res?.data?._id;
                  setOpenDropdownId(null);
                  setActiveDropdownItem(null);
                  setExpandedBotId(currentBotId);
                  queryClient.invalidateQueries({ queryKey: ["botConversations", currentBotId] });
                  navigate(`/bots/${currentBotId}?convId=${newConvId}`);
                  setIsMobileMenuOpen(false);
                } catch (err) { console.error("Failed to create new conversation:", err); }
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center gap-2.5 text-[13px] font-medium cursor-pointer"
            >
              <FiPlus className="text-sm" /> New Chat
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditTitleValue(activeDropdownType === "chat" ? activeDropdownItem.title || "New Conversation" : activeDropdownItem.name);
              setEditingItemId(activeDropdownItem._id);
              setOpenDropdownId(null);
              setActiveDropdownItem(null);
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-2.5 text-[13px] font-medium"
          >
            <FiEdit2 className="text-sm" /> Rename
          </button>
          <button
            onClick={(e) => { togglePin(e, activeDropdownItem._id); setActiveDropdownItem(null); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-2.5 text-[13px] font-medium"
          >
            {pinnedItemIds.includes(activeDropdownItem._id) ? <><TbPinnedOff className="text-sm" /> Unpin</> : <><TbPin className="text-sm" /> Pin</>}
          </button>
          <div className="h-px bg-border-primary/40 my-1"></div>
          <button
            onClick={(e) => { handleDeleteItem(e, activeDropdownItem._id, activeDropdownType, activeDropdownItem); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 transition cursor-pointer flex items-center gap-2.5 text-[13px] font-medium"
          >
            <FiTrash2 className="text-sm" /> Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" onClick={() => setDeleteModalItem(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface-primary dark:bg-[#1a1b26] border border-border-primary dark:border-white/10 p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0"><FiTrash2 className="w-5 h-5" /></div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Delete Chat?</h3>
                <p className="text-xs text-text-muted mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-text-muted my-4 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-medium text-text-primary">"{deleteModalItem.title || "this conversation"}"</span>?
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button type="button" onClick={() => setDeleteModalItem(null)} className="px-4 py-2 rounded-xl text-xs font-medium text-text-primary bg-surface-secondary hover:bg-black/5 dark:hover:bg-white/5 border border-border-primary transition cursor-pointer">
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
                    queryClient.setQueryData(["botConversations", target.botId], (oldConvs) => {
                      if (!Array.isArray(oldConvs)) return [];
                      return oldConvs.filter((c) => c._id !== target.id);
                    });
                    if (searchParams.get("convId") === target.id) navigate(`/bots/${target.botId}`);
                    try {
                      await backEndCallObjDel(`/bots/${target.botId}/conversations`, target.id);
                    } catch (err) {
                      console.error("Failed to delete conversation:", err);
                      queryClient.invalidateQueries({ queryKey: ["botConversations", target.botId] });
                    }
                  }
                }}
                disabled={deleteChatMutation.isPending || deleteChatMutation.isLoading}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {deleteChatMutation.isPending || deleteChatMutation.isLoading ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
