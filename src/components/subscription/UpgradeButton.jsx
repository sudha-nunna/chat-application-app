import { useSubscription } from "../../context/SubscriptionContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { FiZap } from "react-icons/fi";

const UpgradeButton = ({ variant = "default", className = "" }) => {
  const { currentPlan } = useSubscription();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Always show upgrade CTA as per user request

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate("/subscription")}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gradient-to-r from-interactive-base via-interactive-active to-interactive-hover hover:from-interactive-base hover:to-interactive-hover text-text-primary dark:text-white shadow-md transition active:scale-[0.98] ${className}`}
        title="Upgrade your account plan"
      >
        <FiZap className="text-amber-600 text-xs animate-pulse" />
        <span>Upgrade</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/subscription")}
      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition group ${
        "bg-surface-secondary hover:bg-surface-secondary/80 border-border-primary text-text-primary dark:bg-gradient-to-r dark:from-interactive-active/20 dark:to-interactive-active/10 dark:hover:from-interactive-active/30 dark:hover:to-interactive-active/20 dark:border-interactive-active/30 dark:text-text-muted"
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${"bg-interactive-base/10 dark:bg-interactive-active border-interactive-base/20 dark:border-interactive-base/30 text-amber-500 group-hover:scale-105"}`}>
          <FiZap className="text-sm" />
        </div>
        <div className="text-left">
          <p className={`text-[13px] font-bold tracking-tight leading-none mb-1 ${"text-text-primary dark:text-white"}`}>Upgrade to Pro</p>
          <p className={`text-[10px] font-medium leading-none ${"text-text-primary/80 dark:text-text-muted"}`}>Get High Priority & Unlimited AI</p>
        </div>
      </div>
      <span className="text-[10px] bg-interactive-base text-text-primary dark:text-white px-3 py-1 rounded-full font-bold shadow-sm">
        20% OFF
      </span>
    </button>
  );
};

export default UpgradeButton;
