import { useState, useEffect } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { usePlans } from "../hooks/usePlans";
import { NobackEndCallObj, backEndCallGet } from "../services/authService";
import { useTanStackData, useTanStackQueryClient } from "../hooks/useTanStackData";
import PlanCard from "../components/subscription/PlanCard";
import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";
import { redirectToStripe } from "../utils/stripeService";
import {
  FiZap,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
  FiActivity,
  FiArrowRight,
} from "react-icons/fi";

const SubscriptionPage = () => {
  const { currentPlan, upgradePlan, downgradePlan } = useSubscription();
  const { plans, loading: plansLoading, error: plansError, refreshPlans } = usePlans();
  const { isDark } = useTheme();

  const queryClient = useTanStackQueryClient();
  const token = localStorage.getItem("token");

  const { data: usage = null } = useTanStackData(
    ["usage"],
    async () => {
      if (!token) return null;
      const res = await backEndCallGet("/usage/summary");
      return res?.data || res || null;
    },
    { enabled: !!token }
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [creditPacks, setCreditPacks] = useState([]);

  useEffect(() => {
    fetchCreditPacks();
  }, []);

  const fetchCreditPacks = async () => {
    try {
      const res = await backEndCallGet("/credits/packs");
      if (res && res.packs) {
        setCreditPacks(res.packs);
      } else if (Array.isArray(res)) {
        setCreditPacks(res);
      }
    } catch (err) {
      console.error("Failed to fetch credit packs:", err);
    }
  };

  const handlePlanSelect = async (targetPlan, planObj) => {
    if (targetPlan === "free") {
      setActionLoading(true);
      setFeedback(null);
      const res = await downgradePlan("free");
      setActionLoading(false);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.data?.message || "Switched to free plan successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        window.dispatchEvent(new Event("auth-change"));
      } else {
        setFeedback({ type: "error", message: res.message || "Operation failed" });
      }
      return;
    }

    // Redirect to Stripe Checkout for credit package purchase
    setActionLoading(true);
    setFeedback({
      type: "info",
      message: "Redirecting to Stripe secure checkout...",
    });

    try {
      redirectToStripe(targetPlan, planObj, "_blank");
      setActionLoading(false);
      setFeedback({
        type: "info",
        message: "Opened Stripe Checkout in a new tab. Complete your payment there!",
      });
    } catch (err) {
      console.error("Failed to redirect to Stripe:", err);
      setActionLoading(false);
      setFeedback({
        type: "error",
        message: "Failed to open Stripe checkout. Please try again.",
      });
    }
  };

  const handlePurchaseCredits = async (packId, packObj) => {
    setActionLoading(true);
    setFeedback({
      type: "info",
      message: "Opening Stripe secure checkout...",
    });
    try {
      redirectToStripe(packId, packObj, "_blank");
      setActionLoading(false);
      setFeedback({
        type: "info",
        message: "Opened Stripe Checkout in a new tab. Complete your payment there!",
      });
    } catch (err) {
      console.error("Failed to redirect to Stripe:", err);
      setActionLoading(false);
      setFeedback({
        type: "error",
        message: "Failed to open Stripe checkout. Please try again.",
      });
    }
  };

  // Filter out the 'free' tier so only top-up packages are displayed
  const topUpPlans = (plans || []).filter(
    (p) => p.key?.toLowerCase() !== "free" && (p.monthlyPrice > 0 || (p.creditsGranted || p.credits || 0) > 0)
  );

  const activeCredits = usage?.user?.credits ?? 0;

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-8 space-y-8 max-w-6xl mx-auto custom-scrollbar bg-transparent text-text-primary">
      {/* Clean Unboxed Header Row */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-text-primary"}`}>
            Credit Top-Up
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Select a package to recharge your AI credits. Pay once, use until consumed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Balance:</span>
            <span className="text-sm font-extrabold text-accent-primary font-mono">
              {typeof activeCredits === "number" ? activeCredits.toFixed(2) : activeCredits} Credits
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : feedback.type === "info"
              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <FiCheckCircle className="text-base shrink-0 text-emerald-400" />
            ) : feedback.type === "info" ? (
              <FiRefreshCw className="text-base shrink-0 text-indigo-400 animate-spin" />
            ) : (
              <FiAlertTriangle className="text-base shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Available Credit Packages Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-600 dark:text-zinc-400">
              Select Package
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-accent-primary/10 border border-indigo-200 dark:border-accent-primary/20 text-indigo-700 dark:text-[#a4a9ff] text-[11px] font-semibold">
            <FiZap className="text-xs text-amber-600 dark:text-amber-400" />
            <span>Pay As You Go • Non-Expiring Credits</span>
          </div>
        </div>

        {plansLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <FiRefreshCw className="text-3xl text-accent-primary animate-spin" />
            <p className="text-xs font-medium text-text-muted">
              Fetching available credit packages...
            </p>
          </div>
        ) : plansError ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center space-y-2">
            <p>{plansError}</p>
            <button
              onClick={refreshPlans}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 font-semibold hover:bg-rose-500/30 transition text-xs"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topUpPlans.map((p) => (
              <PlanCard
                key={p.key}
                plan={p}
                currentPlan={currentPlan}
                onSelect={(planKey) => handlePlanSelect(planKey, p)}
                loading={actionLoading}
              />
            ))}
          </div>
        )}

        {/* Optional Add-on Credit Packs (if configured on backend) */}
        {creditPacks.length > 0 && (
          <div className="pt-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
              Additional Instant Top-Up Packs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {creditPacks.map((pack) => (
                <div
                  key={pack.packId}
                  className={`p-6 rounded-2xl border flex flex-col justify-between ${
                    isDark
                      ? "bg-surface-secondary/70 border-border-primary"
                      : "bg-white border-border-primary shadow-sm"
                  }`}
                >
                  <div>
                    <h4
                      className={`text-lg font-bold mb-1 ${
                        isDark ? "text-white" : "text-text-primary"
                      }`}
                    >
                      {pack.name}
                    </h4>
                    <p className="text-xs text-text-muted mb-4">
                      {pack.description || "Instant credit boost"}
                    </p>
                    <div
                      className={`text-2xl font-extrabold mb-4 font-mono ${
                        isDark ? "text-white" : "text-text-primary"
                      }`}
                    >
                      ${pack.price}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-accent-primary mb-6">
                      <FiZap className="text-amber-400" />
                      <span>{pack.credits} Credits</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchaseCredits(pack.packId, pack)}
                    disabled={actionLoading}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-accent-primary hover:bg-indigo-600 text-white transition cursor-pointer shadow-sm"
                  >
                    {actionLoading ? "Redirecting..." : "Purchase Pack"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
