import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiMessageSquare,
  FiX,
  FiSend,
  FiCpu,
  FiRefreshCw,
  FiSquare,
  FiZap,
  FiMove,
  FiCalendar,
  FiArrowRight
} from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import { streamExternalChatApi, getResponseFormat } from "../../services/externalBotService";
import PillListWidget from "./PillListWidget";

const SUGGESTED_PROMPTS = [
  "Explain React Hooks in detail with examples",
  "How does Async/Await work in JavaScript?",
  "What is the difference between SQL and NoSQL?"
];

const createMessageObj = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  role,
  content,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  ...extra
});

const formatMarkdownBreaks = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/([^\n])\n([^\n])/g, "$1  \n$2");
};

/**
 * Capitalizes every word in a string (Title Case Format)
 * e.g. "explain react hooks" -> "Explain React Hooks"
 */
const toCapitalized = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
};

/**
 * Extracts bullet lists or metadata arrays into structured items & intro text
 */
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

/**
 * Dynamic Switch-Case Renderer based on Response Format:
 * Handles: "out_of_the_box" | "table" | "list" | "text"
 */
const ResponseSwitchRenderer = ({ msg, onOptionClick, isDark }) => {
  const format = getResponseFormat(msg);
  const { intro, items } = extractListAndIntro(msg.content, msg.metadata);
  const tableData = msg.metadata?.table || (msg.metadata?.headers && msg.metadata?.rows ? msg.metadata : null);

  // Common Markdown Components Styling
  const markdownComponents = {
    p: ({ node, ...props }) => (
      <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="text-blue-400 hover:underline font-semibold break-all" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong
        className={`font-extrabold px-1.5 py-0.5 rounded-md text-[11px] inline-block my-0.5 shadow-2xs ${
          msg.role === "user"
            ? "text-white bg-blue-700/70 border border-blue-400/40"
            : isDark
            ? "text-amber-300 bg-amber-500/20 border border-amber-500/40"
            : "text-indigo-700 bg-indigo-100 border border-indigo-300"
        }`}
        {...props}
      />
    ),
    em: ({ node, ...props }) => (
      <em className={`italic font-medium ${isDark ? "text-amber-200" : "text-indigo-600"}`} {...props} />
    ),
    table: ({ node, ...props }) => (
      <div className={`w-full max-w-full overflow-x-auto my-2 rounded-xl border custom-scrollbar ${isDark ? "border-slate-800 bg-slate-950" : "border-slate-300 bg-white"}`}>
        <table className="w-full border-collapse text-left text-xs min-w-full table-auto border-spacing-0" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className={`uppercase text-[10px] tracking-wider border-b ${isDark ? "bg-slate-900 text-slate-200 border-slate-800" : "bg-slate-200 text-slate-700 border-slate-300"}`} {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="px-3 py-2 font-semibold select-none whitespace-nowrap align-top" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className={`px-3 py-2 border-b align-top ${isDark ? "text-slate-300 border-slate-800/50" : "text-slate-700 border-slate-200"}`} {...props} />
    ),
    tr: ({ node, ...props }) => (
      <tr className={`transition-colors last:border-none ${isDark ? "hover:bg-slate-800/30 even:bg-slate-900/40" : "hover:bg-slate-200/50 even:bg-slate-50"}`} {...props} />
    )
  };

  // SWITCH CASE FORMAT RENDERING
  switch (format) {

    // -----------------------------------------------------------
    // CASE 1: OUT OF THE BOX / SCHEDULE CALL / CARD FORMAT
    // -----------------------------------------------------------
    case "out_of_the_box":
    case "card":
      return (
        <div className="w-full space-y-2 my-1">
          {/* Main Message Text */}
          <div className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
            isDark ? "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-xs shadow-md" : "bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs shadow-sm"
          }`}>
            {msg.metadata?.title && (
              <div className="font-bold text-xs text-amber-400 mb-1.5 flex items-center gap-1.5">
                <span>💡 {msg.metadata.title}</span>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {formatMarkdownBreaks(msg.content)}
            </ReactMarkdown>
          </div>

          {/* Schedule Call Interactive Action Button */}
          <div className="w-[88%] mt-2">
            <button
              type="button"
              onClick={() => {
                if (msg.metadata?.actionUrl) {
                  window.open(msg.metadata.actionUrl, "_blank");
                } else {
                  onOptionClick && onOptionClick("Schedule a discovery call with engineering team");
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
      );

    // -----------------------------------------------------------
    // CASE 2: TABLE RESPONSE FORMAT
    // -----------------------------------------------------------
    case "table":
      return (
        <div className="w-full space-y-2">
          {intro && (
            <div className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
              isDark ? "bg-slate-800/90 text-slate-100 border border-slate-700/60" : "bg-slate-100 text-slate-900 border border-slate-200"
            }`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {formatMarkdownBreaks(intro)}
              </ReactMarkdown>
            </div>
          )}

          {tableData ? (
            <div className={`w-[95%] overflow-x-auto my-2 rounded-xl border custom-scrollbar ${
              isDark ? "border-slate-800 bg-slate-950/90 text-slate-200" : "border-slate-300 bg-white text-slate-800"
            }`}>
              {tableData.title && (
                <div className={`p-2.5 border-b font-bold text-xs ${
                  isDark ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-slate-100 border-slate-200 text-slate-800"
                }`}>
                  📊 {tableData.title}
                </div>
              )}
              <table className="w-full text-left text-xs border-collapse min-w-full">
                <thead className={`uppercase text-[10px] tracking-wider border-b ${
                  isDark ? "bg-slate-900 text-slate-200 border-slate-800" : "bg-slate-200 text-slate-700 border-slate-300"
                }`}>
                  <tr>
                    {tableData.headers?.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-semibold select-none whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows?.map((row, rIdx) => (
                    <tr key={rIdx} className={`border-b last:border-none ${
                      isDark ? "border-slate-800/50 hover:bg-slate-800/30 even:bg-slate-900/40" : "border-slate-200 hover:bg-slate-100/50 even:bg-slate-50"
                    }`}>
                      {Array.isArray(row)
                        ? row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 text-xs">
                              {cell}
                            </td>
                          ))
                        : tableData.headers?.map((h, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 text-xs">
                              {row[h] ?? row[h.toLowerCase()] ?? ""}
                            </td>
                          ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`max-w-[95%] p-3 rounded-2xl text-xs leading-relaxed ${
              isDark ? "bg-slate-800/90 text-slate-100 border border-slate-700/60" : "bg-slate-100 text-slate-900 border border-slate-200"
            }`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {formatMarkdownBreaks(msg.content)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );

    // -----------------------------------------------------------
    // CASE 3: LIST RESPONSE FORMAT (Pill Cards)
    // -----------------------------------------------------------
    case "list":
      return (
        <div className="w-full space-y-1">
          {intro && (
            <div className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
              isDark ? "bg-slate-800/90 text-slate-100 border border-slate-700/60" : "bg-slate-100 text-slate-900 border border-slate-200"
            }`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {formatMarkdownBreaks(intro)}
              </ReactMarkdown>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="w-[88%] mt-1">
              <PillListWidget items={items} onItemClick={onOptionClick} />
            </div>
          )}
        </div>
      );

    // -----------------------------------------------------------
    // CASE 4: TEXT RESPONSE FORMAT (Standard Markdown / User Msg)
    // -----------------------------------------------------------
    case "text":
    default:
      return (
        <div
          className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
            msg.role === "user"
              ? "bg-blue-600 text-white rounded-br-xs shadow-md shadow-blue-600/10 font-medium capitalize"
              : isDark
              ? "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-xs"
              : "bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs"
          }`}
        >
          {msg.role === "user" ? (
            <span className="whitespace-pre-wrap capitalize">{msg.content}</span>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {formatMarkdownBreaks(msg.content) || ""}
            </ReactMarkdown>
          )}

          {msg.isStreaming && !msg.content && (
            <span className="flex items-center gap-1.5 text-blue-400 font-mono italic">
              <FiRefreshCw className="animate-spin text-xs" />
              <span>Thinking & Streaming response...</span>
            </span>
          )}

          {msg.isStreaming && msg.content && (
            <span className="inline-block w-1.5 h-3 bg-blue-400 ml-1 animate-pulse" />
          )}
        </div>
      );
  }
};

/**
 * Main Floating External Bot Widget Component
 */
const FloatingExternalBotWidget = () => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    createMessageObj("assistant", "Hello! I am your AI Assistant powered by External Bot Stream APIs. Ask me anything!")
  ]);

  // Draggable State Management (Mouse & Touch)
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const hasMovedRef = useRef(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Default initial position anchored at bottom right corner
  useEffect(() => {
    const setInitialPos = () => {
      if (position.x === null && typeof window !== "undefined") {
        setPosition({
          x: Math.max(16, window.innerWidth - 75),
          y: Math.max(16, window.innerHeight - 75)
        });
      }
    };
    setInitialPos();
    window.addEventListener("resize", setInitialPos);
    return () => window.removeEventListener("resize", setInitialPos);
  }, [position.x]);

  // Global Drag listeners (Mouse & Touch)
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;

      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined || clientY === undefined) return;

      const deltaX = Math.abs(clientX - dragStartRef.current.startX);
      const deltaY = Math.abs(clientY - dragStartRef.current.startY);

      if (deltaX > 4 || deltaY > 4) {
        hasMovedRef.current = true;
      }

      const newX = Math.min(
        Math.max(16, clientX - dragStartRef.current.offsetX),
        window.innerWidth - 70
      );
      const newY = Math.min(
        Math.max(16, clientY - dragStartRef.current.offsetY),
        window.innerHeight - 70
      );

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove);
      window.addEventListener("touchend", handlePointerUp);
    }

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e) => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    hasMovedRef.current = false;
    const currentX = position.x ?? (typeof window !== "undefined" ? window.innerWidth - 75 : 800);
    const currentY = position.y ?? (typeof window !== "undefined" ? window.innerHeight - 75 : 600);

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      offsetX: clientX - currentX,
      offsetY: clientY - currentY
    };
    setIsDragging(true);
  };

  const handleFabClick = (e) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const handleSendMessage = async (textOverride = null) => {
    const rawText = textOverride !== null ? textOverride : input;
    if (!rawText || !rawText.trim() || loading) return;

    // Convert prompt to capitalized Title Case
    const userText = toCapitalized(rawText.trim());

    if (textOverride === null) setInput("");
    setLoading(true);

    const userMessage = createMessageObj("user", userText);
    const botMessageId = `bot-${Date.now()}`;
    const initialBotMessage = {
      ...createMessageObj("assistant", ""),
      id: botMessageId,
      isStreaming: true
    };

    setMessages((prev) => [...prev, userMessage, initialBotMessage]);
    abortControllerRef.current = new AbortController();

    try {
      await streamExternalChatApi({
        message: userText,
        signal: abortControllerRef.current.signal,
        onChunk: (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        },
        onMetadata: (metadata) => {
          console.log("📊 [Widget metadata event received]:", metadata);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, metadata: { ...msg.metadata, ...metadata } }
                : msg
            )
          );
        }
      });

      // Finalize streaming
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, content: msg.content || "No response text received.", isStreaming: false }
            : msg
        )
      );
    } catch (err) {
      const isAbort = err.name === "AbortError";
      const errorContent = isAbort
        ? " [Generation Stopped]"
        : `⚠️ Failed to fetch response. ${err.message || "Please check network connection."}`;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, content: isAbort ? msg.content + errorContent : errorContent, isStreaming: false }
            : msg
        )
      );
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleClearHistory = () => {
    handleStopGeneration();
    setMessages([createMessageObj("assistant", "Chat history cleared. How can I help you next?")]);
  };

  // Compute Modal position relative to FAB button with screen bounds protection
  const modalWidth = 384;
  const modalHeight = 540;
  const currentFabX = position.x ?? (typeof window !== "undefined" ? window.innerWidth - 75 : 800);
  const currentFabY = position.y ?? (typeof window !== "undefined" ? window.innerHeight - 75 : 600);

  const modalLeft = Math.min(
    Math.max(12, currentFabX - modalWidth + 50),
    (typeof window !== "undefined" ? window.innerWidth : 1000) - modalWidth - 16
  );

  const modalTop = Math.min(
    Math.max(12, currentFabY - modalHeight - 12),
    (typeof window !== "undefined" ? window.innerHeight : 800) - modalHeight - 16
  );

  return (
    <>
      {/* Draggable Floating Trigger Button (FAB) */}
      <div
        style={
          position.x !== null
            ? { left: `${position.x}px`, top: `${position.y}px` }
            : undefined
        }
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        className={`fixed z-50 touch-none select-none ${position.x === null ? "bottom-6 right-6" : ""}`}
      >
        <button
          onClick={handleFabClick}
          className={`relative p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-transform duration-200 transform hover:scale-105 active:scale-95 border cursor-grab active:cursor-grabbing ${
            isDragging ? "ring-4 ring-blue-500/40 scale-110" : ""
          } ${
            isOpen
              ? "bg-rose-600 text-white border-rose-500 shadow-rose-600/30 rotate-90"
              : isDark
              ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-blue-500/50 shadow-blue-600/40"
              : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-blue-400 shadow-blue-500/30"
          }`}
          title={isOpen ? "Close Assistant (Drag to Move)" : "Open External AI Chatbot Widget (Drag to Move)"}
        >
          {isOpen ? (
            <FiX className="text-xl" />
          ) : (
            <>
              <FiMessageSquare className="text-xl" />
              {/* Online Pulse Badge */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Modal Box (Draggable via Header) */}
      {isOpen && (
        <div
          style={{
            left: `${modalLeft}px`,
            top: `${modalTop}px`
          }}
          className={`fixed z-50 w-[92vw] sm:w-96 h-[540px] max-h-[82vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${
            isDark
              ? "bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur-xl"
              : "bg-white/95 border-slate-200 text-slate-900 backdrop-blur-xl shadow-slate-300/60"
          }`}
        >
          {/* Header - Draggable Drag Handle */}
          <div
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            className={`p-4 border-b flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing ${
              isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
            title="Drag Header to Move Chat Widget"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                <FiCpu className="text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight">External AI Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className={`text-[10px] flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  <FiMove className="text-[9px]" />
                  <span>Drag header to move</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className={`p-1.5 rounded-lg text-xs transition ${
                  isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                }`}
                title="Clear Chat History"
              >
                <FiRefreshCw />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-lg text-xs transition ${
                  isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                }`}
                title="Minimize Widget"
              >
                <FiX className="text-base" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col w-full ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Dynamic Switch-Case Renderer based on Response Format */}
                <ResponseSwitchRenderer
                  msg={msg}
                  isDark={isDark}
                  onOptionClick={(selectedText) => handleSendMessage(selectedText)}
                />

                <span className={`text-[9px] mt-1 px-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {msg.timestamp}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Prompts (Visible when only 1 message or idle) */}
          {messages.length <= 2 && !loading && (
            <div className={`px-4 py-2 border-t flex flex-col gap-1.5 shrink-0 ${
              isDark ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50/60 border-slate-200/60"
            }`}>
              <div className={`text-[10px] font-bold flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <FiZap className="text-amber-400" />
                <span>Suggested Prompts:</span>
              </div>
              <div className="flex flex-col gap-1">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className={`text-left text-[11px] px-2.5 py-1.5 rounded-xl border transition truncate ${
                      isDark
                        ? "bg-slate-900 border-slate-800 hover:border-blue-500/50 hover:bg-blue-600/10 text-slate-300 hover:text-blue-300"
                        : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 shadow-2xs"
                    }`}
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`p-3 border-t flex items-center gap-2 shrink-0 ${
              isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={loading ? "Generating response..." : "Ask anything..."}
              disabled={loading}
              className={`flex-1 px-3.5 py-2 rounded-xl text-xs focus:outline-none transition capitalize ${
                isDark
                  ? "bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                  : "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
              }`}
            />

            {loading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0"
                title="Stop Stream Generation"
              >
                <FiSquare className="text-xs fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition shrink-0 cursor-pointer"
                title="Send Message"
              >
                <FiSend className="text-xs" />
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingExternalBotWidget;
