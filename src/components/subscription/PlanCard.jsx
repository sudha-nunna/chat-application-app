import { FiCheck, FiZap,FiShield, FiArrowRight } from "react-icons/fi";

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

  const isCurrent = currentPlan.toLowerCase() === planKey.toLowerCase();
  const priceDisplay = isAnnual
    ? `$${annualPrice}/mo`
    : `$${monthlyPrice}/mo`;

  const getPriorityBadge = () => {
    switch (planKey.toLowerCase()) {
      case "enterprise":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <FiShield /> Dedicated ({priorityScore})
          </span>
        );
      case "pro":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <FiZap className="text-amber-300 animate-pulse" /> High Priority ({priorityScore})
          </span>
        );
      case "free":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
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
          ? "bg-gradient-to-b from-blue-950/60 via-slate-900 to-slate-950 border-blue-500/60 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/30"
          : isCurrent
          ? "bg-slate-900/90 border-slate-700 shadow-md"
          : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md shadow-blue-600/30 border border-blue-400/40">
          Most Popular
        </div>
      )}

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          {getPriorityBadge()}
        </div>

        <p className="text-xs text-slate-400 mb-4 min-h-[32px]">{description}</p>

        {/* Pricing */}
        <div className="mb-5">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {monthlyPrice === 0 ? "$0" : priceDisplay}
            </span>
            {monthlyPrice > 0 && (
              <span className="text-xs text-slate-400 font-medium">
                {isAnnual ? "billed annually" : "per month"}
              </span>
            )}
          </div>
          {isAnnual && monthlyPrice > 0 && (
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
              Save 20% compared to monthly
            </p>
          )}
        </div>

        {/* Core Specs */}
        <div className="space-y-2 py-3 border-t border-b border-slate-800/80 mb-4 text-xs">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Daily Messages:</span>
            <span className="font-semibold text-slate-200">
              {formatLimit(maxMessagesPerDay, "/ Day")}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">AI Agents:</span>
            <span className="font-semibold text-slate-200">
              {formatLimit(maxAgents, "Agents")}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Knowledge Files:</span>
            <span className="font-semibold text-slate-200">
              {formatLimit(maxKnowledgeFiles, "Files")}
            </span>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 mb-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Included Features:
          </p>
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
              <FiCheck className="text-blue-400 text-sm shrink-0 mt-0.5" />
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
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-default flex items-center justify-center gap-1"
          >
            <span>Current Active Plan</span>
          </button>
        ) : (
          <button
            onClick={() => onSelect(planKey)}
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
              isRecommended
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-blue-600/25"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
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
