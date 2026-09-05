import { FiCheck, FiZap, FiShield, FiArrowRight, FiMessageSquare, FiCpu } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

const PlanCard = ({
  plan,
  currentPlan,
  onSelect,
  loading = false,
}) => {
  const {
    key: planKey,
    name: title,
    monthlyPrice = 0,
    creditsGranted,
    credits,
    description,
    features = [],
    priorityScore = 10,
    maxMessagesPerDay,
    recommended: isRecommended = false,
  } = plan;

  const { isDark } = useTheme();

  const isCurrent = currentPlan?.toLowerCase() === planKey?.toLowerCase();
  const effectiveCredits =
    creditsGranted ||
    credits ||
    (monthlyPrice === 5 ? 500 : monthlyPrice === 20 ? 2500 : monthlyPrice === 70 ? 10000 : monthlyPrice > 0 ? monthlyPrice * 100 : 0);

  const getPriorityBadge = () => {
    switch (planKey?.toLowerCase()) {
      case "enterprise":
      case "power":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
            <FiShield className="w-3 h-3 text-purple-600 dark:text-purple-300" /> Dedicated ({priorityScore})
          </span>
        );
      case "pro":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
            <FiZap className="w-3 h-3 animate-pulse text-amber-600 dark:text-amber-400" /> High Priority ({priorityScore})
          </span>
        );
      case "free":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-500/30">
            Standard ({priorityScore})
          </span>
        );
    }
  };

  const formatLimit = (val) => {
    if (monthlyPrice > 0 || val === -1) return "Unlimited (Token-based)";
    return `${val || 50} / Day`;
  };

  return (
    <div
      className={`relative flex flex-col justify-between p-5 md:p-6 rounded-2xl transition-all duration-300 group h-full ${
        isRecommended
          ? "bg-gradient-to-b from-accent-primary/[0.08] via-white to-white dark:from-[#1d1f36] dark:via-[#151726] dark:to-[#131420] border-2 border-accent-primary dark:border-[#7c83f6] shadow-xl shadow-accent-primary/15"
          : "bg-white dark:bg-[#141522] border border-border-primary/80 dark:border-white/10 hover:border-accent-primary/50 dark:hover:border-white/20 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Popular Badge */}
      {isRecommended && (
        <div className="absolute top-3.5 right-3.5 bg-gradient-to-r from-accent-primary to-indigo-600 text-white text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md shadow-accent-primary/30">
          Popular
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-lg font-bold tracking-tight text-text-primary dark:text-white flex items-center gap-2">
            {title}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-300 text-xs leading-relaxed mt-1 pr-2">
            {description}
          </p>
        </div>

        {/* Pricing & Credits (One-Time Credit Pack Display) */}
        <div className="mb-3 pb-3 border-b border-border-primary/60 dark:border-white/10">
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                isRecommended
                  ? "text-accent-primary dark:text-[#a0a5fa]"
                  : "text-text-primary dark:text-white"
              }`}
            >
              {monthlyPrice === 0 ? "$0" : `$${monthlyPrice}`}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400 text-xs font-semibold">
              {monthlyPrice === 0 ? "forever free" : "one-time"}
            </span>
          </div>

          {monthlyPrice > 0 ? (
            <div className="text-xs font-medium flex justify-between items-center mt-1.5">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <FiZap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                {effectiveCredits.toLocaleString()} AI Credits
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-md font-semibold">
                Recharge anytime
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-1.5">
              Default free starter tier
            </div>
          )}
        </div>

        {/* Clean Spec Rows */}
        <div className="space-y-2.5 mb-3 py-2.5 border-b border-border-primary/60 dark:border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <FiMessageSquare className="w-3.5 h-3.5 text-accent-primary shrink-0" />
              <span className="font-medium text-text-primary dark:text-zinc-200">
                Daily Messages
              </span>
            </div>
            <span className="font-bold text-text-primary dark:text-white">
              {formatLimit(maxMessagesPerDay)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <FiCpu className="w-3.5 h-3.5 text-accent-primary shrink-0" />
              <span className="font-medium text-text-primary dark:text-zinc-200">
                Model Priority
              </span>
            </div>
            <div>{getPriorityBadge()}</div>
          </div>
        </div>

        {/* Clean Feature List */}
        <div className="space-y-2 mb-4 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
            Included Features
          </p>
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <FiCheck className="text-accent-primary dark:text-[#8f95ff] w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                {feat}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="relative z-10 mt-auto pt-2">
        {isCurrent && (planKey === "free" || monthlyPrice === 0) ? (
          <button
            disabled
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold border border-border-primary/40 dark:border-white/10 bg-surface-secondary dark:bg-[#1a1c29] text-zinc-400 cursor-default flex items-center justify-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Current Free Tier
          </button>
        ) : isCurrent ? (
          <button
            onClick={() => onSelect(planKey)}
            disabled={loading}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 group/btn cursor-pointer ${
              isRecommended
                ? "bg-accent-primary hover:bg-indigo-600 text-white shadow-md shadow-accent-primary/25"
                : "bg-surface-secondary dark:bg-[#1c1e2d] hover:bg-surface-tertiary dark:hover:bg-[#25283c] text-text-primary dark:text-white border border-border-primary dark:border-white/15"
            }`}
          >
            <FiZap className="text-amber-400 text-xs shrink-0" />
            <span>Top Up {title} (${monthlyPrice})</span>
            <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        ) : (
          <button
            onClick={() => onSelect(planKey)}
            disabled={loading}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 group/btn cursor-pointer ${
              isRecommended
                ? "bg-accent-primary hover:bg-indigo-600 text-white shadow-md shadow-accent-primary/25"
                : "bg-surface-secondary dark:bg-[#1c1e2d] hover:bg-surface-tertiary dark:hover:bg-[#25283c] text-text-primary dark:text-white border border-border-primary dark:border-white/15"
            }`}
          >
            <span>{planKey === "free" ? "Downgrade to Free" : `Buy ${title} ($${monthlyPrice})`}</span>
            <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanCard;

