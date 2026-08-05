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
  FiRotateCw,
  FiCalendar,
  FiArrowRight
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj, backEndCallObjDel } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import ClusterStatusWidget from "../global/ClusterStatusWidget";
import PillListWidget from "../global/PillListWidget";
import { getResponseFormat } from "../../services/externalBotService";

const formatMarkdownBreaks = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/([^\n])\n([^\n])/g, "$1  \n$2");
};

const extractListAndIntro = (content, metadata) => {
  if (metadata?.list && Array.isArray(metadata.list)) {
    return { intro: content, items: metadata.list };
  }
  if (metadata?.items && Array.isArray(metadata.items)) {
    return { intro: content, items: metadata.items };
  }
  if (metadata?.options && Array.isArray(metadata.options)) {
    return { intro: content, items: metadata.options };
  }

  if (!content || typeof content !== "string") return { intro: content, items: null };

  const lines = content.split("\n");
  const introLines = [];
  const items = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:[-*•]|\d+[\.\)])\s+(.+)$/);
    if (match && match[1]) {
      const itemText = match[1].trim();
      const cleanText = itemText.replace(/^\*\*(.*)\*\*$/, "$1").trim();
      if (cleanText && cleanText.length < 120) {
        items.push(cleanText);
      } else {
        introLines.push(line);
      }
    } else {
      introLines.push(line);
    }
  }

  if (items.length >= 1) {
    return {
      intro: introLines.join("\n").trim(),
      items
    };
  }

  return { intro: content, items: null };
};

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

  const [clusterNodes, setClusterNodes] = useState([]);
  const [isClusterLoading, setIsClusterLoading] = useState(true);
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
    } catch (e) {
    } finally {
      setIsClusterLoading(false);
    }
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
      const res = await NobackEndCall(`/bots/${bot._id}/conversations`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setConversations(list);
      if (selectLatest && list.length > 0) {
        setActiveConvId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to load bot conversations:", err);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await NobackEndCall(`/bots/${bot._id}/conversations/${convId}/messages`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setMessages(list);
    } catch (err) {
      console.error("Failed to load bot messages:", err);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const res = await NobackEndCallObj(`/bots/${bot._id}/conversations`, {
        title: "New Conversation"
      }, "post");
      const newConvId = res?._id || res?.data?._id;
      await fetchConversations(false);
      if (newConvId) setActiveConvId(newConvId);
      setIsMobileDrawerOpen(false);
    } catch (err) {
      console.error("Failed to create new conversation:", err);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation thread?")) return;
    try {
      await backEndCallObjDel(`/bots/${bot._id}/conversations`, convId);
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
        const createRes = await NobackEndCallObj(`/bots/${bot._id}/conversations`, {
          title: userText.slice(0, 30) || "New Conversation"
        }, "post");
        targetConvId = createRes?._id || createRes?.data?._id;
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
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(dataStr);
              const chunkContent = parsed.chunk ?? parsed.text ?? parsed.token ?? parsed.content ?? parsed.message ?? "";
              if (chunkContent) {
                accumulatedAnswer += chunkContent;
              }
              if (parsed.sources) {
                accumulatedSources = parsed.sources;
              }
              if (parsed.metadata) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0) {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      metadata: { ...updated[lastIdx].metadata, ...parsed.metadata }
                    };
                  }
                  return updated;
                });
              }

              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0) {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: accumulatedAnswer,
                    sources: accumulatedSources
                  };
                }
                return updated;
              });
            } catch (e) {
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx].content += "\n\n⚠️ Stream paused due to higher-priority request. Click Resume.";
          }
          return updated;
        });
      } else {
        console.error("Stream error:", err);
      }
    } finally {
      isStreamingRef.current = false;
      setLoading(false);
      setAbortController(null);
      fetchConversations(false);
    }
  };

  // Shared Markdown Components Styling
  const markdownComponents = (isUser) => ({
    p: ({ node, ...props }) => (
      <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="text-blue-400 hover:underline font-semibold break-all" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong
        className={`font-extrabold px-1.5 py-0.5 rounded-md text-xs inline-block my-0.5 shadow-2xs ${
          isUser
            ? "text-white bg-blue-700/80 border border-blue-400/30"
            : isDark
            ? "text-amber-300 bg-amber-500/20 border border-amber-500/30 font-extrabold"
            : "text-indigo-700 bg-indigo-100 border border-indigo-300 font-extrabold"
        }`}
        {...props}
      />
    ),
    table: ({ node, ...props }) => (
      <div className={`w-full max-w-full overflow-x-auto my-2.5 rounded-lg border custom-scrollbar ${isDark ? "border-slate-800" : "border-slate-300"}`}>
        <table className="w-full border-collapse text-left text-xs min-w-full table-auto border-spacing-0" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className={`uppercase text-[10px] tracking-wider border-b ${isDark ? "bg-slate-900 text-slate-200 border-slate-800" : "bg-slate-200 text-slate-700 border-slate-300"}`} {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="px-3.5 py-2.5 font-semibold select-none whitespace-normal break-words align-top min-w-[120px]" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className={`px-3.5 py-2.5 border-b align-top break-words [overflow-wrap:anywhere] min-w-[120px] ${isDark ? "text-slate-300 border-slate-800/50" : "text-slate-700 border-slate-200"}`} {...props} />
    ),
    tr: ({ node, ...props }) => (
      <tr className={`transition-colors last:border-none ${isDark ? "hover:bg-slate-800/30 even:bg-slate-900/40" : "hover:bg-slate-200/50 even:bg-slate-50"}`} {...props} />
    )
  });

  return (
    <div className="flex-1 flex h-full min-h-0 overflow-hidden relative">

      {/* THREADS HISTORY SIDEBAR */}
      <div className={`${showHistorySidebar ? "w-64" : "w-0 overflow-hidden"} ${
        isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-200 bg-slate-100/80"
      } border-r transition-all duration-300 shrink-0 hidden md:flex flex-col h-full`}>
        <div className="p-3 border-b border-inherit flex items-center justify-between">
          <button
            onClick={handleCreateNewChat}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm transition"
          >
            <FiPlus /> New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <p className={`text-center text-xs p-4 italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              No conversation history
            </p>
          ) : (
            conversations.map((c) => {
              const isActive = activeConvId === c._id;
              return (
                <div
                  key={c._id}
                  onClick={() => setActiveConvId(c._id)}
                  className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                    isActive
                      ? "bg-blue-600/10 text-blue-500 font-semibold"
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

      {/* MAIN CHAT AREA */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Fixed Controls Header */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${
          isDark ? "bg-slate-950/60 border-slate-800/60" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`md:hidden flex items-center justify-center p-1.5 border rounded-lg ${
                isDark ? "text-slate-300 hover:text-white bg-slate-900 border-slate-800" : "text-slate-700 hover:text-slate-900 bg-white border-slate-200 shadow-sm"
              }`}
              title="Toggle Threads Menu"
            >
              <FiMenu className="text-base" />
            </button>

            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className={`hidden md:flex items-center gap-1.5 text-xs ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"}`}
            >
              <FiSidebar />
              <span>{showHistorySidebar ? "Hide History" : "Show History"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 relative">
            <ClusterStatusWidget clusterNodes={clusterNodes} isDark={isDark} isLoading={isClusterLoading} />

            <span className={`text-[11px] font-mono truncate hidden md:inline ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Bot: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{bot.name}</strong> ({bot.model})
            </span>
          </div>
        </div>

        {/* MESSAGES SCROLL AREA */}
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

              const format = getResponseFormat(msg);
              const { intro, items } = extractListAndIntro(msg.content, msg.metadata);

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
                        : isDark
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                        : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    }`}
                  >
                    {isUser ? <FiUser /> : <FiCpu />}
                  </div>

                  {/* Bubble Container */}
                  <div className={`space-y-1.5 min-w-0 max-w-full flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    
                    {/* ----------------------------------------------------------- */}
                    {/* FORMAT TYPE RENDERING SWITCH */}
                    {/* ----------------------------------------------------------- */}
                    {format === "out_of_the_box" ? (
                      <div className="w-full space-y-2">
                        <div className={`min-w-0 max-w-full p-3.5 px-4 rounded-2xl text-xs leading-relaxed overflow-hidden break-words shadow-md ${
                          isDark ? "bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none" : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
                        }`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(isUser)}>
                            {formatMarkdownBreaks(msg.content) || ""}
                          </ReactMarkdown>
                        </div>

                        {/* Schedule Call Interactive Button */}
                        <div className="w-full max-w-md pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (msg.metadata?.actionUrl) {
                                window.open(msg.metadata.actionUrl, "_blank");
                              } else {
                                handleSendMessage(null, "Schedule a discovery call with engineering team");
                              }
                            }}
                            className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-between transition-all duration-200 shadow-md active:scale-95 cursor-pointer group ${
                              isDark
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 border border-indigo-500/40"
                                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/20 border border-indigo-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <FiCalendar className="text-sm text-amber-300 shrink-0" />
                              <span>📅 Schedule Call</span>
                            </div>
                            <FiArrowRight className="text-xs shrink-0 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ) : format === "list" && items && items.length > 0 ? (
                      <div className="w-full space-y-1">
                        {intro && (
                          <div className={`min-w-0 max-w-full p-3.5 px-4 rounded-2xl text-xs leading-relaxed overflow-hidden break-words shadow-md ${
                            isDark ? "bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none" : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
                          }`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(isUser)}>
                              {formatMarkdownBreaks(intro)}
                            </ReactMarkdown>
                          </div>
                        )}
                        <PillListWidget items={items} onItemClick={(text) => handleSendMessage(null, text)} />
                      </div>
                    ) : (
                      <div
                        className={`min-w-0 max-w-full p-3.5 px-4 rounded-2xl text-xs leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] shadow-md ${
                          isUser
                            ? "bg-blue-600 text-white font-medium rounded-tr-none shadow-blue-600/20"
                            : isDark
                            ? "bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none"
                            : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(isUser)}>
                            {formatMarkdownBreaks(msg.content) || "Thinking..."}
                          </ReactMarkdown>
                        )}

                        {/* ChatGPT-Style Pause / Retry Interactive Warning Banner */}
                        {!isUser && msg.content && typeof msg.content === "string" && msg.content.includes("Stream paused due to higher-priority request") && (
                          <div className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-900"
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
                    )}

                    {/* COLLAPSED SOURCES TOGGLE BUTTON */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-0.5">
                        <button
                          onClick={() => setOpenSourcesIdx(isSourcesOpen ? null : index)}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-lg px-2.5 py-1 transition ${
                            isDark
                              ? "text-slate-400 hover:text-blue-400 bg-slate-950 border-slate-800"
                              : "text-slate-600 hover:text-blue-600 bg-slate-100 border-slate-200"
                          }`}
                        >
                          <FiFileText className="text-blue-500" />
                          <span>View Sources</span>
                          {isSourcesOpen ? <FiChevronUp /> : <FiChevronDown />}
                        </button>

                        {isSourcesOpen && (
                          <div className={`mt-2 p-3 border rounded-xl space-y-2 max-w-full overflow-hidden ${
                            isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
                          }`}>
                            {msg.sources.map((s, sIdx) => (
                              <div key={sIdx} className={`p-2 rounded-lg text-[10px] ${
                                isDark ? "bg-slate-900" : "bg-white border border-slate-200"
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
        <div className={`p-4 border-t shrink-0 ${isDark ? "border-slate-800/80 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="text"
              placeholder={`Ask ${bot.name} anything...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-xs focus:outline-none transition ${
                isDark
                  ? "bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                  : "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
              }`}
            />

            {loading ? (
              <button
                type="button"
                onClick={handleStopBotGeneration}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 cursor-pointer"
                title="Stop Streaming Generation"
              >
                <FiStopCircle className="text-sm" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shrink-0 shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
              >
                <FiSend />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default BotChatTab;
