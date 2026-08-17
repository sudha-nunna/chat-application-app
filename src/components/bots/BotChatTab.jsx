import { useState, useEffect, useRef, useCallback } from "react";
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
  FiStopCircle,
  FiAlertTriangle,
  FiRotateCw,
  FiMic,
  FiMicOff,
  FiRadio,
  FiVolume2,
  FiVolumeX
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj, backEndCallObjDel } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import ClusterStatusWidget from "../global/ClusterStatusWidget";
import { formatMarkdownBreaks } from "../../services/externalBotService";
import VisemeAvatarPlayer from "../global/VisemeAvatarPlayer";
import VoiceConversationManager from "../avatar/VoiceConversationManager";
import AvatarContainer from "../avatar/AvatarContainer";

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

  // Avatar stage capability (enabled for AVATAR and HYBRID bot types)
  const isAvatarBot = Boolean(
    bot?.botType === "AVATAR" || bot?.botType === "HYBRID"
  );

  // Dedicated Avatar Bots default to Voice Avatar; Hybrid Bots default to Text Chat first
  const shouldDefaultToVoiceAvatar = Boolean(bot?.botType === "AVATAR");

  // Voice Conversation Mode State Management (ChatGPT Voice Mode / Talkie AI style)
  const [activeMode, setActiveMode] = useState(() => (shouldDefaultToVoiceAvatar ? "VOICE_AVATAR" : "TEXT_CHAT"));
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(() => shouldDefaultToVoiceAvatar);
  const [voiceState, setVoiceState] = useState(() => (shouldDefaultToVoiceAvatar ? "LISTENING" : "IDLE")); // IDLE, LISTENING, THINKING, SPEAKING
  const [sttInterimText, setSttInterimText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState("");
  const voiceManagerRef = useRef(null);

  const [clusterNodes, setClusterNodes] = useState([]);
  const [isClusterLoading, setIsClusterLoading] = useState(false);
  const messagesContainerRef = useRef(null);
  const isStreamingRef = useRef(false);

  // Initialize Voice Conversation Manager with Barge-In Speech Interruption support
  useEffect(() => {
    voiceManagerRef.current = new VoiceConversationManager({
      onListeningStart: () => {
        setVoiceState("LISTENING");
        setMicPermissionError("");
      },
      onSpeechDetected: (text) => {
        setSttInterimText(text);
        setVoiceState("LISTENING");
      },
      onSpeechEnded: () => {},
      onBargeIn: () => {
        setVoiceState("LISTENING");
      },
      onTranscriptComplete: (finalTranscript) => {
        if (finalTranscript && finalTranscript.trim()) {
          setSttInterimText("");
          setVoiceState("THINKING");
          handleSendMessage(null, finalTranscript);
        }
      },
      onError: (err) => {
        console.warn("Voice Mode Error:", err);
        if (err.includes("not supported") || err.includes("not-allowed") || err.includes("permission")) {
          setMicPermissionError("Microphone access denied or not supported by browser.");
        }
      }
    });

    // Dedicated Avatar Bots auto-start in Voice Avatar mode; Hybrid Bots default to Text Chat
    if (shouldDefaultToVoiceAvatar) {
      setActiveMode("VOICE_AVATAR");
      setIsVoiceModeActive(true);
      setVoiceState("LISTENING");
      if (voiceManagerRef.current) voiceManagerRef.current.startListening("HANDS_FREE");
    } else {
      setActiveMode("TEXT_CHAT");
      setIsVoiceModeActive(false);
      setVoiceState("IDLE");
      if (voiceManagerRef.current) voiceManagerRef.current.stopListening();
    }

    return () => {
      if (voiceManagerRef.current) {
        voiceManagerRef.current.stopListening();
      }
    };
  }, [bot?._id, isAvatarBot]);

  const toggleVoiceMode = (targetMode) => {
    const nextMode = targetMode || (activeMode === "VOICE_AVATAR" ? "TEXT_CHAT" : "VOICE_AVATAR");
    setActiveMode(nextMode);

    if (nextMode === "VOICE_AVATAR" && isAvatarBot) {
      setIsVoiceModeActive(true);
      setVoiceState("LISTENING");
      if (voiceManagerRef.current) voiceManagerRef.current.startListening("HANDS_FREE");
    } else {
      setIsVoiceModeActive(false);
      setVoiceState("IDLE");
      if (voiceManagerRef.current) voiceManagerRef.current.stopListening();
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

  // Health check polling removed as requested

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

              // Metadata & Response Type Extraction
              const metaObj = parsed.metadata || (parsed.responseType || parsed.type ? parsed : null);

              if (metaObj) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0) {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      metadata: { ...updated[lastIdx].metadata, ...metaObj },
                      responseType: metaObj.responseType || metaObj.type || updated[lastIdx].responseType
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
  const markdownComponents = {
    p: ({ node, ...props }) => (
      <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="text-blue-400 hover:underline font-semibold break-all" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong
        className={`font-extrabold px-1.5 py-0.5 rounded-md text-xs inline-block my-0.5 shadow-2xs ${
          isDark
            ? "text-amber-300 bg-amber-500/20 border border-amber-500/30 font-extrabold"
            : "text-indigo-700 bg-indigo-100 border border-indigo-300 font-extrabold"
          }`}
        {...props}
      />
    ),
    em: ({ node, ...props }) => (
      <em className={`italic font-medium ${isDark ? "text-amber-200" : "text-indigo-600"}`} {...props} />
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
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc list-outside my-2 space-y-1 pl-4" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal list-outside my-2 space-y-1 pl-4" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="leading-relaxed marker:text-blue-500 font-normal pl-0.5" {...props} />
    ),
  };

  return (
    <div className="flex-1 flex h-full min-h-0 overflow-hidden relative">

      {/* THREADS HISTORY SIDEBAR */}
      <div className={`${showHistorySidebar ? "w-64" : "w-0 overflow-hidden"} ${isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-200 bg-slate-100/80"
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
                  className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${isActive
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
        <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${isDark ? "bg-slate-950/60 border-slate-800/60" : "bg-slate-50 border-slate-200"
          }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`md:hidden flex items-center justify-center p-1.5 border rounded-lg ${isDark ? "text-slate-300 hover:text-white bg-slate-900 border-slate-800" : "text-slate-700 hover:text-slate-900 bg-white border-slate-200 shadow-sm"
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
            {/* Mode Switcher: Text Chat vs Voice Avatar Assistant Mode (Avatar & Hybrid Bots) */}
            {isAvatarBot && (
              <div className={`flex items-center p-1 rounded-xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-200/70 border-slate-300"}`}>
                <button
                  onClick={() => toggleVoiceMode("TEXT_CHAT")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMode === "TEXT_CHAT"
                      ? "bg-blue-600 text-white shadow-sm"
                      : isDark
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FiMessageSquare className="text-xs" />
                  <span>Text Chat</span>
                </button>
                <button
                  onClick={() => toggleVoiceMode("VOICE_AVATAR")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMode === "VOICE_AVATAR"
                      ? "bg-emerald-500 text-slate-950 shadow-sm animate-pulse"
                      : isDark
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FiMic className="text-xs" />
                  <span>Voice Avatar</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* BOT-TYPE SPECIFIC CAPABILITY STATUS BAR */}
        {bot?.botType === "ACTION" && (
          <div className={`px-4 py-2 text-xs border-b flex items-center justify-between font-medium ${isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            <span className="flex items-center gap-1.5 font-bold">
              ⚡ Action Tool Calling Agent Active: 
              <span className="font-normal opacity-90">Executing configured REST APIs & Workflows ({bot.apiCount || bot.apis?.length || 0} APIs ready)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-500/20 border border-amber-500/30 font-bold">REST Tools</span>
          </div>
        )}

        {bot?.botType === "VOICE" && (
          <div className={`px-4 py-2 text-xs border-b flex items-center justify-between font-medium ${isDark ? "bg-purple-500/10 border-purple-500/20 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-800"}`}>
            <span className="flex items-center gap-1.5 font-bold">
              🎙️ Voice Agent Synthesis Active: 
              <span className="font-normal opacity-90">Voice Profile [{bot.voiceProfile?.voiceId || "default-en"}] with hands-free microphone input</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/20 border border-purple-500/30 font-bold">Audio Speech</span>
          </div>
        )}

        {bot?.botType === "CHAT" && (
          <div className={`px-4 py-2 text-xs border-b flex items-center justify-between font-medium ${isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
            <span className="flex items-center gap-1.5 font-bold">
              💬 Knowledge Chatbot Active: 
              <span className="font-normal opacity-90">Indexed RAG document search ({bot.fileCount || 0} Knowledge files attached)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-500/20 border border-blue-500/30 font-bold">RAG Search</span>
          </div>
        )}

        {/* HERO 3D DIGITAL HUMAN AVATAR VIEWPORT (VOICE AVATAR MODE) */}
        {isAvatarBot && activeMode === "VOICE_AVATAR" && (
          <div className={`flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col items-center justify-start gap-6 ${isDark ? "bg-slate-950/90" : "bg-slate-100"}`}>
            <div className="w-full max-w-2xl h-80 relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-slate-900/50">
              <AvatarContainer
                modelUrl={bot?.avatar3DModel || bot?.avatarConfig?.faceModelUrl}
                speechData={messages[messages.length - 1]?.speechData || messages[messages.length - 1]?.metadata?.speechData}
                avatarConfig={bot?.avatarConfig}
                isPlaying={voiceState === "SPEAKING"}
                avatarStateOverride={voiceState}
                onSpeechEnd={handleAvatarSpeechEnd}
              />
            </div>

            {/* Voice Assistant Interaction Console & Scrollable Subtitles */}
            <div className="w-full max-w-2xl flex flex-col justify-center items-center text-center space-y-4 p-2">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border ${
                  voiceState === "LISTENING"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                    : voiceState === "THINKING"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                    : voiceState === "SPEAKING"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                }`}>
                  {voiceState}
                </span>
                <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Real-Time AI Voice Assistant
                </span>
              </div>

              {micPermissionError ? (
                <p className="text-xs text-rose-400 font-semibold">{micPermissionError}</p>
              ) : (
                <div className={`w-full max-h-48 overflow-y-auto custom-scrollbar p-4 rounded-2xl border text-xs leading-relaxed transition shadow-lg text-left ${
                  isDark ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2.5 flex items-center justify-between">
                    <span>{sttInterimText ? "User Speech Transcript" : voiceState === "SPEAKING" ? "Avatar Subtitles" : "Live Subtitle Stream"}</span>
                    <span className="text-[9px] text-slate-500 normal-case italic font-normal">Scrollable subtitle log</span>
                  </p>

                  {sttInterimText ? (
                    <p className="italic font-sans text-sm font-medium text-emerald-400">"{sttInterimText}"</p>
                  ) : messages.length === 0 ? (
                    <p className="italic font-sans text-xs text-slate-400">Microphone is listening continuously. Speak anytime to converse with avatar...</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.slice(-4).map((m, idx) => (
                        <div key={m._id || idx} className={`p-2 rounded-lg text-xs ${
                          m.role === "user" ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" : isDark ? "bg-slate-800/60 text-slate-200" : "bg-slate-100 text-slate-800"
                        }`}>
                          <strong className="block text-[10px] uppercase text-slate-400 mb-0.5">{m.role === "user" ? "You" : bot.name}:</strong>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Console Action Buttons: Always-On Voice & Stop Assistant */}
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => toggleVoiceMode("VOICE_AVATAR")}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all shadow-xl cursor-pointer ${
                    isVoiceModeActive
                      ? "bg-emerald-500 text-slate-950 shadow-emerald-500/40 animate-pulse ring-4 ring-emerald-500/20"
                      : "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/40"
                  }`}
                  title={isVoiceModeActive ? "Click to Stop / Pause Voice Assistant" : "Click to Start Voice Assistant"}
                >
                  {isVoiceModeActive ? <FiStopCircle className="text-2xl" /> : <FiMic className="text-xl" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-full border text-sm font-bold transition cursor-pointer shadow-md ${
                    isMuted
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                      : isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                      : "bg-white border-slate-300 text-slate-700 hover:text-slate-900"
                  }`}
                  title={isMuted ? "Unmute avatar voice" : "Mute avatar voice"}
                >
                  {isMuted ? <FiVolumeX className="text-lg" /> : <FiVolume2 className="text-lg" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES SCROLL AREA (TEXT CHAT MODE ONLY) */}
        {activeMode === "TEXT_CHAT" && (
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

                    {/* DIRECT MARKDOWN RENDERER */}
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
                        <>
                          {(isAvatarBot && (msg.speechData || msg.metadata?.speechData)) && (
                            <div className="mb-3">
                              <VisemeAvatarPlayer
                                speechData={msg.speechData || msg.metadata?.speechData}
                                onSpeechEnd={handleAvatarSpeechEnd}
                                isExternalMuted={isMuted}
                                avatarConfig={msg.avatarConfig || msg.metadata?.avatarConfig || {
                                  ...bot?.avatarConfig,
                                  avatarProvider: bot?.avatarProvider || bot?.avatarConfig?.avatarProvider || (bot?.avatar3DModel ? "THREE_3D" : "LOCAL_VISEME"),
                                  faceModelUrl: bot?.avatar3DModel || bot?.avatarConfig?.faceModelUrl,
                                  avatar3DModel: bot?.avatar3DModel || bot?.avatarConfig?.avatar3DModel,
                                  faceImageUrl: bot?.avatarImage || bot?.avatarConfig?.faceImageUrl,
                                  faceVideoUrl: bot?.avatarVideo || bot?.avatarConfig?.faceVideoUrl
                                }}
                              />
                            </div>
                          )}
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {formatMarkdownBreaks(msg.content) || "Thinking..."}
                          </ReactMarkdown>
                        </>
                      )}

                      {/* Source Citations Toggle Button */}
                      {msg.metadata?.sources && msg.metadata.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/40">
                          <button
                            onClick={() => setOpenSourcesIdx(isSourcesOpen ? null : index)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
                          >
                            <FiFileText />
                            <span>{msg.metadata.sources.length} Verified Sources</span>
                            {isSourcesOpen ? <FiChevronUp /> : <FiChevronDown />}
                          </button>

                          {isSourcesOpen && (
                            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-blue-500/40 text-[11px]">
                              {msg.metadata.sources.map((s, sIdx) => (
                                <div key={sIdx} className={`p-2 rounded-lg ${isDark ? "bg-slate-900/60 border border-slate-800/60" : "bg-white border border-slate-200"
                                  }`}>
                                  <p className="font-bold text-blue-500">{s.fileName}</p>
                                  <p className={`mt-0.5 line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{s.snippet}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
        )}

        {/* STICKY INPUT FORM BAR (TEXT CHAT MODE ONLY) */}
        {activeMode === "TEXT_CHAT" && (
          <div className={`p-4 border-t shrink-0 ${isDark ? "border-slate-800/80 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
          {/* Live Voice Mode Speech-to-Text Banner Indicator */}
          {isVoiceModeActive && activeMode === "TEXT_CHAT" && (
            <div className="max-w-4xl mx-auto mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {voiceState === "LISTENING" ? "Listening..." : voiceState === "THINKING" ? "Thinking..." : "Active"}
                </span>
                <span className="italic text-slate-300 font-mono text-[11px] truncate max-w-xs md:max-w-md">
                  {sttInterimText ? `"${sttInterimText}"` : "Speak naturally into your microphone..."}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleVoiceMode}
                className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-bold px-2 py-0.5 rounded-md transition"
              >
                Exit Voice Mode
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceMode}
              className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                isVoiceModeActive
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30 animate-pulse"
                  : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  : "bg-white border-slate-300 text-slate-600 hover:text-slate-900 shadow-xs"
              }`}
              title="Toggle Live Hands-Free Voice Mode"
            >
              {isVoiceModeActive ? <FiMicOff /> : <FiMic />}
            </button>

            <input
              type="text"
              placeholder={`Ask ${bot.name} anything...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-xs focus:outline-none transition ${isDark
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
        )}
      </div>
    </div>
  );
};

export default BotChatTab;
