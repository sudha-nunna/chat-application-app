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
import { TbRobotFace } from "react-icons/tb";
import { NobackEndCall, NobackEndCallObj, backEndCallObjDel } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import { useSearchParams } from "react-router-dom";
import ClusterStatusWidget from "../global/ClusterStatusWidget";
import { formatMarkdownBreaks } from "../../services/externalBotService";
import VisemeAvatarPlayer from "../global/VisemeAvatarPlayer";
import VoiceConversationManager from "../avatar/VoiceConversationManager";
import AvatarContainer from "../avatar/AvatarContainer";

const BotChatTab = ({ bot }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(searchParams.get("convId") || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [openSourcesIdx, setOpenSourcesIdx] = useState(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { isDark } = useTheme();

  const urlConvId = searchParams.get("convId");

  useEffect(() => {
    if (urlConvId && urlConvId !== activeConvId) {
      setActiveConvId(urlConvId);
    }
  }, [urlConvId]);

  useEffect(() => {
    if (activeConvId && activeConvId !== urlConvId) {
      setSearchParams({ convId: activeConvId }, { replace: true });
    }
  }, [activeConvId]);

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
      if (selectLatest && list.length > 0 && !activeConvId) {
        setActiveConvId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to load bot conversations:", err);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      setIsFetchingMessages(true);
      setMessages([]);
      const res = await NobackEndCall(`/bots/${bot._id}/conversations/${convId}/messages`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setMessages(list);
    } catch (err) {
      console.error("Failed to load bot messages:", err);
    } finally {
      setIsFetchingMessages(false);
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
      <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] text-sm" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="text-text-primary hover:underline font-semibold break-all" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong
        className={`font-extrabold px-1.5 py-0.5 rounded-md text-xs inline-block my-0.5 shadow-2xs ${
          "text-text-primary bg-surface-secondary border border-border-primary font-extrabold dark:text-amber-600 dark:bg-amber-900/20 dark:border dark:border-amber-800/30 dark:font-extrabold"
          }`}
        {...props}
      />
    ),
    em: ({ node, ...props }) => (
      <em className={`italic font-medium ${"text-text-primary dark:text-amber-200"}`} {...props} />
    ),
    table: ({ node, ...props }) => (
      <div className={`w-full max-w-full overflow-x-auto my-2.5 rounded-lg border custom-scrollbar ${"border-border-primary dark:border-border-primary"}`}>
        <table className="w-full border-collapse text-left text-xs min-w-full table-auto border-spacing-0" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className={`uppercase text-[10px] tracking-wider border-b ${"bg-surface-secondary text-text-primary border-border-primary dark:bg-interactive-active dark:text-text-muted dark:border-border-primary"}`} {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="px-3.5 py-2.5 font-semibold select-none whitespace-normal break-words align-top min-w-[120px]" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className={`px-3.5 py-2.5 border-b align-top break-words [overflow-wrap:anywhere] min-w-[120px] ${"text-text-primary border-border-primary dark:text-text-muted dark:border-border-primary/50"}`} {...props} />
    ),
    tr: ({ node, ...props }) => (
      <tr className={`transition-colors last:border-none ${"hover:bg-surface-secondary/50 even:bg-interactive-base dark:hover:bg-interactive-active/30 dark:even:bg-interactive-active/40"}`} {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc list-outside my-2 space-y-1 pl-4" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal list-outside my-2 space-y-1 pl-4" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="leading-relaxed marker:text-text-primary font-normal pl-0.5" {...props} />
    ),
  };

  return (
    <div className="flex-1 flex h-full min-h-0 overflow-hidden relative">

      {/* MAIN CHAT AREA */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Fixed Controls Header */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${"bg-interactive-base border-border-primary dark:bg-interactive-base/60 dark:border-border-primary/60"
          }`}>
          {/* <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`md:hidden flex items-center justify-center p-1.5 border rounded-lg ${"text-text-primary hover:text-text-primary bg-white border-border-primary shadow-sm dark:text-text-muted dark:hover:text-white dark:bg-interactive-active dark:border-border-primary"
                }`}
              title="Toggle Threads Menu"
            >
              <FiMenu className="text-base" />
            </button>
          </div> */}

          <div className="flex items-center gap-3 relative">
            {/* Mode Switcher: Text Chat vs Voice Avatar Assistant Mode (Avatar & Hybrid Bots) */}
            {isAvatarBot && (
              <div className={`flex items-center p-1 rounded-xl border ${"bg-surface-secondary/70 border-border-primary dark:bg-interactive-active dark:border-border-primary"}`}>
                <button
                  onClick={() => toggleVoiceMode("TEXT_CHAT")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMode === "TEXT_CHAT"
                      ? "bg-interactive-base text-text-primary dark:text-white shadow-sm"
                      : "text-text-primary hover:text-text-primary dark:text-text-primary dark:hover:text-text-muted"
                  }`}
                >
                  <FiMessageSquare className="text-xs" />
                  <span>Text Chat</span>
                </button>
                <button
                  onClick={() => toggleVoiceMode("VOICE_AVATAR")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMode === "VOICE_AVATAR"
                      ? "bg-interactive-base text-text-primary shadow-sm animate-pulse"
                      : "text-text-primary hover:text-text-primary dark:text-text-primary dark:hover:text-text-muted"
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
          <div className={`px-4 py-2 text-xs border-b flex items-center justify-between font-medium ${"bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/10 dark:border-amber-800/20 dark:text-amber-600"}`}>
            <span className="flex items-center gap-1.5 font-bold">
              ⚡ Action Tool Calling Agent Active: 
              <span className="font-normal opacity-90">Executing configured REST APIs & Workflows ({bot.apiCount || bot.apis?.length || 0} APIs ready)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-900/20 border border-amber-800/30 font-bold">REST Tools</span>
          </div>
        )}

        {bot?.botType === "VOICE" && (
          <div className={`px-4 py-2 text-xs border-b flex items-center justify-between font-medium ${"bg-interactive-base border-border-primary text-text-primary dark:bg-interactive-base/10 dark:border-border-primary/20 dark:text-text-muted"}`}>
            <span className="flex items-center gap-1.5 font-bold">
              🎙️ Voice Agent Synthesis Active: 
              <span className="font-normal opacity-90">Voice Profile [{bot.voiceProfile?.voiceId || "default-en"}] with hands-free microphone input</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-interactive-base/20 border border-border-primary/30 font-bold">Audio Speech</span>
          </div>
        )}

        {bot?.botType === "CHAT" && (
          <div className={`px-4 py-2 text-xs border-b flex items-center justify-between font-medium ${"bg-interactive-base border-border-primary text-text-primary dark:bg-interactive-base/10 dark:border-border-primary/20 dark:text-text-muted"}`}>
            <span className="flex items-center gap-1.5 font-bold">
              💬 Knowledge Chatbot Active: 
              <span className="font-normal opacity-90">Indexed RAG document search ({bot.fileCount || 0} Knowledge files attached)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-interactive-base/20 border border-border-primary/30 font-bold">RAG Search</span>
          </div>
        )}

        {/* HERO 3D DIGITAL HUMAN AVATAR VIEWPORT (VOICE AVATAR MODE) */}
        {isAvatarBot && activeMode === "VOICE_AVATAR" && (
          <div className={`flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col items-center justify-start gap-6 ${"bg-surface-secondary dark:bg-interactive-base/90"}`}>
            <div className="w-full max-w-2xl h-80 relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-interactive-active/50">
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
                    ? "bg-interactive-base/20 text-text-primary border-border-primary/40 animate-pulse"
                    : voiceState === "THINKING"
                    ? "bg-amber-900/20 text-amber-600 border-amber-800/40 animate-pulse"
                    : voiceState === "SPEAKING"
                    ? "bg-interactive-base/20 text-text-primary border-border-primary/40 animate-pulse"
                    : "bg-interactive-base/20 text-text-primary border-border-primary/40"
                }`}>
                  {voiceState}
                </span>
                <span className={`text-xs ${"text-text-primary dark:text-text-primary"}`}>
                  Real-Time AI Voice Assistant
                </span>
              </div>

              {micPermissionError ? (
                <p className="text-xs text-text-primary font-semibold">{micPermissionError}</p>
              ) : (
                <div className={`w-full max-h-48 overflow-y-auto custom-scrollbar p-4 rounded-2xl border text-xs leading-relaxed transition shadow-lg text-left ${
                  "bg-white border-border-primary text-text-primary dark:bg-interactive-active/90 dark:border-border-primary dark:text-text-muted"
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary mb-2.5 flex items-center justify-between">
                    <span>{sttInterimText ? "User Speech Transcript" : voiceState === "SPEAKING" ? "Avatar Subtitles" : "Live Subtitle Stream"}</span>
                    <span className="text-[9px] text-text-primary normal-case italic font-normal">Scrollable subtitle log</span>
                  </p>

                  {sttInterimText ? (
                    <p className="italic font-sans text-sm font-medium text-text-primary">"{sttInterimText}"</p>
                  ) : messages.length === 0 ? (
                    <p className="italic font-sans text-xs text-text-primary">Microphone is listening continuously. Speak anytime to converse with avatar...</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.slice(-4).map((m, idx) => (
                        <div key={m._id || idx} className={`p-2 rounded-lg text-xs ${
                          m.role === "user" ? "bg-interactive-base/10 text-text-primary border border-border-primary/20" : "bg-surface-secondary text-text-primary dark:bg-interactive-active/60 dark:text-text-muted"
                        }`}>
                          <strong className="block text-[10px] uppercase text-text-primary mb-0.5">{m.role === "user" ? "You" : bot.name}:</strong>
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
                      ? "bg-interactive-base text-text-primary shadow-black/10/40 animate-pulse ring-4 ring-border-focus/20"
                      : "bg-interactive-base text-text-primary dark:text-white hover:bg-interactive-base shadow-black/10/40"
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
                      ? "bg-interactive-base/20 border-border-primary/40 text-text-primary"
                      : "bg-white border-border-primary text-text-primary hover:text-text-primary dark:bg-interactive-active dark:border-border-primary dark:text-text-muted dark:hover:text-white"
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
          className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar flex flex-col bg-white dark:bg-interactive-active/40"
        >
          <div className="w-full flex-1 max-w-3xl mx-auto px-3 md:px-6 py-6 flex flex-col space-y-6">
          {isFetchingMessages ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white animate-spin mb-3 mx-auto"></div>
              <p className="text-xs text-text-primary">Loading chat...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full text-center p-8 ${"text-text-primary dark:text-text-primary"}`}>
              <div className="w-14 h-14 rounded-2xl bg-interactive-base/10 border border-border-primary/20 flex items-center justify-center text-text-primary text-2xl mb-3">
                <FiCpu />
              </div>
              <h3 className={`text-base font-bold ${"text-text-primary dark:text-text-muted"}`}>Chat with {bot.name}</h3>
              <p className={`text-xs max-w-md mt-1 ${"text-text-primary dark:text-text-primary"}`}>
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
                  className={`flex gap-1.5 lg:gap-3 items-start ${isUser ? "ml-auto flex-row-reverse max-w-[75%]" : "mr-auto max-w-[85%] md:max-w-[80%]"} min-w-0`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-6 lg:w-8 h-6 lg:h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isUser
                      ? "bg-interactive-base text-text-primary dark:text-white shadow-md shadow-black/10/20"
                      : "bg-surface-secondary text-text-primary border border-border-primary dark:bg-interactive-base/20 dark:text-text-primary dark:border dark:border-border-primary/30"
                      }`}
                  >
                    {isUser ? <FiUser /> :  <TbRobotFace className=" text-sm lg:text-base" />}
                  </div>

                  {/* Bubble Container */}
                  <div className={`space-y-1.5 min-w-0 max-w-full flex flex-col ${isUser ? "items-end" : "items-start"}`}>

                    {/* DIRECT MARKDOWN RENDERER */}
                    <div
                      className={`min-w-0 max-w-full p-3.5 px-4 rounded-2xl text-xs leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] shadow-md ${isUser
                        ? "bg-interactive-base text-text-primary dark:text-white font-medium rounded-tr-none shadow-black/10/20"
                        : "bg-surface-secondary border border-border-primary text-text-primary rounded-tl-none dark:bg-interactive-base dark:border dark:border-border-primary dark:text-text-muted dark:rounded-tl-none"
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
                        <div className="mt-2.5 pt-2 border-t border-border-primary/40">
                          <button
                            onClick={() => setOpenSourcesIdx(isSourcesOpen ? null : index)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary hover:text-text-muted transition"
                          >
                            <FiFileText />
                            <span>{msg.metadata.sources.length} Verified Sources</span>
                            {isSourcesOpen ? <FiChevronUp /> : <FiChevronDown />}
                          </button>

                          {isSourcesOpen && (
                            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-border-primary/40 text-[11px]">
                              {msg.metadata.sources.map((s, sIdx) => (
                                <div key={sIdx} className={`p-2 rounded-lg ${"bg-white border border-border-primary dark:bg-interactive-active/60 dark:border dark:border-border-primary/60"
                                  }`}>
                                  <p className="font-bold text-text-primary">{s.fileName}</p>
                                  <p className={`mt-0.5 line-clamp-2 ${"text-text-primary dark:text-text-primary"}`}>{s.snippet}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* ChatGPT-Style Pause / Retry Interactive Warning Banner */}
                      {!isUser && msg.content && typeof msg.content === "string" && msg.content.includes("Stream paused due to higher-priority request") && (
                        <div className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${"bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/10 dark:border-amber-800/30 dark:text-amber-600"
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
                            className="px-3 py-1.5 bg-amber-900 hover:bg-amber-600 text-text-primary font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 cursor-pointer"
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
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-lg px-2.5 py-1 transition ${"text-text-primary hover:text-text-primary bg-surface-secondary border-border-primary dark:text-text-primary dark:hover:text-text-primary dark:bg-interactive-base dark:border-border-primary"
                            }`}
                        >
                          <FiFileText className="text-text-primary" />
                          <span>View Sources</span>
                          {isSourcesOpen ? <FiChevronUp /> : <FiChevronDown />}
                        </button>

                        {isSourcesOpen && (
                          <div className={`mt-2 p-3 border rounded-xl space-y-2 max-w-full overflow-hidden ${"bg-surface-secondary border-border-primary dark:bg-interactive-base dark:border-border-primary"
                            }`}>
                            {msg.sources.map((s, sIdx) => (
                              <div key={sIdx} className={`p-2 rounded-lg text-[10px] ${"bg-white border border-border-primary dark:bg-interactive-active"
                                }`}>
                                <p className="font-bold text-text-primary">{s.fileName}</p>
                                <p className={`mt-0.5 line-clamp-2 ${"text-text-primary dark:text-text-primary"}`}>{s.snippet}</p>
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
            <div className={`flex items-center gap-2 text-xs p-2 italic ${"text-text-primary dark:text-text-primary"}`}>
              <span className="w-2 h-2 rounded-full bg-amber-800 animate-pulse" />
              <span>Retrieving chunks & generating grounded response...</span>
            </div>
          )}
          </div>
        </div>
        )}

        {/* STICKY INPUT FORM BAR (TEXT CHAT MODE ONLY) */}
        {activeMode === "TEXT_CHAT" && (
          <div className={`p-4 border-t shrink-0 ${"border-border-primary bg-interactive-base dark:border-border-primary/80 dark:bg-interactive-base"}`}>
          {/* Live Voice Mode Speech-to-Text Banner Indicator */}
          {isVoiceModeActive && activeMode === "TEXT_CHAT" && (
            <div className="max-w-3xl mx-auto mb-3 p-2.5 rounded-xl bg-interactive-base/10 border border-border-primary/30 flex items-center justify-between text-xs text-text-primary animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-interactive-base animate-ping" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {voiceState === "LISTENING" ? "Listening..." : voiceState === "THINKING" ? "Thinking..." : "Active"}
                </span>
                <span className="italic text-text-muted font-mono text-[11px] truncate max-w-xs md:max-w-md">
                  {sttInterimText ? `"${sttInterimText}"` : "Speak naturally into your microphone..."}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleVoiceMode}
                className="text-[10px] bg-interactive-base/20 hover:bg-interactive-base/40 text-text-muted font-bold px-2 py-0.5 rounded-md transition"
              >
                Exit Voice Mode
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
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
              placeholder={`Ask ${bot.name} anything...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-xs focus:outline-none transition ${"bg-white border border-border-primary text-text-primary placeholder:text-text-muted focus:border-border-focus dark:bg-interactive-active dark:border dark:border-border-primary dark:text-text-muted dark:placeholder:text-text-muted dark:focus:border-border-focus"
                }`}
            />

            {loading ? (
              <button
                type="button"
                onClick={handleStopBotGeneration}
                className="px-4 py-2.5 bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 cursor-pointer"
                title="Stop Streaming Generation"
              >
                <FiStopCircle className="text-sm" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-accent-primary hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shrink-0 shadow-md shadow-black/10/20 active:scale-95 cursor-pointer"
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
