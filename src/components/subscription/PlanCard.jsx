import { FiCheck, FiZap, FiShield, FiArrowRight } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

const PlanCard = ({
  plan,
  isAnnual,
  currentPlan,
  onSelect,
  loading = false,
}) => {
  const {
    key: planKey,
    name: title,
    monthlyPrice,
    annualPrice,
    description,
    features = [],
    priorityScore = 10,
    maxMessagesPerDay,
    maxAgents,
    maxKnowledgeFiles,
    recommended: isRecommended = false,
  } = plan;

  const { isDark } = useTheme();

  const isCurrent = currentPlan.toLowerCase() === planKey.toLowerCase();
  const priceDisplay = isAnnual
    ? `$${annualPrice}/mo`
    : `$${monthlyPrice}/mo`;

  const getPriorityBadge = () => {
    switch (planKey.toLowerCase()) {
      case "enterprise":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-interactive-base/20 text-text-primary border border-border-primary/30">
            <FiShield /> Dedicated ({priorityScore})
          </span>
        );
      case "pro":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-interactive-base/20 text-text-primary border border-border-primary/30">
            <FiZap className="text-amber-500 animate-pulse" /> High Priority ({priorityScore})
          </span>
        );
      case "free":
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
            "bg-surface-secondary dark:bg-interactive-active text-text-primary border-border-primary"
          }`}>
            Standard ({priorityScore})
          </span>
        );
    }
  };

  const formatLimit = (val, label) => {
    if (val === -1) return "Unlimited";
    return `${val} ${label}`;
  };

  return (
    <div
      className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
        isRecommended
          ? "bg-gradient-to-b from-interactive-base via-white to-interactive-hover border-border-primary shadow-lg shadow-black/10/10 ring-1 ring-border-focus/30 dark:bg-gradient-to-b dark:from-interactive-base/60 dark:via-interactive-active dark:to-interactive-hover dark:border-border-primary/60 dark:shadow-xl dark:shadow-black/10/10 dark:ring-1 dark:ring-border-focus/30"
          : isCurrent
          ? "bg-white border-border-primary shadow-md dark:bg-interactive-active/90 dark:border-border-primary dark:shadow-md"
          : "bg-white border-border-primary hover:border-border-primary shadow-sm dark:bg-interactive-active/50 dark:border-border-primary dark:hover:border-border-primary"
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-interactive-base to-interactive-hover text-text-primary dark:text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md shadow-black/10/30 border border-border-primary/40">
          Most Popular
        </div>
      )}

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-bold tracking-tight ${"text-text-primary dark:text-white"}`}>{title}</h3>
          {getPriorityBadge()}
        </div>

        <p className={`text-xs mb-4 min-h-[32px] ${"text-text-primary"}`}>{description}</p>

        {/* Pricing */}
        <div className="mb-5">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-extrabold tracking-tight ${"text-text-primary dark:text-white"}`}>
              {monthlyPrice === 0 ? "$0" : priceDisplay}
            </span>
            {monthlyPrice > 0 && (
              <span className={`text-xs font-medium ${"text-text-primary"}`}>
                {isAnnual ? "billed annually" : "per month"}
              </span>
            )}
          </div>
          {isAnnual && monthlyPrice > 0 && (
            <p className="text-[10px] text-text-primary font-medium mt-0.5">
              Save 20% compared to monthly
            </p>
          )}
        </div>

        {/* Core Specs */}
        <div className={`space-y-2 py-3 border-t border-b mb-4 text-xs ${
          "border-border-primary dark:border-border-primary/80"
        }`}>
          <div className="flex justify-between">
            <span className={"text-text-primary"}>Daily Messages:</span>
            <span className={`font-semibold ${"text-text-primary dark:text-text-muted"}`}>
              {formatLimit(maxMessagesPerDay, "/ Day")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={"text-text-primary"}>AI Agents:</span>
            <span className={`font-semibold ${"text-text-primary dark:text-text-muted"}`}>
              {formatLimit(maxAgents, "Agents")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={"text-text-primary"}>Knowledge Files:</span>
            <span className={`font-semibold ${"text-text-primary dark:text-text-muted"}`}>
              {formatLimit(maxKnowledgeFiles, "Files")}
            </span>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 mb-6">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${"text-text-primary"}`}>
            Included Features:
          </p>
          {features.map((feat, idx) => (
            <div key={idx} className={`flex items-start gap-2 text-xs ${"text-text-primary dark:text-text-muted"}`}>
              <FiCheck className="text-text-primary text-sm shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div>
        {isCurrent ? (
          <button
            disabled
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border cursor-default flex items-center justify-center gap-1 ${
              "bg-surface-secondary dark:bg-interactive-active/80 text-text-primary border-border-primary dark:border-border-primary/60"
            }`}
          >
            <span>Current Active Plan</span>
          </button>
        ) : (
          <button
            onClick={() => onSelect(planKey)}
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
              isRecommended
                ? "bg-gradient-to-r from-interactive-base via-interactive-active to-interactive-hover hover:from-interactive-base hover:to-interactive-hover text-text-primary dark:text-white shadow-black/10/25"
                : "bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white shadow-black/10/20"
            }`}
          >
            <span>{planKey === "free" ? "Downgrade to Free" : `Upgrade to ${title}`}</span>
            <FiArrowRight />
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanCard;
