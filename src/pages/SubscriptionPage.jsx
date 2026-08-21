import { useState, useEffect } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { usePlans } from "../hooks/usePlans";
import { NobackEndCall } from "../services/authService";
import PlanBadge from "../components/subscription/PlanBadge";
import PlanCard from "../components/subscription/PlanCard";
import { useTheme } from "../context/ThemeContext";
import {
  FiZap,
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiAlertTriangle,
  FiRefreshCw,
  FiCheckCircle,
  FiActivity,
} from "react-icons/fi";

const SubscriptionPage = () => {
  const {
    subscription,
    currentPlan,
    subscriptionStatus,
    billingCycle,
    priorityScore,
    refreshSubscription,
    upgradePlan,
    downgradePlan,
    cancelSubscription,
  } = useSubscription();

  const { plans, loading: plansLoading, error: plansError, refreshPlans } = usePlans();
  const { isDark } = useTheme();

  const [usage, setUsage] = useState(null);
  const [isAnnual, setIsAnnual] = useState(billingCycle === "annual");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await NobackEndCall("/subscription/usage");
      if (res?.success && res?.usage) {
        setUsage(res.usage);
      }
    } catch (err) {
      console.error("Error fetching usage statistics:", err);
    }
  };

  const handleRefreshAll = () => {
    refreshSubscription();
    refreshPlans();
    fetchUsage();
  };

  const handlePlanSelect = async (targetPlan) => {
    setActionLoading(true);
    setFeedback(null);
    let res;
    if (targetPlan === "free") {
      res = await downgradePlan("free");
    } else {
      res = await upgradePlan(targetPlan, isAnnual ? "annual" : "monthly");
    }
    setActionLoading(false);
    if (res.success) {
      setFeedback({ type: "success", message: res.data?.message || "Subscription updated successfully!" });
      fetchUsage();
    } else {
      setFeedback({ type: "error", message: res.message || "Operation failed" });
    }
  };

  const handleCancelClick = async () => {
    setActionLoading(true);
    setFeedback(null);
    const res = await cancelSubscription();
    setActionLoading(false);
    setShowCancelConfirm(false);

    if (res.success) {
      setFeedback({ type: "success", message: "Subscription set to cancel at end of current billing period." });
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to cancel subscription." });
    }
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-4 sm:p-8 space-y-8 max-w-7xl mx-auto custom-scrollbar ${
      "bg-transparent text-text-primary"
    }`}>
      {/* Header Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-xl ${
        isDark ? "bg-interactive-base border-border-primary" : "bg-white border-border-primary"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className={`text-xl lg:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-text-primary"}`}>Subscription & Billing</h1>
            <PlanBadge showPriority={true} />
          </div>
          <p className={`text-xs ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            Manage your AI model priority queues, agent capacity, and payment preferences.
          </p>
        </div>

        <button
          onClick={handleRefreshAll}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition self-start md:self-auto ${
            isDark ? "bg-interactive-active hover:bg-interactive-active border-border-primary text-text-muted" : "bg-surface-secondary hover:bg-surface-secondary border-border-primary text-text-primary"
          }`}
        >
          <FiRefreshCw className={plansLoading ? "animate-spin" : ""} />
          <span>Refresh Details</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-interactive-base/20 text-text-muted border-border-primary/30"
              : "bg-interactive-base/20 text-text-muted border-border-primary/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <FiCheckCircle className="text-lg" /> : <FiAlertTriangle className="text-lg" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Subscription Summary Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Tier */}
        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? "bg-interactive-base border-border-primary" : "bg-white border-border-primary shadow-sm"
        }`}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            <span>Active Tier</span>
            <FiCreditCard className="text-text-primary" />
          </div>
          <div className={`text-xl font-bold capitalize ${isDark ? "text-white" : "text-text-primary"}`}>{currentPlan} Plan</div>
          <div className={`text-[11px] font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            Status: <span className="text-text-primary capitalize font-semibold">{subscriptionStatus}</span>
          </div>
        </div>

        {/* Card 2: Request Priority Score */}
        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? "bg-interactive-base border-border-primary" : "bg-white border-border-primary shadow-sm"
        }`}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            <span>Request Queue Priority</span>
            <FiZap className="text-amber-500" />
          </div>
          <div className={`text-xl font-bold ${isDark ? "text-white" : "text-text-primary"}`}>{priorityScore} / 100</div>
          <div className={`text-[11px] font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            {priorityScore >= 50 ? "High priority processing queue" : "Standard processing queue"}
          </div>
        </div>

        {/* Card 3: Messages Used Today */}
        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? "bg-interactive-base border-border-primary" : "bg-white border-border-primary shadow-sm"
        }`}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            <span>Daily Usage Today</span>
            <FiActivity className="text-text-primary" />
          </div>
          <div className={`text-xl font-bold ${isDark ? "text-white" : "text-text-primary"}`}>
            {usage ? usage.messagesUsedToday : 0} Messages
          </div>
          <div className={`text-[11px] font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            Messages sent today
          </div>
        </div>

        {/* Card 4: Renewal Date */}
        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? "bg-interactive-base border-border-primary" : "bg-white border-border-primary shadow-sm"
        }`}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            <span>Renewal / Expiration</span>
            <FiCalendar className="text-text-primary" />
          </div>
          <div className={`text-xl font-bold ${isDark ? "text-white" : "text-text-primary"}`}>
            {subscription?.endDate
              ? new Date(subscription.endDate).toLocaleDateString()
              : "Ongoing"}
          </div>
          <div className={`text-[11px] font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            {subscription?.cancelAtPeriodEnd ? "Cancels at end of cycle" : "Auto-renews"}
          </div>
        </div>
      </div>

      {/* Plan Selection Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-text-primary"}`}>Available Subscription Plans</h2>
            <p className={`text-xs ${isDark ? "text-text-primary" : "text-text-primary"}`}>Upgrade or downgrade your plan anytime.</p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className={`text-xs font-semibold ${!isAnnual ? (isDark ? "text-white" : "text-text-primary") : "text-text-primary"}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-12 h-6 rounded-full p-1 transition-colors focus:outline-none ring-1 ring-inset ring-border-primary/50 ${
                isAnnual
                  ? "bg-text-primary dark:bg-white ring-text-primary dark:ring-white"
                  : "bg-black/10 dark:bg-black/40"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-md transition-transform ${
                  isAnnual
                    ? "translate-x-6 bg-white dark:bg-black"
                    : "translate-x-0 bg-white"
                }`}
              />
            </button>
            <span className={`text-xs font-semibold ${isAnnual ? (isDark ? "text-white" : "text-text-primary") : "text-text-primary"}`}>
              Annual (20% OFF)
            </span>
          </div>
        </div>

        {/* Dynamic Plan Cards Grid */}
        {plansLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <FiRefreshCw className="text-3xl text-text-primary animate-spin" />
            <p className={`text-xs font-medium ${isDark ? "text-text-primary" : "text-text-primary"}`}>Fetching subscription plans from database...</p>
          </div>
        ) : plansError ? (
          <div className="p-4 rounded-2xl bg-interactive-base/10 border border-border-primary/30 text-text-primary text-xs text-center">
            {plansError}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Subscription Management / Cancellation Section */}
      {currentPlan !== "free" && (
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? "bg-interactive-base border-border-primary/80" : "bg-white border-border-primary shadow-sm"
        }`}>
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-text-primary"}`}>Subscription Actions</h3>
          <p className={`text-xs ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            If you cancel your subscription, you will maintain access to your {currentPlan.toUpperCase()} plan until the end of your billing cycle on{" "}
            <span className={`font-semibold ${isDark ? "text-text-muted" : "text-text-primary"}`}>
              {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : "the billing period end"}
            </span>.
          </p>

          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-interactive-base/10 hover:bg-interactive-base/20 text-text-primary border border-border-primary/30 transition"
            >
              Cancel Subscription
            </button>
          ) : (
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? "bg-interactive-base/40 border-border-primary/40" : "bg-interactive-base border-border-primary"
            }`}>
              <p className="text-xs font-semibold text-text-primary">
                Are you sure you want to cancel your {currentPlan.toUpperCase()} subscription?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelClick}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white transition"
                >
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isDark ? "bg-interactive-active hover:bg-interactive-base text-text-muted" : "bg-surface-secondary hover:bg-interactive-base text-text-primary"
                  }`}
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
