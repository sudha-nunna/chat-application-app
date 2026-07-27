import { useState, useEffect, useRef } from "react";
import { FiMessageSquare } from "react-icons/fi";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

const ChatArea = ({ currentChatId, setCurrentChatId, onChatUpdated, onToggleMobileSidebar }) => {
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false); 
  const [streamingReply, setStreamingReply] = useState("");
  const [isAudioActive, setIsAudioActive] = useState(false); 
  const messagesContainerRef = useRef(null);
  const currentStreamingTextRef = useRef("");

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

  const processAudioQueue = () => {
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
        processAudioQueue(); 
      };

      utterance.onerror = () => {
        isPlayingRef.current = false;
        processAudioQueue();
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
        `${import.meta.env.VITE_API_URL}/chats/${currentChatId}/messages`,
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

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/ollama/message/${targetChatEndpoint}`,
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
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
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

      setStreamingReply("");
      currentStreamingTextRef.current = "";
      setIsBotTyping(false);
      if (onChatUpdated) onChatUpdated();
    } catch (err) {
      console.error("Stream parsing exception:", err);
      setIsSearching(false);
      setIsBotTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Error: Unable to process request.` }
      ]);
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative text-slate-100 bg-slate-900/50">
      
      {/* Fixed Sticky Header Bar */}
      <div className="px-4 md:px-6 py-3 bg-slate-950/60 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 flex items-center gap-1 text-xs shrink-0"
              title="Toggle Threads List"
            >
              <FiMessageSquare className="text-sm" />
              <span className="text-[11px] font-medium">Threads</span>
            </button>
          )}
          <span className="font-semibold text-xs text-slate-200 tracking-wide truncate">
            General AI Assistant (ChatGPT Mode)
          </span>
        </div>

        {isAudioActive && (
          <button
            onClick={clearAudioPipeline}
            className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-lg text-xs font-medium transition"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            Stop Voice
          </button>
        )}
      </div>

      {/* Messages Scroll Area - ONLY this section scrolls */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar"
      >
        {messages.length === 0 && !isSearching && !isBotTyping && (
          <div className="h-full flex items-center justify-center text-slate-500 font-medium text-xs">
            Start a conversation with the General AI Assistant...
          </div>
        )}

        {messages.map((m, index) => (
          <MessageBubble key={index} role={m.role} content={m.content} />
        ))}

        {isSearching && (
          <div className="flex justify-start">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-slate-400 italic text-xs animate-pulse">
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

      {/* Fixed Input Area */}
      <div className="shrink-0">
        <ChatInput onSend={handleSendSubmit} />
      </div>
    </div>
  );
};

export default ChatArea;
