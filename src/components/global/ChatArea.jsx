import { useState, useEffect, useRef } from "react";
import { FiMessageSquare, FiCode, FiLayout, FiBookOpen, FiMail, FiServer, FiCpu, FiCheckCircle, FiX, FiActivity, FiVolume2, FiVolumeX, FiStopCircle } from "react-icons/fi";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ClusterStatusWidget from "./ClusterStatusWidget";
import { useTheme } from "../../context/ThemeContext";
import { useTanStackQueryClient } from "../../hooks/useTanStackData";

const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated, onToggleMobileSidebar }) => {
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();
  const [messages, setMessages] = useState([]);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);

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

  // Health check polling removed as requested

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
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
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
    <div className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden relative ${"bg-white dark:bg-interactive-active/40 text-text-primary dark:text-text-muted"
      }`}>

      {/* Fixed Sticky Header Bar */}
      <div className={`px-4 md:px-6 py-3 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${"bg-interactive-base dark:bg-interactive-base/60 border-border-primary dark:border-border-primary/60"
        }`}>
        <div className="flex items-center gap-2 truncate">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className={`md:hidden p-1.5 rounded-lg border flex items-center gap-1 text-xs shrink-0 cursor-pointer transition ${"bg-surface-secondary dark:bg-interactive-active hover:bg-interactive-base text-text-primary border-border-primary"
                }`}
              title="Toggle Threads List"
            >
              <FiMessageSquare className="text-sm" />
              <span className="text-[11px] font-medium">Threads</span>
            </button>
          )}
          <span className={`font-semibold text-xs tracking-wide truncate ${"text-text-primary dark:text-text-muted"}`}>
            General AI Assistant 
          </span>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Reusable Cluster Status Widget */}
          <ClusterStatusWidget clusterNodes={clusterNodes} isDark={isDark} isLoading={isClusterLoading} />

          {/* Fixed Always-Visible Voice Over Control Toggle Button */}
          <button
            onClick={toggleVoiceOver}
            className={`flex items-center gap-1.5 border px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer active:scale-95 ${isVoicePaused
              ? "bg-surface-secondary text-text-primary border-border-primary hover:bg-surface-secondary hover:text-text-primary dark:bg-interactive-active dark:text-text-primary dark:border-border-primary dark:hover:bg-interactive-base dark:hover:text-text-muted"
              : isAudioActive
                ? "bg-interactive-base/20 hover:bg-interactive-base/30 text-text-primary border-border-primary/30 shadow-sm"
                : "bg-interactive-base/20 hover:bg-interactive-base/30 text-text-primary border-border-primary/30"
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
                <span className="hidden lg:block">Voice Muted</span>
              </>
            ) : isAudioActive ? (
              <>
                <FiVolume2 className="text-sm animate-pulse text-text-primary" />
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
        className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar flex flex-col"
      >
        <div className="w-full flex-1 max-w-3xl mx-auto px-3 md:px-6 py-6 flex flex-col space-y-3">
          {isFetchingMessages && (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white animate-spin mb-3 mx-auto"></div>
              <p className="text-xs text-text-primary">Loading chat...</p>
            </div>
          )}

          {!isFetchingMessages && messages.length === 0 && !isSearching && !isBotTyping && (
            <div className="h-full flex flex-col items-center justify-center pt-10 pb-8 px-4 w-full max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-interactive-base/80 flex items-center justify-center mb-6 shadow-sm border border-border-primary/50">
                {/* <FiCpu className={`text-3xl ${"text-text-primary dark:text-text-muted"}`} /> */}
                <img src="/mini-logo2.png" alt="logo" className={`w-9 h-9 ${isDark? "invert" : ""}`}/>
              </div>
              <h2 className={`text-2xl font-bold mb-2 tracking-tight ${"text-text-primary dark:text-text-muted"}`}>
                General AI Assistant
              </h2>
              <p className={`text-sm mb-6 lg:mb-10 text-center ${"text-text-muted dark:text-text-primary"}`}>
                Start a conversation or choose a suggestion below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  { title: "Write Code", icon: FiCode, prompt: "Write a React functional component for a modern landing page." },
                  { title: "Design Landing Page", icon: FiLayout, prompt: "Create a modern layout structure and color palette for a SaaS product." },
                  { title: "Explain a Concept", icon: FiBookOpen, prompt: "Explain quantum computing in simple terms for a beginner." },
                  { title: "Draft an Email", icon: FiMail, prompt: "Write a professional email requesting a project status update." }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendSubmit(item.prompt)}
                    className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 group ${
                      "bg-surface-secondary hover:bg-white cursor-pointer border-border-primary shadow-sm hover:shadow-md dark:bg-[#131212] dark:hover:bg-[#0e0d0d] dark:border-border-primary/40 dark:hover:border-border-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 rounded-lg border bg-white border-border-primary/60 dark:bg-[#222222] dark:border-border-primary/40 shadow-sm flex items-center justify-center shrink-0">
                        <item.icon className={`text-[15px] ${"text-text-primary dark:text-text-muted"}`} />
                      </div>
                      <span className={`font-semibold text-sm ${"text-text-primary dark:text-text-muted"}`}>{item.title}</span>
                    </div>
                    <span className={`text-xs leading-relaxed tracking-wide line-clamp-2 ${"text-text-muted dark:text-text-primary/60"}`}>
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isFetchingMessages && messages.map((m, index) => {
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
              <div className={`p-3 rounded-2xl border italic text-xs animate-pulse ${"bg-surface-secondary dark:bg-interactive-base border-border-primary text-text-primary"
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
