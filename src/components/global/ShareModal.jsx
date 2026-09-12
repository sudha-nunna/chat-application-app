import React, { useState, useEffect } from "react";
import { FiShare2, FiCopy, FiCheck, FiX, FiLock, FiGlobe } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

const ShareModal = ({ isOpen, onClose, chatId, chatTitle, hasMessages = true }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { isDark } = useTheme();

  const isShareable = Boolean(chatId && chatId !== "new" && hasMessages);

  // Proactively ensure the chat is marked as shared as soon as the modal opens
  useEffect(() => {
    if (isOpen && isShareable) {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
      fetch(`${apiUrl}/chats/${chatId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }).catch((err) => console.warn("Share status proactive update:", err.message));
    }
  }, [isOpen, isShareable, chatId]);

  if (!isOpen) return null;

  if (!isShareable) {
    return (
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-2xl border transition-all ${
            isDark
              ? "bg-[#181924] border-white/10 text-white"
              : "bg-surface-primary border-border-primary text-text-primary"
          } animate-in zoom-in-95 duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border-primary/40 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-primary/10 text-accent-primary">
                <FiShare2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Share Conversation</h3>
                <p className="text-xs text-text-muted">Create a private shared link</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Empty State Content */}
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center text-xl shadow-xs">
              <FiShare2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-text-primary dark:text-gray-200">
                No conversation to share
              </h4>
              <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                This chat doesn't have any messages yet. Start a conversation or send a message first to generate a shareable link.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 pt-3 border-t border-border-primary/40 dark:border-white/10 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-accent-primary text-white hover:bg-accent-primary/90 active:scale-95 transition cursor-pointer shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/share/${chatId}`;

  const handleCopyLink = async () => {
    try {
      setIsSharing(true);
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

      // Mark the chat as shared on backend (idempotent)
      await fetch(`${apiUrl}/chats/${chatId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }).catch((err) => console.warn("Share status update fallback:", err.message));

      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-2xl border transition-all ${
          isDark
            ? "bg-[#181924] border-white/10 text-white"
            : "bg-surface-primary border-border-primary text-text-primary"
        } animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-primary/40 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-primary/10 text-accent-primary">
              <FiShare2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Share Conversation</h3>
              <p className="text-xs text-text-muted">Create a private shared link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border-primary/30 dark:border-white/5">
            <div className="text-xs font-semibold text-text-primary dark:text-gray-200 truncate">
              {chatTitle || "Current Conversation"}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-text-muted">
              <FiLock className="w-3 h-3 text-accent-primary shrink-0" />
              <span>Only logged-in users with this link can view this chat</span>
            </div>
          </div>

          {/* Link Box */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-black/30 border border-border-primary dark:border-white/10 text-text-primary dark:text-gray-300 outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                disabled={isSharing}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-accent-primary text-white hover:bg-accent-primary/90 active:scale-95 transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-border-primary/40 dark:border-white/10 flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <FiGlobe className="w-3 h-3 text-emerald-500" />
            Link ready to share
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-accent-primary text-white hover:bg-accent-primary/90 active:scale-95 transition cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
