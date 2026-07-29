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
  FiStopCircle
} from "react-icons/fi";
import api from "../../services/api";

const BotChatTab = ({ bot }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSourcesIdx, setOpenSourcesIdx] = useState(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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
    } catch (e) {}
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
      const newConv = res.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv._id);
      setMessages([]);
      setIsMobileDrawerOpen(false);
    } catch (err) {
      console.error("Failed to create new bot conversation:", err);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation thread?")) return;

    try {
      await api.delete(`/bots/${bot._id}/conversations/${convId}`);
      const updatedList = conversations.filter((c) => c._id !== convId);
      setConversations(updatedList);

      if (activeConvId === convId) {
        if (updatedList.length > 0) {
          setActiveConvId(updatedList[0]._id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete bot conversation:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    const t0 = performance.now();
    let firstTokenTime = null;

    console.log(`\n🚀 [FRONTEND BOT CHAT START] User Prompt: "${userQuery}" at t=0 ms`);

    setInput("");
    isStreamingRef.current = true;

    const userMsgObj = { _id: Date.now().toString(), role: "user", content: userQuery };
    setMessages((prev) => [...prev, userMsgObj]);

    setLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { _id: assistantMsgId, role: "assistant", content: "", sources: [] }
    ]);

    try {
      const token = localStorage.getItem("token");
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/bots/${bot._id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: userQuery, conversationId: activeConvId }),
        signal: abortControllerRef.current.signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamText = "";
      let retrievedSources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "meta") {
                if (!activeConvId || activeConvId !== data.conversationId) {
                  setActiveConvId(data.conversationId);
                  fetchConversations(false);
                }
              } else if (data.type === "sources") {
                retrievedSources = data.sources || [];
              } else if (data.type === "chunk") {
                if (!firstTokenTime) {
                  firstTokenTime = performance.now();
                  const ttftMs = (firstTokenTime - t0).toFixed(2);
                  console.log(`⚡ [FRONTEND TTFT] Time To First Token received in browser: ${ttftMs} ms (${(ttftMs/1000).toFixed(2)} s)`);
                }
                streamText += data.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg._id === assistantMsgId
                      ? { ...msg, content: streamText, sources: retrievedSources }
                      : msg
                  )
                );
              }
            } catch (e) {}
          }
        }
      }

      const totalTime = (performance.now() - t0).toFixed(2);
      const streamDuration = firstTokenTime ? (performance.now() - firstTokenTime).toFixed(2) : "N/A";

      console.log(`
⏱️  =================== [FRONTEND UI BOT CHAT DIAGNOSTICS] ===================
  ├── 🚀 Time To First Token (TTFT):   ${firstTokenTime ? (firstTokenTime - t0).toFixed(2) + ' ms' : 'N/A'}
  ├── ⚡ UI Stream Rendering Duration: ${streamDuration} ms
  └── 🏁 Total UI Round-Trip Time:    ${totalTime} ms (${(totalTime/1000).toFixed(2)} s)
===========================================================================\n
`);
    } catch (err) {
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        console.log("🛑 Bot stream generation stopped by user.");
      } else {
        console.error("Bot chat streaming error:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === assistantMsgId
              ? { ...msg, content: "I could not find information related to that question in the uploaded knowledge base." }
              : msg
          )
        );
      }
    } finally {
      setLoading(false);
      isStreamingRef.current = false;
    }
  };

  return (
    <div className="flex-1 min-w-0 flex h-full overflow-hidden bg-slate-900/50 relative">
      
      {/* MOBILE DRAWER OVERLAY */}
      {isMobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* MOBILE SLIDE-IN SIDEBAR DRAWER */}
      <div 
        className={`fixed inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800 z-50 flex flex-col h-full transition-transform duration-300 md:hidden ${
          isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <FiMessageSquare className="text-blue-400" />
            <span>Chat Threads</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNewChat}
              className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[11px] font-semibold px-2 py-1 rounded-lg transition"
            >
              <FiPlus />
              <span>New</span>
            </button>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <FiX className="text-base" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-[11px] text-slate-500 text-center py-8">
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
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${
                    isActive
                      ? "bg-blue-600/15 border border-blue-500/30 text-blue-300 font-semibold"
                      : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FiMessageSquare className={isActive ? "text-blue-400 shrink-0" : "text-slate-600 shrink-0"} />
                    <span className="truncate text-[11px]">{c.title || "New Conversation"}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, c._id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
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
        className={`hidden md:flex flex-col h-full bg-slate-950 border-r border-slate-800 shrink-0 transition-all duration-300 select-none ${
          showHistorySidebar ? "w-64 min-w-[256px] max-w-[256px]" : "w-0 min-w-0 max-w-0 overflow-hidden border-none"
        }`}
      >
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <FiMessageSquare className="text-blue-400" />
            <span>Chat Threads</span>
          </span>
          <button
            onClick={handleCreateNewChat}
            className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
            title="New Chat Thread"
          >
            <FiPlus />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-[11px] text-slate-500 text-center py-8">
              No chat history yet.<br />Start asking questions!
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = activeConvId === c._id;
              return (
                <div
                  key={c._id}
                  onClick={() => setActiveConvId(c._id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${
                    isActive
                      ? "bg-blue-600/15 border border-blue-500/30 text-blue-300 font-semibold"
                      : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FiMessageSquare className={isActive ? "text-blue-400 shrink-0" : "text-slate-600 shrink-0"} />
                    <span className="truncate text-[11px]">{c.title || "New Conversation"}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, c._id)}
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
      </div>

      {/* MAIN CHAT AREA (Fills Remaining Space Only) */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        
        {/* Fixed Controls Header */}
        <div className="px-4 py-2.5 bg-slate-950/60 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden flex items-center justify-center p-1.5 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
              title="Toggle Threads Menu"
            >
              <FiMenu className="text-base" />
            </button>

            {/* Desktop Toggle Button */}
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              <FiSidebar />
              <span>{showHistorySidebar ? "Hide History" : "Show History"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowStatusModal(!showStatusModal)}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer"
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
              <div className="absolute right-0 top-10 z-50 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-100">
                    <FiServer className="text-blue-400" />
                    <span>AI Cluster Health Status</span>
                  </div>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800"
                  >
                    <FiX />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {clusterNodes.map((node, idx) => (
                    <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200">{node.id} ({node.name || `Node ${idx+1}`})</span>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <FiCheckCircle className="text-[10px]" />
                          {node.status || "HEALTHY"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p>• Model: <span className="text-slate-300 font-mono text-[10px]">{node.defaultModel}</span></p>
                        <p>• Active Load: <span className="text-slate-200">{node.activeRequests || 0} active request(s)</span></p>
                        <p className="truncate">• Endpoint: <span className="text-slate-400 font-mono text-[10px]">{node.url}</span></p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
                  <FiActivity className="text-blue-400 shrink-0" />
                  <span>Smart Load Balancer dispatches concurrent requests automatically.</span>
                </div>
              </div>
            )}

            <span className="text-[11px] text-slate-400 font-mono truncate hidden md:inline">
              Bot: <strong className="text-slate-200">{bot.name}</strong> ({bot.model})
            </span>
          </div>
        </div>

        {/* MESSAGES SCROLL AREA - ONLY THIS SCROLLS */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-2xl mb-3">
                <FiCpu />
              </div>
              <h3 className="text-base font-bold text-slate-200">Chat with {bot.name}</h3>
              <p className="text-xs max-w-md text-slate-400 mt-1">
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
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isUser
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    }`}
                  >
                    {isUser ? <FiUser /> : <FiCpu />}
                  </div>

                  {/* Bubble Container */}
                  <div className={`space-y-1.5 min-w-0 max-w-full flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`min-w-0 max-w-full p-3.5 px-4 rounded-2xl text-xs leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] shadow-md ${
                        isUser
                          ? "bg-blue-600 text-white font-medium rounded-tr-none shadow-blue-600/20"
                          : "bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="w-full max-w-full overflow-x-auto my-2.5 rounded-lg border border-slate-800 custom-scrollbar">
                                <table className="w-full border-collapse text-left text-xs min-w-full" {...props} />
                              </div>
                            ),
                            code({ node, inline, className, children, ...props }) {
                              const isMultiLine = String(children).includes("\n");
                              return inline || !isMultiLine ? (
                                <code className="bg-slate-800/80 text-blue-300 px-1.5 py-0.5 rounded font-mono text-[11px] break-words [overflow-wrap:anywhere]" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <div className="my-2.5 w-full max-w-full overflow-x-auto rounded-xl bg-slate-950 border border-slate-800 p-3.5 custom-scrollbar font-mono text-[11px] text-emerald-400">
                                  <pre className="overflow-x-auto m-0 p-0">{children}</pre>
                                </div>
                              );
                            },
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 break-words [overflow-wrap:anywhere] [word-break:break-word]" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-blue-400" {...props} />
                          }}
                        >
                          {msg.content || "Thinking..."}
                        </ReactMarkdown>
                      )}
                    </div>

                    {/* COLLAPSED SOURCES TOGGLE BUTTON (SHOWN ONLY WHEN ACTUAL SOURCES EXIST) */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-0.5">
                        <button
                          onClick={() => setOpenSourcesIdx(isSourcesOpen ? null : index)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-blue-400 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 transition"
                        >
                          <FiFileText className="text-blue-400" />
                          <span>View Sources</span>
                          {isSourcesOpen ? <FiChevronUp /> : <FiChevronDown />}
                        </button>

                        {isSourcesOpen && (
                          <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 max-w-full overflow-hidden">
                            {msg.sources.map((s, sIdx) => (
                              <div key={sIdx} className="p-2 bg-slate-900 rounded-lg text-[10px]">
                                <p className="font-bold text-blue-400">{s.fileName}</p>
                                <p className="text-slate-400 mt-0.5 line-clamp-2">{s.snippet}</p>
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
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2 italic">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Retrieving chunks & generating grounded response...</span>
            </div>
          )}
        </div>

        {/* STICKY INPUT FORM BAR */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="text"
              placeholder={`Ask ${bot.name} anything...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-slate-100 placeholder:text-slate-500 transition disabled:opacity-75"
            />
            {loading ? (
              <button
                type="button"
                onClick={handleStopBotGeneration}
                className="w-10 h-10 rounded-full bg-black hover:bg-slate-900 border border-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer shadow-lg active:scale-95"
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
