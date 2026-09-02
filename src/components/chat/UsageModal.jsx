import { useState, useEffect } from "react";
import {
  FiX,
  FiZap,
  FiActivity,
  FiCpu,
  FiClock,
  FiRefreshCw,
  FiTrendingUp,
  FiLayers,
  FiShield,
  FiShoppingBag
} from "react-icons/fi";
import { backEndCallGet } from "../../services/authService";
import { useSubscription } from "../../context/SubscriptionContext";

const UsageModal = ({ isOpen, onClose, onRechargeClick }) => {
  const { setIsUpgradeModalOpen } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchUsageSummary();
    }
  }, [isOpen]);

  const fetchUsageSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await backEndCallGet("/usage/summary");
      if (res?.success && res?.data) {
        setUsageData(res.data);
      } else if (res?.data) {
        setUsageData(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch usage summary:", err);
      setError("Unable to load real-time usage stats. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const today = usageData?.today || { messagesUsed: 0, tokensUsed: 0, creditsUsed: 0, messagesRemaining: 50 };
  const plan = usageData?.plan || { name: "FREE", maxMessagesPerDay: 50 };
  const user = usageData?.user || { credits: 0, plan: "free" };
  const lifetime = usageData?.lifetime || { totalTokens: 0, totalCreditsUsed: 0, totalRequests: 0 };
  const modelBreakdown = usageData?.modelBreakdown || [];
  const recentTransactions = usageData?.recentTransactions || [];

  const isUnlimited = plan.maxMessagesPerDay === -1;
  const progressPercent = isUnlimited
    ? 100
    : Math.min(100, Math.round((today.messagesUsed / (plan.maxMessagesPerDay || 50)) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-xl border border-border-primary/60 bg-surface-primary dark:bg-interactive-base p-5 shadow-2xl relative max-h-[88vh] overflow-y-auto custom-scrollbar text-text-primary">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-interactive-active/40 transition cursor-pointer"
        >
          <FiX className="text-base" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-primary/40 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm">
              <FiActivity />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-text-primary">Usage & Telemetry</h2>
              <p className="text-[11px] text-text-muted">Live credit metrics, quotas, and token consumption.</p>
            </div>
          </div>

          <button
            onClick={fetchUsageSummary}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-primary/50 text-[11px] font-medium hover:bg-interactive-active text-text-muted hover:text-text-primary transition cursor-pointer mr-6"
          >
            <FiRefreshCw className={loading ? "animate-spin text-amber-400 text-xs" : "text-xs"} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {loading && !usageData ? (
          <div className="py-12 text-center text-xs text-text-muted">
            <FiRefreshCw className="animate-spin text-lg mx-auto mb-2 text-amber-400" />
            Loading real-time telemetry...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Credit Balance */}
              <div className="p-3 rounded-lg border border-border-primary/40 bg-surface-secondary/30 flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-muted text-[11px]">
                  <span>Credits</span>
                  <FiZap className="text-amber-400 text-xs" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-amber-400 tracking-tight">
                    {typeof user.credits === "number" ? user.credits.toLocaleString() : user.credits}
                  </span>
                  <span className="text-[10px] text-text-muted">cr</span>
                </div>
                <div className="mt-1 text-[10px] text-text-muted uppercase tracking-wider">
                  Plan: <span className="text-text-primary font-medium">{plan.name}</span>
                </div>
              </div>

              {/* Today Messages Quota */}
              <div className="p-3 rounded-lg border border-border-primary/40 bg-surface-secondary/30 flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-muted text-[11px]">
                  <span>Daily Messages</span>
                  <FiClock className="text-blue-400 text-xs" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-text-primary tracking-tight">
                    {today.messagesUsed}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    / {isUnlimited ? "∞" : plan.maxMessagesPerDay}
                  </span>
                </div>
                <div className="w-full bg-interactive-active/60 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progressPercent > 85 ? "bg-red-500" : progressPercent > 60 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Tokens Consumed Today */}
              <div className="p-3 rounded-lg border border-border-primary/40 bg-surface-secondary/30 flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-muted text-[11px]">
                  <span>Tokens Today</span>
                  <FiCpu className="text-purple-400 text-xs" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-purple-400 tracking-tight">
                    {(today.tokensUsed || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-text-muted">tok</span>
                </div>
                <div className="mt-1 text-[10px] text-text-muted">
                  Total: <span className="text-text-primary font-medium">{(lifetime.totalTokens || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Model Usage Breakdown */}
            <div className="rounded-lg border border-border-primary/40 overflow-hidden">
              <div className="px-3.5 py-2 bg-surface-secondary/50 border-b border-border-primary/40 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <FiLayers className="text-amber-400 text-xs" />
                  <span>Model Breakdown</span>
                </span>
                <span className="text-[10px] text-text-muted">
                  Dispatched: <strong className="text-text-primary">{lifetime.totalRequests || 0}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border-primary/30 text-[10px] uppercase tracking-wider text-text-muted bg-surface-secondary/20">
                      <th className="px-3 py-1.5 font-medium">Model ID</th>
                      <th className="px-3 py-1.5 font-medium text-center">Requests</th>
                      <th className="px-3 py-1.5 font-medium text-right">In / Out Tokens</th>
                      <th className="px-3 py-1.5 font-medium text-right">Credits</th>
                      <th className="px-3 py-1.5 font-medium text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-primary/20 font-mono text-[11px]">
                    {modelBreakdown.length > 0 ? (
                      modelBreakdown.map((m) => (
                        <tr key={m.modelId} className="hover:bg-interactive-active/20 transition">
                          <td className="px-3 py-2 font-sans font-medium text-text-primary truncate max-w-[140px]">
                            {m.modelId}
                          </td>
                          <td className="px-3 py-2 text-center text-text-secondary">
                            {m.totalRequests}
                          </td>
                          <td className="px-3 py-2 text-right text-text-muted">
                            <span className="text-text-primary">{(m.promptTokens || 0).toLocaleString()}</span>
                            {" / "}
                            <span className="text-purple-400">{(m.completionTokens || 0).toLocaleString()}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-amber-400 font-sans">
                            {m.creditsUsed} cr
                          </td>
                          <td className="px-3 py-2 text-right text-text-muted text-[10px]">
                            {m.avgLatencyMs} ms
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-3 py-4 text-center text-text-muted font-sans text-[11px]">
                          No telemetry recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Transaction Audit Log */}
            <div className="rounded-lg border border-border-primary/40 overflow-hidden">
              <div className="px-3.5 py-2 bg-surface-secondary/50 border-b border-border-primary/40 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <FiTrendingUp className="text-emerald-400 text-xs" />
                  <span>Recent Activity</span>
                </span>
                <span className="text-[10px] text-text-muted">Last 10 events</span>
              </div>

              <div className="divide-y divide-border-primary/20 max-h-40 overflow-y-auto custom-scrollbar">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <div key={tx._id} className="px-3.5 py-2 flex items-center justify-between text-xs hover:bg-interactive-active/20 transition">
                      <div className="flex flex-col truncate pr-2">
                        <span className="text-[11px] font-normal text-text-primary truncate">
                          {tx.description || tx.type}
                        </span>
                        <span className="text-[10px] text-text-muted mt-0.5 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center shrink-0">
                        <span
                          className={`font-semibold font-mono px-1.5 py-0.5 rounded text-[10px] ${
                            tx.amount > 0
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount} cr
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-text-muted">
                    No transactions recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-2.5 border-t border-border-primary/40 flex items-center justify-between">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <FiShield className="text-emerald-400 text-[11px]" />
                <span>Protected by Server Quota Guard</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    setIsUpgradeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <FiShoppingBag className="text-xs" />
                  <span>Buy Credits</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg bg-interactive-active hover:bg-interactive-active/80 text-text-primary text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageModal;
