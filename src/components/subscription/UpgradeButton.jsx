import { useSubscription } from "../../context/SubscriptionContext";
import { FiZap } from "react-icons/fi";

const UpgradeButton = ({ variant = "default", className = "" }) => {
  const { currentPlan, setIsUpgradeModalOpen } = useSubscription();

  // Hide persistent upgrade CTA for paid users
  if (currentPlan !== "free") {
    return null;
  }

  if (variant === "compact") {
    return (
      <button
        onClick={() => setIsUpgradeModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition active:scale-[0.98] ${className}`}
        title="Upgrade your account plan"
      >
        <FiZap className="text-amber-300 text-xs animate-pulse" />
        <span>Upgrade</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setIsUpgradeModalOpen(true)}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/40 text-xs font-semibold text-blue-300 transition group ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-lg bg-blue-500/20 text-amber-300 border border-blue-400/30 group-hover:scale-110 transition">
          <FiZap className="text-sm animate-pulse" />
        </div>
        <div className="text-left">
          <p className="text-[11px] font-bold text-white tracking-tight">Upgrade to Pro</p>
          <p className="text-[9px] text-blue-300/80 font-normal">Get High Priority & Unlimited AI</p>
        </div>
      </div>
      <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold shadow group-hover:bg-blue-400 transition">
        20% OFF
      </span>
    </button>
  );
};

export default UpgradeButton;
