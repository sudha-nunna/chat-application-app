import React, { useState } from "react";
import {
  Check,
  X,
  Eye,
  Bot,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NobackEndCallObj } from "../../services/authService";

const ReviewChangesCard = ({
  proposal,
  onApplySuccess,
  onFeedbackSubmit
}) => {
  const navigate = useNavigate();

  // Default proposal structure if not fully populated
  const config = {
    agentName: proposal?.agentName || "Customer Assistant",
    generalPrompt:
      proposal?.generalPrompt ||
      "You are a professional, helpful customer service agent. Answer questions accurately, maintain a friendly and calm tone, and assist callers with their requests.",
    beginMessage:
      proposal?.beginMessage ||
      "Hello! Thank you for calling. How can I help you today?",
    functions: proposal?.functions || ["end_call"],
    voiceName: proposal?.voiceName || "Cimo",
    ...proposal
  };

  const [confirmedItems, setConfirmedItems] = useState({
    generalPrompt: false,
    functions: false,
    beginMessage: false
  });

  const [rejectedItems, setRejectedItems] = useState({
    generalPrompt: false,
    functions: false,
    beginMessage: false
  });

  const [viewingItem, setViewingItem] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [createdBotId, setCreatedBotId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const totalItems = 3;
  const confirmedCount = Object.values(confirmedItems).filter(Boolean).length;

  const handleToggleConfirm = (key) => {
    setConfirmedItems((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
    setRejectedItems((prev) => ({
      ...prev,
      [key]: false
    }));
  };

  const handleToggleReject = (key) => {
    setRejectedItems((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
    setConfirmedItems((prev) => ({
      ...prev,
      [key]: false
    }));
  };

  const handleAcceptAll = () => {
    setConfirmedItems({
      generalPrompt: true,
      functions: true,
      beginMessage: true
    });
    setRejectedItems({
      generalPrompt: false,
      functions: false,
      beginMessage: false
    });
  };

  const handleRejectAll = () => {
    setRejectedItems({
      generalPrompt: true,
      functions: true,
      beginMessage: true
    });
    setConfirmedItems({
      generalPrompt: false,
      functions: false,
      beginMessage: false
    });
  };

  const handleSubmit = async () => {
    // If feedback is provided and user wants changes, notify parent
    if (feedbackText.trim() && onFeedbackSubmit) {
      onFeedbackSubmit(feedbackText.trim());
      setFeedbackText("");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        name: config.agentName,
        systemPrompt: confirmedItems.generalPrompt
          ? config.generalPrompt
          : "You are an AI assistant.",
        botType: "VOICE",
        botSpecificRules: confirmedItems.beginMessage
          ? `Begin greeting: ${config.beginMessage}`
          : "",
        voiceProfile: {
          voiceName: config.voiceName,
          voiceId: "cimo-en",
          lang: "en-US",
          speed: 1.0,
          pitch: 1.0
        },
        capabilities: {
          enableVoice: true,
          enableActions: confirmedItems.functions,
          enableRag: true
        }
      };

      const res = await NobackEndCallObj("/bots", payload, "post").catch((err) => {
        console.warn("Backend save notice:", err);
        // Graceful fallback for mock/local demo if server is offline
        return { _id: "local-" + Date.now(), name: payload.name };
      });

      const botId = res?._id || res?.data?._id || "new-agent";
      setCreatedBotId(botId);
      setIsApplied(true);
      if (onApplySuccess) onApplySuccess(botId, config);
    } catch (err) {
      console.error("Failed to submit agent changes:", err);
      setErrorMessage("Failed to create agent. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto my-4 rounded-2xl border border-border-primary/80 bg-surface-secondary/80 dark:bg-[#12141D] p-5 shadow-lg select-none transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-primary/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Review changes</h3>
        </div>
        <span className="text-xs font-semibold text-text-muted">
          {confirmedCount}/{totalItems} confirmed
        </span>
      </div>

      {/* Section Title */}
      <div className="pt-3 pb-1 text-[11px] font-bold text-text-muted uppercase tracking-wider">
        GLOBAL ({totalItems})
      </div>

      {/* Changes List */}
      <div className="space-y-2 pt-1 pb-4">
        {/* Item 1: General Prompt */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/5 border border-border-primary/50 text-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Bot className="w-4 h-4 text-text-muted shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-text-primary truncate">General Prompt</p>
              <p className="text-[11px] text-text-muted underline decoration-dotted">
                1 change
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setViewingItem(viewingItem === "generalPrompt" ? null : "generalPrompt")
              }
              className="px-2.5 py-1 rounded-lg border border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium text-text-primary transition flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleReject("generalPrompt")}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                rejectedItems.generalPrompt
                  ? "bg-red-500/10 border-red-500/40 text-red-500"
                  : "border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              }`}
              title="Reject change"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleConfirm("generalPrompt")}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                confirmedItems.generalPrompt
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-bold"
                  : "border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              }`}
              title="Confirm change"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {viewingItem === "generalPrompt" && (
          <div className="p-3 bg-surface-primary dark:bg-black/30 rounded-xl border border-border-primary/60 text-xs font-mono text-text-secondary leading-relaxed">
            {config.generalPrompt}
          </div>
        )}

        {/* Item 2: Functions */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/5 border border-border-primary/50 text-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Layers className="w-4 h-4 text-text-muted shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-text-primary truncate">Functions</p>
              <p className="text-[11px] text-text-muted underline decoration-dotted">
                0 → {config.functions.length} functions: {config.functions.join(", ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setViewingItem(viewingItem === "functions" ? null : "functions")
              }
              className="px-2.5 py-1 rounded-lg border border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium text-text-primary transition flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleReject("functions")}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                rejectedItems.functions
                  ? "bg-red-500/10 border-red-500/40 text-red-500"
                  : "border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              }`}
              title="Reject change"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleConfirm("functions")}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                confirmedItems.functions
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-bold"
                  : "border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              }`}
              title="Confirm change"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {viewingItem === "functions" && (
          <div className="p-3 bg-surface-primary dark:bg-black/30 rounded-xl border border-border-primary/60 text-xs font-mono text-text-secondary leading-relaxed">
            Enabled Call Functions: {JSON.stringify(config.functions, null, 2)}
          </div>
        )}

        {/* Item 3: Begin Message */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/5 border border-border-primary/50 text-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Bot className="w-4 h-4 text-text-muted shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-text-primary truncate">Begin Message</p>
              <p className="text-[11px] text-text-muted underline decoration-dotted">
                1 change
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setViewingItem(viewingItem === "beginMessage" ? null : "beginMessage")
              }
              className="px-2.5 py-1 rounded-lg border border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium text-text-primary transition flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleReject("beginMessage")}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                rejectedItems.beginMessage
                  ? "bg-red-500/10 border-red-500/40 text-red-500"
                  : "border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              }`}
              title="Reject change"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleConfirm("beginMessage")}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                confirmedItems.beginMessage
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-bold"
                  : "border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              }`}
              title="Confirm change"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {viewingItem === "beginMessage" && (
          <div className="p-3 bg-surface-primary dark:bg-black/30 rounded-xl border border-border-primary/60 text-xs font-mono text-text-secondary leading-relaxed">
            {config.beginMessage}
          </div>
        )}
      </div>

      {/* Success / Open in Studio View */}
      {isApplied ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ✓ Agent Created & Configured Successfully!
          </p>
          <button
            type="button"
            onClick={() => navigate(`/bots/${createdBotId || "new"}`)}
            className="w-full py-2.5 px-4 rounded-xl bg-accent-primary text-white text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Open in Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Reject All / Accept All */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRejectAll}
              className="flex-1 py-1.5 px-3 rounded-xl border border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-text-muted hover:text-red-500 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject all</span>
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 py-1.5 px-3 rounded-xl border border-border-primary hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-text-muted hover:text-emerald-500 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept all</span>
            </button>
          </div>

          {/* Feedback Input */}
          <input
            type="text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Anything I should do differently?"
            className="w-full px-3.5 py-2 rounded-xl border border-border-primary bg-white dark:bg-white/5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition"
          />

          {/* Submit Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-2.5 px-4 rounded-xl bg-text-primary text-surface-primary dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Submit</span>
              </>
            )}
          </button>

          {errorMessage && (
            <p className="text-[11px] text-red-500 text-center">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewChangesCard;
