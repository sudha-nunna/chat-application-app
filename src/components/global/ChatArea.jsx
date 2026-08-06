import { useState, useEffect, useRef } from "react";
import { FiMessageSquare, FiServer, FiCpu, FiCheckCircle, FiX, FiActivity, FiVolume2, FiVolumeX, FiStopCircle } from "react-icons/fi";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ClusterStatusWidget from "./ClusterStatusWidget";
import { useTheme } from "../../context/ThemeContext";

const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated, onToggleMobileSidebar }) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([]);

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

  // useEffect(() => {
  //   fetchClusterStatus();
  //   const interval = setInterval(fetchClusterStatus, 12000);
  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusModalRef.current && !statusModalRef.current.contains(event.target)) {
        setShowStatusModal(false);
      }
    };
    if (showStatusModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusModal]);

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

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentSentenceBufferRef = useRef("");

  useEffect(() => {
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

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, streamingReply, isSearching, isBotTyping]);

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
    try {
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
    }
  };

  const handleSendSubmit = async (textPayload) => {
    if (!textPayload.trim()) return;

    const t0 = performance.now();
    let firstTokenTime = null;

    console.log(`\n🚀 [FRONTEND GENERAL CHAT START] User Prompt: "${textPayload}" at t=0 ms`);

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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: textPayload,
            mode: conversationMode
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) throw new Error(`Server returned status code: ${response.status}`);
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
                }
              } else if (parsed.type === "chunk") {
                const textBit = parsed.text || "";
                if (!firstTokenTime) {
                  firstTokenTime = performance.now();
                  const ttftMs = (firstTokenTime - t0).toFixed(2);
                  console.log(`⚡ [FRONTEND TTFT] Time To First Token received in browser: ${ttftMs} ms (${(ttftMs / 1000).toFixed(2)} s)`);
                }

                currentStreamingTextRef.current += textBit;
                setStreamingReply(currentStreamingTextRef.current);
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
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
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
    }
  };

  return (
    <div className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden relative ${isDark ? "bg-slate-900/50 text-slate-100" : "bg-white text-slate-900"
      }`}>

      {/* Fixed Sticky Header Bar */}
      <div className={`px-4 md:px-6 py-3 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${isDark ? "bg-slate-950/60 border-slate-800/60" : "bg-slate-50 border-slate-200"
        }`}>
        <div className="flex items-center gap-2 truncate">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className={`md:hidden p-1.5 rounded-lg border flex items-center gap-1 text-xs shrink-0 ${isDark ? "bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700" : "bg-slate-200 hover:bg-slate-300 text-blue-600 border-slate-300"
                }`}
              title="Toggle Threads List"
            >
              <FiMessageSquare className="text-sm" />
              <span className="text-[11px] font-medium">Threads</span>
            </button>
          )}
          <span className={`font-semibold text-xs tracking-wide truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>
            General AI Assistant (ChatGPT Mode)
          </span>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Reusable Cluster Status Widget */}
          <ClusterStatusWidget clusterNodes={clusterNodes} isDark={isDark} isLoading={isClusterLoading} />

          {/* Fixed Always-Visible Voice Over Control Toggle Button */}
          <button
            onClick={toggleVoiceOver}
            className={`flex items-center gap-1.5 border px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer active:scale-95 ${isVoicePaused
              ? isDark
                ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200"
                : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200 hover:text-slate-800"
              : isAudioActive
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border-rose-500/30 shadow-sm"
                : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 border-blue-500/30"
              }`}
            title={
              isVoicePaused
                ? "Voice Muted. Click to Enable Voice Over"
                : isAudioActive
                  ? "Voice Playing. Click to Stop Voice"
                  : "Voice Enabled. Click to Mute Voice"
            }
          >
            {isVoicePaused ? (
              <>
                <FiVolumeX className="text-sm" />
                <span>Voice Muted</span>
              </>
            ) : isAudioActive ? (
              <>
                <FiVolume2 className="text-sm animate-pulse text-rose-500" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <FiVolume2 className="text-sm" />
                <span>Voice On</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area - ONLY this section scrolls */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar"
      >
        {messages.length === 0 && !isSearching && !isBotTyping && (
          <div className={`h-full flex items-center justify-center font-medium text-xs ${isDark ? "text-slate-500" : "text-slate-400"
            }`}>
            Start a conversation with the General AI Assistant...
          </div>
        )}

        {messages.map((m, index) => {
          const userMsg = [...messages.slice(0, index)].reverse().find(msg => msg.role === "user");
          return (
            <MessageBubble
              key={index}
              role={m.role}
              content={m.content}
              onRetry={userMsg ? () => handleSendSubmit(userMsg.content) : undefined}
            />
          );
        })}

        {isSearching && (
          <div className="flex justify-start">
            <div className={`p-3 rounded-2xl border italic text-xs animate-pulse ${isDark ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
              }`}>
              Thinking...
            </div>
          </div>
        )}


        {isBotTyping && (
          <MessageBubble
            role="assistant"
            content={streamingReply || "Loading response..."}
          />
        )}
      </div>

      {/* Fixed Input Area with ChatGPT style Stop Button inside */}
      <div className="shrink-0">
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
