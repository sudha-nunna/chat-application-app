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
  FiMove
} from "react-icons/fi";
import {
  streamExternalChatApi,
  formatMarkdownBreaks,
  toCapitalized
} from "../../services/externalBotService";
import { useTheme } from "../../context/ThemeContext";

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

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  };

  const handleSendMessage = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const messageText = customPrompt || input.trim();
    if (!messageText || loading) return;

    const formattedPrompt = toCapitalized(messageText);

    if (!customPrompt) setInput("");

    const userMessage = createMessageObj("user", formattedPrompt);
    const botPlaceholderId = `assistant-${Date.now()}`;
    const botMessagePlaceholder = createMessageObj("assistant", "", {
      id: botPlaceholderId,
      isStreaming: true,
      metadata: null
    });

    setMessages((prev) => [...prev, userMessage, botMessagePlaceholder]);
    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamExternalChatApi({
        message: formattedPrompt,
        onChunk: (chunkText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botPlaceholderId
                ? { ...msg, content: msg.content + chunkText, isStreaming: true }
                : msg
            )
          );
        },
        onMetadata: (metaObj) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botPlaceholderId
                ? { ...msg, metadata: metaObj }
                : msg
            )
          );
        },
        signal: controller.signal
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botPlaceholderId
              ? {
                ...msg,
                content: msg.content || "⚠️ Failed to receive response from external bot API.",
                isStreaming: false
              }
              : msg
          )
        );
      }
    } finally {
      setLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botPlaceholderId ? { ...msg, isStreaming: false } : msg
        )
      );
      abortControllerRef.current = null;
    }
  };

  const handleClearHistory = () => {
    if (loading) handleStopStream();
    setMessages([
      createMessageObj("assistant", "Hello! Chat history cleared. How can I assist you today?")
    ]);
  };

  // Compute boundaries for floating chat box so it doesn't go offscreen
  const modalLeft = Math.min(
    Math.max(16, (position.x ?? (typeof window !== "undefined" ? window.innerWidth - 75 : 800)) - 320),
    typeof window !== "undefined" ? window.innerWidth - 390 : 800
  );
  const modalTop = Math.min(
    Math.max(16, (position.y ?? (typeof window !== "undefined" ? window.innerHeight - 75 : 600)) - 550),
    typeof window !== "undefined" ? window.innerHeight - 560 : 600
  );

  // Markdown Custom Styling Components
  const markdownComponents = {
    p: ({ node, ...props }) => (
      <p className="mb-1.5 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="text-blue-400 hover:underline font-semibold break-all" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong
        className={`font-extrabold px-1.5 py-0.5 rounded-md text-[11px] inline-block my-0.5 shadow-2xs ${
          isDark
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

  return (
    <>
      {/* Floating Draggable FAB Button */}
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
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col w-full ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-blue-600 text-white rounded-br-xs shadow-md shadow-blue-600/10 font-medium"
                        : isDark
                          ? "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-xs"
                          : "bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs"
                    }`}
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</span>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {formatMarkdownBreaks(msg.content) || ""}
                      </ReactMarkdown>
                    )}

                    {msg.isStreaming && !msg.content && (
                      <span className="flex items-center gap-1.5 text-blue-400 font-mono italic mt-1">
                        <FiRefreshCw className="animate-spin text-xs" />
                        <span>Thinking & Streaming response...</span>
                      </span>
                    )}

                    {msg.isStreaming && msg.content && (
                      <span className="inline-block w-1.5 h-3 bg-blue-400 ml-1 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-semibold mb-1.5">
                <FiZap className="text-amber-400" />
                <span>Suggested Questions:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => handleSendMessage(e, promptText)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border transition text-left ${
                      isDark
                        ? "bg-slate-800/70 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700/80"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input Form */}
          <form
            onSubmit={handleSendMessage}
            className={`p-3 border-t flex items-center gap-2 shrink-0 ${
              isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <input
              type="text"
              placeholder="Ask external bot anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition ${
                isDark
                  ? "bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500"
                  : "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400"
              }`}
            />

            {loading ? (
              <button
                type="button"
                onClick={handleStopStream}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs transition shadow-md shadow-rose-600/20 cursor-pointer"
                title="Stop Response Stream"
              >
                <FiSquare className="text-xs" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs transition shadow-md shadow-blue-600/20 cursor-pointer"
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
