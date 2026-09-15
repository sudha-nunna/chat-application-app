import { useState, useEffect, useRef } from "react";
import { FiMenu, FiMessageSquare, FiCode, FiLayout, FiBookOpen, FiMail, FiServer, FiCpu, FiCheckCircle, FiX, FiActivity, FiVolume2, FiVolumeX, FiStopCircle, FiImage, FiArrowDown, FiArrowUp, FiFileText, FiShare2, FiUpload, FiSun, FiMoon, FiEye } from "react-icons/fi";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ClusterStatusWidget from "./ClusterStatusWidget";
import ShareModal from "./ShareModal";
import ArtifactPreviewPanel from "../artifacts/ArtifactPreviewPanel";
import { extractPreviewableCode } from "../../utils/codeExportUtils";
import { useTheme } from "../../context/ThemeContext";
import { useTanStackQueryClient, useTanStackData } from "../../hooks/useTanStackData";
import { NobackEndCall } from "../../services/authService";
import { speakText, stopSpeech, cleanMarkdownForSpeech } from "../../utils/speechUtils";
const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated, onToggleMobileSidebar }) => {
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useTanStackQueryClient();
  const authToken = localStorage.getItem("token");
  const { data: chats = [] } = useTanStackData(
    ["chats"],
    async () => {
      if (!authToken) return [];
      const res = await NobackEndCall("/chats");
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!authToken }
  );
  const currentChat = chats.find((c) => c._id === currentChatId);
  const chatTitle = currentChat ? currentChat.title : "New conversation";
  const [messages, setMessages] = useState([]);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollToUser, setShowScrollToUser] = useState(false);
  const latestUserMsgRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isVoicePaused, setIsVoicePaused] = useState(true);
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isDevModeActive, setIsDevModeActive] = useState(false);
  const isVoicePausedRef = useRef(true);
  const isAbortedRef = useRef(false);
  const abortControllerRef = useRef(null);
  const [activeSpeakingIndex, setActiveSpeakingIndex] = useState(null);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [autoListenTrigger, setAutoListenTrigger] = useState(0);
  const pendingVoiceAutoSpeakRef = useRef(false);
  const isVoiceConversationModeRef = useRef(false);
  const streamFollowUpsRef = useRef([]);
  const lastArtifactUpdateRef = useRef(0);
  const isExplicitWebPromptRef = useRef(false);
  const originalContentBeforeEditRef = useRef(null);
  const originalMessageIdRef = useRef(null);
  const streamingSpeechQueueRef = useRef([]);
  const streamingSentenceBufferRef = useRef("");
  const isSpeakingStreamingChunkRef = useRef(false);
  const inCodeBlockRef = useRef(false);
  const isStreamingSpeechActiveRef = useRef(false);
  const triggerMicAutoListen = () => {
    setTimeout(() => {
      setAutoListenTrigger((prev) => prev + 1);
    }, 450);
  };
  const processStreamingSpeechQueue = () => {
    if (!isStreamingSpeechActiveRef.current) return;
    if (isSpeakingStreamingChunkRef.current) return;
    if (streamingSpeechQueueRef.current.length === 0) {
      if (!isGeneratingRef.current) {
        isStreamingSpeechActiveRef.current = false;
        setActiveSpeakingIndex(null);
        setCurrentSubtitle("");
        if (isVoiceConversationModeRef.current) {
          isVoiceConversationModeRef.current = false;
          triggerMicAutoListen();
        }
      }
      return;
    }
    const nextSentence = streamingSpeechQueueRef.current.shift();
    if (!nextSentence || !nextSentence.trim()) {
      processStreamingSpeechQueue();
      return;
    }
    isSpeakingStreamingChunkRef.current = true;
    speakText(nextSentence, {
      onWordBoundary: (chunk) => {
        if (isStreamingSpeechActiveRef.current) {
          setCurrentSubtitle(chunk);
        }
      },
      onEnd: () => {
        isSpeakingStreamingChunkRef.current = false;
        processStreamingSpeechQueue();
      },
      onError: () => {
        isSpeakingStreamingChunkRef.current = false;
        processStreamingSpeechQueue();
      }
    });
  };
  const handleIncomingStreamSpeech = (chunk) => {
    if (!pendingVoiceAutoSpeakRef.current && !isStreamingSpeechActiveRef.current) return;
    if (chunk.includes("```") || chunk.includes("~~~")) {
      const fences = (chunk.match(/```|~~~/g) || []).length;
      if (fences % 2 === 1) {
        inCodeBlockRef.current = !inCodeBlockRef.current;
      }
    }
    if (inCodeBlockRef.current) return;
    streamingSentenceBufferRef.current += chunk;
    const sentenceEndRegex = /([.!?](\s+|$)|[\r\n]+)/;
    let match = sentenceEndRegex.exec(streamingSentenceBufferRef.current);
    while (match) {
      const splitIndex = match.index + match[0].length;
      const completedSentence = streamingSentenceBufferRef.current.slice(0, splitIndex).trim();
      streamingSentenceBufferRef.current = streamingSentenceBufferRef.current.slice(splitIndex);
      if (completedSentence) {
        const cleaned = cleanMarkdownForSpeech(completedSentence);
        if (cleaned) {
          isStreamingSpeechActiveRef.current = true;
          setActiveSpeakingIndex(-1);
          streamingSpeechQueueRef.current.push(cleaned);
          if (!isSpeakingStreamingChunkRef.current) {
            processStreamingSpeechQueue();
          }
        }
      }
      match = sentenceEndRegex.exec(streamingSentenceBufferRef.current);
    }
    const words = streamingSentenceBufferRef.current.trim().split(/\s+/);
    if (words.length >= 12) {
      const chunkText = words.join(" ");
      streamingSentenceBufferRef.current = "";
      const cleaned = cleanMarkdownForSpeech(chunkText);
      if (cleaned) {
        isStreamingSpeechActiveRef.current = true;
        setActiveSpeakingIndex(-1);
        streamingSpeechQueueRef.current.push(cleaned);
        if (!isSpeakingStreamingChunkRef.current) {
          processStreamingSpeechQueue();
        }
      }
    }
  };
  const handleStopSpeaking = () => {
    isVoiceConversationModeRef.current = false;
    isStreamingSpeechActiveRef.current = false;
    pendingVoiceAutoSpeakRef.current = false;
    streamingSpeechQueueRef.current = [];
    streamingSentenceBufferRef.current = "";
    isSpeakingStreamingChunkRef.current = false;
    inCodeBlockRef.current = false;
    stopSpeech();
    setActiveSpeakingIndex(null);
    setCurrentSubtitle("");
  };
  const handleToggleSpeak = (index, rawContent) => {
    if (activeSpeakingIndex === index) {
      handleStopSpeaking();
    } else {
      stopSpeech();
      setActiveSpeakingIndex(index);
      speakText(rawContent, {
        onWordBoundary: (chunk) => setCurrentSubtitle(chunk),
        onEnd: () => {
          setActiveSpeakingIndex(null);
          setCurrentSubtitle("");
        },
        onError: () => {
          setActiveSpeakingIndex(null);
          setCurrentSubtitle("");
        }
      });
    }
  };
  useEffect(() => {
    return () => {
      handleStopSpeaking();
    };
  }, []);
  const handleShare = () => {
    setIsShareModalOpen(true);
  };
  useEffect(() => {
    const handleOpenArtifact = (e) => {
      if (e.detail?.code) {
        setActiveArtifact({
          ...e.detail,
          code: e.detail.code,
          language: e.detail.language || "html",
          title: e.detail.title || chatTitle || "Interactive Preview"
        });
        setIsArtifactOpen(true);
      }
    };
    window.addEventListener("open-artifact", handleOpenArtifact);
    return () => window.removeEventListener("open-artifact", handleOpenArtifact);
  }, [chatTitle]);
  const lastParsedContentRef = useRef("");
  useEffect(() => {
    setIsArtifactOpen(false);
    lastParsedContentRef.current = "";
  }, [currentChatId]);
  useEffect(() => {
    const isArtifactRequested = isDevModeActive || isExplicitWebPromptRef.current;
    if (streamingReply) {
      if (streamingReply.includes("```") && isArtifactRequested) {
        const now = Date.now();
        if (now - lastArtifactUpdateRef.current > 350) {
          lastArtifactUpdateRef.current = now;
          const parsed = extractPreviewableCode(streamingReply);
          if (parsed) {
            setActiveArtifact(parsed);
            if (window.innerWidth >= 768) {
              setIsArtifactOpen(true);
            }
          }
        }
      }
      return;
    }
    if (Array.isArray(messages) && messages.length > 0) {
      if (isGeneratingRef.current && isArtifactRequested) {
        return;
      }
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant" && messages[i].content) {
          const content = messages[i].content;
          const parsed = extractPreviewableCode(content);
          if (parsed) {
            if (lastParsedContentRef.current !== content) {
              lastParsedContentRef.current = content;
              setActiveArtifact(parsed);
            }
            break;
          }
        }
      }
    }
  }, [messages, streamingReply]);
  const handleToggleDevMode = (newState) => {
    setIsDevModeActive((prev) => {
      const next = typeof newState === "boolean" ? newState : !prev;
      if (next) {
        setIsWebSearchActive(false);
      }
      return next;
    });
  };
  const handleToggleWebSearch = (newState) => {
    setIsWebSearchActive((prev) => {
      const next = typeof newState === "boolean" ? newState : !prev;
      if (next) {
        handleToggleDevMode(false);
      }
      return next;
    });
  };
  const handleCloseArtifact = () => {
    setIsArtifactOpen(false);
    window.dispatchEvent(new CustomEvent("setSidebarCollapsed", { detail: { collapsed: false } }));
  };
  useEffect(() => {
    if (isArtifactOpen) {
      window.dispatchEvent(new CustomEvent("setSidebarCollapsed", { detail: { collapsed: true } }));
    } else {
      window.dispatchEvent(new CustomEvent("setSidebarCollapsed", { detail: { collapsed: false } }));
    }
  }, [isArtifactOpen]);
  useEffect(() => {
    if (isGeneratingRef.current && (streamingChatIdRef.current === currentChatId || !currentChatId)) {
      return;
    }
    setActiveArtifact(null);
    setIsArtifactOpen(false);
  }, [currentChatId]);
  const [clusterNodes, setClusterNodes] = useState([]);
  const [isClusterLoading, setIsClusterLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const statusModalRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabledRef = useRef(true);
  const currentStreamingTextRef = useRef("");
  const isGeneratingRef = useRef(false);
  const streamingChatIdRef = useRef(null);
  const prevChatIdRef = useRef(currentChatId);
  const lastUsedModelRef = useRef(null);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [activeSearchSources, setActiveSearchSources] = useState([]);
  const activeSearchSourcesRef = useRef([]);
  const [isSearchGuidanceActive, setIsSearchGuidanceActive] = useState(false);
  const isSearchGuidanceRef = useRef(false);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentSentenceBufferRef = useRef("");
  const activeChatIdRef = useRef(currentChatId);
  useEffect(() => {
    activeChatIdRef.current = currentChatId;
  }, [currentChatId]);
  useEffect(() => {
    const handleNewChatReset = () => {
      activeChatIdRef.current = null;
      if (isGeneratingRef.current) {
        handleStopGeneration();
      }
      setMessages([]);
      setStreamingReply("");
      currentStreamingTextRef.current = "";
      setIsSearching(false);
      setIsBotTyping(false);
      setIsFetchingMessages(false);
      clearAudioPipeline();
      setActiveArtifact(null);
      setIsArtifactOpen(false);
    };
    window.addEventListener("new-chat-action", handleNewChatReset);
    return () => {
      window.removeEventListener("new-chat-action", handleNewChatReset);
    };
  }, []);
  const tokenQueueRef = useRef([]);
  const streamNetworkDoneRef = useRef(false);
  const rafHandleRef = useRef(null);
  const streamCompleteCbRef = useRef(null);
  const stopDrainLoop = () => {
    if (rafHandleRef.current) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }
  };
  const startDrainLoop = () => {
    stopDrainLoop();
    streamNetworkDoneRef.current = false;
    tokenQueueRef.current = [];
    let lastFlushTime = 0;
    const tick = (now) => {
      if (isAbortedRef.current) {
        stopDrainLoop();
        return;
      }
      const elapsed = now - lastFlushTime;
      const flushInterval = 12;
      if (elapsed >= flushInterval || streamNetworkDoneRef.current) {
        const qLen = tokenQueueRef.current.length;
        if (qLen > 0) {
          let step;
          if (streamNetworkDoneRef.current) {
            step = qLen;
          } else if (qLen > 40) {
            step = Math.ceil(qLen / 1.5);
          } else if (qLen > 15) {
            step = Math.ceil(qLen / 2);
          } else if (qLen > 5) {
            step = 6;
          } else {
            step = 4;
          }
          const words = tokenQueueRef.current.splice(0, step).join("");
          currentStreamingTextRef.current += words;
          setStreamingReply(currentStreamingTextRef.current);
          lastFlushTime = now;
        } else if (streamNetworkDoneRef.current) {
          stopDrainLoop();
          if (typeof streamCompleteCbRef.current === "function") {
            streamCompleteCbRef.current(currentStreamingTextRef.current);
            streamCompleteCbRef.current = null;
          }
          return;
        }
      }
      rafHandleRef.current = requestAnimationFrame(tick);
    };
    rafHandleRef.current = requestAnimationFrame(tick);
  };
  const pushToQueue = (text) => {
    if (!text) return;
    const tokens = text.match(/\S+\s*|\s+/g) || [text];
    tokenQueueRef.current.push(...tokens);
  };
  useEffect(() => {
    if (isGeneratingRef.current && (streamingChatIdRef.current === currentChatId || !currentChatId)) {
      prevChatIdRef.current = currentChatId;
      return;
    }
    if (isGeneratingRef.current && prevChatIdRef.current !== currentChatId) {
      handleStopGeneration(prevChatIdRef.current || streamingChatIdRef.current);
    }
    prevChatIdRef.current = currentChatId;
    if (currentChatId) {
      loadSavedMessages();
    } else {
      setMessages([]);
      setShowScrollBottom(false);
      setShowScrollToUser(false);
      setStreamingReply("");
      currentStreamingTextRef.current = "";
      setIsSearching(false);
      setIsBotTyping(false);
      clearAudioPipeline();
    }
  }, [currentChatId]);
  const scrollToBottom = (force = true) => {
    if (messagesContainerRef.current) {
      if (force) {
        isAutoScrollEnabledRef.current = true;
        setShowScrollBottom(false);
        setShowScrollToUser(false);
      }
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };
  const scrollToLatestUserMessage = () => {
    if (latestUserMsgRef.current) {
      isAutoScrollEnabledRef.current = false;
      setShowScrollToUser(false);
      latestUserMsgRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  useEffect(() => {
    if (isAutoScrollEnabledRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setShowScrollBottom(false);
      setShowScrollToUser(false);
    }
  }, [messages, streamingReply, isSearching, isBotTyping]);
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= 80;
    setShowScrollBottom(distanceFromBottom > 100);
    if (!isAtBottom && distanceFromBottom > 100 && latestUserMsgRef.current && messagesContainerRef.current) {
      const containerRect = messagesContainerRef.current.getBoundingClientRect();
      const userMsgRect = latestUserMsgRef.current.getBoundingClientRect();
      setShowScrollToUser(userMsgRect.bottom < containerRect.top + 30);
    } else {
      setShowScrollToUser(false);
    }
    isAutoScrollEnabledRef.current = isAtBottom;
  };
  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      isAutoScrollEnabledRef.current = false;
      setShowScrollBottom(true);
    }
  };
  const clearAudioPipeline = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    currentSentenceBufferRef.current = "";
    setIsAudioActive(false);
    handleStopSpeaking();
  };
  const toggleVoiceOver = () => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    currentSentenceBufferRef.current = "";
    setIsAudioActive(false);
    if (isVoicePaused) {
      setIsVoicePaused(false);
      isVoicePausedRef.current = false;
    } else {
      setIsVoicePaused(true);
      isVoicePausedRef.current = true;
    }
  };
  const handleStopGeneration = (targetChatOverride = null) => {
    isGeneratingRef.current = false;
    isAbortedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopDrainLoop();
    tokenQueueRef.current = [];
    streamNetworkDoneRef.current = false;
    streamCompleteCbRef.current = null;
    const targetChat = targetChatOverride || streamingChatIdRef.current || (currentChatId && currentChatId !== "new" ? currentChatId : null);
    const partialText = currentStreamingTextRef.current;
    if (partialText && partialText.trim()) {
      if (!targetChatOverride || targetChatOverride === currentChatId) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: partialText, isStoppedMidway: true }
        ]);
      }
      try {
        const token = localStorage.getItem("token");
        if (targetChat && token) {
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/chats/${targetChat}/messages/stop`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ content: partialText })
          }).catch((e) => console.warn("Failed to notify stop:", e.message));
        }
      } catch (err) {
        console.warn("Stop notification error:", err);
      }
    }
    setStreamingReply("");
    currentStreamingTextRef.current = "";
    setIsSearching(false);
    setIsBotTyping(false);
    clearAudioPipeline();
  };
  const handleContinueGeneration = (stoppedContent, messageIndex) => {
    if (isGeneratingRef.current) return;
    const tailSnippet = (stoppedContent || "").slice(-120).trim();
    const openFences = (stoppedContent.match(/```/g) || []).length;
    const isInsideCode = openFences % 2 !== 0;
    let continuationPrompt = "";
    if (isInsideCode) {
      continuationPrompt = `Continue writing the code and response exactly from where you stopped. Do not repeat what was already written. Do not open a new code block. Continue directly with the remaining code and tags from: "${tailSnippet}"`;
    } else {
      continuationPrompt = `Continue your response exactly from where you stopped without repeating. Continue immediately from: "${tailSnippet}"`;
    }
    handleSendSubmit(
      continuationPrompt,
      null,
      void 0,
      [],
      void 0,
      false,
      false,
      { baseContent: stoppedContent, messageIndex, isInsideCode }
    );
  };
  const processAudioQueue = () => {
    if (isVoicePausedRef.current) return;
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
        setIsAudioActive(false);
      }
      return;
    }
    isPlayingRef.current = true;
    setIsAudioActive(true);
    const nextSentence = audioQueueRef.current.shift();
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(nextSentence);
      utterance.lang = "en-US";
      utterance.onend = () => {
        isPlayingRef.current = false;
        if (!isVoicePausedRef.current) processAudioQueue();
      };
      utterance.onerror = () => {
        isPlayingRef.current = false;
        if (!isVoicePausedRef.current) processAudioQueue();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      isPlayingRef.current = false;
      setIsAudioActive(false);
    }
  };
  const handleIncomingTextChunk = (textChunk) => {
    const cleanChunk = textChunk.replace(/[\*#_`\-]/g, "");
    currentSentenceBufferRef.current += cleanChunk;
    const sentenceEndRegex = /[.!?]/;
    if (sentenceEndRegex.test(currentSentenceBufferRef.current)) {
      const lastPunctuationIndex = Math.max(
        currentSentenceBufferRef.current.lastIndexOf("."),
        currentSentenceBufferRef.current.lastIndexOf("?"),
        currentSentenceBufferRef.current.lastIndexOf("!")
      );
      if (lastPunctuationIndex !== -1) {
        const completedSentence = currentSentenceBufferRef.current.slice(0, lastPunctuationIndex + 1).trim();
        currentSentenceBufferRef.current = currentSentenceBufferRef.current.slice(lastPunctuationIndex + 1);
        if (completedSentence) {
          audioQueueRef.current.push(completedSentence);
          if (!isPlayingRef.current) {
            processAudioQueue();
          }
        }
      }
    }
  };
  const loadSavedMessages = async () => {
    if (!currentChatId) return;
    if (isGeneratingRef.current) {
      handleStopGeneration(streamingChatIdRef.current);
    }
    const targetChatId = currentChatId;
    handleStopSpeaking();
    pendingVoiceAutoSpeakRef.current = false;
    try {
      setIsFetchingMessages(true);
      setMessages([]);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/chats/${targetChatId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = await res.json();
      if (activeChatIdRef.current === targetChatId) {
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error reading history collections:", err);
    } finally {
      if (activeChatIdRef.current === targetChatId) {
        setIsFetchingMessages(false);
      }
    }
  };
  const handleSendSubmit = async (textPayload, audioBlob, selectedModelId, attachments = [], editIndex = void 0, isVoiceSubmission = false, enableSearch = false, continuationContext = null, isAssistantReload = false) => {
    if (isGeneratingRef.current) {
      console.warn("\u26A0\uFE0F Request blocked because generation is already active.");
      return;
    }
    const cleanText = (typeof textPayload === "string" ? textPayload : "").trim();
    if (!cleanText) {
      console.warn("\u26A0\uFE0F Request blocked: A text prompt is required to send.");
      return;
    }
    if (selectedModelId) {
      lastUsedModelRef.current = selectedModelId;
    }
    lastParsedContentRef.current = "";
    lastArtifactUpdateRef.current = 0;
    const isQuestion = /^(how|why|what|when|where|who|can|could|should|would|is|are|do|does|did|explain)\b/i.test(cleanText);
    const isBackendQuery = /(backend|express|server\.js|api route|database schema|sql query|git command|install package)/i.test(cleanText) && !/(frontend|ui|page|landing|dashboard|component|react)/i.test(cleanText);
    const isCreationIntent = /\b(build|create|generate|make|design|code|develop)\s+.*?\b(page|website|webpage|web page|landing|dashboard|portfolio|component|ui|frontend|app|form|navbar|header|footer|sidebar|card|modal|section|theme|template|login|signup|register|contact|about|pricing)\b/i.test(cleanText) || /\b(landing page|login page|signup page|register page|contact page|about page|pricing page|admin panel|checkout page|login form|signup form|contact form|dashboard ui|react app|web application|website design|ui design)\b/i.test(cleanText);
    let isExplicitWebPrompt = false;
    if (!continuationContext && !isBackendQuery && isCreationIntent) {
      isExplicitWebPrompt = true;
      if (isQuestion && !/(build me|create me|design me|make me|generate me|write a code for|build a|create a|design a|make a|generate a)/i.test(cleanText)) {
        isExplicitWebPrompt = false;
      }
    }
    isExplicitWebPromptRef.current = isExplicitWebPrompt;
    const isDesktopView = typeof window !== "undefined" && window.innerWidth >= 768;
    if ((isExplicitWebPrompt || isDevModeActive) && !continuationContext) {
      if (isDesktopView) {
        setIsArtifactOpen(true);
        setActiveArtifact({
          code: `<!-- Generating live code preview... -->
<div class="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-6 text-center">
  <div>
    <div class="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/10 animate-pulse">
      \u26A1
    </div>
    <h1 class="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">Generating Web App...</h1>
    <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
      Codegene AI is writing the code. It will stream live directly here in real-time.
    </p>
    <div class="inline-flex items-center gap-2 mt-5 px-3.5 py-1.5 rounded-full bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
      Streaming live
    </div>
  </div>
</div>`,
          language: "html",
          title: "Generating...",
          isStreaming: true
        });
      } else {
        setIsArtifactOpen(false);
      }
    } else if (!isDevModeActive && !isExplicitWebPrompt) {
      setIsArtifactOpen(false);
    }
    clearAudioPipeline();
    handleStopSpeaking();
    pendingVoiceAutoSpeakRef.current = Boolean(isVoiceSubmission);
    isStreamingSpeechActiveRef.current = Boolean(isVoiceSubmission);
    isVoiceConversationModeRef.current = Boolean(isVoiceSubmission);
    isGeneratingRef.current = true;
    isAbortedRef.current = false;
    const effectiveChatId = activeChatIdRef.current || currentChatId;
    streamingChatIdRef.current = effectiveChatId;
    streamFollowUpsRef.current = [];
    const isSearchRequested = Boolean(enableSearch);
    const userMsgObj = { role: "user", content: cleanText, attachments, enableSearch: isSearchRequested };
    const t0 = performance.now();
    let firstTokenTime = null;
    console.log(`
\u{1F680} [FRONTEND GENERAL CHAT START] User Prompt: "${cleanText || (hasAttachments ? "[Attachment only]" : "")}" with ${attachments.length} attachments (Web Search: ${isSearchRequested ? "ON" : "OFF"}) at t=0 ms`);
    if (window.speechSynthesis && window.speechSynthesis.paused && !isVoicePausedRef.current) {
      window.speechSynthesis.resume();
    }
    if (continuationContext) {
      setMessages((prev) => prev.slice(0, continuationContext.messageIndex));
      currentStreamingTextRef.current = continuationContext.baseContent || "";
      setStreamingReply(continuationContext.baseContent || "");
    } else if (isAssistantReload && editIndex !== void 0 && editIndex >= 0) {
      setMessages((prev) => prev.slice(0, editIndex + 1));
      currentStreamingTextRef.current = "";
      setStreamingReply("");
    } else if (editIndex !== void 0 && editIndex >= 0) {
      originalMessageIdRef.current = messages[editIndex]?._id ?? messages[editIndex]?.id ?? null;
      originalContentBeforeEditRef.current = messages[editIndex]?.content ?? null;
      setMessages((prev) => [...prev.slice(0, editIndex), userMsgObj]);
      currentStreamingTextRef.current = "";
      setStreamingReply("");
    } else {
      setMessages((prev) => [...prev, userMsgObj]);
      currentStreamingTextRef.current = "";
      setStreamingReply("");
    }
    setIsSearching(true);
    setIsWebSearching(isSearchRequested);
    setIsBotTyping(true);
    tokenQueueRef.current = [];
    streamNetworkDoneRef.current = false;
    streamCompleteCbRef.current = null;
    activeSearchSourcesRef.current = [];
    setActiveSearchSources([]);
    isSearchGuidanceRef.current = false;
    setIsSearchGuidanceActive(false);
    isAutoScrollEnabledRef.current = true;
    setShowScrollBottom(false);
    setShowScrollToUser(false);
    scrollToBottom(true);
    try {
      const token = localStorage.getItem("token");
      const targetChatEndpoint = effectiveChatId && effectiveChatId !== "new" ? effectiveChatId : "new";
      const conversationMode = "text";
      abortControllerRef.current = new AbortController();
      const requestEndpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/ollama/message/${targetChatEndpoint}`;
      const activeModel = selectedModelId || lastUsedModelRef.current;
      const isUserEdit = Boolean(editIndex !== void 0 && editIndex >= 0 && !isAssistantReload);
      const requestPayload = {
        message: cleanText,
        mode: conversationMode,
        model: activeModel,
        modelId: activeModel,
        attachments,
        stream: true,
        enableSearch: isSearchRequested,
        webSearch: isSearchRequested,
        isReload: Boolean(isAssistantReload),
        isEdit: Boolean(isUserEdit),
        devMode: Boolean(isDevModeActive),
        isDevModeActive: Boolean(isDevModeActive),
        // messageId (_id) is the most reliable way to find the exact DB document for edit
        messageId: isUserEdit ? originalMessageIdRef.current ?? void 0 : void 0,
        // originalContent as text fallback (in case _id doesn't match e.g. guest sessions)
        originalContent: isUserEdit ? originalContentBeforeEditRef.current ?? void 0 : editIndex !== void 0 && editIndex >= 0 && messages[editIndex] ? messages[editIndex].content : void 0
      };
      console.log("\u{1F4E4} [AI CHAT REQUEST SENT FROM BROWSER]", {
        endpoint: requestEndpoint,
        model: activeModel,
        message: cleanText,
        attachmentsCount: attachments?.length || 0,
        payload: requestPayload
      });
      const response = await fetch(
        requestEndpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(requestPayload),
          signal: abortControllerRef.current.signal
        }
      );
      if (!response.ok) {
        if (response.status === 402) {
          const errorData = await response.json();
          throw new Error(JSON.stringify({ type: "INSUFFICIENT_CREDITS", data: errorData }));
        }
        throw new Error(`Server returned status code: ${response.status}`);
      }
      if (!response.body) throw new Error("Readable stream tracking failure.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamFinished = false;
      let buffer = "";
      let isFirstContinuationChunk = Boolean(continuationContext?.isInsideCode);
      const drainPromise = new Promise((resolve) => {
        streamCompleteCbRef.current = resolve;
        startDrainLoop();
      });
      while (!streamFinished) {
        if (isAbortedRef.current) break;
        const { value, done } = await reader.read();
        if (done || isAbortedRef.current) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (isAbortedRef.current) break;
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith("data: ")) {
            const dataStr = cleanedLine.replace(/^data:\s*/, "").trim();
            if (dataStr === "[DONE]") {
              streamFinished = true;
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "meta") {
                if (!currentChatId || currentChatId === "new") {
                  streamingChatIdRef.current = parsed.chatId;
                  activeChatIdRef.current = parsed.chatId;
                  setCurrentChatId(parsed.chatId);
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
                } else if (parsed.title) {
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
                }
              } else if (parsed.type === "search_status") {
                const incomingSources = Array.isArray(parsed.sources) ? parsed.sources : [];
                activeSearchSourcesRef.current = incomingSources;
                setActiveSearchSources(incomingSources);
              } else if (parsed.type === "search_guidance") {
                isSearchGuidanceRef.current = true;
                setIsSearchGuidanceActive(true);
              } else if (parsed.type === "chunk" || parsed.chunk || parsed.token) {
                let textBit = parsed.text || parsed.chunk || parsed.token || "";
                if (textBit) {
                  if (isFirstContinuationChunk) {
                    const stripped = textBit.replace(/^```[a-zA-Z0-9_.-]*\s*\n?/, "");
                    if (stripped !== textBit) {
                      textBit = stripped;
                      isFirstContinuationChunk = false;
                    } else if (textBit.trim().length > 6) {
                      isFirstContinuationChunk = false;
                    }
                  }
                  if (!firstTokenTime) {
                    firstTokenTime = performance.now();
                    const ttftMs = (firstTokenTime - t0).toFixed(2);
                    console.log(`\u26A1 [FRONTEND TTFT] Time To First Token received in browser: ${ttftMs} ms (${(ttftMs / 1e3).toFixed(2)} s)`);
                    setIsSearching(false);
                    setIsWebSearching(false);
                    setIsBotTyping(true);
                  }
                  pushToQueue(textBit);
                  handleIncomingStreamSpeech(textBit);
                }
              } else if (parsed.type === "follow_ups") {
                const incomingFollowUps = Array.isArray(parsed.followUps) ? parsed.followUps : [];
                streamFollowUpsRef.current = incomingFollowUps;
                setMessages((prev) => {
                  if (!Array.isArray(prev) || prev.length === 0) return prev;
                  const lastIdx = prev.length - 1;
                  if (prev[lastIdx]?.role === "assistant") {
                    const updated = [...prev];
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      followUps: incomingFollowUps
                    };
                    return updated;
                  }
                  return prev;
                });
              } else if (parsed.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `\u26A0\uFE0F Error: ${parsed.message}` }
                ]);
                streamFinished = true;
                break;
              }
            } catch (e) {
            }
          }
        }
      }
      if (isAbortedRef.current) {
        stopDrainLoop();
        tokenQueueRef.current = [];
        streamNetworkDoneRef.current = false;
        streamCompleteCbRef.current = null;
        setIsSearching(false);
        setIsWebSearching(false);
        setIsBotTyping(false);
        isGeneratingRef.current = false;
        return;
      }
      streamNetworkDoneRef.current = true;
      const finalResponseContent = await drainPromise;
      if ((isStreamingSpeechActiveRef.current || pendingVoiceAutoSpeakRef.current) && streamingSentenceBufferRef.current.trim()) {
        const remainingClean = cleanMarkdownForSpeech(streamingSentenceBufferRef.current.trim());
        streamingSentenceBufferRef.current = "";
        if (remainingClean) {
          isStreamingSpeechActiveRef.current = true;
          streamingSpeechQueueRef.current.push(remainingClean);
          if (!isSpeakingStreamingChunkRef.current) {
            processStreamingSpeechQueue();
          }
        }
      }
      if ((isStreamingSpeechActiveRef.current || pendingVoiceAutoSpeakRef.current) && !isSpeakingStreamingChunkRef.current && streamingSpeechQueueRef.current.length === 0 && finalResponseContent && finalResponseContent.trim()) {
        const fullClean = cleanMarkdownForSpeech(finalResponseContent);
        if (fullClean) {
          isStreamingSpeechActiveRef.current = true;
          speakText(fullClean, {
            onWordBoundary: (chunk) => {
              if (isStreamingSpeechActiveRef.current) {
                setCurrentSubtitle(chunk);
              }
            },
            onEnd: () => {
              const shouldAutoListen = isVoiceConversationModeRef.current;
              handleStopSpeaking();
              if (shouldAutoListen) {
                triggerMicAutoListen();
              }
            },
            onError: () => {
              handleStopSpeaking();
            }
          });
        }
      }
      if (finalResponseContent && finalResponseContent.trim()) {
        setMessages((prev) => {
          const next = [
            ...prev,
            {
              role: "assistant",
              content: finalResponseContent,
              followUps: streamFollowUpsRef.current || [],
              sources: activeSearchSourcesRef.current || [],
              requiresWebSearch: isSearchGuidanceRef.current || false
            }
          ];
          if (isStreamingSpeechActiveRef.current) {
            setActiveSpeakingIndex(next.length - 1);
          }
          return next;
        });
      }
      const totalTime = (performance.now() - t0).toFixed(2);
      const streamDuration = firstTokenTime ? (performance.now() - firstTokenTime).toFixed(2) : "N/A";
      console.log("\u{1F4E5} [AI CHAT RESPONSE RECEIVED IN BROWSER]", {
        model: selectedModelId,
        totalTimeMs: totalTime,
        responseLength: finalResponseContent?.length || 0,
        responseText: finalResponseContent
      });
      console.log(`
\u23F1\uFE0F  =================== [FRONTEND UI GENERAL CHAT DIAGNOSTICS] ===================
  \u251C\u2500\u2500 \u{1F680} Time To First Token (TTFT):   ${firstTokenTime ? (firstTokenTime - t0).toFixed(2) + " ms" : "N/A"}
  \u251C\u2500\u2500 \u26A1 UI Stream Rendering Duration: ${streamDuration} ms
  \u2514\u2500\u2500 \u{1F3C1} Total UI Round-Trip Time:    ${totalTime} ms (${(totalTime / 1e3).toFixed(2)} s)
===========================================================================

`);
      setStreamingReply("");
      currentStreamingTextRef.current = "";
      setIsBotTyping(false);
      setIsSearching(false);
      setIsWebSearching(false);
      isGeneratingRef.current = false;
      if (!isSpeakingStreamingChunkRef.current && streamingSpeechQueueRef.current.length === 0 && isVoiceConversationModeRef.current) {
        isStreamingSpeechActiveRef.current = false;
        setActiveSpeakingIndex(null);
        setCurrentSubtitle("");
        isVoiceConversationModeRef.current = false;
        triggerMicAutoListen();
      }
      if (onChatUpdated) onChatUpdated();
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    } catch (err) {
      if (err.message && err.message.includes("INSUFFICIENT_CREDITS")) {
        try {
          const parsedError = JSON.parse(err.message);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `\u26A0\uFE0F **Credits Exhausted**

${parsedError.data?.message || "You have run out of AI Credits."}

[Click here to top up your credits](/subscription)` }
          ]);
        } catch (e) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `\u26A0\uFE0F Error: Insufficient credits. [Go to Subscription](/subscription)` }
          ]);
        }
      } else if (err.name === "AbortError" || err.message?.includes("aborted")) {
        console.log("\u{1F6D1} Stream generation stopped by user.");
      } else {
        console.error("Stream parsing exception:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I'm sorry, I am experiencing difficulty connecting at the moment due to high traffic. Please try again in a few minutes." }
        ]);
      }
      setIsSearching(false);
      setIsWebSearching(false);
      setIsBotTyping(false);
      isGeneratingRef.current = false;
      setStreamingReply("");
      currentStreamingTextRef.current = "";
    } finally {
      stopDrainLoop();
      tokenQueueRef.current = [];
      streamNetworkDoneRef.current = false;
      streamCompleteCbRef.current = null;
      isGeneratingRef.current = false;
      setIsSearching(false);
      setIsWebSearching(false);
      setIsBotTyping(false);
      setStreamingReply("");
      currentStreamingTextRef.current = "";
    }
  };
  const formatChatTimestamp = (chat, msgList) => {
    let rawDate = msgList?.[0]?.createdAt || msgList?.[0]?.timestamp || chat?.updatedAt || chat?.createdAt || chat?.timestamp;
    if (!rawDate && chat?._id && typeof chat._id === "string" && chat._id.length === 24) {
      const ts = parseInt(chat._id.substring(0, 8), 16) * 1e3;
      if (!isNaN(ts)) rawDate = ts;
    }
    const date = rawDate ? new Date(rawDate) : /* @__PURE__ */ new Date();
    if (isNaN(date.getTime())) return "";
    const now = /* @__PURE__ */ new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const timeStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
    if (date >= startOfToday) {
      return `${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)} ${timeStr}`;
    } else if (date >= startOfYesterday) {
      return `Yesterday ${timeStr}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return `${new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      }).format(date)} ${timeStr}`;
    } else {
      return `${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(date)} ${timeStr}`;
    }
  };
  const lastUserMsgIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return i;
    }
    return -1;
  })();
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `flex-1 min-w-0 flex flex-col h-full overflow-hidden relative bg-[#F5F6FB] dark:bg-interactive-active/40 text-text-primary dark:text-text-muted`,
      style: {
        backgroundImage: "var(--chat-bg-image)",
        backgroundSize: "var(--chat-bg-size)"
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `px-4 md:px-6 py-3 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${"bg-interactive-base dark:bg-[#0D0E15] border-border-primary dark:border-border-primary"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 min-w-0 flex-1 mr-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            if (onToggleMobileSidebar) {
              onToggleMobileSidebar();
            } else {
              window.dispatchEvent(new CustomEvent("toggleMobileSidebar"));
            }
          },
          className: `md:hidden p-2 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition ${"bg-transparent dark:bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-text-primary dark:text-[#e5e5e5] border-border-primary dark:border-white/10"}`,
          title: "Toggle Sidebar"
        },
        /* @__PURE__ */ React.createElement(FiMenu, { className: "text-lg" })
      ), /* @__PURE__ */ React.createElement("span", { className: "font-normal tracking-wide text-text-primary dark:text-[#e5e5e5] truncate" }, chatTitle), (() => {
        let suffix = "";
        if (!currentChat) {
          suffix = "drafting now";
        } else {
          let pinnedItemIds = [];
          try {
            const saved = localStorage.getItem("pinnedChats");
            pinnedItemIds = saved ? JSON.parse(saved) : [];
          } catch (e) {
          }
          if (pinnedItemIds.includes(currentChat._id)) {
            suffix = "pinned";
          } else {
            const getChatDate = (c) => {
              if (!c) return /* @__PURE__ */ new Date();
              const rawDate = c.updatedAt || c.createdAt || c.timestamp;
              if (rawDate) {
                const parsed = new Date(rawDate);
                if (!isNaN(parsed.getTime())) return parsed;
              }
              if (c._id && typeof c._id === "string" && c._id.length === 24) {
                const timestamp = parseInt(c._id.substring(0, 8), 16) * 1e3;
                if (!isNaN(timestamp)) return new Date(timestamp);
              }
              return /* @__PURE__ */ new Date();
            };
            const chatDate = getChatDate(currentChat);
            const now = /* @__PURE__ */ new Date();
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
            if (chatDate >= startOfToday) suffix = "today";
            else if (chatDate >= startOfYesterday) suffix = "yesterday";
            else if (chatDate >= startOf7Days) suffix = "previous 7 days";
            else if (chatDate >= startOf30Days) suffix = "previous 30 days";
            else suffix = "older";
          }
        }
        if (suffix) {
          return /* @__PURE__ */ React.createElement("span", { className: "text-[13px] font-serif italic text-[#7c83f6] ml-1 shrink-0 hidden sm:inline-block" }, "\u2014 ", suffix);
        }
        return null;
      })()),
      activeSpeakingIndex !== null && currentSubtitle && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 dark:bg-accent-primary/20 border border-accent-primary/30 text-xs text-text-primary dark:text-white shadow-xs max-w-[260px] sm:max-w-[380px] md:max-w-[520px] animate-in fade-in duration-200 mx-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-0.5 text-accent-primary shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "w-1 h-1.5 rounded-full bg-accent-primary animate-pulse" }), /* @__PURE__ */ React.createElement("span", { className: "w-1 h-3 rounded-full bg-accent-primary animate-pulse delay-75" }), /* @__PURE__ */ React.createElement("span", { className: "w-1 h-2 rounded-full bg-accent-primary animate-pulse delay-150" })), /* @__PURE__ */ React.createElement("span", { className: "font-medium truncate tracking-wide text-[12px] italic text-text-primary dark:text-zinc-200" }, '"', currentSubtitle, '"'), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleStopSpeaking,
          className: "p-1 rounded-full hover:bg-accent-primary/20 text-text-muted hover:text-accent-primary transition cursor-pointer shrink-0 ml-auto flex items-center gap-1",
          title: "Stop reading aloud"
        },
        /* @__PURE__ */ React.createElement(FiVolumeX, { className: "w-3.5 h-3.5 text-accent-primary" }),
        /* @__PURE__ */ React.createElement("span", { className: "text-[10.5px] font-semibold text-accent-primary hidden sm:inline" }, "Stop")
      )),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 md:gap-3" }, (activeArtifact || isDevModeActive) && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            if (!isArtifactOpen && !activeArtifact) {
              handleToggleDevMode(true);
            } else {
              setIsArtifactOpen((prev) => !prev);
            }
          },
          className: `flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${isArtifactOpen ? "bg-accent-primary text-white border-accent-primary shadow-xs" : "bg-accent-primary/10 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/20"}`,
          title: isArtifactOpen ? "Hide Live Preview Panel" : "Open Live Preview Panel"
        },
        /* @__PURE__ */ React.createElement(FiEye, { className: "text-[14px]" }),
        /* @__PURE__ */ React.createElement("span", { className: "hidden xs:inline" }, "Preview")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleShare,
          className: "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-transparent border border-border-primary dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary dark:text-[#e5e5e5] text-[12px] font-medium transition-all cursor-pointer active:scale-95",
          title: "Share conversation"
        },
        /* @__PURE__ */ React.createElement(FiShare2, { className: "text-[14px]" }),
        /* @__PURE__ */ React.createElement("span", { className: "hidden xs:inline sm:inline" }, "Share")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: toggleTheme,
          className: "flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-white/20 border border-border-primary dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary dark:text-[#e5e5e5] transition-colors cursor-pointer",
          title: "Toggle Theme"
        },
        isDark ? /* @__PURE__ */ React.createElement(FiSun, { className: "text-[14px]" }) : /* @__PURE__ */ React.createElement(FiMoon, { className: "text-[14px]" })
      ))
    ),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-h-0 min-w-0 flex flex-row overflow-hidden relative" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `h-full flex flex-col min-w-0 transition-all duration-300 ${isArtifactOpen && activeArtifact ? "w-full md:w-[48%] lg:w-[45%]" : "w-full"}`
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          ref: messagesContainerRef,
          onScroll: handleScroll,
          onWheel: handleWheel,
          className: "flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] flex flex-col relative"
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `w-full flex-1 max-w-[820px] mx-auto px-2.5 sm:px-4 md:px-6 pt-4 pb-8 flex flex-col ${!isFetchingMessages && messages.length === 0 && !isSearching && !isBotTyping ? "justify-center" : "space-y-1.5 sm:space-y-2"}`
          },
          !isSearching && !isBotTyping && isFetchingMessages && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center flex-1 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white animate-spin mb-3 mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-text-primary" }, "Loading chat...")),
          !isFetchingMessages && messages.length === 0 && !isSearching && !isBotTyping && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-start justify-center md:px-4 w-full max-w-[820px] mx-auto py-6 md:py-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "h-[1px] w-8 bg-accent-primary" }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted" }, "Intelligence, without the noise")), /* @__PURE__ */ React.createElement(
            "h2",
            {
              className: `text-[26px] font-light! md:text-[48px] font-serif leading-tight tracking-tight mb-4 ${"text-text-primary dark:text-[#F4F4F5]"}`
            },
            "What can we",
            " ",
            /* @__PURE__ */ React.createElement("span", { className: "text-accent-primary italic font-normal" }, "make clear"),
            " ",
            "today?"
          ), /* @__PURE__ */ React.createElement("p", { className: "text-xs md:text-sm text-text-muted max-w-md leading-relaxed mb-6" }, "Codegene helps you reason through hard problems, build", /* @__PURE__ */ React.createElement("br", null), "useful things, and move from a blank page to a precise", /* @__PURE__ */ React.createElement("br", null), "result."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row w-full max-w-[820px] mx-auto rounded-xl border border-border-primary dark:border-white/5 overflow-hidden shadow-sm bg-white dark:bg-[#191a24]" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => handleSendSubmit("Help me build a prototype."),
              className: "flex-1 group flex flex-col p-3.5 sm:p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left border-b md:border-b-0 md:border-r border-border-primary dark:border-white/5"
            },
            /* @__PURE__ */ React.createElement("div", { className: "w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-[6px] bg-accent-primary/20 flex items-center justify-center text-accent-primary mb-2 group-hover:bg-interactive-hover dark:group-hover:bg-[#2c2d43] transition-colors" }, /* @__PURE__ */ React.createElement(FiCode, { className: "text-[13px] sm:text-[14px]" })),
            /* @__PURE__ */ React.createElement("span", { className: "text-[12.5px] sm:text-[13px] font-medium mb-1 leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide" }, "Build a prototype"),
            /* @__PURE__ */ React.createElement("span", { className: "text-[11px] sm:text-[12px] text-text-muted dark:text-[#8a8a93] leading-normal" }, "Turn an idea into a working interface")
          ), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => handleSendSubmit("Help me analyze a document."),
              className: "flex-1 group flex flex-col p-3.5 sm:p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left border-b md:border-b-0 md:border-r border-border-primary dark:border-white/5"
            },
            /* @__PURE__ */ React.createElement("div", { className: "w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-[6px] bg-accent-primary/20 flex items-center justify-center text-accent-primary mb-2 group-hover:bg-interactive-hover dark:group-hover:bg-[#2c2d43] transition-colors" }, /* @__PURE__ */ React.createElement(FiFileText, { className: "text-[13px] sm:text-[14px]" })),
            /* @__PURE__ */ React.createElement("span", { className: "text-[12.5px] sm:text-[13px] mb-1 font-medium leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide" }, "Analyze a document"),
            /* @__PURE__ */ React.createElement("span", { className: "text-[11px] sm:text-[12px] text-text-muted dark:text-[#8a8a93] leading-normal" }, "Find the signal in a long file")
          ), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => handleSendSubmit("Help me explore a visual direction."),
              className: "flex-1 group flex flex-col p-3.5 sm:p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            },
            /* @__PURE__ */ React.createElement("div", { className: "w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-[6px] bg-accent-primary/20 flex items-center justify-center text-accent-primary mb-2 group-hover:bg-interactive-hover dark:group-hover:bg-[#2c2d43] transition-colors" }, /* @__PURE__ */ React.createElement(FiImage, { className: "text-[13px] sm:text-[14px]" })),
            /* @__PURE__ */ React.createElement("span", { className: "text-[12.5px] sm:text-[13px] mb-1 font-medium leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide" }, "Create an image"),
            /* @__PURE__ */ React.createElement("span", { className: "text-[11px] sm:text-[12px] text-text-muted dark:text-[#8a8a93] leading-normal" }, "Explore a visual direction")
          ))),
          !isFetchingMessages && messages.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "w-full flex justify-center py-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-semibold text-text-muted" }, formatChatTimestamp(currentChat, messages))),
          !isFetchingMessages && messages.length > 0 && (() => {
            const lastUserMsgIdx2 = messages.reduce(
              (lastIdx, msg, idx) => msg.role === "user" ? idx : lastIdx,
              -1
            );
            const lastAssistantMsgIdx = messages.reduce(
              (lastIdx, msg, idx) => msg.role === "assistant" ? idx : lastIdx,
              -1
            );
            return messages.map((m, index) => {
              const isUserMsg = m.role === "user";
              const isLatestUserMsg = index === lastUserMsgIdx2;
              const isLatestAssistant = index === lastAssistantMsgIdx && !isSearching && !isBotTyping;
              const prevUserMsg = !isUserMsg ? [...messages.slice(0, index)].reverse().find((msg) => msg.role === "user") : null;
              const prevUserMsgIdx = !isUserMsg ? messages.reduce(
                (lastIdx, msg, idx) => msg.role === "user" && idx < index ? idx : lastIdx,
                -1
              ) : -1;
              const isSearchActuallyExecuted = isUserMsg ? Boolean(
                m.searchExecuted || messages[index + 1] && Array.isArray(messages[index + 1].sources) && messages[index + 1].sources.length > 0 || isLatestUserMsg && Array.isArray(activeSearchSources) && activeSearchSources.length > 0
              ) : false;
              return /* @__PURE__ */ React.createElement(
                "div",
                {
                  key: index,
                  ref: isLatestUserMsg ? latestUserMsgRef : void 0,
                  className: "w-full flex flex-col"
                },
                /* @__PURE__ */ React.createElement(
                  MessageBubble,
                  {
                    role: m.role,
                    content: m.content,
                    attachments: m.attachments,
                    enableSearch: m.enableSearch,
                    searchExecuted: isSearchActuallyExecuted,
                    sources: m.sources || [],
                    requiresWebSearch: m.requiresWebSearch || false,
                    onEnableSearchAndRetry: () => {
                      handleToggleWebSearch(true);
                      if (prevUserMsg?.content) {
                        handleSendSubmit(
                          prevUserMsg.content,
                          null,
                          void 0,
                          prevUserMsg.attachments,
                          void 0,
                          false,
                          true
                        );
                      }
                    },
                    followUps: m.followUps || [],
                    isLatestAssistant,
                    onSelectFollowUp: (followUpPrompt) => handleSendSubmit(followUpPrompt),
                    isSpeaking: activeSpeakingIndex === index,
                    onToggleSpeak: !isUserMsg ? (rawContent) => handleToggleSpeak(index, rawContent) : void 0,
                    onRetry: isUserMsg ? (newContent) => handleSendSubmit(newContent || m.content, null, void 0, m.attachments, index, false, m.enableSearch, null, false) : prevUserMsg ? (newContent) => handleSendSubmit(
                      newContent || prevUserMsg.content,
                      null,
                      void 0,
                      prevUserMsg.attachments,
                      prevUserMsgIdx >= 0 ? prevUserMsgIdx : void 0,
                      false,
                      prevUserMsg.enableSearch,
                      null,
                      true
                    ) : void 0,
                    isStoppedMidway: m.isStoppedMidway,
                    onContinueGeneration: () => handleContinueGeneration(m.content, index)
                  }
                )
              );
            });
          })(),
          (isSearching || isBotTyping) && /* @__PURE__ */ React.createElement(
            MessageBubble,
            {
              role: "assistant",
              content: streamingReply,
              isStreaming: true,
              isThinking: !streamingReply,
              isWebSearching,
              sources: activeSearchSources,
              requiresWebSearch: isSearchGuidanceActive,
              onEnableSearchAndRetry: () => handleToggleWebSearch(true)
            }
          )
        )
      ),
      /* @__PURE__ */ React.createElement("div", { className: "shrink-0 z-10 relative pb-2 sm:pb-3 md:pb-4 bg-transparent pr-0 md:pr-[6px]" }, (showScrollBottom || showScrollToUser) && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-14 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-1.5 p-1 rounded-full bg-surface-primary/95 dark:bg-[#191A24]/95 backdrop-blur-md border border-border-primary dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200" }, showScrollToUser && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: scrollToLatestUserMessage,
          className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-xs group",
          title: "Scroll to your latest message"
        },
        /* @__PURE__ */ React.createElement(FiArrowUp, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-y-0.5 transition-transform" }),
        /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-semibold hidden xs:inline" }, "Latest sent")
      ), showScrollBottom && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => scrollToBottom(true),
          className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-primary dark:text-white text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-xs group",
          title: "Scroll to bottom"
        },
        /* @__PURE__ */ React.createElement(FiArrowDown, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-y-0.5 transition-transform" }),
        /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-semibold hidden xs:inline" }, "Bottom")
      )), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-[820px] mx-auto px-2 sm:px-4 md:px-6 pb-2 shrink-0" }, /* @__PURE__ */ React.createElement(
        ChatInput,
        {
          onSend: handleSendSubmit,
          isGenerating: isSearching || isBotTyping,
          onStop: handleStopGeneration,
          autoListenTrigger,
          isWebSearchActive,
          setIsWebSearchActive: handleToggleWebSearch,
          isDevModeActive,
          setIsDevModeActive: handleToggleDevMode
        }
      )))
    ), isArtifactOpen && activeArtifact && /* @__PURE__ */ React.createElement("div", { className: "hidden md:flex flex-1 min-w-0 h-full overflow-hidden transition-all duration-300" }, /* @__PURE__ */ React.createElement(
      ArtifactPreviewPanel,
      {
        artifact: activeArtifact,
        onClose: handleCloseArtifact
      }
    ))),
    isArtifactOpen && activeArtifact && /* @__PURE__ */ React.createElement("div", { className: "md:hidden fixed inset-0 z-50 bg-black/80 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 h-full w-full" }, /* @__PURE__ */ React.createElement(
      ArtifactPreviewPanel,
      {
        artifact: activeArtifact,
        onClose: handleCloseArtifact
      }
    ))),
    /* @__PURE__ */ React.createElement(
      ShareModal,
      {
        isOpen: isShareModalOpen,
        onClose: () => setIsShareModalOpen(false),
        chatId: currentChatId,
        chatTitle,
        hasMessages: messages.length > 0
      }
    )
  );
};
export default ChatArea;
