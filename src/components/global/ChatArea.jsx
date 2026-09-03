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
  const isVoicePausedRef = useRef(true);
  const isAbortedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [clusterNodes, setClusterNodes] = useState([]);
  const [isClusterLoading, setIsClusterLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const statusModalRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const currentStreamingTextRef = useRef("");
  const isGeneratingRef = useRef(false);

  // Health check polling removed as requested

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentSentenceBufferRef = useRef("");

  useEffect(() => {
    if (isGeneratingRef.current) {
      return;
    }

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

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingReply, isSearching, isBotTyping]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
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
    if (isGeneratingRef.current) return;
    try {
      setIsFetchingMessages(true);
      setMessages([]);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/chats/${currentChatId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error reading history collections:", err);
    } finally {
      setIsFetchingMessages(false);
    }
  };

  const handleSendSubmit = async (textPayload, audioBlob, selectedModelId) => {
    if (!textPayload.trim()) return;

    const t0 = performance.now();
    let firstTokenTime = null;

    console.log(`\n🚀 [FRONTEND GENERAL CHAT START] User Prompt: "${textPayload}" at t=0 ms`);

    isGeneratingRef.current = true;
    isAbortedRef.current = false;
    clearAudioPipeline();

    if (window.speechSynthesis && window.speechSynthesis.paused && !isVoicePausedRef.current) {
      window.speechSynthesis.resume();
    }

    setMessages((prev) => [...prev, { role: "user", content: textPayload }]);
    setIsSearching(true);
    setIsBotTyping(false);
    setStreamingReply("");
    currentStreamingTextRef.current = "";

    const typeText = async (text) => {
      const chunkSize = 3;
      for (let i = 0; i < text.length; i += chunkSize) {
        if (isAbortedRef.current) break;
        const chars = text.slice(i, i + chunkSize);
        currentStreamingTextRef.current += chars;
        setStreamingReply(currentStreamingTextRef.current);
        await new Promise(r => setTimeout(r, 15));
      }
    };

    try {
      const token = localStorage.getItem("token");
      const targetChatEndpoint = currentChatId && currentChatId !== "new" ? currentChatId : "new";
      const conversationMode = "text";

      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/ollama/message/${targetChatEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: textPayload,
            mode: conversationMode,
            model: selectedModelId,
            modelId: selectedModelId,
            stream: true
          }),
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

      setIsSearching(false);
      setIsBotTyping(true);

      while (!streamFinished) {
        if (isAbortedRef.current) break;
        const { value, done } = await reader.read();
        if (done || isAbortedRef.current) break;

        console.log(`[STREAM DEBUG] Received chunk of length ${value.length} at ${performance.now().toFixed(2)}ms`);

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (isAbortedRef.current) break;
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith("data: ")) {
            const dataStr = cleanedLine.replace("data: ", "").trim();

            if (dataStr === "[DONE]") {
              streamFinished = true;
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "meta") {
                if (!currentChatId || currentChatId === "new") {
                  setCurrentChatId(parsed.chatId);
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
                }
              } else if (parsed.type === "chunk") {
                const textBit = parsed.text || "";
                if (!firstTokenTime) {
                  firstTokenTime = performance.now();
                  const ttftMs = (firstTokenTime - t0).toFixed(2);
                  console.log(`⚡ [FRONTEND TTFT] Time To First Token received in browser: ${ttftMs} ms (${(ttftMs / 1000).toFixed(2)} s)`);
                }

                await typeText(textBit);
                handleIncomingTextChunk(textBit);
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

      if (isAbortedRef.current) return;

      if (currentSentenceBufferRef.current.trim()) {
        audioQueueRef.current.push(currentSentenceBufferRef.current.trim());
        processAudioQueue();
      }

      const finalResponseContent = currentStreamingTextRef.current;
      if (finalResponseContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: finalResponseContent },
        ]);
      }

      const totalTime = (performance.now() - t0).toFixed(2);
      const streamDuration = firstTokenTime ? (performance.now() - firstTokenTime).toFixed(2) : "N/A";

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
      if (onChatUpdated) onChatUpdated();
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
      setStreamingReply("");
      currentStreamingTextRef.current = "";
    } finally {
      isGeneratingRef.current = false;
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
          <span className="font-semibold text-[13px] tracking-wide text-text-primary dark:text-[#e5e5e5]">
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
                  if (c._id && typeof c._id === "string" && c._id.length === 24) {
                    const timestamp = parseInt(c._id.substring(0, 8), 16) * 1000;
                    if (!isNaN(timestamp)) return new Date(timestamp);
                  }
                  return new Date();
                };

                const chatDate = getChatDate(currentChat);
                const now = new Date();
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
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent border border-border-primary dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary dark:text-[#e5e5e5] text-[12px] font-medium transition-colors cursor-pointer">
              <FiShare2 className="text-[14px]" />
              Share
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
        className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar flex flex-col relative"
      >
        <div
          className={`w-full flex-1 max-w-2xl md:max-w-[720px] mx-auto px-4 py-4 flex flex-col ${!isFetchingMessages && messages.length === 0 && !isSearching && !isBotTyping ? "justify-center" : "space-y-2.5"}`}
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
              <div className="flex flex-col items-start justify-center md:px-4 w-full max-w-2xl md:max-w-[720px] mx-auto py-6 md:py-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-[1px] w-8 bg-accent-primary"></div>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
                    Intelligence, without the noise
                  </span>
                </div>
                <h2
                  className={`text-[26px] md:text-[38px] font-serif leading-tight tracking-tight mb-4 ${"text-text-primary dark:text-[#F4F4F5]"}`}
                >
                  What can we{" "}
                  <span className="text-accent-primary italic font-normal">
                    make clear
                  </span>{" "}
                  today?
                </h2>
                <p className="text-xs md:text-sm text-text-muted max-w-md leading-relaxed mb-6">
                  Codegene helps you reason through hard problems, build useful
                  things, and move from a blank page to a precise result.
                </p>

                {/* Quick Actions */}
                <div className="flex flex-col md:flex-row w-full max-w-2xl md:max-w-[720px] rounded-xl border border-border-primary dark:border-white/5 overflow-hidden shadow-sm bg-white dark:bg-[#191a24]">
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
                    <span className="font-semibold text-[14px] mb-1.5 leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide">
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
                    <span className="font-semibold text-[14px] mb-1.5 leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide">
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
                    <span className="font-semibold text-[14px] mb-1.5 leading-none text-text-primary dark:text-[#e5e5e5] tracking-wide">
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
              const userMsg = [...messages.slice(0, index)]
                .reverse()
                .find((msg) => msg.role === "user");
              return (
                <MessageBubble
                  key={index}
                  role={m.role}
                  content={m.content}
                  onRetry={
                    userMsg
                      ? (newContent) =>
                          handleSendSubmit(newContent || userMsg.content)
                      : undefined
                  }
                />
              );
            })}

          {(isSearching || (isBotTyping && !streamingReply)) && (
            <div className="flex items-start gap-1 mr-auto w-full max-w-full my-2.5 min-w-0">
              <div
                className={`w-5 lg:w-7 h-5 lg:h-7 flex items-center justify-center shrink-0 bg-transparent text-text-primary mt-1`}
              >
                <svg
                  className="animate-spin w-5 h-5 text-[#8a8a93]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <div className="flex items-center h-8 lg:h-10">
                <div className="flex items-center">
                  <span className="text-[14px] font-medium text-text-muted dark:text-[#8a8a93]">Processing</span>
                  <span className="text-[14px] font-medium text-text-muted dark:text-[#8a8a93] flex ml-[1px]">
                    <span className="animate-typing-dot" style={{ animationDelay: '0s' }}>.</span>
                    <span className="animate-typing-dot" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-typing-dot" style={{ animationDelay: '0.4s' }}>.</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {isBotTyping && streamingReply && (
            <MessageBubble role="assistant" content={streamingReply} />
          )}
        </div>
      </div>

      {/* Fixed Input Area with ChatGPT style Stop Button inside */}
      <div className="shrink-0 z-10 relative pb-2 md:pb-4 bg-transparent">
        {showScrollBottom && (
          <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={scrollToBottom}
              className="p-2.5 rounded-full bg-surface-primary border border-border-primary text-text-primary shadow-[0_4px_14px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:bg-surface-secondary transition-all"
            >
              <FiArrowDown className="w-4 h-4" />
            </button>
          </div>
        )}
        <ChatInput
          onSend={handleSendSubmit}
          isGenerating={isSearching || isBotTyping}
          onStop={handleStopGeneration}
        />
      </div>
    </div>
  );
};

export default ChatArea;
