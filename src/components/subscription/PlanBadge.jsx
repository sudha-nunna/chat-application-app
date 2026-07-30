import { useSubscription } from "../../context/SubscriptionContext";
import { useTheme } from "../../context/ThemeContext";
import { FiZap, FiShield } from "react-icons/fi";

const PlanBadge = ({ showPriority = false, className = "" }) => {
  const { currentPlan, priorityScore } = useSubscription();
  const { isDark } = useTheme();

  const getBadgeStyle = () => {
    switch (currentPlan.toLowerCase()) {
      case "enterprise":
        return {
          bg: isDark
            ? "bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40"
            : "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: <FiShield className="text-emerald-500 shrink-0" />,
          label: "ENTERPRISE",
          priorityLabel: "Dedicated Priority",
        };
      case "pro":
        return {
          bg: isDark
            ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/40"
            : "bg-blue-100 text-blue-800 border-blue-300",
          icon: <FiZap className="text-blue-500 shrink-0 animate-pulse" />,
          label: "PRO",
          priorityLabel: "High Priority",
        };
      case "free":
      default:
        return {
          bg: isDark
            ? "bg-slate-800/80 text-slate-400 border-slate-700/60"
            : "bg-slate-200 text-slate-700 border-slate-300",
          icon: null,
          label: "FREE",
          priorityLabel: "Standard Priority",
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border shadow-sm ${badge.bg} ${className}`}>
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
