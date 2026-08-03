import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiSend,
  FiFileText,
  FiCpu,
  FiUser,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiTrash2,
  FiMessageSquare,
  FiSidebar,
  FiMenu,
  FiX,
  FiServer,
  FiCheckCircle,
  FiActivity,
  FiStopCircle,
  FiAlertTriangle,
  FiRotateCw
} from "react-icons/fi";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const BotChatTab = ({ bot }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSourcesIdx, setOpenSourcesIdx] = useState(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { isDark } = useTheme();

  const [clusterNodes, setClusterNodes] = useState([
    { id: "Node-1", name: "Primary Node", status: "HEALTHY", defaultModel: "qwen2.5:1.5b", activeRequests: 0 },
    { id: "Node-2", name: "Secondary Node", status: "HEALTHY", defaultModel: "gemma-3-4b-it", activeRequests: 0 }
  ]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const messagesContainerRef = useRef(null);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    fetchClusterStatus();
    const interval = setInterval(fetchClusterStatus, 12000);
    return () => clearInterval(interval);
  }, []);

  const fetchClusterStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/ollama/cluster-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes) setClusterNodes(data.nodes);
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchConversations();
  }, [bot._id]);

  useEffect(() => {
    if (activeConvId) {
      if (!isStreamingRef.current) {
        fetchMessages(activeConvId);
      }
    } else {
      if (!isStreamingRef.current) {
        setMessages([]);
      }
    }
  }, [activeConvId]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchConversations = async (selectLatest = true) => {
    try {
      const res = await api.get(`/bots/${bot._id}/conversations`);
      setConversations(res.data || []);
      if (selectLatest && res.data && res.data.length > 0) {
        setActiveConvId(res.data[0]._id);
      }
    } catch (err) {
      console.error("Failed to load bot conversations:", err);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await api.get(`/bots/${bot._id}/conversations/${convId}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Failed to load bot messages:", err);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const res = await api.post(`/bots/${bot._id}/conversations`, {
        title: "New Conversation"
      });
      await fetchConversations(false);
      setActiveConvId(res.data._id);
      setIsMobileDrawerOpen(false);
    } catch (err) {
      console.error("Failed to create new conversation:", err);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation thread?")) return;
    try {
      await api.delete(`/bots/${bot._id}/conversations/${convId}`);
      if (activeConvId === convId) {
        setActiveConvId(null);
      }
      fetchConversations(true);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const [abortController, setAbortController] = useState(null);

  const handleStopBotGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    isStreamingRef.current = false;
    setLoading(false);
  };

  const handleSendMessage = async (e, textOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const userText = textOverride !== null ? textOverride : input;
    if (!userText || !userText.trim() || loading) return;

    if (textOverride === null) setInput("");
    setLoading(true);
    isStreamingRef.current = true;

    let targetConvId = activeConvId;

    if (!targetConvId) {
      try {
        const createRes = await api.post(`/bots/${bot._id}/conversations`, {
          title: userText.slice(0, 30) || "New Conversation"
        });
        targetConvId = createRes.data._id;
        setActiveConvId(targetConvId);
      } catch (err) {
        console.error("Failed to auto-create conversation:", err);
        setLoading(false);
        isStreamingRef.current = false;
        return;
      }
    }

    const tempUserMsg = { role: "user", content: userText };
    const tempBotMsg = { role: "assistant", content: "", sources: [] };

    setMessages((prev) => [...prev, tempUserMsg, tempBotMsg]);

    const controller = new AbortController();
    setAbortController(controller);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/bots/${bot._id}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: targetConvId,
          message: userText
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = "";
      let accumulatedSources = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, "");
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.sources && parsed.sources.length > 0) {
              accumulatedSources = parsed.sources;
            }

            if (parsed.chunk) {
              accumulatedAnswer += parsed.chunk;
              setMessages((prev) => {
                const next = [...prev];
                const lastIdx = next.length - 1;
                if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
                  next[lastIdx] = {
                    ...next[lastIdx],
                    content: accumulatedAnswer,
                    sources: accumulatedSources
                  };
                }
                return next;
              });
            }
          } catch (e) { }
        }
      }

      fetchConversations(false);
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("🛑 Bot stream generation stopped by user.");
      } else {
        console.error("Stream error:", err);
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
            next[lastIdx] = {
              ...next[lastIdx],
              content: "⚠️ Error generating response from Bot engine."
            };
          }
          return next;
        });
      }
    } finally {
      setLoading(false);
      setAbortController(null);
      isStreamingRef.current = false;
    }
  };

  return (
    <div className={`flex-1 min-w-0 flex h-full overflow-hidden relative ${isDark ? "bg-slate-900/50 text-slate-100" : "bg-white text-slate-900"
      }`}>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* MOBILE SLIDE-IN SIDEBAR DRAWER */}
      <div
        className={`fixed inset-y-0 left-0 w-72 border-r z-50 flex flex-col h-full transition-transform duration-300 md:hidden ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
          } ${isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`p-3.5 border-b flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            <FiMessageSquare className="text-blue-500" />
            <span>Chat Threads</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNewChat}
              className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-500/30 text-[11px] font-semibold px-2 py-1 rounded-lg transition"
            >
              <FiPlus />
              <span>New</span>
            </button>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className={`p-1 ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-900"}`}
            >
              <FiX className="text-base" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className={`text-[11px] text-center py-8 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              No chat history yet.<br />Start asking questions!
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = activeConvId === c._id;
              return (
                <div
                  key={c._id}
                  onClick={() => {
                    setActiveConvId(c._id);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${isActive
                    ? isDark
                      ? "bg-blue-600/15 border border-blue-500/30 text-blue-300 font-semibold"
                      : "bg-blue-50 border border-blue-200 text-blue-700 font-semibold"
                    : isDark
                      ? "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                      : "hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FiMessageSquare className={isActive ? "text-blue-500 shrink-0" : isDark ? "text-slate-600 shrink-0" : "text-slate-400 shrink-0"} />
                    <span className="truncate text-[11px]">{c.title || "New Conversation"}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, c._id)}
                    className={`p-1 hover:text-rose-500 transition ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DESKTOP THREADS SUB-SIDEBAR (256px FIXED - COLLAPSIBLE) */}
      <div
        className={`hidden md:flex flex-col h-full border-r shrink-0 transition-all duration-300 select-none ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
          } ${showHistorySidebar ? "w-64 min-w-[256px] max-w-[256px]" : "w-0 min-w-0 max-w-0 overflow-hidden border-none"
          }`}
      >
        <div className={`p-3.5 border-b flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            <FiMessageSquare className="text-blue-500" />
            <span>Chat Threads</span>
          </span>
          <button
            onClick={handleCreateNewChat}
            className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-500/30 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
            title="New Chat Thread"
          >
            <FiPlus />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className={`text-[11px] text-center py-8 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              No chat history yet.<br />Start asking questions!
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = activeConvId === c._id;
              return (
                <div
                  key={c._id}
                  onClick={() => setActiveConvId(c._id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${isActive
                    ? isDark
                      ? "bg-blue-600/15 border border-blue-500/30 text-blue-300 font-semibold"
                      : "bg-blue-50 border border-blue-200 text-blue-700 font-semibold"
                    : isDark
                      ? "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                      : "hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FiMessageSquare className={isActive ? "text-blue-500 shrink-0" : isDark ? "text-slate-600 shrink-0" : "text-slate-400 shrink-0"} />
                    <span className="truncate text-[11px]">{c.title || "New Conversation"}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, c._id)}
                    className={`opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition ${isDark ? "text-slate-500" : "text-slate-400"}`}
                    title="Delete Thread"
                  >
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA (Fills Remaining Space Only) */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Fixed Controls Header */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${isDark ? "bg-slate-950/60 border-slate-800/60" : "bg-slate-50 border-slate-200"
          }`}>
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`md:hidden flex items-center justify-center p-1.5 border rounded-lg ${isDark ? "text-slate-300 hover:text-white bg-slate-900 border-slate-800" : "text-slate-700 hover:text-slate-900 bg-white border-slate-200 shadow-sm"
                }`}
              title="Toggle Threads Menu"
            >
              <FiMenu className="text-base" />
            </button>

            {/* Desktop Toggle Button */}
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className={`hidden md:flex items-center gap-1.5 text-xs ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <FiSidebar />
              <span>{showHistorySidebar ? "Hide History" : "Show History"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowStatusModal(!showStatusModal)}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer"
              title="Click to view AI Cluster Health & Load Balancing"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <FiServer className="text-xs" />
              <span className="hidden sm:inline">Cluster: 2 Nodes Online</span>
            </button>

            {showStatusModal && (
              <div className={`absolute right-0 top-10 z-[100] w-80 max-w-[90vw] border rounded-xl shadow-2xl p-4 text-xs flex flex-col max-h-[80vh] ${isDark ? "bg-slate-900 border-slate-700/80 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-slate-300/50"
                }`}>
                <div className={`flex items-center justify-between border-b pb-2.5 mb-3 shrink-0 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <div className={`flex items-center gap-2 font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    <FiServer className="text-blue-500" />
                    <span>AI Cluster Health Status</span>
                  </div>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className={`p-1 rounded-md ${isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar shrink-0">
                  {clusterNodes.map((node, idx) => (
                    <div key={idx} className={`border rounded-lg p-2.5 ${isDark ? "bg-slate-950/70 border-slate-800/80" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center justify-between mb-1">
                        {console.log(clusterNodes, 'clusterNodes')
                        }
                        <span className={`font-semibold capitalize ${isDark ? "text-slate-200" : "text-slate-800"}`}>{node.name}</span>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <FiCheckCircle className="text-[10px]" />
                          {node.status || "HEALTHY"}
                        </span>
                      </div>
                      <div className={`text-[11px] space-y-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        <p>• Model: <span className={`font-mono text-[10px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>{node.defaultModel}</span></p>
                        <p>• Active Load: <span className={isDark ? "text-slate-200" : "text-slate-800"}>{node.activeRequests || 0} active request(s)</span></p>
                        <p className="truncate">• Endpoint: <span className={`font-mono text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{node.url}</span></p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`mt-3 pt-2 border-t text-[10px] flex items-center gap-1.5 shrink-0 ${isDark ? "border-slate-800/80 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                  <FiActivity className="text-blue-500 shrink-0" />
                  <span>Smart Load Balancer dispatches concurrent requests automatically.</span>
                </div>
              </div>
            )}

            <span className={`text-[11px] font-mono truncate hidden md:inline ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Bot: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{bot.name}</strong> ({bot.model})
            </span>
          </div>
        </div>

        {/* MESSAGES SCROLL AREA - ONLY THIS SCROLLS */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full text-center p-8 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 text-2xl mb-3">
                <FiCpu />
              </div>
              <h3 className={`text-base font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Chat with {bot.name}</h3>
              <p className={`text-xs max-w-md mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Ask anything about uploaded knowledge base files and integrated APIs.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isSourcesOpen = openSourcesIdx === index;

              return (
                <div
                  key={msg._id || index}
                  className={`flex gap-3 items-start ${isUser ? "ml-auto flex-row-reverse max-w-[75%]" : "mr-auto max-w-[85%] md:max-w-[80%]"} min-w-0`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isUser
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : isDark
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                        : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                      }`}
                  >
                    {isUser ? <FiUser /> : <FiCpu />}
                  </div>

                  {/* Bubble Container */}
                  <div className={`space-y-1.5 min-w-0 max-w-full flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`min-w-0 max-w-full p-3.5 px-4 rounded-2xl text-xs leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] shadow-md ${isUser
                        ? "bg-blue-600 text-white font-medium rounded-tr-none shadow-blue-600/20"
                        : isDark
                          ? "bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none"
                          : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
                        }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className={`w-full max-w-full overflow-x-auto my-2.5 rounded-lg border custom-scrollbar ${isDark ? "border-slate-800" : "border-slate-300"
                                }`}>
                                <table className="w-full border-collapse text-left text-xs min-w-full" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => (
                              <thead className={`uppercase text-[10px] tracking-wider border-b ${isDark ? "bg-slate-900 text-slate-200 border-slate-800" : "bg-slate-200 text-slate-700 border-slate-300"
                                }`} {...props} />
                            ),
                            th: ({ node, ...props }) => (
                              <th className="px-3 py-2 font-semibold select-none whitespace-nowrap" {...props} />
                            ),
                            td: ({ node, ...props }) => (
                              <td className={`px-3 py-2 border-b ${isDark ? "text-slate-300 border-slate-800/50" : "text-slate-700 border-slate-200"
                                }`} {...props} />
                            ),
                            tr: ({ node, ...props }) => (
                              <tr className={`transition-colors last:border-none ${isDark ? "hover:bg-slate-800/30 even:bg-slate-900/40" : "hover:bg-slate-200/50 even:bg-slate-50"
                                }`} {...props} />
                            ),
                            code: ({ node, inline, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || "");
                              const isMultiLine = String(children).includes("\n");
                              if (inline || (!match && !isMultiLine)) {
                                return (
                                  <code className={`px-1.5 py-0.5 rounded font-mono text-[11px] break-words [overflow-wrap:anywhere] ${isUser
                                    ? "bg-blue-700/80 text-blue-100"
                                    : isDark
                                      ? "bg-slate-800/80 text-blue-300"
                                      : "bg-slate-200 text-blue-700"
                                    }`} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <div className={`my-2.5 w-full max-w-full overflow-x-auto rounded-xl border p-3.5 custom-scrollbar font-mono text-[11px] text-emerald-400 ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-700"
                                  }`}>
                                  <pre className="overflow-x-auto m-0 p-0">{children}</pre>
                                </div>
                              );
                            },
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 break-words [overflow-wrap:anywhere] [word-break:break-word]" {...props} />,
                            strong: ({ node, ...props }) => <strong className={`font-bold ${isUser ? "text-white" : isDark ? "text-blue-400" : "text-blue-600"}`} {...props} />
                          }}
                        >
                          {msg.content?.replace(/\n\n⚠️ Stream paused due to higher-priority request\.( Click Resume\.)?/, "").trim() || "Thinking..."}
                        </ReactMarkdown>
                      )}

                      {/* ChatGPT-Style Pause / Retry Interactive Warning Banner */}
                      {!isUser && msg.content && typeof msg.content === "string" && msg.content.includes("Stream paused due to higher-priority request") && (
                        <div className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-900"
                          }`}>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <FiAlertTriangle className="text-amber-500 text-sm shrink-0" />
                            <span>Stream paused due to higher-priority request.</span>
                          </div>
                          <button
                            onClick={() => {
                              const userMsg = [...messages.slice(0, index)].reverse().find(m => m.role === "user");
                              if (userMsg) {
                                handleSendMessage(null, userMsg.content);
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 cursor-pointer"
                          >
                            <FiRotateCw className="w-3.5 h-3.5" />
                            Retry
                          </button>
                        </div>
                      )}
                    </div>

                    {/* COLLAPSED SOURCES TOGGLE BUTTON */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-0.5">
                        <button
                          onClick={() => setOpenSourcesIdx(isSourcesOpen ? null : index)}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-lg px-2.5 py-1 transition ${isDark
                            ? "text-slate-400 hover:text-blue-400 bg-slate-950 border-slate-800"
                            : "text-slate-600 hover:text-blue-600 bg-slate-100 border-slate-200"
                            }`}
                        >
                          <FiFileText className="text-blue-500" />
                          <span>View Sources</span>
                          {isSourcesOpen ? <FiChevronUp /> : <FiChevronDown />}
                        </button>

                        {isSourcesOpen && (
                          <div className={`mt-2 p-3 border rounded-xl space-y-2 max-w-full overflow-hidden ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
                            }`}>
                            {msg.sources.map((s, sIdx) => (
                              <div key={sIdx} className={`p-2 rounded-lg text-[10px] ${isDark ? "bg-slate-900" : "bg-white border border-slate-200"
                                }`}>
                                <p className="font-bold text-blue-500">{s.fileName}</p>
                                <p className={`mt-0.5 line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{s.snippet}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {loading && messages[messages.length - 1]?.content === "" && (
            <div className={`flex items-center gap-2 text-xs p-2 italic ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Retrieving chunks & generating grounded response...</span>
            </div>
          )}
        </div>

        {/* STICKY INPUT FORM BAR */}
        <div className={`p-4 border-t shrink-0 ${isDark ? "border-slate-800/80 bg-slate-950" : "border-slate-200 bg-slate-50"
          }`}>
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="text"
              placeholder={`Ask ${bot.name} anything...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className={`flex-1 border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition disabled:opacity-75 ${isDark
                ? "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
                : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                }`}
            />
            {loading ? (
              <button
                type="button"
                onClick={handleStopBotGeneration}
                className="w-10 h-10 rounded-full bg-black hover:bg-slate-900 border border-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer shadow-lg active:scale-95 text-white"
                title="Stop Generating"
              >
                <div className="w-3.5 h-3.5 bg-white rounded-[2px]" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                <FiSend className="text-sm" />
              </button>
            )}
          </form>
        </div>

      </div>

    </div>
  );
};

export default BotChatTab;
