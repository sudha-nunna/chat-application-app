import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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
  FiPhoneCall,
  FiMic,
  FiMicOff,
  FiRadio,
} from "react-icons/fi";
import {
  streamExternalChatApi,
  formatMarkdownBreaks,
  toCapitalized,
} from "../../services/externalBotService";
import { useTheme } from "../../context/ThemeContext";
import VisemeAvatarPlayer from "./VisemeAvatarPlayer";
import VoiceConversationManager from "../avatar/VoiceConversationManager";

const SUGGESTED_PROMPTS = [
  "Explain React Hooks in detail with examples",
  "How does Async/Await work in JavaScript?",
  "What is the difference between SQL and NoSQL?",
];

const createMessageObj = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  role,
  content,
  timestamp: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
  ...extra,
});

const isLiveAgentRequested = (msg) => {
  if (!msg || msg.role === "user") return false;
  const meta = msg.metadata;
  if (meta) {
    if (
      meta.responseType === "live_agent" ||
      meta.liveAgent === true ||
      meta.live_agent === true ||
      meta.action === "live_agent" ||
      meta.type === "live_agent" ||
      meta.tool === "live_agent" ||
      meta.hasLiveAgent
    ) {
      return true;
    }
  }
  const content = (msg.content || "").toLowerCase();
  return (
    content.includes("live_agent") ||
    content.includes("live agent") ||
    content.includes("schedule_call") ||
    content.includes("schedule call") ||
    content.includes("discovery call")
  );
};

/**
 * Main Floating External Bot Widget Component
 */
const FloatingExternalBotWidget = () => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Single Chat Session State Management using sessionStorage exclusively
  const [activeConvId, setActiveConvId] = useState(() => {
    return sessionStorage.getItem("external_bot_conv_id") || null;
  });

  // Voice Conversation Mode State Management
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [voiceState, setVoiceState] = useState("IDLE");
  const [sttInterimText, setSttInterimText] = useState("");
  const voiceManagerRef = useRef(null);

  const [messages, setMessages] = useState([
    createMessageObj(
      "assistant",
      "Hello! I am your AI Assistant powered by External Bot Stream APIs. Ask me anything!",
    ),
  ]);

  // Draggable State Management (Mouse & Touch)
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const hasMovedRef = useRef(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabledRef = useRef(true);
  const abortControllerRef = useRef(null);

  // Initialize Voice Conversation Manager
  useEffect(() => {
    voiceManagerRef.current = new VoiceConversationManager({
      onListeningStart: () => setVoiceState("LISTENING"),
      onSpeechDetected: (text) => {
        setSttInterimText(text);
        setVoiceState("LISTENING");
      },
      onSpeechEnded: () => {},
      onTranscriptComplete: (finalTranscript) => {
        if (finalTranscript && finalTranscript.trim()) {
          setSttInterimText("");
          setVoiceState("THINKING");
          handleSendMessage(null, finalTranscript);
        }
      },
      onError: (err) => console.warn("Widget Voice Error:", err),
    });

    return () => {
      if (voiceManagerRef.current) voiceManagerRef.current.stopListening();
    };
  }, []);

  const toggleVoiceMode = () => {
    if (isVoiceModeActive) {
      setIsVoiceModeActive(false);
      setVoiceState("IDLE");
      if (voiceManagerRef.current) voiceManagerRef.current.stopListening();
    } else {
      setIsVoiceModeActive(true);
      setVoiceState("LISTENING");
      if (voiceManagerRef.current)
        voiceManagerRef.current.startListening("HANDS_FREE");
    }
  };

  const handleAvatarSpeechEnd = useCallback(() => {
    if (isVoiceModeActive && voiceManagerRef.current) {
      setVoiceState("LISTENING");
      voiceManagerRef.current.startListening("HANDS_FREE");
    } else {
      setVoiceState("IDLE");
    }
  }, [isVoiceModeActive]);

  // Default initial position anchored at bottom right corner
  useEffect(() => {
    const setInitialPos = () => {
      if (position.x === null && typeof window !== "undefined") {
        setPosition({
          x: Math.max(16, window.innerWidth - 75),
          y: Math.max(16, window.innerHeight - 75),
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
        window.innerWidth - 70,
      );
      const newY = Math.min(
        Math.max(16, clientY - dragStartRef.current.offsetY),
        window.innerHeight - 70,
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
    const currentX =
      position.x ??
      (typeof window !== "undefined" ? window.innerWidth - 75 : 800);
    const currentY =
      position.y ??
      (typeof window !== "undefined" ? window.innerHeight - 75 : 600);

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      offsetX: clientX - currentX,
      offsetY: clientY - currentY,
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
    if (isOpen && isAutoScrollEnabledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isAutoScrollEnabledRef.current = distanceFromBottom <= 80;
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      isAutoScrollEnabledRef.current = false;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg,
      ),
    );
  };

  const handleSendMessage = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const messageText = customPrompt || input.trim();
    if (!messageText || loading) return;

    isAutoScrollEnabledRef.current = true;

    const formattedPrompt = toCapitalized(messageText);

    if (!customPrompt) setInput("");

    const userMessage = createMessageObj("user", formattedPrompt);
    const botPlaceholderId = `assistant-${Date.now()}`;
    const botMessagePlaceholder = createMessageObj("assistant", "", {
      id: botPlaceholderId,
      isStreaming: true,
      metadata: null,
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
        conversationId: activeConvId,
        signal: controller.signal,
        onChunk: (chunkText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botPlaceholderId
                ? {
                    ...msg,
                    content: msg.content + chunkText,
                    isStreaming: true,
                  }
                : msg,
            ),
          );
        },
        onMetadata: (metaObj) => {
          const convId =
            metaObj?.conversationId || metaObj?.chatId || metaObj?._id;
          if (convId) {
            setActiveConvId(convId);
            sessionStorage.setItem("external_bot_conv_id", convId);
          }
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === botPlaceholderId) {
                const prevMeta = msg.metadata || {};
                const mergedMeta = {
                  ...prevMeta,
                  ...metaObj,
                  responseType:
                    metaObj?.responseType === "live_agent" ||
                    prevMeta?.responseType === "live_agent"
                      ? "live_agent"
                      : metaObj?.responseType || prevMeta?.responseType,
                  liveAgent:
                    metaObj?.liveAgent ||
                    metaObj?.live_agent ||
                    prevMeta?.liveAgent ||
                    prevMeta?.live_agent ||
                    false,
                };
                return { ...msg, metadata: mergedMeta };
              }
              return msg;
            }),
          );
        },
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botPlaceholderId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    "⚠️ Failed to receive response from external bot API.",
                  isStreaming: false,
                }
              : msg,
          ),
        );
      }
    } finally {
      setLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botPlaceholderId ? { ...msg, isStreaming: false } : msg,
        ),
      );
      abortControllerRef.current = null;
    }
  };

  const handleClearHistory = () => {
    if (loading) handleStopStream();
    setActiveConvId(null);
    sessionStorage.removeItem("external_bot_conv_id");
    setMessages([
      createMessageObj(
        "assistant",
        "Hello! Chat history cleared. How can I assist you today?",
      ),
    ]);
  };

  // Compute boundaries for floating chat box so it doesn't go offscreen
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const modalLeft = Math.min(
    Math.max(
      16,
      (position.x ??
        (typeof window !== "undefined" ? window.innerWidth - 75 : 800)) - 320,
    ),
    typeof window !== "undefined" ? (isMobile ? Math.max(16, window.innerWidth - 390) : window.innerWidth - 390) : 800,
  );
  const modalTop = Math.min(
    Math.max(
      16,
      (position.y ??
        (typeof window !== "undefined" ? window.innerHeight - 75 : 600)) - 550,
    ),
    typeof window !== "undefined" ? (isMobile ? Math.max(16, window.innerHeight - 560) : window.innerHeight - 560) : 600,
  );

  // Markdown Custom Styling Components
  const markdownComponents = {
    p: ({ node, ...props }) => (
      <p
        className="mb-1.5 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"
        {...props}
      />
    ),
    a: ({ node, ...props }) => (
      <a
        className="text-text-primary hover:underline font-semibold break-all"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    strong: ({ node, ...props }) => (
      <strong
        className={`font-extrabold px-1.5 py-0.5 rounded-md text-[11px] inline-block my-0.5 shadow-2xs ${"text-text-primary bg-surface-secondary border border-border-primary dark:text-amber-600 dark:bg-amber-900/20 dark:border dark:border-amber-800/40"}`}
        {...props}
      />
    ),
    em: ({ node, ...props }) => (
      <em
        className={`italic font-medium ${"text-text-primary dark:text-amber-200"}`}
        {...props}
      />
    ),
    table: ({ node, ...props }) => (
      <div
        className={`w-full max-w-full overflow-x-auto my-2 rounded-xl border custom-scrollbar ${"border-border-primary bg-white dark:bg-interactive-base"}`}
      >
        <table
          className="w-full border-collapse text-left text-xs min-w-full table-auto border-spacing-0"
          {...props}
        />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead
        className={`uppercase text-[10px] tracking-wider border-b ${"bg-surface-secondary dark:bg-interactive-active text-text-primary dark:text-text-muted border-border-primary"}`}
        {...props}
      />
    ),
    th: ({ node, ...props }) => (
      <th
        className="px-3 py-2 font-semibold select-none whitespace-nowrap align-top"
        {...props}
      />
    ),
    td: ({ node, ...props }) => (
      <td
        className={`px-3 py-2 border-b align-top ${"text-text-primary dark:text-text-muted border-border-primary dark:border-border-primary/50"}`}
        {...props}
      />
    ),
    tr: ({ node, ...props }) => (
      <tr
        className={`transition-colors last:border-none ${"hover:bg-surface-secondary/50 even:bg-interactive-base dark:hover:bg-interactive-active/30 dark:even:bg-interactive-active/40"}`}
        {...props}
      />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc list-outside my-2 space-y-1 pl-4" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol
        className="list-decimal list-outside my-2 space-y-1 pl-4"
        {...props}
      />
    ),
    li: ({ node, ...props }) => (
      <li
        className="leading-relaxed marker:text-text-primary font-normal pl-0.5"
        {...props}
      />
    ),
    pre: ({ node, ...props }) => <div className="my-2">{props.children}</div>,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline) {
        return (
          <div className="relative w-full max-w-full overflow-x-auto rounded-xl shadow-sm custom-scrollbar bg-[#1e1e1e] border border-white/10">
            {match ? (
              <SyntaxHighlighter
                children={String(children).replace(/\n$/, "")}
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, padding: "12px", fontSize: "11px", background: "transparent" }}
                {...props}
              />
            ) : (
              <pre className="p-3 text-[11px] font-mono leading-relaxed text-[#d4d4d4]" {...props}>
                {children}
              </pre>
            )}
          </div>
        );
      }
      return (
        <code
          className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/5 dark:bg-white/10 border border-border-primary/30 dark:border-white/5 font-mono font-medium text-text-primary"
          {...props}
        >
          {children}
        </code>
      );
    },
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
            isDragging ? "ring-4 ring-border-focus/40 scale-110" : ""
          } ${
            isOpen
              ? "bg-white text-text-primary dark:bg-interactive-base dark:text-white border-border-primary shadow-black/10/30 rotate-90"
              : "bg-text-primary text-text-inverse dark:bg-gradient-to-tr dark:from-interactive-base dark:to-interactive-hover dark:text-white border-transparent dark:border-border-primary/50 shadow-black/10/30 dark:shadow-black/10/40"
          }`}
          title={
            isOpen
              ? "Close Assistant (Drag to Move)"
              : "Open External AI Chatbot Widget (Drag to Move)"
          }
        >
          {isOpen ? (
            <FiX className="text-xl" />
          ) : (
            <>
              <FiMessageSquare className="text-xl" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-interactive-base opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-interactive-base border-2 border-border-primary"></span>
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
            top: `${modalTop}px`,
          }}
          className={`fixed z-50 w-[92vw] sm:w-96 h-[540px] max-h-[82vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${"bg-white/95 border-border-primary text-text-primary backdrop-blur-xl shadow-black/10/60 dark:bg-interactive-active/95 dark:border-border-primary dark:text-text-muted dark:backdrop-blur-xl"}`}
        >
          {/* Header - Draggable Drag Handle */}
          <div
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            className={`p-4 border-b flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing ${"bg-interactive-base dark:bg-interactive-base/80 border-border-primary"}`}
            title="Drag Header to Move Chat Widget"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-interactive-base to-interactive-hover text-text-primary dark:text-white flex items-center justify-center font-bold shadow-md shadow-black/10/20 shrink-0">
                <FiCpu className="text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight">
                    External AI Assistant
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse" />
                </div>
                <p
                  className={`text-[10px] flex items-center gap-1 ${"text-text-primary"}`}
                >
                  <FiMove className="text-[9px]" />
                  <span>Drag header to move</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleVoiceMode}
                className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  isVoiceModeActive
                    ? "bg-interactive-base text-text-primary animate-pulse"
                    : "text-text-primary hover:text-text-primary hover:bg-surface-secondary dark:text-text-primary dark:hover:text-text-muted dark:hover:bg-interactive-active"
                }`}
                title="Toggle Live Hands-Free Voice Mode"
              >
                {isVoiceModeActive ? (
                  <FiRadio className="text-xs animate-spin" />
                ) : (
                  <FiMic className="text-xs" />
                )}
              </button>

              <button
                type="button"
                onClick={handleClearHistory}
                className={`p-1.5 rounded-lg text-xs transition ${"text-text-primary hover:text-text-primary dark:hover:text-text-muted hover:bg-surface-secondary dark:hover:bg-interactive-active"}`}
                title="Clear Chat History"
              >
                <FiRefreshCw />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-lg text-xs transition ${"text-text-primary hover:text-text-primary dark:hover:text-text-muted hover:bg-surface-secondary dark:hover:bg-interactive-active"}`}
                title="Minimize Widget"
              >
                <FiX className="text-base" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar"
          >
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
                        ? "bg-neutral-900 text-white dark:bg-[#383838] dark:text-white rounded-br-xs shadow-md font-normal"
                        : "bg-surface-secondary text-text-primary border border-border-primary rounded-bl-xs dark:bg-[#181818] dark:text-text-muted dark:border dark:border-white/5 dark:rounded-bl-xs"
                    }`}
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {msg.content}
                      </span>
                    ) : (
                      <>
                        {(msg.metadata?.botType === "AVATAR" ||
                          msg.metadata?.botType === "VIDEO_AVATAR" ||
                          msg.metadata?.botType === "HYBRID" ||
                          !msg.metadata?.botType) &&
                          (msg.speechData || msg.metadata?.speechData) && (
                            <div className="mb-3">
                              <VisemeAvatarPlayer
                                speechData={
                                  msg.speechData || msg.metadata?.speechData
                                }
                                onSpeechEnd={handleAvatarSpeechEnd}
                                avatarConfig={
                                  msg.avatarConfig ||
                                  msg.metadata?.avatarConfig || {
                                    avatarProvider:
                                      msg.metadata?.avatarProvider ||
                                      (msg.metadata?.avatar3DModel
                                        ? "THREE_3D"
                                        : "LOCAL_VISEME"),
                                    faceModelUrl: msg.metadata?.avatar3DModel,
                                    avatar3DModel: msg.metadata?.avatar3DModel,
                                    faceImageUrl: msg.metadata?.avatarImage,
                                    faceVideoUrl: msg.metadata?.avatarVideo,
                                  }
                                }
                              />
                            </div>
                          )}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {formatMarkdownBreaks(msg.content) || ""}
                        </ReactMarkdown>
                      </>
                    )}

                    {msg.isStreaming && !msg.content && (
                      <span className="flex items-center gap-1.5 text-text-primary  text-xs font-mono italic mt-1">
                        <FiRefreshCw className="animate-spin text-xs" />
                        <span>Thinking & Streaming response...</span>
                      </span>
                    )}

                    {msg.isStreaming && msg.content && (
                      <span className="inline-block w-1.5 h-3 bg-interactive-base ml-1 animate-pulse" />
                    )}

                    {!isUser && isLiveAgentRequested(msg) && (
                      <div
                        className={`mt-2.5 p-2.5 rounded-xl border flex flex-col gap-2 ${"bg-amber-50/90 dark:bg-interactive-base/90 border-amber-200 dark:border-amber-800/30 shadow-sm"}`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                          <FiCalendar className="text-sm shrink-0" />
                          <span>Live Agent Handoff</span>
                        </div>
                        <p
                          className={`text-[11px] leading-tight ${"text-text-primary dark:text-text-muted"}`}
                        >
                          A live support representative is requested. Would you
                          like to schedule a call?
                        </p>
                        <button
                          type="button"
                          onClick={(e) =>
                            handleSendMessage(
                              e,
                              "I would like to schedule a call with a live agent",
                            )
                          }
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-interactive-hover hover:from-amber-600 hover:to-interactive-hover text-text-primary dark:text-white font-bold text-xs py-2 rounded-lg shadow-md transition cursor-pointer"
                        >
                          <FiPhoneCall />
                          <span>Schedule Call Now</span>
                        </button>
                      </div>
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
              <div className="flex items-center gap-1.5 text-[10px] text-text-primary font-semibold mb-1.5">
                <FiZap className="text-amber-800" />
                <span>Suggested Questions:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => handleSendMessage(e, promptText)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border transition text-left ${"bg-surface-secondary border-border-primary text-text-primary hover:text-text-primary hover:bg-surface-secondary dark:bg-interactive-active/70 dark:border-white/5 dark:text-text-muted dark:hover:text-white dark:hover:bg-interactive-base/80"}`}
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
            className={`p-3 border-t flex flex-col gap-2 shrink-0 ${"bg-interactive-base dark:bg-interactive-base/80 border-border-primary"}`}
          >
            {isVoiceModeActive && (
              <div className="p-2 rounded-lg bg-interactive-base/10 border border-border-primary/30 flex items-center justify-between text-[11px] text-text-primary animate-pulse">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-interactive-base animate-ping shrink-0" />
                  <span className="font-bold uppercase text-[9px]">
                    {voiceState}:
                  </span>
                  <span className="italic text-text-muted truncate">
                    {sttInterimText || "Listening..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  className="text-[9px] font-bold underline shrink-0"
                >
                  Exit
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={toggleVoiceMode}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                  isVoiceModeActive
                    ? "bg-interactive-base text-text-primary border-border-primary shadow-md shadow-black/10/30 animate-pulse"
                    : "bg-white border-border-primary text-text-primary hover:text-text-primary shadow-xs dark:bg-interactive-active dark:border-border-primary dark:text-text-primary dark:hover:text-white"
                }`}
                title="Toggle Live Hands-Free Voice Mode"
              >
                {isVoiceModeActive ? <FiMicOff /> : <FiMic />}
              </button>

              <input
                type="text"
                placeholder="Ask external bot anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-border-focus transition ${"bg-white border border-border-primary text-text-primary placeholder:text-neutral-400 dark:bg-[#1a1a1a] dark:border dark:border-white/10 dark:text-white dark:placeholder:text-neutral-600"}`}
              />

              {loading ? (
                <button
                  type="button"
                  onClick={handleStopStream}
                  className="p-2.5 rounded-xl bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-xs transition shadow-md shadow-black/10/20 cursor-pointer"
                  title="Stop Response Stream"
                >
                  <FiSquare className="text-xs" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-interactive-base disabled:opacity-40 disabled:hover:bg-interactive-base text-white text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
                  title="Send Message"
                >
                  <FiSend className="text-xs" />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingExternalBotWidget;
