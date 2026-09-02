import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { backEndCallGet, backEndCallPost, NobackEndCallObj } from "../services/authService";
import {
  FiZap,
  FiShoppingBag,
  FiRefreshCw,
  FiCheck,
  FiShield,
  FiCpu,
  FiActivity,
  FiClock
} from "react-icons/fi";

const SubscriptionPage = () => {
  const { isDark } = useTheme();
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [creditPacks, setCreditPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState("");

  useEffect(() => {
    fetchUsage();
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const res = await backEndCallGet("/credits/packs");
      if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
        setCreditPacks(res.data);
        const popularPack = res.data.find(p => p.popular);
        if (popularPack?.id) {
          setSelectedPack(popularPack.id);
        } else if (res.data[0]?.id) {
          setSelectedPack(res.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching dynamic credit packs:", err);
    }
  };

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await backEndCallGet("/usage/summary");
      if (res?.success && res?.data) {
        setUsageData(res.data);
      }
    } catch (err) {
      console.error("Error fetching usage stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packId) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      let res;
      try {
        res = await backEndCallPost("/credits/purchase", { packId });
      } catch {
        res = await NobackEndCallObj("/credits/purchase", { packId }, "post");
      }

      if (res?.success) {
        setFeedback({
          type: "success",
          message: res.message || "Credits added successfully to your wallet!"
        });
        fetchUsage();
      } else {
        setFeedback({ type: "error", message: res?.message || "Purchase failed." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Transaction error." });
    } finally {
      setActionLoading(false);
    }
  };

  const user = usageData?.user || { credits: 0, isPaidUser: false, plan: "Free Tier" };
  const today = usageData?.today || { messagesUsed: 0, tokensUsed: 0, creditsUsed: 0 };
  const lifetime = usageData?.lifetime || { totalTokens: 0, totalCreditsUsed: 0, totalRequests: 0 };
  const isPaid = Boolean(user.isPaidUser);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-8 space-y-6 max-w-7xl mx-auto custom-scrollbar text-text-primary">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border-primary bg-surface-primary dark:bg-interactive-base shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-text-primary">
              Credit Wallet & Top-Up
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPaid
                  ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                  : "bg-surface-secondary text-text-muted border border-border-primary"
              }`}
            >
              {isPaid ? "Paid Tier (Unlimited Messages)" : "Free Tier (50 msgs/day)"}
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Pay-as-you-go token-based billing. Top up credits anytime — credits never expire.
          </p>
        </div>

        <button
          onClick={fetchUsage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-primary text-xs font-medium hover:bg-interactive-active text-text-muted hover:text-text-primary transition cursor-pointer self-start md:self-auto"
        >
          <FiRefreshCw className={loading ? "animate-spin text-amber-400" : ""} />
          <span>Refresh Wallet</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <FiCheck className="text-sm" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-75 hover:opacity-100 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Wallet Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Credit Balance */}
        <div className="p-4 rounded-xl border border-border-primary bg-surface-primary dark:bg-interactive-base flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Available Balance</span>
            <FiZap className="text-amber-400 text-sm" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">
              {typeof user.credits === "number" ? user.credits.toLocaleString() : 0}
            </span>
            <span className="text-xs text-text-muted">credits</span>
          </div>
          <div className="mt-2 text-[10px] text-text-muted">
            Status: <span className="text-text-primary font-medium">{isPaid ? "Active Paid User" : "Free Tier"}</span>
          </div>
        </div>

        {/* Card 2: Daily Messages */}
        <div className="p-4 rounded-xl border border-border-primary bg-surface-primary dark:bg-interactive-base flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Daily Messages</span>
            <FiClock className="text-blue-400 text-sm" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-text-primary tracking-tight">
              {today.messagesUsed}
            </span>
            <span className="text-xs text-text-muted">
              / {isPaid ? "∞ Unlimited" : "50 max"}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-text-muted">
            {isPaid ? "Unlimited daily messaging" : `${Math.max(0, 50 - today.messagesUsed)} remaining today`}
          </div>
        </div>

        {/* Card 3: Tokens Today */}
        <div className="p-4 rounded-xl border border-border-primary bg-surface-primary dark:bg-interactive-base flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Tokens Today</span>
            <FiCpu className="text-purple-400 text-sm" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-purple-400 tracking-tight">
              {(today.tokensUsed || 0).toLocaleString()}
            </span>
            <span className="text-xs text-text-muted">tokens</span>
          </div>
          <div className="mt-2 text-[10px] text-text-muted">
            Credits used: <span className="text-text-primary font-medium">{today.creditsUsed || 0} cr</span>
          </div>
        </div>

        {/* Card 4: Lifetime Requests */}
        <div className="p-4 rounded-xl border border-border-primary bg-surface-primary dark:bg-interactive-base flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Total Requests</span>
            <FiActivity className="text-emerald-400 text-sm" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">
              {(lifetime.totalRequests || 0).toLocaleString()}
            </span>
            <span className="text-xs text-text-muted">dispatches</span>
          </div>
          <div className="mt-2 text-[10px] text-text-muted">
            Lifetime Tokens: <span className="text-text-primary font-medium">{(lifetime.totalTokens || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Top-Up Credit Packs */}
      <div className="space-y-3 pt-2">
        <div>
          <h2 className="text-base font-bold text-text-primary">Available Credit Packs</h2>
          <p className="text-xs text-text-muted">Select a credit pack to top up your balance. Instant activation.</p>
        </div>

        {creditPacks.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border-primary text-center bg-surface-primary dark:bg-interactive-base text-text-muted">
            <FiShoppingBag className="text-3xl mx-auto mb-2 text-amber-400 opacity-80" />
            <h4 className="text-sm font-bold text-text-primary">No Credit Top-Up Packages Currently Active</h4>
            <p className="text-xs text-text-muted mt-1">Check back soon for available top-up packages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creditPacks.map((pack) => {
              const isSelected = selectedPack === pack.id;
              const packFeatures = Array.isArray(pack.features) ? pack.features : [];
              return (
                <div
                  key={pack.id || pack._id || pack.name}
                  onClick={() => setSelectedPack(pack.id)}
                  className={`relative p-5 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/5"
                      : "border-border-primary/50 bg-surface-primary dark:bg-interactive-base hover:border-border-primary"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 right-4 px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-amber-400 text-black tracking-wider shadow-sm">
                      Best Value
                    </span>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{pack.name}</h3>
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{pack.description}</p>

                    <div className="my-3.5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-amber-400 tracking-tight">{pack.price}</span>
                      <span className="text-xs text-text-muted">one-time</span>
                    </div>

                    {packFeatures.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-border-primary/40 text-xs">
                        {packFeatures.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-text-secondary">
                            <FiCheck className="text-emerald-400 text-xs mt-0.5 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pack.id);
                    }}
                    disabled={actionLoading}
                    className={`mt-5 w-full py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-400 hover:bg-amber-300 text-black"
                        : "bg-interactive-active hover:bg-interactive-active/80 text-text-primary"
                    }`}
                  >
                    <FiShoppingBag className="text-xs" />
                    <span>{actionLoading && isSelected ? "Purchasing..." : `Buy ${(pack.credits || 500).toLocaleString()} Credits`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="p-4 rounded-xl border border-border-primary/50 bg-surface-primary dark:bg-interactive-base flex flex-wrap items-center justify-between text-xs text-text-muted gap-3">
        <div className="flex items-center gap-2">
          <FiShield className="text-emerald-400 text-sm" />
          <span>Purchasing any credit pack unlocks unlimited daily messages permanently.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>🔒 256-Bit Encrypted Payments</span>
          <span>⚡ Instant Wallet Credit</span>
          <span>♾️ Credits Never Expire</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
