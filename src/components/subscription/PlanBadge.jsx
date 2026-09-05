import { useSubscription } from "../../context/SubscriptionContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { FiZap, FiShield } from "react-icons/fi";

const PlanBadge = ({ showPriority = false, className = "" }) => {
  const { currentPlan, priorityScore } = useSubscription();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const getBadgeStyle = () => {
    switch (currentPlan.toLowerCase()) {
      case "enterprise":
        return {
          bg: "bg-surface-secondary dark:bg-gradient-to-r dark:from-amber-500/20 dark:via-interactive-active/20 dark:to-interactive-hover/20 text-text-primary border-border-primary dark:border-border-primary/40 hover:bg-surface-secondary/80 dark:hover:brightness-125",
          icon: <FiShield className="text-text-primary shrink-0" />,
          label: "ENTERPRISE",
          priorityLabel: "Dedicated Priority",
        };
      case "pro":
        return {
          bg: "bg-surface-secondary dark:bg-gradient-to-r dark:from-interactive-base/20 dark:to-interactive-hover/20 text-text-primary border-border-primary dark:border-border-primary/40 hover:bg-surface-secondary/80 dark:hover:brightness-125",
          icon: <FiZap className="text-text-primary shrink-0 animate-pulse" />,
          label: "PRO",
          priorityLabel: "High Priority",
        };
      case "free":
      default:
        return {
          bg: "bg-surface-secondary dark:bg-[#272727]/80 hover:bg-surface-secondary/80 dark:hover:bg-[#333] text-text-primary dark:text-[#ececec] border-transparent",
          icon: null,
          label: "FREE",
          priorityLabel: "Standard Priority",
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); navigate("/subscription"); }}
      className={`cursor-pointer transition-all inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border shadow-sm ${badge.bg} ${className}`}
      title="Manage Subscription"
    >
      {badge.icon}
      <span>{badge.label}</span>
      {showPriority && (
        <span className="text-[9px] opacity-75 font-normal border-l border-current pl-1.5 ml-0.5">
          {badge.priorityLabel} ({priorityScore})
        </span>
      )}
    </div>
  );
};

export default PlanBadge;
