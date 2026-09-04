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
  FiShoppingBag,
  FiArrowUpRight,
  FiArrowDownLeft,
} from "react-icons/fi";
import { backEndCallGet } from "../../services/authService";
import { useSubscription } from "../../context/SubscriptionContext";

const CreditsModal = () => {
  const {
    isCreditsModalOpen,
    setIsCreditsModalOpen,
    setIsUpgradeModalOpen,
  } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);
  const [error, setError] = useState("");

  const fetchUsageData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await backEndCallGet("/usage/summary");
      if (res?.success && res?.data) {
        setUsageData(res.data);
      } else if (res?.data) {
        setUsageData(res.data);
      } else if (res) {
        setUsageData(res);
      }
    } catch (err) {
      console.warn("Failed to fetch usage summary:", err);
      setError("Unable to load real-time usage stats. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCreditsModalOpen) {
      fetchUsageData();
    }
  }, [isCreditsModalOpen]);

  if (!isCreditsModalOpen) return null;

  const today = usageData?.today || {
    messagesUsed: 0,
    tokensUsed: 0,
    creditsUsed: 0,
    messagesRemaining: 50,
  };
  const plan = usageData?.plan || { name: "FREE", maxMessagesPerDay: 50 };
  const user = usageData?.user || { credits: 0, plan: "free" };
  const lifetime = usageData?.lifetime || {
    totalTokens: 0,
    totalCreditsUsed: 0,
    totalRequests: 0,
  };
  const modelBreakdown = usageData?.modelBreakdown || [];
  const recentTransactions = usageData?.recentTransactions || [];

  const isUnlimited = plan.maxMessagesPerDay === -1 || user.isPaidUser;
  const maxCap = plan.maxMessagesPerDay > 0 ? plan.maxMessagesPerDay : 50;
  const progressPercent = isUnlimited
    ? 100
    : Math.min(100, Math.round((today.messagesUsed / maxCap) * 100));

  const formatModelName = (id) => {
    if (!id) return "Unknown Model";
    if (id === "auto") return "Auto Model Router";
    if (id.includes("deepseek")) return "DeepSeek V4 Flash";
    if (id.includes("zhipuai") || id.includes("glm")) return "GLM-4 Flash";
    if (id.includes("kimi")) return "Kimi K2.7 Code";
    if (id.includes("gpt-4")) return "GPT-4o Turbo";
    if (id.includes("claude")) return "Claude 3.5 Sonnet";
    return id.split("/").pop().replace(/[:_]/g, " ");
  };

  const formatNumber = (num) => {
    if (typeof num !== "number") return num || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toLocaleString();
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-surface-primary dark:bg-[#13141f] text-text-primary dark:text-white overflow-hidden"
    >
      {/* Header Bar */}
      <div className="relative py-3.5 px-5 md:px-6 border-b shrink-0 bg-gradient-to-r from-accent-primary/10 via-surface-secondary/90 to-indigo-500/10 dark:from-[#1e2034] dark:via-[#161725] dark:to-[#1a1b2d] border-border-primary dark:border-white/10 overflow-hidden">
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-accent-primary/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary via-indigo-500 to-purple-500 flex items-center justify-center text-white text-base shadow-md shadow-accent-primary/20 shrink-0 font-bold">
              <FiActivity />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary via-text-primary to-accent-primary dark:from-white dark:via-white dark:to-[#a4a9ff]">
                Usage & Telemetry
              </h2>
              <p className="text-[11px] text-text-muted">
                Live credit metrics, quotas, and token consumption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsageData}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-secondary hover:bg-surface-tertiary dark:bg-[#1a1c2b] dark:hover:bg-[#23263a] text-text-primary dark:text-white border border-border-primary/60 dark:border-white/10 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Refresh Telemetry"
            >
              <FiRefreshCw
                className={`text-xs ${loading ? "animate-spin text-accent-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsCreditsModalOpen(false)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-text-primary dark:hover:text-white transition-all cursor-pointer border border-border-primary/50 dark:border-white/5"
              title="Close Panel"
            >
              <FiX className="text-base" />
            </button>
          </div>
        </div>
      </div>

      {/* Body Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar max-w-6xl mx-auto w-full">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {loading && !usageData ? (
            <div className="py-20 text-center text-xs text-text-muted">
              <FiRefreshCw className="animate-spin text-2xl mx-auto mb-3 text-accent-primary" />
              Loading real-time telemetry...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stat 1: Credit Balance */}
                <div className="p-4 rounded-2xl border border-border-primary/60 dark:border-white/[0.08] bg-surface-secondary/70 dark:bg-[#151726]/90 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-text-muted text-[11px]">
                    <span className="font-semibold uppercase tracking-wider">Credits</span>
                    <FiZap className="text-accent-primary dark:text-[#a0a5fa] text-xs" />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-accent-primary dark:text-[#8f95ff] tracking-tight">
                      {typeof user.credits === "number"
                        ? user.credits.toFixed(2)
                        : user.credits}
                    </span>
                    <span className="text-xs font-semibold text-text-muted">cr</span>
                  </div>
                  <div className="mt-2 text-[10px] text-text-muted uppercase tracking-wider font-semibold flex items-center justify-between">
                    <span>Plan:</span>
                    <span className="text-accent-primary dark:text-[#a0a5fa] font-extrabold px-1.5 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20">
                      {isUnlimited ? "PAID (UNLIMITED)" : plan.name}
                    </span>
                  </div>
                </div>

                {/* Stat 2: Today Messages Quota */}
                <div className="p-4 rounded-2xl border border-border-primary/60 dark:border-white/[0.08] bg-surface-secondary/70 dark:bg-[#151726]/90 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-text-muted text-[11px]">
                    <span className="font-semibold uppercase tracking-wider">Daily Messages</span>
                    <FiClock className="text-blue-400 text-xs" />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-text-primary dark:text-white tracking-tight">
                      {today.messagesUsed}
                    </span>
                    <span className="text-xs text-text-muted font-semibold">
                      {isUnlimited ? "/ ∞" : `/ ${maxCap}`}
                    </span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isUnlimited
                          ? "bg-gradient-to-r from-accent-primary to-indigo-400"
                          : progressPercent > 85
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${isUnlimited ? 100 : progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Stat 3: Tokens Consumed Today */}
                <div className="p-4 rounded-2xl border border-border-primary/60 dark:border-white/[0.08] bg-surface-secondary/70 dark:bg-[#151726]/90 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-text-muted text-[11px]">
                    <span className="font-semibold uppercase tracking-wider">Tokens Today</span>
                    <FiCpu className="text-purple-400 text-xs" />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-purple-400 dark:text-[#b895ff] tracking-tight">
                      {formatNumber(today.tokensUsed)}
                    </span>
                    <span className="text-xs font-semibold text-text-muted">tok</span>
                  </div>
                  <div className="mt-2 text-[10px] text-text-muted flex justify-between items-center">
                    <span>Total:</span>
                    <span className="text-text-primary dark:text-white font-bold">{formatNumber(lifetime.totalTokens)}</span>
                  </div>
                </div>
              </div>

              {/* Model Usage Breakdown */}
              <div className="rounded-2xl border border-border-primary/60 dark:border-white/[0.08] overflow-hidden bg-surface-secondary/30 dark:bg-[#151726]/40 shadow-sm">
                <div className="px-4 py-3 bg-surface-secondary/80 dark:bg-[#181926] border-b border-border-primary/60 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <FiLayers className="text-accent-primary text-xs" />
                    <span>Model Breakdown</span>
                  </span>
                  <span className="text-[11px] text-text-muted font-medium">
                    Dispatched: <strong className="text-text-primary dark:text-white font-extrabold">{lifetime.totalRequests || 0}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border-primary/40 dark:border-white/10 text-[10px] uppercase tracking-wider text-text-muted bg-surface-secondary/40 dark:bg-[#141522]">
                        <th className="px-4 py-2.5 font-bold">Model Name</th>
                        <th className="px-4 py-2.5 font-bold text-center">Requests</th>
                        <th className="px-4 py-2.5 font-bold text-right">In / Out Tokens</th>
                        <th className="px-4 py-2.5 font-bold text-right">Credits</th>
                        <th className="px-4 py-2.5 font-bold text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/30 dark:divide-white/5 text-xs">
                      {modelBreakdown.length > 0 ? (
                        modelBreakdown.map((m) => (
                          <tr key={m.modelId} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                            <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">
                              <div className="flex flex-col">
                                <span>{formatModelName(m.modelId)}</span>
                                <span className="text-[9.5px] text-text-muted font-mono">{m.modelId}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-text-secondary dark:text-zinc-300 font-semibold">
                              {m.totalRequests}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[11px]">
                              <span className="text-text-primary dark:text-white font-bold">{formatNumber(m.promptTokens)}</span>
                              <span className="text-text-muted opacity-50 px-1">/</span>
                              <span className="text-purple-400 font-bold">{formatNumber(m.completionTokens)}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-accent-primary dark:text-[#8f95ff] font-mono">
                              {typeof m.creditsUsed === "number" ? m.creditsUsed.toFixed(4) : m.creditsUsed} cr
                            </td>
                            <td className="px-4 py-3 text-right text-text-muted text-[11px] font-mono">
                              {m.avgLatencyMs ? `${m.avgLatencyMs} ms` : "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-text-muted text-xs">
                            No telemetry recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Transaction Audit Log */}
              <div className="rounded-2xl border border-border-primary/60 dark:border-white/[0.08] overflow-hidden bg-surface-secondary/30 dark:bg-[#151726]/40 shadow-sm">
                <div className="px-4 py-3 bg-surface-secondary/80 dark:bg-[#181926] border-b border-border-primary/60 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <FiTrendingUp className="text-accent-primary text-xs" />
                    <span>Recent Activity</span>
                  </span>
                  <span className="text-[11px] text-text-muted font-medium">Last 10 events</span>
                </div>

                <div className="divide-y divide-border-primary/30 dark:divide-white/5 max-h-52 overflow-y-auto custom-scrollbar">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => {
                      const modelName = formatModelName(tx.modelId || tx.description);
                      const isPositive = tx.amount > 0;
                      return (
                        <div key={tx._id} className="px-4 py-3 flex items-center justify-between text-xs hover:bg-black/5 dark:hover:bg-white/5 transition">
                          <div className="flex items-center gap-3 truncate pr-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-accent-primary/10 text-accent-primary dark:text-[#a0a5fa] border border-accent-primary/20"}`}>
                              {isPositive ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-semibold text-text-primary dark:text-white truncate">
                                {tx.description ? tx.description : `${modelName} Dispatch`}
                              </span>
                              <span className="text-[10px] text-text-muted mt-0.5">
                                {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center shrink-0">
                            <span
                              className={`font-bold font-mono px-2.5 py-1 rounded-lg text-xs ${
                                isPositive
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-accent-primary/10 text-accent-primary dark:text-[#a0a5fa] border border-accent-primary/20"
                              }`}
                            >
                              {isPositive ? `+${tx.amount}` : `${tx.amount}`} cr
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-5 text-center text-xs text-text-muted">
                      No transactions recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 flex items-center justify-between text-[11px] text-text-muted bg-surface-secondary/40 dark:bg-[#181926]/70 border-border-primary dark:border-white/10">
          <div className="flex items-center gap-1.5 font-medium">
            <FiShield className="text-emerald-400 text-xs" />
            <span>Protected by Server Quota Guard</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setIsCreditsModalOpen(false);
                setIsUpgradeModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-accent-primary hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-accent-primary/25"
            >
              <FiShoppingBag className="text-xs" />
              <span>Buy Credits</span>
            </button>

            <button
              onClick={() => setIsCreditsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-surface-secondary dark:bg-[#1a1c2b] hover:bg-surface-tertiary dark:hover:bg-[#23263a] text-text-primary dark:text-white text-xs font-semibold transition cursor-pointer border border-border-primary/40 dark:border-white/10"
            >
              Close
            </button>
          </div>
        </div>
    </div>
  );
};

export default CreditsModal;
