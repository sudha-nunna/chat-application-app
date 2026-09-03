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

  const [isAnnual, setIsAnnual] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isUpgradeModalOpen) return null;

  const handlePlanSelect = async (targetPlan) => {
    setActionLoading(true);
    setFeedback(null);

    const billingCycle = isAnnual ? "annual" : "monthly";
    let res;
    if (targetPlan === "free") {
      res = await downgradePlan("free");
    } else {
      res = await upgradePlan(targetPlan, billingCycle);
    }

    setActionLoading(false);
    if (res.success) {
      setFeedback({ type: "success", message: res.data?.message || "Plan updated successfully!" });
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to update plan" });
    }
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 transition-opacity duration-300"
        onClick={() => setIsUpgradeModalOpen(false)}
      />

      {/* Right Side Subscription Drawer Modal Overlay - Half Screen (50vw) */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[50vw] shadow-2xl flex flex-col z-50 border-l transition-all duration-300 bg-surface-primary dark:bg-[#13141f] border-border-primary dark:border-white/10 text-text-primary dark:text-white`}
      >
        {/* Header Bar */}
        <div className="relative py-3.5 px-5 md:px-6 border-b shrink-0 bg-gradient-to-r from-accent-primary/10 via-surface-secondary/90 to-indigo-500/10 dark:from-[#1e2034] dark:via-[#161725] dark:to-[#1a1b2d] border-border-primary dark:border-white/10 overflow-hidden">
          {/* Ambient Lighting Orbs */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-accent-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left side: Icon + Title & Subtitle */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary via-indigo-500 to-purple-500 flex items-center justify-center text-white text-base shadow-md shadow-accent-primary/20 shrink-0">
                <FiZap className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary via-text-primary to-accent-primary dark:from-white dark:via-white dark:to-[#a4a9ff]">
                  Upgrade Your Workspace
                </h2>
                <p className="text-[11px] text-text-muted">
                  High-speed AI cluster routing, unlimited prompts & priority models
                </p>
              </div>
            </div>

            {/* Right side: Segmented Pill Toggle + Close Button */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-surface-secondary/80 dark:bg-[#12131d] border border-border-primary/60 dark:border-white/10 shadow-inner">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    !isAnnual
                      ? "bg-accent-primary text-white shadow-sm"
                      : "text-text-muted hover:text-text-primary dark:hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isAnnual
                      ? "bg-accent-primary text-white shadow-sm"
                      : "text-text-muted hover:text-text-primary dark:hover:text-white"
                  }`}
                >
                  <span>Annual</span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full transition-colors ${
                      isAnnual
                        ? "bg-white/20 text-white"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    -20%
                  </span>
                </button>
              </div>

              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-text-primary dark:hover:text-white transition-all cursor-pointer border border-border-primary/50 dark:border-white/5"
                title="Close Panel"
              >
                <FiX className="text-base" />
              </button>
            </div>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-3.5 md:p-4 space-y-3 custom-scrollbar">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold text-center border shadow-sm ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/30"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Dynamic Plan Cards Grid */}
          {plansLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <FiRefreshCw className="text-xl text-accent-primary animate-spin" />
              <p className="text-xs text-text-muted font-medium">Loading subscription plans...</p>
            </div>
          ) : plansError ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium">
              {plansError}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-0.5">
              {plans.map((p) => (
                <PlanCard
                  key={p.key}
                  plan={p}
                  isAnnual={isAnnual}
                  currentPlan={currentPlan}
                  onSelect={handlePlanSelect}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t shrink-0 flex items-center justify-between text-[11px] text-text-muted bg-surface-secondary/40 dark:bg-[#181926]/70 border-border-primary dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <FiShield className="text-accent-primary text-xs" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-3 font-semibold text-text-primary dark:text-zinc-300">
            <span>🔒 SSL Encrypted</span>
            <span>⚡ Instant Activation</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionModal;
