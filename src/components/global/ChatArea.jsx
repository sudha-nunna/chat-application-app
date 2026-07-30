import { useState, useEffect, useRef } from "react";
import { FiMessageSquare, FiServer, FiCpu, FiCheckCircle, FiX, FiActivity, FiVolume2, FiVolumeX, FiStopCircle } from "react-icons/fi";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useTheme } from "../../context/ThemeContext";

const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated, onToggleMobileSidebar }) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([]);

  const [isSearching, setIsSearching] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false); 
  const [streamingReply, setStreamingReply] = useState("");
  const [isAudioActive, setIsAudioActive] = useState(false); 
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const isVoicePausedRef = useRef(false);
  const isAbortedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [clusterNodes, setClusterNodes] = useState([
    { id: "Node-1", name: "Primary Node", status: "HEALTHY", defaultModel: "qwen2.5:1.5b", activeRequests: 0 },
    { id: "Node-2", name: "Secondary Node", status: "HEALTHY", defaultModel: "gemma-3-4b-it", activeRequests: 0 }
  ]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const messagesContainerRef = useRef(null);
  const currentStreamingTextRef = useRef("");

  useEffect(() => {
    fetchClusterStatus();
    const interval = setInterval(fetchClusterStatus, 12000);
    return () => clearInterval(interval);
  }, []);

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
    } catch (e) {}
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
    setIsVoicePaused(false);
    isVoicePausedRef.current = false;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleVoiceOver = () => {
    if (!("speechSynthesis" in window)) return;

    if (isVoicePaused) {
      window.speechSynthesis.resume();
      setIsVoicePaused(false);
      isVoicePausedRef.current = false;
    } else {
      window.speechSynthesis.pause();
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

    if (window.speechSynthesis && window.speechSynthesis.paused) {
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
                  console.log(`⚡ [FRONTEND TTFT] Time To First Token received in browser: ${ttftMs} ms (${(ttftMs/1000).toFixed(2)} s)`);
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
            } catch (e) {}
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
  └── 🏁 Total UI Round-Trip Time:    ${totalTime} ms (${(totalTime/1000).toFixed(2)} s)
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
    <div className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden relative ${
      isDark ? "bg-slate-900/50 text-slate-100" : "bg-white text-slate-900"
    }`}>
      
      {/* Fixed Sticky Header Bar */}
      <div className={`px-4 md:px-6 py-3 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${
        isDark ? "bg-slate-950/60 border-slate-800/60" : "bg-slate-50 border-slate-200"
      }`}>
        <div className="flex items-center gap-2 truncate">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className={`md:hidden p-1.5 rounded-lg border flex items-center gap-1 text-xs shrink-0 ${
                isDark ? "bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700" : "bg-slate-200 hover:bg-slate-300 text-blue-600 border-slate-300"
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
          {/* Cluster Health Pill Badge */}
          <button
            onClick={() => setShowStatusModal(!showStatusModal)}
            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer"
            title="Click to view AI Cluster Health & Load Balancing"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <FiServer className="text-xs" />
            <span className="hidden sm:inline">Cluster: 2 Nodes Online</span>
            <span className="sm:hidden">2 Nodes</span>
          </button>

          {/* Interactive Cluster Health Status Modal Popover */}
          {showStatusModal && (
            <div className={`absolute right-0 top-10 z-50 w-80 border rounded-xl shadow-2xl p-4 text-xs ${
              isDark ? "bg-slate-900 border-slate-700/80 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-slate-300/50"
            }`}>
              <div className={`flex items-center justify-between border-b pb-2.5 mb-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                <div className={`flex items-center gap-2 font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  <FiServer className="text-blue-500" />
                  <span>AI Cluster Health Status</span>
                </div>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className={`p-1 rounded-md ${isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
                >
                  <FiX />
                </button>
              </div>

              <div className="space-y-2.5">
                {clusterNodes.map((node, idx) => (
                  <div key={idx} className={`border rounded-lg p-2.5 ${isDark ? "bg-slate-950/70 border-slate-800/80" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{node.id} ({node.name || `Node ${idx+1}`})</span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <FiCheckCircle className="text-[10px]" />
                        {node.status || "HEALTHY"}
                      </span>
                    </div>
                    <div className={`text-[11px] space-y-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      <p>• Model: <span className={`font-mono text-[10px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>{node.defaultModel}</span></p>
                      <p>• Active Load: <span className={isDark ? "text-slate-200" : "text-slate-800"}>{node.activeRequests || 0} active request(s)</span></p>
                      <p className="truncate">• Endpoint: <span className={`font-mono text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{node.url}</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mt-3 pt-2 border-t text-[10px] flex items-center gap-1.5 ${isDark ? "border-slate-800/80 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                <FiActivity className="text-blue-500 shrink-0" />
                <span>Smart Load Balancer dispatches concurrent requests automatically.</span>
              </div>
            </div>
          )}

          {/* Real-World Voice Over Control Button (Stop/Pause & Enable/Resume Present Response) */}
          {isAudioActive && (
            <button
              onClick={toggleVoiceOver}
              className={`flex items-center gap-1.5 border px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                isVoicePaused
                  ? "bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 border-blue-500/30"
                  : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border-rose-500/30"
              }`}
              title={isVoicePaused ? "Click to Enable & Resume Voice" : "Click to Stop & Pause Voice"}
            >
              {isVoicePaused ? (
                <>
                  <FiVolume2 className="text-sm" />
                  <span>Enable Voice</span>
                </>
              ) : (
                <>
                  <FiVolumeX className="text-sm animate-pulse" />
                  <span>Stop Voice</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area - ONLY this section scrolls */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar"
      >
        {messages.length === 0 && !isSearching && !isBotTyping && (
          <div className={`h-full flex items-center justify-center font-medium text-xs ${
            isDark ? "text-slate-500" : "text-slate-400"
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
            <div className={`p-3 rounded-2xl border italic text-xs animate-pulse ${
              isDark ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
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
