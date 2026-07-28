import { useState, useEffect } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { usePlans } from "../hooks/usePlans";
import api from "../services/api";
import PlanBadge from "../components/subscription/PlanBadge";
import PlanCard from "../components/subscription/PlanCard";
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
      const res = await api.get("/subscription/usage");
      if (res.data?.success && res.data?.usage) {
        setUsage(res.data.usage);
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
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 space-y-8 max-w-7xl mx-auto custom-scrollbar">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Subscription & Billing</h1>
            <PlanBadge showPriority={true} />
          </div>
          <p className="text-xs text-slate-400">
            Manage your AI model priority queues, agent capacity, and payment preferences.
          </p>
        </div>

        <button
          onClick={handleRefreshAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-semibold transition self-start md:self-auto"
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
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/20 text-rose-300 border-rose-500/30"
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
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Tier</span>
            <FiCreditCard className="text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white capitalize">{currentPlan} Plan</div>
          <div className="text-[11px] text-slate-500 font-medium">
            Status: <span className="text-emerald-400 capitalize">{subscriptionStatus}</span>
          </div>
        </div>

        {/* Card 2: Request Priority Score */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Request Queue Priority</span>
            <FiZap className="text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">{priorityScore} / 100</div>
          <div className="text-[11px] text-slate-500 font-medium">
            {priorityScore >= 50 ? "High priority processing queue" : "Standard processing queue"}
          </div>
        </div>

        {/* Card 3: Messages Used Today */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Daily Usage Today</span>
            <FiActivity className="text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {usage ? usage.messagesUsedToday : 0} Messages
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Messages sent today
          </div>
        </div>

        {/* Card 4: Renewal Date */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Renewal / Expiration</span>
            <FiCalendar className="text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {subscription?.endDate
              ? new Date(subscription.endDate).toLocaleDateString()
              : "Ongoing"}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {subscription?.cancelAtPeriodEnd ? "Cancels at end of cycle" : "Auto-renews"}
          </div>
        </div>
      </div>

      {/* Plan Selection Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Available Subscription Plans</h2>
            <p className="text-xs text-slate-400">Upgrade or downgrade your plan anytime.</p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className={`text-xs font-semibold ${!isAnnual ? "text-white" : "text-slate-400"}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-12 h-6 rounded-full bg-slate-800 p-1 transition-colors border border-slate-700 focus:outline-none"
            >
              <div
                className={`w-4 h-4 rounded-full bg-blue-500 shadow-md transition-transform ${
                  isAnnual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-semibold ${isAnnual ? "text-white" : "text-slate-400"}`}>
              Annual (20% OFF)
            </span>
          </div>
        </div>

        {/* Dynamic Plan Cards Grid */}
        {plansLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <FiRefreshCw className="text-3xl text-blue-400 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Fetching subscription plans from database...</p>
          </div>
        ) : plansError ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
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
        <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-white">Subscription Actions</h3>
          <p className="text-xs text-slate-400">
            If you cancel your subscription, you will maintain access to your {currentPlan.toUpperCase()} plan until the end of your billing cycle on{" "}
            <span className="text-slate-200 font-semibold">
              {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : "the billing period end"}
            </span>.
          </p>

          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
            >
              Cancel Subscription
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3">
              <p className="text-xs font-semibold text-rose-300">
                Are you sure you want to cancel your {currentPlan.toUpperCase()} subscription?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelClick}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition"
                >
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
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
