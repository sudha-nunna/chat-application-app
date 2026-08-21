import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
  FiMessageCircle
} from "react-icons/fi";
import { TbPin, TbPinnedOff, TbRobotFace } from "react-icons/tb";
import { backEndCallGet, NobackEndCall, backEndCallObjDel, NobackEndCallObj } from "../../services/authService";
import CreateBotModal from "../bots/CreateBotModal";
import AuthModal from "../auth/AuthModal";
import PlanBadge from "../subscription/PlanBadge";
import SubscriptionModal from "../subscription/SubscriptionModal";
import FloatingExternalBotWidget from "../global/FloatingExternalBotWidget";
import { useTheme } from "../../context/ThemeContext";
import { useSubscription } from "../../context/SubscriptionContext";
import { useTanStackData, useTanStackQueryClient, useTanStackMutation } from "../../hooks/useTanStackData";

const AppLayout = ({ children }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { setIsUpgradeModalOpen } = useSubscription();
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("token"));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [tempClosed, setTempClosed] = useState(false);
  const [activePopover, setActivePopover] = useState(null);

  useEffect(() => {
    const handleOpenModal = () => setIsCreateModalOpen(true);
    window.addEventListener("open-create-bot-modal", handleOpenModal);
    return () => window.removeEventListener("open-create-bot-modal", handleOpenModal);
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
    if (location.pathname.startsWith("/chat") || location.pathname === "/") {
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
  }, [location.pathname]);

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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("pinnedChats", JSON.stringify(pinnedItemIds));
  }, [pinnedItemIds]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (!event.target.closest('.three-dots-btn')) {
          setOpenDropdownId(null);
          setActiveDropdownItem(null);
        }
      }
      if (!event.target.closest('.profile-dropdown') && !event.target.closest('.profile-btn')) {
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
        backEndCallGet("/auth/me")
          .then((res) => {
            if (res?.success && res?.user) {
              setUser(res.user);
              localStorage.setItem("user", JSON.stringify(res.user));
            }
          })
          .catch(() => {});
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
    { enabled: !!authToken }
  );

  // Fetch Chats
  const { data: chats = [] } = useTanStackData(
    ["chats"],
    async () => {
      if (!authToken) return [];
      const res = await NobackEndCall("/chats");
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!authToken }
  );

  // Fetch Bot Conversations
  const { data: botConversations = [] } = useTanStackData(
    ["botConversations", expandedBotId],
    async () => {
      if (!expandedBotId || !authToken) return [];
      const res = await NobackEndCall(`/bots/${expandedBotId}/conversations`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!expandedBotId && !!authToken }
  );

  // Delete Mutation
  const deleteChatMutation = useTanStackMutation({
    mutationFn: async (chatId) => {
      return await backEndCallObjDel("/chats", chatId);
    },
    onSuccess: (_, chatId) => {
      setPinnedItemIds(prev => prev.filter(id => id !== chatId));
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (activeChatId === chatId) navigate("/chat");
    }
  });

  // Rename Mutation
  const renameChatMutation = useTanStackMutation({
    mutationFn: async ({ chatId, title }) => {
      return await NobackEndCallObj(`/chats/${chatId}`, { title }, "put");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setEditingItemId(null);
    }
  });

  // Rename Bot Mutation
  const renameBotMutation = useTanStackMutation({
    mutationFn: async ({ botId, name }) => {
      return await NobackEndCallObj(`/bots/${botId}`, { name }, "put");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      setEditingItemId(null);
    }
  });

  const handleDeleteItem = (e, id, type) => {
    e.stopPropagation();
    if (type === "chat") {
      if (!window.confirm("Delete this conversation?")) return;
      deleteChatMutation.mutate(id);
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
    setPinnedItemIds(prev => 
      prev.includes(id) ? prev.filter(pinnedId => pinnedId !== id) : [...prev, id]
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

  const handleSelectItem = (id, type) => {
    if (type === "chat") {
      if (id) {
        navigate(`/chat?chatId=${id}`);
      } else {
        navigate(`/chat`);
      }
    } else if (type === "bot") {
      navigate(`/bots/${id}`);
    }
    setIsMobileMenuOpen(false);
    setIsSearchModalOpen(false);
  };

  const isGoogleCallbackRoute = location.pathname.startsWith("/auth/google");
  
  const pinnedChats = chats.filter(c => pinnedItemIds.includes(c._id));
  const recentChats = chats.filter(c => !pinnedItemIds.includes(c._id));

  const pinnedBots = bots.filter(b => pinnedItemIds.includes(b._id));
  const otherBots = bots.filter(b => !pinnedItemIds.includes(b._id));

  const filteredSearchChats = chats.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
  const filteredSearchBots = bots.filter(b => b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

  const renderSidebarItem = (item, type, inPopover = false) => {
    const isChat = type === "chat";
    const isActive = !isCreateModalOpen && (isChat 
      ? activeChatId === item._id
      : location.pathname === `/bots/${item._id}`);
    const isDropdownOpen = openDropdownId === item._id;
    const isEditing = editingItemId === item._id;
    const isPinned = pinnedItemIds.includes(item._id);

    const title = isChat ? (item.title || "New Conversation") : item.name;
    const collapseUI = isSidebarCollapsed && !inPopover && !isMobileMenuOpen;

    return (
      <div className="flex flex-col w-full">
        <div
          key={item._id}
          onClick={() => !isEditing && handleSelectItem(item._id, type)}
          title={title}
          className={`group relative flex items-center justify-between py-2 rounded-lg cursor-pointer text-sm transition select-none border-none outline-none ${collapseUI ? "px-0 justify-center" : "px-3"} ${
            isActive
              ? "bg-black/5 dark:bg-interactive-active text-text-primary font-medium"
              : "hover:bg-surface-secondary dark:hover:bg-interactive-active/50 text-text-primary dark:text-text-muted dark:hover:text-text-primary"
          }`}
        >
          <div className={`flex items-center gap-1 w-full relative ${collapseUI ? 'justify-center pr-0' : 'pr-12'}`}>
            {!isChat ? (
               <div 
                 className={`min-w-5 h-5 rounded-full border inline-flex items-center justify-center shrink-0 ${isActive ? 'border-border-primary/50 bg-interactive-base text-text-primary dark:text-white dark:border-white' : 'border-border-primary/50 bg-interactive-base text-text-primary dark:text-white'}`}
                 onClick={(e) => {
                   if (!collapseUI && type === "bot") {
                     e.stopPropagation();
                     setExpandedBotId(expandedBotId === item._id ? null : item._id);
                   }
                 }}
               >
                 <TbRobotFace className="text-[12px]" />
               </div>
            ) : isPinned ? (
               <div className="w-5 h-5 inline-flex items-center justify-start shrink-0 text-text-primary">
                 <FiMessageCircle className="text-[14px]" />
               </div>
            ) : null}

            {isEditing && !collapseUI ? (
              <form onSubmit={(e) => handleRenameSubmit(e, item._id, type)} className="w-full flex items-center gap-2">
                <input 
                  type="text" 
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full bg-transparent outline-none border-b border-text-muted/30 text-sm`} 
                />
                <button type="submit" onClick={(e) => e.stopPropagation()} className="p-1 hover:text-white transition">
                  <FiCheck className="text-xs" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setEditingItemId(null); }} className="p-1 hover:text-white transition">
                  <FiX className="text-xs" />
                </button>
              </form>
            ) : !collapseUI ? (
              <>
                <span className="truncate flex-1">{title}</span>
                <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradien-to-l to-transparent pointer-events-none ${
                  isActive 
                    ? "from-interactive-base dark:from-interactive-active" 
                    : "from-white dark:from-surface-secondary group-hover:from-surface-secondary dark:group-hover:from-interactive-active/80"
                }`}></div>
              </>
            ) : null}
          </div>

          {!isEditing && !collapseUI && (
            <div className={`absolute right-2 flex items-center ${isDropdownOpen ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"} transition`}>
              {type === "bot" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedBotId(expandedBotId === item._id ? null : item._id);
                  }}
                  className={`p-1 mr-0.5 rounded-md hover:text-black dark:hover:text-white transition cursor-pointer ${isActive ? "text-text-muted" : "text-text-primary"}`}
                >
                  {expandedBotId === item._id ? <FiChevronDown className="text-[14px]" /> : <FiChevronRight className="text-[14px]" />}
                </button>
              )}
              
              <button
                onClick={(e) => togglePin(e, item._id)}
                className={`p-1 mr-0.5 rounded-md hover:text-black dark:hover:text-white transition cursor-pointer ${isActive ? "text-text-muted" : "text-text-primary"}`}
                title={isPinned ? "Unpin" : "Pin"}
              >
                {isPinned ? <TbPinnedOff className="text-[14px]" /> : <TbPin className="text-[14px]" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDropdownOpen) {
                    setOpenDropdownId(null);
                    setActiveDropdownItem(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
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
          <div className={`grid transition-all duration-300 ease-in-out ${expandedBotId === item._id ? "grid-rows-[1fr] opacity-100 mt-1 mb-2" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="pl-6 pr-2 py-1 space-y-0.5 border-l-2 border-text-muted/30 dark:border-border-primary/80 ml-4">
                {expandedBotId === item._id && (
                  botConversations.length === 0 ? (
                    <div className="text-[11px] text-text-primary/70 italic p-1">No chats yet</div>
                  ) : (
                    botConversations.map(conv => (
                      <div
                        key={conv._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bots/${item._id}?convId=${conv._id}`);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition ${
                          activeChatId === conv._id || searchParams.get("convId") === conv._id
                            ? "bg-black/5 dark:bg-interactive-active text-text-primary font-medium"
                            : "hover:bg-surface-secondary text-text-primary/80 hover:text-text-primary"
                        }`}
                      >
                        <FiMessageSquare className="shrink-0 text-[10px]" />
                        <span className="truncate flex-1">{conv.title || "New Conversation"}</span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm("Delete this conversation?")) return;
                            try {
                              await backEndCallObjDel(`/bots/${item._id}/conversations`, conv._id);
                              queryClient.invalidateQueries({ queryKey: ["botConversations", item._id] });
                              if (searchParams.get("convId") === conv._id) {
                                navigate(`/bots/${item._id}`);
                              }
                            } catch (err) {
                              console.error("Failed to delete conversation:", err);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition ml-auto"
                          title="Delete Conversation"
                        >
                          <FiTrash2 className="text-[10px]" />
                        </button>
                      </div>
                    ))
                  )
                )}
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
          <img src="/mini-logo2.png" alt="Nexora Logo" className={`w-9 h-9 object-contain shrink-0 ${isDark? "invert": ""}`}/>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
            <span className="text-[13px] font-bold text-text-muted leading-tight">NEXORA</span>
            <span className="text-[10px] font-medium text-text-primary leading-tight">Multi-Tenant AI Agents</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <button onClick={() => { setIsSearchModalOpen(true); setTempClosed(true); }} className="w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer text-text-primary hover:bg-black/5 dark:hover:bg-white/10">
            <div className="w-6 h-6 flex items-center justify-center shrink-0"><FiSearch className="text-lg" /></div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Search</span>
          </button>
          <button onClick={() => { setActiveSidebarTab("chat"); navigate("/chat"); setTempClosed(true); }} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "chat" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}>
            <div className="w-6 h-6 flex items-center justify-center shrink-0"><FiMessageSquare className="text-lg" /></div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Chat</span>
          </button>
          <button onClick={() => { setActiveSidebarTab("agents"); navigate("/bots"); setTempClosed(true); }} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "agents" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}>
            <div className="w-6 h-6 flex items-center justify-center shrink-0"><TbRobotFace className="text-lg" /></div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">AI Agents</span>
          </button>
        </div>

        <div className="my-4 border-t border-border-primary/30 mx-2"></div>

        <div className="space-y-1">
          <button onClick={() => { setActiveSidebarTab("dashboard"); navigate("/dashboard"); setTempClosed(true); }} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "dashboard" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}>
            <div className="w-6 h-6 flex items-center justify-center shrink-0"><FiGrid className="text-lg" /></div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Dashboard</span>
          </button>
          <button onClick={() => { setActiveSidebarTab("subscription"); navigate("/subscription"); setTempClosed(true); }} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "subscription" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}>
            <div className="w-6 h-6 flex items-center justify-center shrink-0"><FiCreditCard className="text-lg" /></div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Subscription</span>
          </button>
          <button onClick={() => { setActiveSidebarTab("servers"); navigate("/admin/servers"); setTempClosed(true); }} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${activeSidebarTab === "servers" ? "bg-interactive-active text-text-primary dark:text-white font-medium" : "text-text-primary hover:bg-black/5 dark:hover:bg-white/10"}`}>
            <div className="w-6 h-6 flex items-center justify-center shrink-0"><FiServer className="text-lg" /></div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">AI Servers</span>
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
                {user?.image ? (
                  <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-primary" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0 border border-border-primary">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "YN"}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold truncate tracking-wide">{user?.name || "Yadagiri Nousu"}</span>
                  <span className="text-[11px] text-text-primary/70">Free</span>
                </div>
              </div>
              <FiChevronRight className="text-text-primary/70 text-sm" />
            </div>

            <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>

            <button onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); setIsUpgradeModalOpen(true); }} className="w-full text-left px-4 py-2.5 font-medium hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
              <FiZap className="text-sm" /> Upgrade plan
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleTheme(); }} className="w-full text-left px-4 py-2.5 font-medium hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
              {isDark ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />} Appearance
            </button>
            <button className="w-full text-left px-4 py-2.5 font-medium hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
              <FiUser className="text-sm" /> Profile
            </button>
            <button className="w-full text-left px-4 py-2.5 font-medium hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
              <FiSettings className="text-sm" /> Settings
            </button>

            <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>

            <button className="w-full text-left px-4 py-2.5 font-medium hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
              <FiLifeBuoy className="text-sm" /> Help
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2.5 font-medium hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
              <FiLogOut className="text-sm" /> Log out
            </button>
          </div>
        )}

        <div 
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          className={`profile-btn p-1.5 rounded-xl transition hover:bg-surface-secondary dark:hover:bg-surface-dropdown bg-transparent flex items-center justify-center group-hover:justify-start cursor-pointer w-full`}
        >
          <div className="flex items-center shrink-0">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-primary/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center font-bold text-[13px] shrink-0 border border-border-primary/50">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "YN"}
              </div>
            )}
          </div>
          
          <div className="flex-col whitespace-nowrap overflow-hidden ml-3 hidden group-hover:flex transition-opacity duration-300">
            <p className="text-[13px] font-bold truncate tracking-wide text-text-primary">{user?.name || "Yadagiri Nousu"}</p>
            <p className="text-[12px] text-text-primary/70 truncate">Free</p>
          </div>

          <button onClick={(e) => { e.stopPropagation(); setIsUpgradeModalOpen(true); }} className="ml-auto px-3 py-1 rounded-full border border-border-primary/50 text-[11px] font-bold hover:bg-white/5 transition shadow-sm hidden group-hover:block shrink-0">
            Upgrade
          </button>
        </div>
      </div>
    </>
  );

  const renderMobileBottomNav = () => (
    <div className="flex items-center justify-around w-full h-16 bg-surface-primary border-t border-border-primary/50 shrink-0 px-2 pb-safe">
      {[
        { id: "chat", icon: FiMessageSquare, onClick: () => { setActiveSidebarTab("chat"); navigate("/chat"); setIsMobileMenuOpen(false); } },
        { id: "agents", icon: TbRobotFace, onClick: () => { setActiveSidebarTab("agents"); navigate("/bots"); setIsMobileMenuOpen(false); } },
        { id: "dashboard", icon: FiGrid, onClick: () => { setActiveSidebarTab("dashboard"); navigate("/dashboard"); setIsMobileMenuOpen(false); } },
        { id: "subscription", icon: FiCreditCard, onClick: () => { setActiveSidebarTab("subscription"); navigate("/subscription"); setIsMobileMenuOpen(false); } },
        { id: "servers", icon: FiServer, onClick: () => { setActiveSidebarTab("servers"); navigate("/admin/servers"); setIsMobileMenuOpen(false); } },
      ].map((item) => {
        const isActive = activeSidebarTab === item.id;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`p-3 rounded-xl flex items-center justify-center transition-all ${
              isActive 
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
    if (!isMobile && activeSidebarTab !== "chat" && activeSidebarTab !== "agents") return null;

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
        <div className={`flex flex-col h-full ${isSidebarCollapsed && !isMobile ? 'overflow-visible px-1' : 'overflow-hidden'} transition-all duration-300 bg-surface-primary shrink-0 select-none relative ${isMobile ? 'w-full' : (isSidebarCollapsed ? "w-[65px] border-r border-border-primary z-[60]" : "w-[280px] border-r border-border-primary z-20")}`}>
        
        {isMobile ? (
          <div className="p-4 border-b border-border-primary/40 flex items-center gap-3 shrink-0 relative">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-surface-secondary text-text-primary shrink-0 transition cursor-pointer">
              <FiChevronLeft className="text-xl" />
            </button>
            <div 
              className="profile-btn flex items-center justify-between w-full cursor-pointer group"
              onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(!isProfileDropdownOpen); }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {user?.image ? (
                  <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-primary" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0 border border-border-primary">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "YN"}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold truncate tracking-wide text-text-primary">{user?.name || "Yadagiri Nousu"}</span>
                  <span className="text-[11px] text-text-primary/70">Free</span>
                </div>
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
                    {user?.image ? (
                      <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-primary" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0 border border-border-primary">
                        {user?.name ? user.name.slice(0, 2).toUpperCase() : "YN"}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold truncate tracking-wide">{user?.name || "Yadagiri Nousu"}</span>
                      <span className="text-[11px] text-text-primary/70">Free</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>

                <button onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); setIsUpgradeModalOpen(true); }} className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiZap className="text-sm" /> Upgrade plan
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleTheme(); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  {isDark ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />} Appearance
                </button>
                <button className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiUser className="text-sm" /> Profile
                </button>
                <button className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiSettings className="text-sm" /> Settings
                </button>

                <div className="h-px bg-border-primary/30 my-1.5 mx-3"></div>

                <button className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiLifeBuoy className="text-sm" /> Help
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2.5 font-medium hover:bg-surface-secondary dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                  <FiLogOut className="text-sm" /> Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`p-4 border-b border-border-primary/40 flex items-center shrink-0 ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
            {!isSidebarCollapsed && <span className="text-sm font-semibold truncate">{activeSidebarTab === "chat" ? "Chats" : "AI Agents"}</span>}
            <div className="flex gap-1">
               <button onClick={() => { setIsSidebarCollapsed(!isSidebarCollapsed); setTempClosed(true); }} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-primary transition cursor-pointer" title="Toggle Sidebar">
                 <FiSidebar className="text-sm" />
               </button>
            </div>
          </div>
        )}

        {(activeSidebarTab === "chat" || activeSidebarTab === "agents") ? (
          <div className={`flex-1 relative ${isSidebarCollapsed && !isMobile ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
          
          <div className={`pt-3 pb-2 flex ${isSidebarCollapsed ? "px-1 justify-center" : "px-3"}`}>
            <button 
               onClick={() => activeSidebarTab === "chat" ? handleSelectItem(null, "chat") : setIsCreateModalOpen(true)}
               title={activeSidebarTab === "chat" ? "New chat" : "New agent"}
               className={`w-full ${((activeSidebarTab === "chat" && !activeChatId && location.pathname === "/chat") || (activeSidebarTab === "agents" && isCreateModalOpen)) ? "bg-surface-secondary dark:bg-interactive-active/40" : "bg-transparent"} hover:bg-surface-secondary/80 dark:hover:bg-interactive-active/70 text-text-primary ${isSidebarCollapsed ? "py-2.5 px-0 justify-center w-10 h-10" : "py-2.5 px-3"} rounded-2xl flex items-center gap-2 text-sm transition font-medium border border-transparent cursor-pointer`}
            >
               <FiPlus className="text-base shrink-0" /> {!isSidebarCollapsed && <span>{activeSidebarTab === "chat" ? "New chat" : "New agent"}</span>}
            </button>
          </div>

          <div className={`pt-4 pb-32 space-y-6 custom-scrollbar ${isSidebarCollapsed && !isMobile ? "px-1 overflow-visible" : "px-3"}`}>
          {activeSidebarTab === "chat" && pinnedChats.length > 0 && (
            <div>
              {(!isSidebarCollapsed || isMobile) && <div 
                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                onClick={() => setIsPinnedOpen(!isPinnedOpen)}
              >
                <span>Pinned</span>
                {isPinnedOpen ? <FiChevronDown className="text-[10px]" /> : <FiChevronRight className="text-[10px]" />}
              </div>}
              
              {isSidebarCollapsed && !isMobile ? (
                <div className="relative group flex justify-center">
                  <button 
                    onClick={() => setActivePopover(activePopover === "pinnedChats" ? null : "pinnedChats")}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "pinnedChats" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"}`}
                    title="Pinned Chats"
                  >
                    <TbPin className="text-xl" />
                  </button>
                  {activePopover === "pinnedChats" && (
                    <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                      <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">Pinned</div>
                      <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                        {pinnedChats.map(c => renderSidebarItem(c, "chat", true))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`grid transition-all duration-300 ease-in-out ${isPinnedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {pinnedChats.map(c => renderSidebarItem(c, "chat"))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSidebarTab === "agents" && pinnedBots.length > 0 && (
            <div>
              {(!isSidebarCollapsed || isMobile) && <div 
                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                onClick={() => setIsPinnedOpen(!isPinnedOpen)}
              >
                <span>Pinned</span>
                {isPinnedOpen ? <FiChevronDown className="text-[10px]" /> : <FiChevronRight className="text-[10px]" />}
              </div>}

              {isSidebarCollapsed && !isMobile ? (
                <div className="relative group flex justify-center">
                  <button 
                    onClick={() => setActivePopover(activePopover === "pinnedBots" ? null : "pinnedBots")}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "pinnedBots" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"}`}
                    title="Pinned Agents"
                  >
                    <TbPin className="text-xl" />
                  </button>
                  {activePopover === "pinnedBots" && (
                    <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                      <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">Pinned</div>
                      <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                        {pinnedBots.map(b => renderSidebarItem(b, "bot", true))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`grid transition-all duration-300 ease-in-out ${isPinnedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {pinnedBots.map(b => renderSidebarItem(b, "bot"))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSidebarTab === "chat" && (
            <div>
              {(!isSidebarCollapsed || isMobile) && <div 
                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                onClick={() => setIsRecentsOpen(!isRecentsOpen)}
              >
                <span>Recents</span>
                {isRecentsOpen ? <FiChevronDown className="text-[10px]" /> : <FiChevronRight className="text-[10px]" />}
              </div>}

              {isSidebarCollapsed && !isMobile ? (
                <div className="relative group flex justify-center">
                  <button 
                    onClick={() => setActivePopover(activePopover === "recentChats" ? null : "recentChats")}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "recentChats" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"}`}
                    title="Recent Chats"
                  >
                    <FiMessageCircle className="text-xl" />
                  </button>
                  {activePopover === "recentChats" && (
                    <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                      <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">Recents</div>
                      <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                        {recentChats.length === 0 ? (
                          <div className="text-xs text-text-primary px-3 py-2">No recent chats</div>
                        ) : (
                          recentChats.map(c => renderSidebarItem(c, "chat", true))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`grid transition-all duration-300 ease-in-out ${isRecentsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {recentChats.length === 0 ? (
                        <div className="text-xs text-text-primary px-3 py-2">No recent chats</div>
                      ) : (
                        recentChats.map(c => renderSidebarItem(c, "chat"))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSidebarTab === "agents" && (
            <div>
              {(!isSidebarCollapsed || isMobile) && <div 
                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                onClick={() => setIsAgentsOpen(!isAgentsOpen)}
              >
                <span>My AI Agents</span>
                {isAgentsOpen ? <FiChevronDown className="text-[10px]" /> : <FiChevronRight className="text-[10px]" />}
              </div>}

              {isSidebarCollapsed && !isMobile ? (
                <div className="relative group flex justify-center">
                  <button 
                    onClick={() => setActivePopover(activePopover === "otherBots" ? null : "otherBots")}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${activePopover === "otherBots" ? "bg-interactive-active text-text-primary dark:text-white" : "hover:bg-surface-secondary text-text-primary"}`}
                    title="My AI Agents"
                  >
                    <TbRobotFace className="text-xl" />
                  </button>
                  {activePopover === "otherBots" && (
                    <div className="absolute left-14 top-0 w-64 bg-surface-dropdown border border-border-primary shadow-2xl rounded-2xl z-[100] py-2 flex flex-col max-h-[60vh]">
                      <div className="px-4 py-2 text-sm font-semibold text-text-primary border-b border-border-primary/30 shrink-0">My AI Agents</div>
                      <div className="overflow-y-auto custom-scrollbar p-1 space-y-1">
                        {otherBots.length === 0 ? (
                          <div className="text-xs text-text-primary px-3 py-2">No bots created yet</div>
                        ) : (
                          otherBots.map(b => renderSidebarItem(b, "bot", true))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`grid transition-all duration-300 ease-in-out ${isAgentsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {otherBots.length === 0 ? (
                        <div className="text-xs text-text-primary px-3 py-2">No bots created yet</div>
                      ) : (
                        otherBots.map(b => renderSidebarItem(b, "bot"))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ) : (
          <>
          <span></span>
          {/* <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-6 text-center">
            <span className="text-sm">Content available on {activeSidebarTab === "dashboard" ? "Dashboard" : "Servers"} page.</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="mt-4 px-4 py-2 bg-surface-secondary hover:bg-interactive-active/40 text-text-primary rounded-lg text-sm transition">Close Menu</button>
          </div> */}
           </>
        )}
      </div>
      </>
    );
  };

  if (location.pathname === "/") {
    return <>{children}</>;
  }

  if (!isAuthenticated && !isGoogleCallbackRoute) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-primary text-text-primary">
        <AuthModal onAuthSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-surface-primary text-text-primary`}>

      <SubscriptionModal />

      <div className={`md:hidden flex items-center justify-between p-3 border-b shrink-0 ${"bg-surface-secondary border-border-primary"}`}>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 rounded-lg bg-interactive-active text-text-primary dark:text-white hover:bg-interactive-base transition cursor-pointer">
            <FiMenu className="text-lg" />
          </button>
          <div className="flex items-center gap-1">
            <img src="/mini-logo2.png" alt="Nexora Logo" className={`w-7 h-7 rounded-md object-contain ${isDark ? "invert" : ""}`} />
            <span className="font-bold text-xs tracking-tight">NEXORA</span>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-interactive-base/20 text-text-primary border border-border-primary/30">
          {location.pathname === "/chat" ? "General Chat" : location.pathname.startsWith("/bots") ? "Bot Detail" : "Dashboard"}
        </span>
      </div>

      {/* Primary Icon Sidebar Placeholder (Desktop) */}
      <div className={`hidden md:block shrink-0 h-full relative z-30 transition-all duration-300 ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[65px]"}`}>
        <aside 
          onMouseLeave={() => setTempClosed(false)}
          className={`absolute top-0 left-0 h-full w-[65px] ${!tempClosed ? "hover:w-[250px] group" : ""} transition-all duration-300 overflow-hidden bg-surface-secondary border-r border-border-primary flex flex-col justify-between ${isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"}`}>
          {renderPrimarySidebar()}
        </aside>
      </div>

      {/* Secondary Sidebar (Desktop) */}
      <div className="hidden md:flex h-full">
        {renderSecondarySidebar()}
      </div>

      <div className={`md:hidden fixed inset-0 z-50 flex transition-all duration-300 ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsMobileMenuOpen(false)}></div>
        <div className={`relative w-[320px] max-w-[85vw] h-full shadow-2xl flex flex-col bg-surface-primary overflow-hidden transform transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
           <div className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
             {renderSecondarySidebar(true)}
           </div>
           {renderMobileBottomNav()}
        </div>
      </div>

      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative">
        {children}
      </main>

      <FloatingExternalBotWidget />

      {isCreateModalOpen && (
        <CreateBotModal onClose={() => setIsCreateModalOpen(false)} onBotCreated={handleBotCreated} />
      )}

      {/* Global Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-32">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSearchModalOpen(false)}
          ></div>
          
          <div className={`relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${"bg-surface-primary border border-border-primary text-text-primary"}`}>
            
            <div className={`flex items-center px-4 py-3 border-b ${"border-border-primary"}`}>
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
                  {filteredSearchBots.map(bot => (
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
                  {filteredSearchChats.map(chat => (
                    <div 
                      key={chat._id}
                      onClick={() => handleSelectItem(chat._id, "chat")}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${"hover:bg-surface-secondary dark:hover:bg-interactive-active"}`}
                    >
                      <div className="w-6 h-6 rounded-md border border-border-primary flex items-center justify-center text-text-primary shrink-0">
                        <FiMessageSquare className="text-xs" />
                      </div>
                      <span className="text-sm font-medium">{chat.title || "New Conversation"}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && filteredSearchBots.length === 0 && filteredSearchChats.length === 0 && (
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
          className={`fixed z-[999] w-40 rounded-xl shadow-xl border py-1.5 text-sm ${
            "bg-surface-dropdown border-border-primary text-text-primary"
          }`}
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          {activeDropdownType === "bot" && (
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                const currentBotId = activeDropdownItem._id;
                try {
                  const res = await NobackEndCallObj(`/bots/${currentBotId}/conversations`, {
                    title: "New Conversation"
                  }, "post");
                  const newConvId = res?._id || res?.data?._id;
                  setOpenDropdownId(null);
                  setActiveDropdownItem(null);
                  setExpandedBotId(currentBotId);
                  queryClient.invalidateQueries({ queryKey: ["botConversations", currentBotId] });
                  navigate(`/bots/${currentBotId}?convId=${newConvId}`);
                  setIsMobileMenuOpen(false);
                } catch (err) {
                  console.error("Failed to create new conversation:", err);
                }
              }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition flex items-center gap-2"
            >
              <FiPlus className="text-xs" /> New Chat
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditTitleValue(activeDropdownType === "chat" ? (activeDropdownItem.title || "New Conversation") : activeDropdownItem.name);
              setEditingItemId(activeDropdownItem._id);
              setOpenDropdownId(null);
              setActiveDropdownItem(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 transition cursor-pointer flex items-center gap-2"
          >
            <FiEdit2 className="text-xs" /> Rename
          </button>
          <button 
            onClick={(e) => {
              togglePin(e, activeDropdownItem._id);
              setActiveDropdownItem(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 transition cursor-pointer flex items-center gap-2"
          >
            {pinnedItemIds.includes(activeDropdownItem._id) ? (
              <><TbPinnedOff className="text-xs" /> Unpin</>
            ) : (
              <><TbPin className="text-xs" /> Pin</>
            )}
          </button>
          <div className="h-px bg-white/10 my-1"></div>
          <button 
            onClick={(e) => {
              handleDeleteItem(e, activeDropdownItem._id, activeDropdownType);
              setActiveDropdownItem(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-500 transition cursor-pointer flex items-center gap-2"
          >
            <FiTrash2 className="text-xs" /> Delete
          </button>
        </div>
      )}

    </div>
  );
};

export default AppLayout;
