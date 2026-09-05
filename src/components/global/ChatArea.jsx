import { useState, useEffect, useRef } from "react";
import { FiMenu, FiMessageSquare, FiCode, FiLayout, FiBookOpen, FiMail, FiServer, FiCpu, FiCheckCircle, FiX, FiActivity, FiVolume2, FiVolumeX, FiStopCircle,FiImage, FiArrowDown, FiFileText, FiShare2, FiUpload, FiSun, FiMoon } from "react-icons/fi";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ClusterStatusWidget from "./ClusterStatusWidget";
import { useTheme } from "../../context/ThemeContext";
import { useTanStackQueryClient, useTanStackData } from "../../hooks/useTanStackData";
import { NobackEndCall } from "../../services/authService";

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

  const currentChat = chats.find(c => c._id === currentChatId);
  const chatTitle = currentChat ? currentChat.title : "New conversation";

  const [messages, setMessages] = useState([]);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isVoicePaused, setIsVoicePaused] = useState(true);
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const isVoicePausedRef = useRef(true);
  const isAbortedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const handleShare = async () => {
    const shareData = {
      title: chatTitle,
      text: `Check out this AI chat on Codegene: "${chatTitle}"`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Native share fallback to clipboard:", err);
        } else {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopiedShare(true);
      setTimeout(() => setIsCopiedShare(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

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

  // Health check polling removed as requested

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
    };

    window.addEventListener("new-chat-action", handleNewChatReset);
    return () => {
      window.removeEventListener("new-chat-action", handleNewChatReset);
    };
  }, []);

  // --- ChatGPT-style streaming engine ---
  // Network SSE chunks fill tokenQueueRef at full network speed.
  // A requestAnimationFrame drain loop pulls words out at a controlled
  // visual pace (~35 words/sec) so text appears to "type" naturally.
  const tokenQueueRef = useRef([]);
  const streamNetworkDoneRef = useRef(false);
  const rafHandleRef = useRef(null);
  const streamCompleteCbRef = useRef(null); // called when drain is fully done

  const stopDrainLoop = () => {
    if (rafHandleRef.current) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }
  };

  /**
   * Start the rAF drain loop.
   * Runs at 60fps. Each frame releases 1-3 words from the queue into
   * streamingReply so the text "types" smoothly like ChatGPT.
   * When the queue is empty AND the network stream is finished,
   * it calls streamCompleteCbRef to commit the final message.
   */
  const startDrainLoop = () => {
    stopDrainLoop();
    streamNetworkDoneRef.current = false;
    tokenQueueRef.current = [];

    // Track last flush time so we release tokens at a capped rate
    let lastFlushTime = 0;

    const tick = (now) => {
      if (isAbortedRef.current) {
        stopDrainLoop();
        return;
      }

      const elapsed = now - lastFlushTime;
      // Target: ~35 words/sec → one flush every ~28ms
      const flushInterval = 28;

      if (elapsed >= flushInterval) {
        const qLen = tokenQueueRef.current.length;
        if (qLen > 0) {
          // Adaptive catch-up: if queue is backed up, drain faster
          let step = 1;
          if (qLen > 60) step = Math.min(8, Math.ceil(qLen / 10));
          else if (qLen > 25) step = 3;
          else if (qLen > 10) step = 2;

          const words = tokenQueueRef.current.splice(0, step).join("");
          currentStreamingTextRef.current += words;
          setStreamingReply(currentStreamingTextRef.current);
          lastFlushTime = now;
        } else if (streamNetworkDoneRef.current) {
          // Queue empty + network done → streaming complete
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

  /**
   * Feed raw SSE text into the token queue.
   * Splits into word-boundary tokens for natural word-by-word appearance.
   */
  const pushToQueue = (text) => {
    if (!text) return;
    // Split on whitespace boundaries to queue whole words + their trailing spaces
    const tokens = text.match(/\S+\s*|\s+/g) || [text];
    tokenQueueRef.current.push(...tokens);
  };

  useEffect(() => {
    // If active stream belongs to current session (even after currentChatId updates from null -> new id), preserve current stream state
    if (isGeneratingRef.current && (streamingChatIdRef.current === currentChatId || !currentChatId)) {
      prevChatIdRef.current = currentChatId;
      return;
    }

    // If user navigated to a different chat thread while generating, abort active stream
    if (isGeneratingRef.current && prevChatIdRef.current !== currentChatId) {
      handleStopGeneration();
    }

    prevChatIdRef.current = currentChatId;

    if (currentChatId) {
      loadSavedMessages();
    } else {
      setMessages([]);
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
      }
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isAutoScrollEnabledRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, streamingReply, isSearching, isBotTyping]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= 80;

    setShowScrollBottom(distanceFromBottom > 100);

    // If user scrolled up beyond threshold, pause auto-scroll
    // If user scrolled back down to bottom, re-engage auto-scroll
    isAutoScrollEnabledRef.current = isAtBottom;
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      // User immediately indicated intent to scroll UP
      isAutoScrollEnabledRef.current = false;
      setShowScrollBottom(true);
    }
  };

  const clearAudioPipeline = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    currentSentenceBufferRef.current = "";
    setIsAudioActive(false);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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

  const handleStopGeneration = () => {
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

    const partialText = currentStreamingTextRef.current;
    if (partialText && partialText.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: partialText }
      ]);
    }

    setStreamingReply("");
    currentStreamingTextRef.current = "";
    setIsSearching(false);
    setIsBotTyping(false);
    clearAudioPipeline();
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
    if (isGeneratingRef.current || !currentChatId) return;
    const targetChatId = currentChatId;
    try {
      setIsFetchingMessages(true);
      setMessages([]);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/chats/${targetChatId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  const handleSendSubmit = async (textPayload, audioBlob, selectedModelId, attachments = [], editIndex = undefined) => {
    if (isGeneratingRef.current) {
      console.warn("⚠️ Request blocked because generation is already active.");
      return;
    }
    const cleanText = (typeof textPayload === "string" ? textPayload : "").trim();
    // Prompt text is mandatory (attachments alone cannot be submitted without text prompt)
    if (!cleanText) {
      console.warn("⚠️ Request blocked: A text prompt is required to send.");
      return;
    }

    if (selectedModelId) {
      lastUsedModelRef.current = selectedModelId;
    }

    isGeneratingRef.current = true;
    isAbortedRef.current = false;
    streamingChatIdRef.current = currentChatId;
    clearAudioPipeline();

    const t0 = performance.now();
    let firstTokenTime = null;

    console.log(`\n🚀 [FRONTEND GENERAL CHAT START] User Prompt: "${cleanText || (hasAttachments ? "[Attachment only]" : "")}" with ${attachments.length} attachments at t=0 ms`);

    if (window.speechSynthesis && window.speechSynthesis.paused && !isVoicePausedRef.current) {
      window.speechSynthesis.resume();
    }

    if (editIndex !== undefined && editIndex >= 0) {
      setMessages((prev) => [...prev.slice(0, editIndex), { role: "user", content: cleanText, attachments }]);
    } else {
      setMessages((prev) => [...prev, { role: "user", content: cleanText, attachments }]);
    }
    setIsSearching(true);
    setIsBotTyping(true);
    setStreamingReply("");
    currentStreamingTextRef.current = "";
    tokenQueueRef.current = [];
    streamNetworkDoneRef.current = false;
    streamCompleteCbRef.current = null;
    isAutoScrollEnabledRef.current = true;
    setShowScrollBottom(false);
    scrollToBottom(true);

    try {
      const token = localStorage.getItem("token");
      const targetChatEndpoint = currentChatId && currentChatId !== "new" ? currentChatId : "new";
      const conversationMode = "text";

      abortControllerRef.current = new AbortController();

      const requestEndpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/ollama/message/${targetChatEndpoint}`;
      const activeModel = selectedModelId || lastUsedModelRef.current;
      const requestPayload = {
        message: cleanText,
        mode: conversationMode,
        model: activeModel,
        modelId: activeModel,
        attachments,
        stream: true
      };

      console.log("📤 [AI CHAT REQUEST SENT FROM BROWSER]", {
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
            Authorization: `Bearer ${token}`,
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

      // Start the visual drain loop BEFORE reading — so the first token
      // renders as soon as it's pushed into the queue.
      // The drain promise resolves when queue is empty + network done.
      const drainPromise = new Promise((resolve) => {
        streamCompleteCbRef.current = resolve;
        startDrainLoop();
      });

      // --- SSE network read loop (runs at full network speed) ---
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
                  setCurrentChatId(parsed.chatId);
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
                }
              } else if (parsed.type === "chunk") {
                const textBit = parsed.text || "";
                if (textBit) {
                  if (!firstTokenTime) {
                    firstTokenTime = performance.now();
                    const ttftMs = (firstTokenTime - t0).toFixed(2);
                    console.log(`⚡ [FRONTEND TTFT] Time To First Token received in browser: ${ttftMs} ms (${(ttftMs / 1000).toFixed(2)} s)`);
                    // Transition from "thinking dots" → streaming text
                    setIsSearching(false);
                    setIsBotTyping(true);
                  }
                  // Push raw text into the queue — the rAF drain loop
                  // will visually release it at a smooth 35 words/sec pace.
                  pushToQueue(textBit);
                  handleIncomingTextChunk(textBit);
                }
              } else if (parsed.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `⚠️ Error: ${parsed.message}` },
                ]);
                streamFinished = true;
                break;
              }
            } catch (e) { }
          }
        }
      }

      if (isAbortedRef.current) {
        stopDrainLoop();
        tokenQueueRef.current = [];
        streamNetworkDoneRef.current = false;
        streamCompleteCbRef.current = null;
        setIsSearching(false);
        setIsBotTyping(false);
        isGeneratingRef.current = false;
        return;
      }

      // Signal the drain loop that no more tokens are coming.
      // The drain loop will resolve drainPromise once the queue empties.
      streamNetworkDoneRef.current = true;

      // Await drain — this takes only as long as needed to visually
      // display the remaining queued tokens (~1-3s for a typical response).
      const finalResponseContent = await drainPromise;

      if (currentSentenceBufferRef.current.trim()) {
        audioQueueRef.current.push(currentSentenceBufferRef.current.trim());
        processAudioQueue();
      }

      if (finalResponseContent && finalResponseContent.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: finalResponseContent },
        ]);
      }

      const totalTime = (performance.now() - t0).toFixed(2);
      const streamDuration = firstTokenTime ? (performance.now() - firstTokenTime).toFixed(2) : "N/A";

      console.log("📥 [AI CHAT RESPONSE RECEIVED IN BROWSER]", {
        model: selectedModelId,
        totalTimeMs: totalTime,
        responseLength: finalResponseContent?.length || 0,
        responseText: finalResponseContent
      });

      console.log(`
⏱️  =================== [FRONTEND UI GENERAL CHAT DIAGNOSTICS] ===================
  ├── 🚀 Time To First Token (TTFT):   ${firstTokenTime ? (firstTokenTime - t0).toFixed(2) + ' ms' : 'N/A'}
  ├── ⚡ UI Stream Rendering Duration: ${streamDuration} ms
  └── 🏁 Total UI Round-Trip Time:    ${totalTime} ms (${(totalTime / 1000).toFixed(2)} s)
===========================================================================\n
`);

      setStreamingReply("");
      currentStreamingTextRef.current = "";
      setIsBotTyping(false);
      setIsSearching(false);
      isGeneratingRef.current = false;
      if (onChatUpdated) onChatUpdated();
      // Invalidate usage to refresh credits once stream completes without multiple get calls
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    } catch (err) {
      if (err.message && err.message.includes("INSUFFICIENT_CREDITS")) {
        try {
          const parsedError = JSON.parse(err.message);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `⚠️ **Credits Exhausted**\n\n${parsedError.data?.message || "You have run out of AI Credits."}\n\n[Click here to top up your credits](/subscription)` }
          ]);
        } catch (e) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `⚠️ Error: Insufficient credits. [Go to Subscription](/subscription)` }
          ]);
        }
      } else if (err.name === "AbortError" || err.message?.includes("aborted")) {
        console.log("🛑 Stream generation stopped by user.");
      } else {
        console.error("Stream parsing exception:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Error: Unable to process request.` }
        ]);
      }
      setIsSearching(false);
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
      setIsBotTyping(false);
      setStreamingReply("");
      currentStreamingTextRef.current = "";
    }
  };

  const formatChatTimestamp = (chat, msgList) => {
    let rawDate =
      msgList?.[0]?.createdAt ||
      msgList?.[0]?.timestamp ||
      chat?.updatedAt ||
      chat?.createdAt ||
      chat?.timestamp;

    if (!rawDate && chat?._id && typeof chat._id === "string" && chat._id.length === 24) {
      const ts = parseInt(chat._id.substring(0, 8), 16) * 1000;
      if (!isNaN(ts)) rawDate = ts;
    }

    const date = rawDate ? new Date(rawDate) : new Date();
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const timeStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    if (date >= startOfToday) {
      return `${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)} ${timeStr}`;
    } else if (date >= startOfYesterday) {
      return `Yesterday ${timeStr}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return `${new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date)} ${timeStr}`;
    } else {
      return `${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)} ${timeStr}`;
    }
  };

  return (
    <div
      className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden relative bg-[#F5F6FB] dark:bg-interactive-active/40 text-text-primary dark:text-text-muted`}
      style={{
        backgroundImage: "var(--chat-bg-image)",
        backgroundSize: "var(--chat-bg-size)",
      }}
    >
      {/* Fixed Sticky Header Bar */}
      <div
        className={`px-4 md:px-6 py-3 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${"bg-interactive-base dark:bg-[#0D0E15] border-border-primary dark:border-border-primary"}`}
      >
        <div className="flex items-center gap-2 truncate">
          <button
            onClick={() => {
              if (onToggleMobileSidebar) {
                onToggleMobileSidebar();
              } else {
                window.dispatchEvent(new CustomEvent("toggleMobileSidebar"));
              }
            }}
            className={`md:hidden p-2 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition ${"bg-transparent dark:bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-text-primary dark:text-[#e5e5e5] border-border-primary dark:border-white/10"}`}
            title="Toggle Sidebar"
          >
            <FiMenu className="text-lg" />
          </button>
          <span className="font-normal tracking-wide text-text-primary dark:text-[#e5e5e5]">
            {chatTitle}
          </span>
          {(() => {
            let suffix = "";
            if (!currentChat) {
              suffix = "drafting now";
            } else {
              let pinnedItemIds = [];
              try {
                const saved = localStorage.getItem("pinnedChats");
                pinnedItemIds = saved ? JSON.parse(saved) : [];
              } catch (e) {}

              if (pinnedItemIds.includes(currentChat._id)) {
                suffix = "pinned";
              } else {
                const getChatDate = (c) => {
                  if (!c) return new Date();
                  const rawDate = c.updatedAt || c.createdAt || c.timestamp;
                  if (rawDate) {
                    const parsed = new Date(rawDate);
                    if (!isNaN(parsed.getTime())) return parsed;
                  }
                  if (
                    c._id &&
                    typeof c._id === "string" &&
                    c._id.length === 24
                  ) {
                    const timestamp =
                      parseInt(c._id.substring(0, 8), 16) * 1000;
                    if (!isNaN(timestamp)) return new Date(timestamp);
                  }
                  return new Date();
                };

                const chatDate = getChatDate(currentChat);
                const now = new Date();
                const startOfToday = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
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
              return (
                <span className="text-[13px] font-serif italic text-[#7c83f6] ml-1">
                  — {suffix}
                </span>
              );
            }
            return null;
          })()}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent border border-border-primary dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary dark:text-[#e5e5e5] text-[12px] font-medium transition-all cursor-pointer active:scale-95"
              title="Share conversation link"
            >
              {isCopiedShare ? (
                <>
                  <FiCheck className="text-[14px] text-green-500" />
                  <span className="text-green-500 font-semibold">Link Copied</span>
                </>
              ) : (
                <>
                  <FiShare2 className="text-[14px]" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-white/20 border border-border-primary dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary dark:text-[#e5e5e5] transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? (
              <FiSun className="text-[14px]" />
            ) : (
              <FiMoon className="text-[14px]" />
            )}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area - ONLY this section scrolls */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] flex flex-col relative"
      >
        <div
          className={`w-full flex-1 max-w-[820px] mx-auto px-4 sm:px-6 pt-4 pb-8 flex flex-col ${!isFetchingMessages && messages.length === 0 && !isSearching && !isBotTyping ? "justify-center" : "space-y-2.5"}`}
        >
          {!isSearching && !isBotTyping && isFetchingMessages && (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white animate-spin mb-3 mx-auto"></div>
              <p className="text-xs text-text-primary">Loading chat...</p>
            </div>
          )}

          {!isFetchingMessages &&
            messages.length === 0 &&
            !isSearching &&
            !isBotTyping && (
              <div className="flex flex-col items-start justify-center md:px-4 w-full max-w-[820px] mx-auto py-6 md:py-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-[1px] w-8 bg-accent-primary"></div>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
                    Intelligence, without the noise
                  </span>
                </div>
                <h2
                  className={`text-[26px] font-light! md:text-[48px] font-serif leading-tight tracking-tight mb-4 ${"text-text-primary dark:text-[#F4F4F5]"}`}
                >
                  What can we{" "}
                  <span className="text-accent-primary italic font-normal">
                    make clear
                  </span>{" "}
                  today?
                </h2>
                <p className="text-xs md:text-sm text-text-muted max-w-md leading-relaxed mb-6">
                  Codegene helps you reason through hard problems, build
                  <br />
                  useful things, and move from a blank page to a precise
                  <br />
                   result.
                </p>

                {/* Quick Actions */}
                <div className="flex flex-col md:flex-row w-full max-w-[820px] mx-auto rounded-xl border border-border-primary dark:border-white/5 overflow-hidden shadow-sm bg-white dark:bg-[#191a24]">
                  {/* Build Card */}
                  <button
                    onClick={() =>
                      handleSendSubmit("Help me build a prototype.")
                    }
                    className="flex-1 group flex flex-col p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left border-b md:border-b-0 md:border-r border-border-primary dark:border-white/5"
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-accent-primary/20 flex items-center justify-center text-accent-primary mb-3 group-hover:bg-interactive-hover dark:group-hover:bg-[#2c2d43] transition-colors">
                      <FiCode className="text-[14px]" />
                    </div>
                    <span className="text-[13px] font-normal mb-1.5 leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide">
                      Build a prototype
                    </span>
                    <span className="text-[12px] text-text-muted dark:text-[#8a8a93] leading-normal">
                      Turn an idea into a working interface
                    </span>
                  </button>
                  {/* Analyze Card */}
                  <button
                    onClick={() =>
                      handleSendSubmit("Help me analyze a document.")
                    }
                    className="flex-1 group flex flex-col p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left border-b md:border-b-0 md:border-r border-border-primary dark:border-white/5"
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-accent-primary/20 flex items-center justify-center text-accent-primary mb-3 group-hover:bg-interactive-hover dark:group-hover:bg-[#2c2d43] transition-colors">
                      <FiFileText className="text-[14px]" />
                    </div>
                    <span className="text-[13px] mb-1.5 font-normal leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide">
                      Analyze a document
                    </span>
                    <span className="text-[12px] text-text-muted dark:text-[#8a8a93] leading-normal">
                      Find the signal in a long file
                    </span>
                  </button>
                  {/* Create Card */}
                  <button
                    onClick={() =>
                      handleSendSubmit("Help me explore a visual direction.")
                    }
                    className="flex-1 group flex flex-col p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-accent-primary/20 flex items-center justify-center text-accent-primary mb-3 group-hover:bg-interactive-hover dark:group-hover:bg-[#2c2d43] transition-colors">
                      <FiImage className="text-[14px]" />
                    </div>
                    <span className="text-[13px] mb-1.5 font-normal leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide">
                      Create an image
                    </span>
                    <span className="text-[12px] text-text-muted dark:text-[#8a8a93] leading-normal">
                      Explore a visual direction
                    </span>
                  </button>
                </div>
              </div>
            )}

          {!isFetchingMessages && messages.length > 0 && (
            <div className="w-full flex justify-center py-1">
              <span className="text-[11px] font-semibold text-text-muted">
                {formatChatTimestamp(currentChat, messages)}
              </span>
            </div>
          )}

          {!isFetchingMessages &&
            messages.map((m, index) => {
              const isUserMsg = m.role === "user";
              const prevUserMsg = !isUserMsg
                ? [...messages.slice(0, index)]
                    .reverse()
                    .find((msg) => msg.role === "user")
                : null;
              return (
                <MessageBubble
                  key={index}
                  role={m.role}
                  content={m.content}
                  attachments={m.attachments}
                  onRetry={
                    isUserMsg
                      ? (newContent) =>
                          handleSendSubmit(newContent || m.content, null, undefined, m.attachments, index)
                      : prevUserMsg
                      ? (newContent) =>
                          handleSendSubmit(newContent || prevUserMsg.content)
                      : undefined
                  }
                />
              );
            })}

          {(isSearching || isBotTyping) && (
            <MessageBubble
              role="assistant"
              content={streamingReply}
              isStreaming={true}
              isThinking={!streamingReply}
            />
          )}
        </div>
      </div>

      {/* Fixed Input Area - Text stops above this line; background pattern shows through */}
      <div className="shrink-0 z-10 relative pb-2 md:pb-4 bg-transparent pr-[6px]">
        {showScrollBottom && (
          <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={() => scrollToBottom(true)}
              className="p-2.5 rounded-full bg-surface-primary border border-border-primary text-text-primary shadow-[0_4px_14px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:bg-surface-secondary transition-all"
            >
              <FiArrowDown className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="w-full max-w-[820px] mx-auto px-4 sm:px-6">
          <ChatInput
            onSend={handleSendSubmit}
            isGenerating={isSearching || isBotTyping}
            onStop={handleStopGeneration}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
