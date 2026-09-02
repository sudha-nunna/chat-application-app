import { useState } from "react";
import { FiAlertCircle, FiX, FiZap, FiCheck, FiShoppingBag, FiShield } from "react-icons/fi";
import { backEndCallPost, NobackEndCallObj } from "../../services/authService";

const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 500, price: "$5", desc: "500 Credits" },
  { id: "pro", name: "Pro Pack", credits: 2500, price: "$20", desc: "2,500 Credits • Best Value", popular: true },
  { id: "power", name: "Power", credits: 10000, price: "$70", desc: "10,000 Credits" }
];

const InsufficientCreditsModal = ({
  isOpen,
  onClose,
  requiredCredits = 0.05,
  availableCredits = 0,
  isDailyLimit = false,
  onCreditsPurchased
}) => {
  const [selectedPack, setSelectedPack] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handlePurchase = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      let res;
      try {
        res = await backEndCallPost("/credits/purchase", { packId: selectedPack });
      } catch {
        res = await NobackEndCallObj("/credits/purchase", { packId: selectedPack }, "post");
      }

      if (res?.success) {
        setSuccessMsg(res.message || "Credits added successfully!");
        if (onCreditsPurchased) {
          onCreditsPurchased(res.data?.newBalance);
        }
        setTimeout(() => {
          onClose();
          setSuccessMsg("");
        }, 1200);
      } else {
        setErrorMsg(res?.message || "Failed to purchase credits. Please try again.");
      }
    } catch (err) {
      console.error("Credit purchase error:", err);
      setErrorMsg(err.message || "Transaction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-border-primary bg-surface-primary dark:bg-interactive-base p-4 shadow-2xl relative text-text-primary">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-text-primary cursor-pointer p-1 rounded-lg hover:bg-interactive-active/40 transition"
        >
          <FiX className="text-sm" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-base shadow-inner">
            <FiZap />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              {isDailyLimit ? "Daily Limit Reached" : "Recharge Wallet"}
            </h2>
            <p className="text-[10px] text-text-muted">
              {isDailyLimit
                ? "Free tier capped at 50 msgs/day. Top up for unlimited chat."
                : `Balance: ${availableCredits || 0} cr. Top up to continue.`}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-2.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
            <FiCheck className="text-xs" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credit Packs Grid */}
        <div className="space-y-1.5 mb-3">
          {CREDIT_PACKS.map((pack) => {
            const isSelected = selectedPack === pack.id;
            return (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack.id)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "border-amber-400 bg-amber-500/10 shadow-xs"
                    : "border-border-primary/50 bg-surface-secondary/20 hover:border-border-primary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isSelected ? "border-amber-400 bg-amber-400 text-black" : "border-text-muted"
                    }`}
                  >
                    {isSelected && <FiCheck className="text-[8px]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-text-primary">{pack.name}</span>
                      {pack.popular && (
                        <span className="px-1 py-0.2 text-[8px] font-extrabold uppercase rounded bg-amber-400 text-black tracking-wider">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-text-muted">{pack.desc}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-amber-400 font-mono">{pack.price}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-2 rounded-lg bg-interactive-active/40 border border-border-primary/40 flex items-center gap-1.5 text-[9px] text-text-muted mb-3">
          <FiShield className="text-emerald-400 text-xs shrink-0" />
          <span>Purchasing unlocks unlimited daily messages permanently.</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-lg border border-border-primary/60 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-interactive-active/40 cursor-pointer transition"
          >
            Cancel
          </button>

          <button
            onClick={handlePurchase}
            disabled={loading}
            className="flex-1 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
          >
            <FiShoppingBag className="text-xs" />
            <span>{loading ? "Processing..." : "Buy Credits"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsufficientCreditsModal;

