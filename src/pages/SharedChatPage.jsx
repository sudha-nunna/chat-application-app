import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import MessageBubble from "../components/global/MessageBubble";
import ArtifactPreviewPanel from "../components/artifacts/ArtifactPreviewPanel";
import { extractPreviewableCode } from "../utils/codeExportUtils";
import { FiMessageSquare, FiCopy, FiExternalLink, FiLock, FiAlertCircle, FiArrowRight, FiUser, FiSun, FiMoon, FiEye } from "react-icons/fi";

const SharedChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isForking, setIsForking] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Redirect unauthenticated visitors to login with return redirect param
      navigate(`/login?redirect=${encodeURIComponent(`/share/${chatId}`)}`);
      return;
    }

    const fetchSharedChat = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
        const response = await fetch(`${apiUrl}/chats/share/${chatId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          navigate(`/login?redirect=${encodeURIComponent(`/share/${chatId}`)}`);
          return;
        }

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.message || `Failed to load conversation (${response.status})`);
        }

        const data = await response.json();
        setChatData(data.chat);
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Shared chat fetch error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedChat();
  }, [chatId, navigate]);

  // Detect previewable code artifacts in messages
  useEffect(() => {
    if (Array.isArray(messages) && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant" && messages[i].content) {
          const parsed = extractPreviewableCode(messages[i].content);
          if (parsed) {
            setActiveArtifact(parsed);
            setIsArtifactOpen(true);
            break;
          }
        }
      }
    }
  }, [messages]);

  // Listen for custom open-artifact clicks from MessageBubble code blocks
  useEffect(() => {
    const handleOpenArtifact = (e) => {
      if (e.detail?.code) {
        setActiveArtifact({
          code: e.detail.code,
          language: e.detail.language || "html",
          title: e.detail.title || "Shared Preview",
        });
        setIsArtifactOpen(true);
      }
    };

    window.addEventListener("open-artifact", handleOpenArtifact);
    return () => window.removeEventListener("open-artifact", handleOpenArtifact);
  }, []);

  const handleForkChat = async () => {
    try {
      setIsForking(true);
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
      const res = await fetch(`${apiUrl}/chats/share/${chatId}/fork`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to clone conversation");
      }

      const data = await res.json();
      if (data.newChatId) {
        // Navigate user to their personal chat with the forked conversation
        navigate(`/chat?id=${data.newChatId}`);
      } else {
        navigate("/chat");
      }
    } catch (err) {
      console.error("Fork error:", err);
      alert("Could not clone chat: " + err.message);
    } finally {
      setIsForking(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#0f1015] text-white" : "bg-surface-primary text-text-primary"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-[#0f1015] text-white" : "bg-surface-primary text-text-primary"}`}>
        <div className="w-full max-w-md p-6 rounded-2xl border border-border-primary/60 dark:border-white/10 bg-surface-secondary dark:bg-[#181924] shadow-xl text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-4">
            <FiAlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Conversation Unavailable</h2>
          <p className="text-xs text-text-muted mb-6 leading-relaxed">
            {error.includes("not been shared")
              ? "This conversation has not been publicly shared by its author, or the link has expired."
              : error}
          </p>
          <button
            onClick={() => navigate("/chat")}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-accent-primary text-white hover:bg-accent-primary/90 transition shadow-sm cursor-pointer"
          >
            Go to My Chats
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full overflow-hidden flex flex-col ${isDark ? "bg-[#0f1015] text-white" : "bg-[#f8f9fc] text-text-primary"}`}>
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between ${
        isDark ? "bg-[#0f1015]/90 border-white/10" : "bg-white/90 border-border-primary/60"
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/chat")}
            className="flex items-center gap-2 text-sm font-bold tracking-tight hover:opacity-80 transition cursor-pointer shrink-0"
            title="Go to Codegene AI"
          >
            <div className="w-7 h-7 rounded-lg bg-accent-primary flex items-center justify-center text-white font-black text-xs shadow-xs">
              C
            </div>
            <span className="hidden sm:inline font-semibold">Codegene</span>
          </button>
          <div className="h-4 w-[1px] bg-border-primary dark:bg-white/10 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold truncate max-w-[180px] sm:max-w-[400px]">
              {chatData?.title || "Shared Conversation"}
            </h1>
            <div className="flex items-center gap-2 text-[10.5px] text-text-muted">
              <span className="flex items-center gap-1 truncate">
                <FiUser className="w-2.5 h-2.5 shrink-0" />
                {chatData?.author?.name || "Anonymous"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 shrink-0">
                <FiLock className="w-2.5 h-2.5 text-accent-primary" />
                Read-only
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Preview Toggle Button */}
          {activeArtifact && (
            <button
              onClick={() => setIsArtifactOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${
                isArtifactOpen
                  ? "bg-accent-primary text-white border-accent-primary shadow-xs"
                  : "bg-accent-primary/10 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/20"
              }`}
              title={isArtifactOpen ? "Hide Live Preview Panel" : "Open Live Preview Panel"}
            >
              <FiEye className="text-[14px]" />
              <span className="hidden xs:inline">Preview</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-border-primary dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/15 text-text-primary dark:text-[#e5e5e5] transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {isDark ? <FiSun className="text-[14px]" /> : <FiMoon className="text-[14px]" />}
          </button>

          {/* Fork / Continue in My Chats */}
          <button
            onClick={handleForkChat}
            disabled={isForking}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold bg-accent-primary text-white hover:bg-accent-primary/90 active:scale-95 transition shadow-sm cursor-pointer shrink-0"
            title="Make an editable copy in your personal chats"
          >
            {isForking ? (
              <span>Cloning...</span>
            ) : (
              <>
                <FiMessageSquare className="w-3.5 h-3.5" />
                <span>Continue in My Chats</span>
                <FiArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Layout: Left is Conversation Feed, Right is Live Preview Sandbox */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-row overflow-hidden relative">
        <main
          className={`h-full overflow-y-auto px-4 py-6 sm:py-8 space-y-6 transition-all duration-300 custom-scrollbar ${
            isArtifactOpen && activeArtifact
              ? "w-full md:w-[48%] lg:w-[45%]"
              : "flex-1 w-full max-w-[840px] mx-auto"
          }`}
        >
          {messages.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-12">No messages in this conversation.</p>
          ) : (
            messages.map((m, idx) => {
              const isUser = m.role === "user";
              const nextAssistant = !isUser ? null : messages[idx + 1];
              const isSearchExecuted = isUser && Boolean(
                m.searchExecuted ||
                (nextAssistant && Array.isArray(nextAssistant.sources) && nextAssistant.sources.length > 0)
              );

              return (
                <div key={idx} className="w-full flex flex-col">
                  <MessageBubble
                    role={m.role}
                    content={m.content}
                    attachments={m.attachments || []}
                    enableSearch={m.enableSearch}
                    searchExecuted={isSearchExecuted}
                    sources={m.sources || []}
                    requiresWebSearch={false}
                    isStreaming={false}
                    isThinking={false}
                  />
                </div>
              );
            })
          )}
        </main>

        {/* Right Pane: Live Artifact Sandbox */}
        {isArtifactOpen && activeArtifact && (
          <div className="hidden md:flex flex-1 min-w-0 h-full overflow-hidden transition-all duration-300">
            <ArtifactPreviewPanel
              artifact={activeArtifact}
              onClose={() => setIsArtifactOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Mobile Fullscreen Preview Overlay */}
      {isArtifactOpen && activeArtifact && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex-1 h-full w-full">
            <ArtifactPreviewPanel
              artifact={activeArtifact}
              onClose={() => setIsArtifactOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedChatPage;
