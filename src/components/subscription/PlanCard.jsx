import { FiCheck, FiZap, FiShield, FiArrowRight, FiMessageSquare, FiCpu, FiClock } from "react-icons/fi";
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
    recommended: isRecommended = false,
  } = plan;

  const { isDark } = useTheme();

  const isCurrent = currentPlan.toLowerCase() === planKey.toLowerCase();
  const priceDisplay = isAnnual
    ? `$${annualPrice}`
    : `$${monthlyPrice}`;

  const getPriorityBadge = () => {
    switch (planKey.toLowerCase()) {
      case "enterprise":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/30 shadow-[0_0_10px_rgba(255,184,0,0.2)]">
            <FiShield className="w-3 h-3" /> Dedicated ({priorityScore})
          </span>
        );
      case "pro":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/30 shadow-[0_0_10px_rgba(255,184,0,0.2)]">
            <FiZap className="w-3 h-3 animate-pulse" /> High Priority ({priorityScore})
          </span>
        );
      case "free":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#2A2A2A] text-[#AAA] border border-[#3A3A3A]">
            Standard ({priorityScore})
          </span>
        );
    }
  };

  const formatLimit = (val) => {
    if (val === -1) return "Unlimited";
    return `${val} / Day`;
  };

  return (
    <div
      className={`relative flex flex-col justify-between p-6 rounded-2xl transition-all duration-300 group overflow-hidden ${
        isRecommended
          ? "bg-[#161616] border border-[#FFB800]/50 shadow-[0_8px_30px_rgba(255,184,0,0.1)] hover:border-[#FFB800] hover:shadow-[0_8px_30px_rgba(255,184,0,0.15)] scale-[1.02] z-10"
          : "bg-[#121212] border border-[#2A2A2A] hover:border-[#444] shadow-lg hover:shadow-xl"
      }`}
    >
      {/* Background Glow for Recommended */}
      {isRecommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#FFB800]/10 rounded-full blur-[50px] pointer-events-none"></div>
      )}

      {isRecommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FFB800] text-black text-[9px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
          Most Popular
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-[#E0E0E0] mb-1">{title}</h3>
            <p className="text-[#888] text-xs h-[32px] leading-relaxed pr-4">{description}</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6 pb-6 border-b border-[#2A2A2A]">
          <div className="flex items-end gap-1 mb-1">
            <span className={`text-4xl font-extrabold tracking-tight ${isRecommended ? "text-[#FFB800]" : "text-white"}`}>
              {monthlyPrice === 0 ? "$0" : priceDisplay}
            </span>
            <span className="text-[#888] text-sm font-medium mb-1">
              /mo
            </span>
          </div>
          {monthlyPrice > 0 ? (
            <div className="text-[11px] text-[#666] font-medium flex justify-between items-center">
              <span>{isAnnual ? "Billed annually" : "Billed monthly"}</span>
              {isAnnual && <span className="text-[#00C853] bg-[#00C853]/10 px-2 py-0.5 rounded">Save 20%</span>}
            </div>
          ) : (
            <div className="text-[11px] text-[#666] font-medium h-[16px]">Forever free</div>
          )}
        </div>

        {/* Core Specs */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-[#2A2A2A]">
            <div className="flex items-center gap-2 text-[#AAA]">
              <FiMessageSquare className="w-4 h-4 text-[#FFB800]" />
              <span className="text-xs font-medium">Daily Messages</span>
            </div>
            <span className="text-sm font-bold text-white">
              {formatLimit(maxMessagesPerDay)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs px-1">
            <div className="flex items-center gap-1.5 text-[#888]">
               <FiCpu className="w-3.5 h-3.5" />
               <span>Model Priority</span>
            </div>
            <div>{getPriorityBadge()}</div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-3 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#666] mb-4">
            Included Features
          </p>
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-3 group/feat">
              <div className="mt-0.5 w-4 h-4 rounded-full bg-[#FFB800]/10 flex items-center justify-center shrink-0 border border-[#FFB800]/20 group-hover/feat:bg-[#FFB800] group-hover/feat:border-[#FFB800] transition-colors">
                <FiCheck className="text-[#FFB800] w-2.5 h-2.5 group-hover/feat:text-black transition-colors" />
              </div>
              <span className="text-xs text-[#AAA] font-medium leading-relaxed group-hover/feat:text-[#E0E0E0] transition-colors">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="relative z-10 mt-auto pt-4">
        {isCurrent ? (
          <button
            disabled
            className="w-full py-3.5 px-4 rounded-xl text-sm font-bold border border-[#333] bg-[#1A1A1A] text-[#888] cursor-default flex items-center justify-center gap-2 transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse"></div>
            Current Active Plan
          </button>
        ) : (
          <button
            onClick={() => onSelect(planKey)}
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group/btn ${
              isRecommended
                ? "bg-[#FFB800] hover:bg-[#F2AE00] text-black shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:shadow-[0_0_25px_rgba(255,184,0,0.5)]"
                : "bg-[#222] hover:bg-[#333] text-white border border-[#333] hover:border-[#444]"
            }`}
          >
            <span>{planKey === "free" ? "Downgrade to Free" : `Upgrade to ${title}`}</span>
            <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanCard;
