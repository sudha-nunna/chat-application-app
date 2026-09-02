import { useState } from "react";
import { useSubscription } from "../../context/SubscriptionContext";
import { FiX, FiZap, FiShield, FiCheck, FiShoppingBag } from "react-icons/fi";
import { backEndCallPost, NobackEndCallObj } from "../../services/authService";

const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 500,
    price: "$5.00",
    description: "Great for quick questions, casual coding, and daily assistant tasks.",
    features: ["500 AI Credits", "Token-based Billing", "Unlocks Paid Tier (No daily message cap)", "All Online Models Included"]
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 2500,
    price: "$20.00",
    popular: true,
    description: "Best value for heavy developers, creators, and multi-turn workflows.",
    features: ["2,500 AI Credits", "Save 20% compared to Starter", "Unlocks Paid Tier (Unlimited daily messages)", "Priority Cluster Routing", "All Online Models Included"]
  },
  {
    id: "power",
    name: "Power Pack",
    credits: 10000,
    price: "$70.00",
    description: "Maximum capacity for enterprise workloads and high token models.",
    features: ["10,000 AI Credits", "Save 30% volume discount", "Unlocks Paid Tier (Unlimited daily messages)", "Highest Priority Cluster Routing", "Dedicated Model Access"]
  }
];

const SubscriptionModal = () => {
  const { isUpgradeModalOpen, setIsUpgradeModalOpen } = useSubscription();
  const [selectedPack, setSelectedPack] = useState("pro");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isUpgradeModalOpen) return null;

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
        setTimeout(() => {
          setIsUpgradeModalOpen(false);
          setFeedback(null);
        }, 1400);
      } else {
        setFeedback({ type: "error", message: res?.message || "Purchase failed." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Transaction error." });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-md transition-opacity bg-black/70"
        onClick={() => setIsUpgradeModalOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden z-10 my-auto bg-surface-primary dark:bg-interactive-base border-border-primary text-text-primary">
        {/* Header Bar */}
        <div className="p-4 border-b flex items-center justify-between border-border-primary/60 bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-base shadow-inner">
              <FiZap />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-text-primary">Buy Credits & Top Up Wallet</h2>
              <p className="text-[10px] text-text-muted">Pay-as-you-go token billing with zero recurring fees.</p>
            </div>
          </div>

          <button
            onClick={() => setIsUpgradeModalOpen(false)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-interactive-active/40 transition cursor-pointer"
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs font-semibold text-center border ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Credit Packs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CREDIT_PACKS.map((pack) => {
              const isSelected = selectedPack === pack.id;
              return (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPack(pack.id)}
                  className={`relative p-3.5 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "border-amber-400 bg-amber-500/10 shadow-xs"
                      : "border-border-primary/50 bg-surface-secondary/20 hover:border-border-primary"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2 right-3 px-1.5 py-0.2 text-[8px] font-extrabold uppercase rounded-full bg-amber-400 text-black tracking-wider shadow-xs">
                      Best Value
                    </span>
                  )}

                  <div>
                    <h3 className="text-xs font-bold text-text-primary">{pack.name}</h3>
                    <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{pack.description}</p>

                    <div className="my-2.5 flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-amber-400 tracking-tight font-mono">{pack.price}</span>
                      <span className="text-[10px] text-text-muted">one-time</span>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-border-primary/40 text-[11px]">
                      {pack.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-text-secondary">
                          <FiCheck className="text-emerald-400 text-[10px] mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pack.id);
                    }}
                    disabled={actionLoading}
                    className={`mt-3.5 w-full py-1.5 rounded-lg font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-400 hover:bg-amber-300 text-black"
                        : "bg-interactive-active hover:bg-interactive-active/80 text-text-primary"
                    }`}
                  >
                    <FiShoppingBag className="text-xs" />
                    <span>{actionLoading && isSelected ? "Purchasing..." : `Buy ${pack.credits.toLocaleString()}`}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Trust Banner */}
          <div className="pt-2.5 border-t border-border-primary/50 flex flex-wrap items-center justify-between text-[10px] text-text-muted gap-2">
            <div className="flex items-center gap-1">
              <FiShield className="text-emerald-400 text-xs" />
              <span>Purchasing any credit pack unlocks unlimited daily messages.</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔒 256-Bit SSL</span>
              <span>⚡ Never Expire</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;

