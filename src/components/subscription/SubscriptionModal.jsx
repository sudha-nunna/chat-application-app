import { useState } from "react";
import { useSubscription } from "../../context/SubscriptionContext";
import { usePlans } from "../../hooks/usePlans";
import { FiX, FiZap, FiShield, FiRefreshCw } from "react-icons/fi";
import PlanCard from "./PlanCard";
import { useTheme } from "../../context/ThemeContext";

const SubscriptionModal = () => {
  const {
    currentPlan,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    upgradePlan,
    downgradePlan,
  } = useSubscription();

  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const { isDark } = useTheme();

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isUpgradeModalOpen) return null;

  const handlePlanSelect = async (targetPlan) => {
    setActionLoading(true);
    setFeedback(null);

    let res;
    if (targetPlan === "free") {
      res = await downgradePlan("free");
    } else {
      res = await upgradePlan(targetPlan, "one-time");
    }

    setActionLoading(false);
    if (res.success) {
      setFeedback({ type: "success", message: res.data?.message || "Credits topped up successfully!" });
      window.dispatchEvent(new Event("auth-change"));
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to process credit pack" });
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-surface-primary dark:bg-[#11121c] text-text-primary dark:text-white overflow-hidden"
    >
      {/* Header Bar */}
      <div className="relative z-20 py-4 px-6 md:px-8 border-b shrink-0 bg-gradient-to-r from-accent-primary/10 via-surface-secondary/90 to-indigo-500/10 dark:from-[#1c1e30] dark:via-[#151624] dark:to-[#191a2c] border-border-primary dark:border-white/10 overflow-hidden shadow-sm">
        {/* Ambient Lighting Orbs */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-accent-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left side: Icon + Title & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-primary via-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg shadow-lg shadow-accent-primary/20 shrink-0 font-bold">
              <FiZap className="animate-pulse text-amber-300" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary via-text-primary to-accent-primary dark:from-white dark:via-white dark:to-[#a4a9ff]">
                Upgrade Your Workspace
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-400 leading-normal mt-0.5">
                Recharge AI credits, unlock unlimited daily prompts & high-priority cluster models
              </p>
            </div>
          </div>

          {/* Right side: Badge + Close Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-secondary/80 dark:bg-[#12131d] border border-border-primary/60 dark:border-white/10 shadow-inner text-xs font-semibold text-zinc-400 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Credit Top-Up • Pay As You Go</span>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-text-primary dark:hover:text-white transition-all cursor-pointer border border-border-primary/50 dark:border-white/10"
              title="Close Panel"
            >
              <FiX className="text-base" />
            </button>
          </div>
        </div>
      </div>

      {/* Body Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar max-w-6xl mx-auto w-full flex flex-col justify-start">
        {/* Feedback banner */}
        {feedback && (
          <div
            className={`p-3 mb-4 rounded-xl text-xs sm:text-sm font-semibold text-center border shadow-sm ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Dynamic Plan Cards Grid */}
        {plansLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <FiRefreshCw className="text-2xl text-accent-primary animate-spin" />
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">Loading credit packages...</p>
          </div>
        ) : plansError ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm text-center font-medium">
            {plansError}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch w-full py-2">
            {plans.map((p) => (
              <PlanCard
                key={p.key}
                plan={p}
                currentPlan={currentPlan}
                onSelect={handlePlanSelect}
                loading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-3 px-6 md:px-8 border-t shrink-0 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-400 bg-surface-secondary/40 dark:bg-[#161724]/80 border-border-primary dark:border-white/10">
        <div className="flex items-center gap-2">
          <FiShield className="text-emerald-400 text-sm" />
          <span>Recharge anytime • Credits never expire</span>
        </div>
        <div className="flex items-center gap-4 font-semibold text-text-primary dark:text-zinc-300">
          <span>🔒 SSL Encrypted</span>
          <span>⚡ Instant Wallet Credit</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
