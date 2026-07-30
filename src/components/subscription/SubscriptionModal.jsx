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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 backdrop-blur-md transition-opacity ${
          isDark ? "bg-slate-950/80" : "bg-slate-900/40"
        }`}
        onClick={() => setIsUpgradeModalOpen(false)}
      />

      {/* Dialog */}
      <div className={`relative w-full max-w-5xl border rounded-3xl shadow-2xl overflow-hidden z-10 my-auto ${
        isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        {/* Header Bar */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50"
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/20">
              <FiZap className="animate-pulse" />
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Upgrade Your Plan</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Unlock high priority processing, expanded agent limits, and enterprise features</p>
            </div>
          </div>

          <button
            onClick={() => setIsUpgradeModalOpen(false)}
            className={`p-2 rounded-xl transition ${
              isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold text-center border ${
                feedback.type === "success"
                  ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-500 border-rose-500/30"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Billing Cycle Switch */}
          <div className="flex justify-center items-center gap-3">
            <span className={`text-xs font-semibold ${!isAnnual ? (isDark ? "text-white" : "text-slate-900") : "text-slate-400"}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-12 h-6 rounded-full p-1 transition-colors border focus:outline-none ${
                isDark ? "bg-slate-800 border-slate-700" : "bg-slate-200 border-slate-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-blue-600 shadow-md transition-transform ${
                  isAnnual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold ${isAnnual ? (isDark ? "text-white" : "text-slate-900") : "text-slate-400"}`}>
                Annual Billing
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </div>
          </div>

          {/* Dynamic Plan Cards Grid */}
          {plansLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <FiRefreshCw className="text-2xl text-blue-500 animate-spin" />
              <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Loading subscription plans...</p>
            </div>
          ) : plansError ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs text-center">
              {plansError}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
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

          {/* SaaS Trust Footer */}
          <div className={`pt-4 border-t flex flex-wrap items-center justify-between text-xs gap-2 ${
            isDark ? "border-slate-800/60 text-slate-400" : "border-slate-200 text-slate-500"
          }`}>
            <div className="flex items-center gap-2">
              <FiShield className="text-blue-500" />
              <span>Cancel or downgrade anytime with 1-click</span>
            </div>
            <div className="flex items-center gap-4">
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>⚡ Instant Upgrade Activation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
