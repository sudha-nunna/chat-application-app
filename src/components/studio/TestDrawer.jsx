import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  FiX,
  FiPlay,
  FiSquare,
  FiMic,
  FiVolume2,
  FiInfo,
  FiSend,
  FiChevronDown
} from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VoiceConversationManager from "../avatar/VoiceConversationManager";
import { speakText, stopSpeech } from "../../utils/speechUtils";
import { NobackEndCallObj, getJwt } from "../../services/authService";

function prepareMarkdownContent(text) {
  if (!text || typeof text !== "string") return "";
  // Ensure markdown headings preceded by text have proper newlines
  let formatted = text.replace(/([^\n])\s*(#{1,4}\s)/g, "$1\n\n$2");
  // Normalize bullet dots (•) to markdown bullet dash (- )
  formatted = formatted.replace(/^[ \t]*•[ \t]*/gm, "- ");
  // Ensure bullets preceded by inline text have newlines
  formatted = formatted.replace(/([^\n])\s*(- \w)/g, "$1\n$2");
  return formatted;
}

const markdownComponents = {
  h1: ({ children, ...props }) => (
    <h1 className="text-sm font-bold text-text-primary mt-2.5 mb-1.5 border-b border-border-primary/50 pb-1" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xs font-bold text-text-primary mt-2 mb-1" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-[11px] font-bold text-text-primary mt-1.5 mb-0.5" {...props}>{children}</h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0 leading-relaxed break-words [overflow-wrap:anywhere]" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-outside my-2 space-y-1 pl-4 text-xs marker:text-accent-primary" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-outside my-2 space-y-1 pl-4 text-xs marker:text-accent-primary" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed pl-0.5" {...props}>{children}</li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-bold text-text-primary dark:text-amber-400" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>{children}</em>
  ),
  table: ({ children, ...props }) => (
    <div className="w-full overflow-x-auto my-2 rounded-lg border border-border-primary/60 custom-scrollbar">
      <table className="w-full border-collapse text-left text-[11px] min-w-full" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-surface-secondary text-text-primary font-semibold border-b border-border-primary/60 text-[10px] uppercase tracking-wider" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-2.5 py-1.5 font-semibold align-top whitespace-nowrap" {...props}>{children}</th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-2.5 py-1.5 border-b border-border-primary/40 align-top" {...props}>{children}</td>
  ),
  tr: ({ children, ...props }) => (
    <tr className="hover:bg-surface-secondary/40 even:bg-surface-primary/30 transition-colors" {...props}>{children}</tr>
  ),
  code: ({ children, ...props }) => (
    <code className="px-1 py-0.5 rounded bg-surface-secondary font-mono text-[11px] text-accent-primary border border-border-primary/40" {...props}>{children}</code>
  ),
  hr: ({ ...props }) => (
    <hr className="my-2 border-border-primary/40" {...props} />
  )
};

export default function TestDrawer({
  isOpen,
  onClose,
  agentId,
  nodes = [],
  voiceProfile,
  globalPrompt = "",
  model = "glm-5.3-flash:cloud"
}) {
  const [activeTab, setActiveTab] = useState("llm"); // "llm" matches Image 2 by default; "audio" | "variables"
  const [drawerWidth, setDrawerWidth] = useState(330); // Adjustable width like info panel
  const isResizingRef = useRef(false);

  // Drag resize from left edge (moving left increases width, moving right decreases width)
  const startResizing = useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const startX = mouseDownEvent.clientX;
    const startWidth = drawerWidth;

    const handleMouseMove = (mouseMoveEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = startX - mouseMoveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 260), 650);
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [drawerWidth]);

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [currentRunningNode, setCurrentRunningNode] = useState(null);

  // LLM chat test state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat to bottom smoothly whenever messages or thinking state change
  useEffect(() => {
    if (activeTab === "llm") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isThinking, activeTab]);

  // Active welcome node helper
  const welcomeNode = nodes.find((n) => n.id === "welcome-node") || nodes[1] || nodes[0];

  // Audio test voice state
  const [isMicListening, setIsMicListening] = useState(false);
  const [interimSpokenText, setInterimSpokenText] = useState("");
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const voiceManagerRef = useRef(null);
  const activeAudioPlayerRef = useRef(null);
  const simulateSpeechRef = useRef(null);

  // Initialize Voice Conversation Manager with 2.0s silence VAD and Barge-In
  useEffect(() => {
    voiceManagerRef.current = new VoiceConversationManager({
      silenceTimeoutMs: 2000, // 2s pause to conclude user turn
      onListeningStart: () => {
        setIsMicListening(true);
      },
      onSpeechDetected: (text) => {
        setInterimSpokenText(text);
      },
      onSpeechEnded: () => {
        setIsMicListening(false);
      },
      onTranscriptComplete: (finalTranscript) => {
        if (finalTranscript && finalTranscript.trim()) {
          setInterimSpokenText("");
          simulateSpeechRef.current?.(finalTranscript.trim());
        }
      },
      onBargeIn: (interruptedText) => {
        // Barge-in: user spoke while AI was speaking aloud!
        stopSpeech();
        if (activeAudioPlayerRef.current) {
          try {
            activeAudioPlayerRef.current.pause();
            activeAudioPlayerRef.current.currentTime = 0;
          } catch {
            /* ignore audio pause error */
          }
        }
        setIsAssistantSpeaking(false);
        setInterimSpokenText(interruptedText);
      },
      onError: (err) => {
        console.warn("Audio speech recognition notice:", err);
      }
    });

    return () => {
      voiceManagerRef.current?.stopListening();
      stopSpeech();
      if (activeAudioPlayerRef.current) {
        try {
          activeAudioPlayerRef.current.pause();
        } catch {
          /* ignore audio pause error */
        }
      }
    };
  }, []);

  const handleClose = () => {
    voiceManagerRef.current?.stopListening();
    stopSpeech();
    if (activeAudioPlayerRef.current) {
      try {
        activeAudioPlayerRef.current.pause();
      } catch {
        /* ignore audio pause error */
      }
    }
    setIsTestRunning(false);
    setIsAssistantSpeaking(false);
    setIsMicListening(false);
    setInterimSpokenText("");
    onClose();
  };

  // Handle Run Test (Audio Webcall Simulation)
  const handleToggleRunTest = () => {
    if (isTestRunning) {
      voiceManagerRef.current?.stopListening();
      stopSpeech();
      if (activeAudioPlayerRef.current) {
        try {
          activeAudioPlayerRef.current.pause();
        } catch {
          /* ignore audio pause error */
        }
      }
      setIsTestRunning(false);
      setIsAssistantSpeaking(false);
      setIsMicListening(false);
      setInterimSpokenText("");
      setCurrentRunningNode(null);
    } else {
      setIsTestRunning(true);
      setTranscript([]);

      // Find initial welcome node
      const initialGreeting =
        welcomeNode?.data?.text ||
        "Hello! How can I assist you with your inquiry today?";

      setCurrentRunningNode(welcomeNode);
      setTranscript([
        { role: "agent", text: initialGreeting, nodeTitle: welcomeNode?.title || "Welcome Node" }
      ]);

      // Agent speaks welcome greeting first in selected voice; once finished, microphone starts listening
      setIsAssistantSpeaking(true);
      voiceManagerRef.current?.setAssistantSpeaking(true, initialGreeting);

      const onGreetingFinish = () => {
        setIsAssistantSpeaking(false);
        voiceManagerRef.current?.setAssistantSpeaking(false);
        voiceManagerRef.current?.startListening("HANDS_FREE");
      };

      const playGreeting = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
          const token = getJwt?.() || "";
          const headers = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`${apiUrl}/agents/voice/preview`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              text: initialGreeting,
              voiceId: voiceProfile?.id || "cimo",
              voiceConfig: voiceProfile || { voiceId: "cimo" }
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.audioUrl) {
              const fullAudioSrc = data.audioUrl.startsWith("http")
                ? data.audioUrl
                : `${apiUrl.replace(/\/$/, "")}${data.audioUrl.startsWith("/") ? "" : "/"}${data.audioUrl}`;
              const audio = new Audio(fullAudioSrc);
              activeAudioPlayerRef.current = audio;
              audio.onended = onGreetingFinish;
              audio.onerror = () => {
                speakText(initialGreeting, {
                  gender: voiceProfile?.gender,
                  onEnd: onGreetingFinish,
                  onError: onGreetingFinish
                });
              };
              await audio.play();
              return;
            }
          }
        } catch {
          /* ignore */
        }

        speakText(initialGreeting, {
          gender: voiceProfile?.gender,
          onEnd: onGreetingFinish,
          onError: onGreetingFinish
        });
      };

      playGreeting();
    }
  };

  // Simulate user reply in audio test
  const handleSimulateUserSpeech = async (userPhrase) => {
    stopSpeech();
    if (activeAudioPlayerRef.current) {
      try {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current.currentTime = 0;
      } catch {
        /* ignore audio error */
      }
    }
    setIsAssistantSpeaking(false);
    setInterimSpokenText("");

    setTranscript((prev) => [...prev, { role: "user", text: userPhrase }]);

    try {
      const targetEndpoint = agentId && agentId !== "new" ? `/agents/${agentId}/chat` : "/agents/preview/chat";
      const res = await NobackEndCallObj(targetEndpoint, "POST", {
        message: userPhrase,
        activeNodeId: currentRunningNode?.id || "welcome-node",
        model: model,
        nodes: nodes,
        systemPrompt: globalPrompt,
        voiceProfile: voiceProfile,
        returnAudio: true,
        channel: "voice"
      });

      if (res && res.success) {
        const nextNode = res.nextNode || currentRunningNode;
        setCurrentRunningNode(nextNode);
        setTranscript((prev) => [
          ...prev,
          { role: "agent", text: res.replyText, nodeTitle: nextNode?.title, model: res.modelUsed || model }
        ]);

        // Agent speaks short conversational response
        setIsAssistantSpeaking(true);
        voiceManagerRef.current?.setAssistantSpeaking(true, res.replyText);

        const onSpeechFinish = () => {
          setIsAssistantSpeaking(false);
          voiceManagerRef.current?.setAssistantSpeaking(false);
          if (isTestRunning) {
            voiceManagerRef.current?.startListening("HANDS_FREE");
          }
        };

        if (activeAudioPlayerRef.current) {
          try {
            activeAudioPlayerRef.current.pause();
            activeAudioPlayerRef.current.currentTime = 0;
            activeAudioPlayerRef.current.onended = null;
            activeAudioPlayerRef.current.onerror = null;
          } catch {
            /* ignore */
          }
        }
        stopSpeech();

        if (res.audioUrl) {
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
          const fullAudioSrc = res.audioUrl.startsWith("http")
            ? res.audioUrl
            : `${apiUrl.replace(/\/$/, "")}${res.audioUrl.startsWith("/") ? "" : "/"}${res.audioUrl}`;
          const audio = new Audio(fullAudioSrc);
          activeAudioPlayerRef.current = audio;
          audio.onended = onSpeechFinish;
          audio.onerror = () => {
            speakText(res.replyText, {
              gender: voiceProfile?.gender,
              onEnd: onSpeechFinish,
              onError: onSpeechFinish
            });
          };
          audio.play().catch(() => {
            speakText(res.replyText, {
              gender: voiceProfile?.gender,
              onEnd: onSpeechFinish,
              onError: onSpeechFinish
            });
          });
        } else {
          speakText(res.replyText, {
            gender: voiceProfile?.gender,
            onEnd: onSpeechFinish,
            onError: onSpeechFinish
          });
        }
        return;
      }
    } catch (err) {
      console.warn("Audio test turn notice:", err.message);
    }

    setTimeout(() => {
      // Fallback local simulation logic
      let nextNode = null;
      let replyText = "";

      if (userPhrase.toLowerCase().includes("return")) {
        nextNode = nodes.find((n) => n.type === "function") || {
          title: "Function Tool",
          data: { functionName: "Returns Processing" }
        };
        replyText = "I understand you need to return a package. Let me look up your return options.";
      } else if (userPhrase.toLowerCase().includes("status") || userPhrase.toLowerCase().includes("order")) {
        nextNode = nodes.find((n) => n.type === "extract_variable") || {
          title: "Extract Variable",
          data: { variableName: "order_id" }
        };
        replyText = "Sure, I can check your order status. Please provide your order number.";
      } else {
        replyText = "Thank you. Let me see how I can assist you with that request.";
      }

      setCurrentRunningNode(nextNode);
      setTranscript((prev) => [
        ...prev,
        { role: "agent", text: replyText, nodeTitle: nextNode?.title }
      ]);

      speakText(replyText);
    }, 600);
  };

  useEffect(() => {
    simulateSpeechRef.current = handleSimulateUserSpeech;
  });

  // Handle LLM Text Chat Test with Real-time Token Streaming
  const handleSendChatMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isThinking) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsThinking(true);

    const apiUrl = import.meta.env.VITE_API_URL || "";
    const token = getJwt();
    const targetEndpoint = agentId && agentId !== "new" ? `/agents/${agentId}/chat` : "/agents/preview/chat";
    const fullUrl = (apiUrl.startsWith("http") ? apiUrl : "") + targetEndpoint;

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userText,
          activeNodeId: currentRunningNode?.id || "welcome-node",
          model,
          nodes,
          systemPrompt: globalPrompt,
          voiceProfile,
          stream: true,
          returnAudio: false
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedReply = "";
        let buffer = "";
        let hasAppendedAssistant = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === "chunk" && (parsed.chunk || parsed.text)) {
                accumulatedReply += (parsed.chunk || parsed.text);
                setIsThinking(false);

                if (!hasAppendedAssistant) {
                  hasAppendedAssistant = true;
                  setChatMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: accumulatedReply }
                  ]);
                } else {
                  setChatMessages((prev) => {
                    const copy = [...prev];
                    const lastIdx = copy.length - 1;
                    if (lastIdx >= 0 && copy[lastIdx].role === "assistant") {
                      copy[lastIdx] = { ...copy[lastIdx], content: accumulatedReply };
                    }
                    return copy;
                  });
                }
              } else if (parsed.type === "done") {
                if (parsed.nextNode) {
                  setCurrentRunningNode(parsed.nextNode);
                }
              }
            } catch {
              // Ignore non-JSON stream lines
            }
          }
        }

        if (accumulatedReply.trim()) {
          setIsThinking(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Streaming chat notice:", err.message);
    }

    // Fallback if network/stream fails
    try {
      const res = await NobackEndCallObj(targetEndpoint, {
        message: userText,
        activeNodeId: currentRunningNode?.id || "welcome-node",
        model,
        nodes,
        systemPrompt: globalPrompt,
        voiceProfile,
        returnAudio: false
      }, "POST");

      if (res && res.success) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.replyText }
        ]);
        if (res.nextNode) {
          setCurrentRunningNode(res.nextNode);
        }
        setIsThinking(false);
        return;
      }
    } catch (_fallbackErr) {
      console.warn("Fallback notice:", _fallbackErr.message);
    }

    setTimeout(() => {
      const currentNode = nodes.find((n) => n.id === (currentRunningNode?.id || "welcome-node")) || welcomeNode;
      const assistantReply = `Guided by active step "${currentNode?.title || "Welcome"}": "${currentNode?.data?.text || "How can I help you today?"}"`;

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantReply }
      ]);
      setIsThinking(false);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ width: `${drawerWidth}px` }}
      className="h-full border-l border-border-primary/60 bg-white dark:bg-surface-secondary flex flex-col shrink-0 z-30 select-none shadow-xl relative animate-fadeIn"
    >
      {/* Left Edge Resizing Drag Handle */}
      <div
        onMouseDown={startResizing}
        className="absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-accent-primary/50 active:bg-accent-primary transition-colors group z-40 flex items-center justify-center -translate-x-1"
        title="Drag left/right to adjust width"
      >
        <div className="w-[2px] h-8 rounded-full bg-border-primary/80 group-hover:bg-accent-primary group-active:bg-accent-primary transition-colors" />
      </div>

      {/* Header with tabs: Test Audio | Test LLM | {} | Close (Matches Image 2) */}
      <div className="p-3 border-b border-border-primary/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-border-primary/60 bg-surface-secondary/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("audio")}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "audio"
                ? "bg-white dark:bg-surface-primary text-text-primary shadow-xs border-2 border-blue-600"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Test Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("llm")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "llm"
                ? "bg-white dark:bg-surface-primary text-text-primary shadow-xs border-2 border-blue-600"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Test LLM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("variables")}
            className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs transition cursor-pointer ${
              activeTab === "variables"
                ? "bg-white dark:bg-surface-primary text-text-primary shadow-xs border-2 border-blue-600"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            &#123;&#125;
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab === "llm" && chatMessages.length > 0 && (
            <button
              type="button"
              onClick={() => setChatMessages([])}
              className="px-2 py-1 text-[10px] font-semibold text-text-muted hover:text-red-500 hover:bg-surface-secondary rounded-lg transition cursor-pointer"
              title="Clear chat history"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition cursor-pointer"
            title="Close test drawer"
          >
            <FiX className="text-base" />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "audio" ? (
          /* TAB 1: TEST AUDIO (Matches Screenshot 2) */
          <div className="flex flex-col h-full justify-between space-y-4">
            <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-4">
              {/* Large Microphone Icon Graphic */}
              <div className="relative flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!isTestRunning) {
                      handleToggleRunTest();
                    } else if (isAssistantSpeaking) {
                      // Manual barge-in interrupt on click
                      stopSpeech();
                      if (activeAudioPlayerRef.current) {
                        try {
                          activeAudioPlayerRef.current.pause();
                          activeAudioPlayerRef.current.currentTime = 0;
                        } catch {
                          /* ignore audio pause error */
                        }
                      }
                      setIsAssistantSpeaking(false);
                      voiceManagerRef.current?.setAssistantSpeaking(false);
                      voiceManagerRef.current?.startListening();
                    } else if (isMicListening && interimSpokenText.trim()) {
                      // Force commit speech without waiting 2s
                      voiceManagerRef.current?.commitImmediate?.();
                    }
                  }}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                    !isTestRunning
                      ? "bg-surface-secondary text-text-muted/60 border border-border-primary/60 hover:border-accent-primary hover:text-accent-primary"
                      : isAssistantSpeaking
                      ? "bg-amber-500 text-white shadow-xl shadow-amber-500/40 animate-pulse"
                      : isMicListening
                      ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 ring-4 ring-emerald-400/30"
                      : "bg-accent-primary text-white shadow-xl shadow-accent-primary/30"
                  }`}
                  title={
                    !isTestRunning
                      ? "Click to start call"
                      : isAssistantSpeaking
                      ? "AI is speaking. Speak or click to interrupt (Barge-In)"
                      : "Microphone active. Speak freely, 2s pause will auto-respond"
                  }
                >
                  {isAssistantSpeaking ? (
                    <FiVolume2 className="text-4xl animate-bounce" />
                  ) : (
                    <FiMic className={`text-4xl ${isMicListening ? "animate-pulse" : ""}`} />
                  )}

                  {/* Pulsing state ring */}
                  {isTestRunning && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isAssistantSpeaking ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-4 w-4 ${
                          isAssistantSpeaking ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </span>
                  )}
                </button>

                {/* Real-time speech status & 2s pause indicator */}
                {isTestRunning && (
                  <div className="mt-3 text-center px-4">
                    {isAssistantSpeaking ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        AI Speaking... (Speak to interrupt)
                      </div>
                    ) : isMicListening ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Listening... (Pause 2s to auto-send)
                        </div>
                        {interimSpokenText && (
                          <div className="text-[12px] font-medium text-text-primary bg-surface-secondary/70 px-3 py-1.5 rounded-xl border border-border-primary/50 max-w-[260px] truncate animate-fadeIn">
                            "{interimSpokenText}..."
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-text-muted">
                        Processing response...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Starting Node Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span>Starting Node:</span>
                <span className="font-bold text-text-primary flex items-center gap-1">
                  Begin <FiChevronDown className="text-xs text-text-muted" />
                </span>
              </div>
            </div>

            {/* Live conversation transcript during voice call */}
            {isTestRunning && (
              <div className="flex-1 min-h-[140px] max-h-[260px] overflow-y-auto custom-scrollbar p-3 rounded-2xl bg-surface-secondary/40 border border-border-primary/40 space-y-2.5">
                {transcript.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 text-text-muted text-[11px] leading-relaxed">
                    <span>Microphone is live. Speak naturally to converse with the agent.</span>
                  </div>
                ) : (
                  transcript.map((item, idx) => (
                    <div
                      key={idx}
                      className={`text-[11px] leading-relaxed p-2 rounded-xl ${
                        item.role === "agent"
                          ? "bg-accent-primary/10 text-accent-primary font-medium"
                          : "bg-surface-primary text-text-primary border border-border-primary/40"
                      }`}
                    >
                      <span className="font-bold uppercase text-[9px] block text-text-muted mb-0.5">
                        {item.role === "agent" ? `Agent (${item.nodeTitle || "Node"})` : "You"}:
                      </span>
                      {item.text}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Bottom: Warning Notice & Run Test Button */}
            <div className="space-y-3 pt-4 border-t border-border-primary/40">
              {/* Notice Box */}
              <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-border-primary/50 text-[11px] text-text-muted flex items-start gap-2 leading-relaxed">
                <FiInfo className="text-xs text-text-muted shrink-0 mt-0.5" />
                <span>Please note call transfer is not supported in Webcall.</span>
              </div>

              {/* Run Test Button */}
              <button
                type="button"
                onClick={handleToggleRunTest}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isTestRunning
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-surface-primary hover:bg-surface-secondary text-text-primary border border-border-primary"
                }`}
              >
                {isTestRunning ? (
                  <>
                    <FiSquare className="text-xs" />
                    <span>End Test</span>
                  </>
                ) : (
                  <>
                    <FiPlay className="text-xs text-accent-primary" />
                    <span>Run Test</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : activeTab === "llm" ? (
          /* TAB 2: TEST LLM CHAT */
          <div className="flex flex-col h-full justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-3 space-y-3">
                  <div className="p-3 rounded-2xl bg-surface-secondary/60 border border-border-primary/50 text-xs text-left w-full max-w-[270px] shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-accent-primary uppercase tracking-wider">
                        Active Greeting Node
                      </span>
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                        Canvas Live
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-text-primary mb-1">
                      {welcomeNode?.title || "Welcome Greeting"}
                    </div>
                    <p className="text-text-secondary text-[11px] leading-relaxed italic bg-surface-primary/70 p-2 rounded-xl border border-border-primary/40">
                      &ldquo;{welcomeNode?.data?.text || "Hello! How can I assist you today?"}&rdquo;
                    </p>
                  </div>
                  <p className="text-[11px] text-neutral-400 dark:text-text-muted leading-relaxed max-w-[230px]">
                    Type a message below to test. Responses are generated based on the canvas node and model{" "}
                    <span className="font-semibold text-text-primary font-mono">{model}</span>.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent-primary text-white ml-auto rounded-tr-xs shadow-xs max-w-[85%]"
                        : "bg-surface-secondary/70 text-text-primary mr-auto rounded-tl-xs border border-border-primary/50 max-w-[95%] w-fit"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    ) : (
                      <div className="markdown-content text-xs leading-relaxed space-y-1">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {prepareMarkdownContent(msg.content)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isThinking && (
                <div className="text-xs text-text-muted flex items-center gap-2 p-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-primary shrink-0" />
                  <span className="tracking-wide animate-pulse">Thinking...</span>
                </div>
              )}
              {/* Invisible scroll-to-bottom anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area matching Image 2 */}
            <div className="p-3 border-t border-border-primary/40 bg-white dark:bg-surface-secondary shrink-0">
              <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type test message..."
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-2xl bg-surface-secondary/50 dark:bg-surface-secondary border border-border-primary/70 text-text-primary placeholder:text-neutral-400 focus:outline-hidden focus:border-accent-primary transition"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isThinking}
                  className="w-9 h-9 rounded-full bg-[#9c8fe0] hover:bg-[#8879d6] text-white flex items-center justify-center disabled:opacity-40 transition cursor-pointer shadow-xs shrink-0"
                  title="Send message"
                >
                  <FiSend className="text-sm transform translate-x-[1px] -rotate-12" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* TAB 3: VARIABLES & PAYLOAD INSPECT */
          <div className="p-4 space-y-3 text-xs overflow-y-auto custom-scrollbar flex-1">
            <h3 className="font-bold text-text-primary">Flow Session State</h3>
            <pre className="p-3 rounded-xl bg-surface-secondary/70 border border-border-primary/50 font-mono text-[10px] text-text-secondary overflow-x-auto">
              {JSON.stringify(
                {
                  agent_id: "ag_918274",
                  active_node: currentRunningNode?.id || "welcome-node",
                  language: "en-US",
                  voice: voiceProfile?.name || "Cimo",
                  variables: {
                    user_phone: "+1 (555) 019-2834",
                    order_status: "Verified",
                    authenticated: true
                  }
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
