import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Plus,
  Paperclip,
  ArrowUp,
  Sparkles,
  Bot,
  User,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getJwt } from "../services/authService";
import GettingStartedGuide from "../components/home/GettingStartedGuide";
import ReviewChangesCard from "../components/home/ReviewChangesCard";

const STORAGE_KEY = "studio_home_sessions_v1";

const DEFAULT_SESSIONS = [
  {
    id: "session-1",
    title: "What can you do?",
    timeAgo: "10 mins ago",
    messages: [
      {
        role: "user",
        content: "What can you do?"
      },
      {
        role: "assistant",
        content:
          "I am your AI Studio Copilot. I can help you design conversation flow agents, choose natural voices, configure telephony call handling, and review changes to your prompts and functions before submitting them to your workspace."
      }
    ]
  }
];

const AgentHomePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [searchQuery, setSearchQuery] = useState("");

  // Sessions from localStorage or defaults
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SESSIONS;
    } catch {
      return DEFAULT_SESSIONS;
    }
  });

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn("Storage write error:", e);
    }
  }, [sessions]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const userName =
    currentUser?.displayName ||
    currentUser?.name ||
    currentUser?.firstName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "sairamakrishna2");

  // Active session and its messages
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  // Filtered sessions in the left/middle History column
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setInputValue("");
    setStreamingText("");
    setIsAiThinking(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setInputValue("");
    setStreamingText("");
    setIsAiThinking(false);
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  };

  // Helper to extract proposal when user wants to create/configure an agent
  const checkForAgentProposal = (text) => {
    const lower = text.toLowerCase();
    const isBuildRequest =
      lower.includes("create") ||
      lower.includes("build") ||
      lower.includes("agent") ||
      lower.includes("bot") ||
      lower.includes("appointment") ||
      lower.includes("dental") ||
      lower.includes("sales") ||
      lower.includes("support") ||
      lower.includes("call");

    if (!isBuildRequest) return null;

    let agentName = "Customer Support Agent";
    if (lower.includes("dental")) agentName = "Dental Clinic Assistant";
    else if (lower.includes("sales")) agentName = "Outbound Sales Agent";
    else if (lower.includes("appointment")) agentName = "Appointment Booking Agent";

    return {
      agentName,
      generalPrompt: `You are an expressive, professional AI voice agent representing ${agentName}. Assist callers promptly, provide accurate details, and maintain an empathetic, calm tone.`,
      beginMessage: `Hello! Thank you for calling today. How can I help you?`,
      functions: ["end_call"],
      voiceName: "Cimo"
    };
  };

  const handleSendMessage = async (textToSend = inputValue) => {
    const text = textToSend.trim();
    if (!text || isAiThinking) return;

    let targetSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    // If on empty/new chat, create a session
    if (!targetSessionId) {
      targetSessionId = "session-" + Date.now();
      const newSession = {
        id: targetSessionId,
        title: text.length > 28 ? text.slice(0, 28) + "..." : text,
        timeAgo: "Just now",
        messages: [{ role: "user", content: text }]
      };
      updatedSessions = [newSession, ...updatedSessions];
      setSessions(updatedSessions);
      setActiveSessionId(targetSessionId);
    } else {
      updatedSessions = updatedSessions.map((s) => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, { role: "user", content: text }]
          };
        }
        return s;
      });
      setSessions(updatedSessions);
    }

    setInputValue("");
    setIsAiThinking(true);
    setStreamingText("");

    const proposal = checkForAgentProposal(text);

    // Call real backend AI model endpoint with graceful streaming
    try {
      const token = getJwt() || localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${apiUrl}/ollama/message/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          mode: "text",
          model: "gpt-4o",
          stream: true
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              const dataStr = trimmed.replace(/^data:\s*/, "");
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                const tokenText = parsed.chunk || parsed.text || parsed.message || "";
                if (tokenText) {
                  accumulated += tokenText;
                  setStreamingText(accumulated);
                }
              } catch {
                // Ignore partial JSON
              }
            } else if (trimmed && !trimmed.startsWith("event:")) {
              accumulated += trimmed + " ";
              setStreamingText(accumulated);
            }
          }
        }

        const finalReply =
          accumulated.trim() ||
          (proposal
            ? "I have designed the initial agent flow and prompt for you. Review the proposed settings below:"
            : "I can help you build and configure conversation flows. What kind of agent would you like to set up?");

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === targetSessionId) {
              return {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    role: "assistant",
                    content: finalReply,
                    proposal
                  }
                ]
              };
            }
            return s;
          })
        );
      } else {
        throw new Error("Direct model stream unavailable");
      }
    } catch (err) {
      console.warn("Using fallback conversational assistant:", err.message);

      // Fallback response with agent proposal if requested
      const fallbackReply = proposal
        ? "I have prepared the initial agent configuration based on your description. You can review each section below, make adjustments, or click Submit to finalize the agent."
        : `I understand! I can help you configure voice agents, manage conversation flows, or connect telephony phone numbers. What would you like to build?`;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  role: "assistant",
                  content: fallbackReply,
                  proposal
                }
              ]
            };
          }
          return s;
        })
      );
    } finally {
      setIsAiThinking(false);
      setStreamingText("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, isAiThinking]);

  return (
    <div className="flex-1 flex h-full min-h-0 min-w-0 bg-[#FAFAFA] dark:bg-[#0B0C12] text-text-primary overflow-hidden">
      {/* Middle Column: History */}
      <div className="w-64 shrink-0 border-r border-border-primary/80 bg-white dark:bg-[#0E1017] flex flex-col h-full select-none">
        {/* Header */}
        <div className="p-4 pb-2 flex items-center justify-between border-b border-border-primary/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-bold text-text-primary">History</span>
          </div>
        </div>

        {/* Search Chats Input */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border-primary bg-surface-secondary dark:bg-white/5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition"
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-1">
          <button
            type="button"
            onClick={handleStartNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-text-muted" />
            <span>New chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-muted">
              No previous chats found
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = activeSessionId === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group flex items-start justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                    isActive
                      ? "bg-[#EAECEF] dark:bg-white/10 text-text-primary font-semibold"
                      : "text-text-muted hover:text-text-primary hover:bg-black/4 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-text-primary font-medium">
                      {session.title}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {session.timeAgo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition shrink-0"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Panel */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-[#0B0C12] overflow-hidden relative">
        {/* Top Header Bar */}
        <div className="h-12 px-6 border-b border-border-primary/60 flex items-center justify-between shrink-0 bg-white dark:bg-[#0B0C12] z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Sparkles className="w-4 h-4 text-accent-primary" />
            <span>AI Assistant</span>
          </div>
        </div>

        {/* CASE 1: EMPTY / NEW CHAT (Centered Greeting + Centered Input + Getting Started Guide) */}
        {messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 flex flex-col items-center">
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
              {/* Top Greeting */}
              <div className="text-center my-4">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                  {getGreeting()}, {userName}
                </h2>
              </div>

              {/* Centered Input Box */}
              <div className="w-full max-w-2xl my-2">
                <div className="rounded-2xl border border-border-primary/90 bg-white dark:bg-[#12141E] p-3 shadow-md focus-within:border-accent-primary transition flex flex-col justify-between min-h-[96px]">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI Assistant to help you understand, build, debug, or improve anything in your workspace."
                    rows={2}
                    className="w-full bg-transparent text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none leading-relaxed"
                  />

                  {/* Bottom Bar inside Input Box */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-primary/40 mt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleSendMessage(
                            "Create an appointment scheduling agent for my business"
                          )
                        }
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary transition cursor-pointer"
                        title="Quick Agent Build"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary transition cursor-pointer"
                        title="Attach file (Optional)"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>29 credits</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!inputValue.trim() || isAiThinking}
                      onClick={() => handleSendMessage()}
                      className="w-8 h-8 rounded-xl bg-text-primary text-surface-primary dark:bg-white dark:text-black flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition cursor-pointer shadow-xs"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Getting Started Guide */}
              <GettingStartedGuide />
            </div>
          </div>
        ) : (
          /* CASE 2: ACTIVE CHAT (Top-to-Bottom Messages + Pinned Bottom Input) */
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Scrollable Messages Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6">
              <div className="w-full max-w-3xl mx-auto space-y-6">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-start gap-3 max-w-[85%]">
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-[13.5px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-accent-primary text-white rounded-tr-xs"
                            : "bg-surface-secondary dark:bg-[#141622] text-text-primary border border-border-primary/60 rounded-tl-xs shadow-xs"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-lg bg-text-primary text-surface-primary dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Review Changes Card if Assistant Generated a Proposal */}
                    {msg.proposal && (
                      <div className="w-full pl-10 pt-2">
                        <ReviewChangesCard
                          proposal={msg.proposal}
                          onFeedbackSubmit={(feedback) => {
                            handleSendMessage(
                              `Please adjust the proposal: ${feedback}`
                            );
                          }}
                          onApplySuccess={(botId) => {
                            console.log("Agent created with ID:", botId);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming or Thinking Indicator */}
                {isAiThinking && (
                  <div className="flex items-start gap-3 max-w-[85%]">
                    <div className="w-7 h-7 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3.5 rounded-2xl bg-surface-secondary dark:bg-[#141622] text-text-primary border border-border-primary/60 rounded-tl-xs text-xs sm:text-[13.5px] leading-relaxed">
                      {streamingText ? (
                        <span>{streamingText}</span>
                      ) : (
                        <div className="flex items-center gap-2 text-text-muted">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-primary" />
                          <span>Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            {/* Pinned Bottom Input Area (Matching User Request) */}
            <div className="p-4 md:px-8 border-t border-border-primary/60 bg-white/80 dark:bg-[#0B0C12]/80 backdrop-blur-md shrink-0">
              <div className="w-full max-w-3xl mx-auto">
                <div className="rounded-2xl border border-border-primary/90 bg-white dark:bg-[#12141E] p-3 shadow-md focus-within:border-accent-primary transition flex flex-col justify-between">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI Assistant to help you understand, build, debug, or improve anything..."
                    rows={1}
                    className="w-full bg-transparent text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none leading-relaxed max-h-32"
                  />

                  {/* Input Bottom Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-primary/40 mt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleSendMessage(
                            "Create an appointment scheduling agent for my business"
                          )
                        }
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary transition cursor-pointer"
                        title="Quick Agent Build"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary transition cursor-pointer"
                        title="Attach file (Optional)"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>29 credits</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!inputValue.trim() || isAiThinking}
                      onClick={() => handleSendMessage()}
                      className="w-8 h-8 rounded-xl bg-text-primary text-surface-primary dark:bg-white dark:text-black flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition cursor-pointer shadow-xs"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentHomePage;
