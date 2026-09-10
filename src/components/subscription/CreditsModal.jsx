import { useState, useMemo } from "react";
import {
  FiRefreshCw,
  FiX,
  FiCreditCard,
  FiActivity,
  FiLayers,
  FiZap,
  FiCheckCircle,
  FiAlertTriangle,
  FiMenu,
  FiShoppingBag,
  FiCpu,
  FiClock,
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";
import { backEndCallGet } from "../../services/authService";
import { useSubscription } from "../../context/SubscriptionContext";
import { useTanStackData, useTanStackQueryClient } from "../../hooks/useTanStackData";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const CreditsModal = ({ isPage = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isUsageRoute = location.pathname.startsWith("/usage") || isPage;
  const { isDark } = useTheme();

  const {
    isCreditsModalOpen,
    setIsCreditsModalOpen,
    refreshSubscription,
  } = useSubscription();

  const queryClient = useTanStackQueryClient();
  const token = localStorage.getItem("token");

  // Fetch real-time usage telemetry from backend
  const {
    data: usageData,
    isLoading,
    isFetching,
    isError,
  } = useTanStackData(
    ["usage"],
    async () => {
      if (!token) return null;
      const res = await backEndCallGet("/usage/summary");
      return res?.data || res || null;
    },
    { enabled: (isCreditsModalOpen || isUsageRoute) && !!token }
  );

  const [hoveredDayPoint, setHoveredDayPoint] = useState(null);

  const loading = isLoading || isFetching;
  const error = isError ? "Unable to load real-time usage telemetry. Please try refreshing." : "";

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["usage"] });
    if (refreshSubscription) refreshSubscription();
  };

  const handleClose = () => {
    setIsCreditsModalOpen(false);
    if (isUsageRoute) {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/chat");
      }
    }
  };

  const handleBuyCredits = () => {
    setIsCreditsModalOpen(false);
    navigate("/subscription");
  };

  if (!isCreditsModalOpen && !isUsageRoute) return null;

  // Real Dynamic Telemetry Payloads from Backend
  const user = usageData?.user || { credits: 0, plan: "Free Tier", isPaidUser: false };
  const plan = usageData?.plan || { name: "FREE TIER", maxMessagesPerDay: 50, isPaidUser: false };
  const today = usageData?.today || {
    messagesUsed: 0,
    tokensUsed: 0,
    creditsUsed: 0,
    messagesRemaining: 50,
  };
  const lifetime = usageData?.lifetime || {
    totalTokens: 0,
    totalCreditsUsed: 0,
    totalRequests: 0,
  };
  const recentTransactions = usageData?.recentTransactions || [];
  const recentHistory = usageData?.recentHistory || [];

  const isUnlimited = plan.maxMessagesPerDay === -1 || user.isPaidUser;
  const maxCap = plan.maxMessagesPerDay > 0 ? plan.maxMessagesPerDay : 50;

  // Formatting helpers
  const formatNumber = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toLocaleString();
  };

  const formatModelName = (id) => {
    if (!id || typeof id !== "string") return "—";
    const clean = id.toLowerCase().trim();
    if (clean === "auto") return "Auto AI Router";
    if (clean.includes("deepseek")) return "DeepSeek V4 Flash";
    if (clean.includes("glm-4-flash") || clean.includes("glm-4")) return "GLM-4 Flash";
    if (clean.includes("glm-5")) return "GLM-5 Flash";
    if (clean.includes("kimi")) return "Kimi K2.7 Code";
    if (clean.includes("gemini-2.5-flash")) return "Gemini 2.5 Flash";
    if (clean.includes("gemini-2.5-pro")) return "Gemini 2.5 Pro";
    if (clean.includes("gemini")) return "Google Gemini";
    if (clean.includes("qwen")) return "Qwen 2.5";
    if (clean.includes("nemotron")) return "Nemotron 3";
    if (clean.includes("minimax")) return "MiniMax M2.7";
    if (clean.includes("gpt-4")) return "GPT-4o";
    if (clean.includes("claude")) return "Claude 3.5";
    return id.split("/").pop().replace(/[:_]/g, " ");
  };

  // Senior Developer Parser: Extracts human-readable activity & exact telemetry
  const getTransactionInfo = (tx) => {
    const isPositive = (tx.amount || 0) > 0;
    const type = (tx.type || "").toLowerCase();
    const desc = (tx.description || "").trim();

    let activity = "AI Chat Response";
    let isModelUsage = false;

    if (
      type === "admin_grant" ||
      desc.toLowerCase().includes("admin manual") ||
      desc.toLowerCase().includes("admin balance") ||
      desc.toLowerCase().includes("admin adjustment")
    ) {
      activity = isPositive ? "Admin Credit Top-up" : "Admin Balance Adjustment";
      isModelUsage = false;
    } else if (type === "purchase" || desc.toLowerCase().includes("purchase") || desc.toLowerCase().includes("top up")) {
      activity = "Credit Pack Top-up";
      isModelUsage = false;
    } else if (type === "subscription_grant" || desc.toLowerCase().includes("subscription")) {
      activity = "Monthly Plan Allowance";
      isModelUsage = false;
    } else if (
      type === "ai_message_consumption" ||
      type === "message_sent" ||
      type === "bot_chat" ||
      !isPositive
    ) {
      activity = "AI Chat Response";
      isModelUsage = true;
    } else {
      activity = isPositive ? "Credit Credited" : "Credit Deducted";
    }

    // Model Name: Show real model ONLY for AI completions, NEVER for wallet/admin operations!
    let modelDisplay = "—";
    if (isModelUsage) {
      if (tx.modelId && tx.modelId.trim()) {
        modelDisplay = formatModelName(tx.modelId);
      } else if (desc.toLowerCase().includes("for ")) {
        const parts = desc.split(/for /i);
        modelDisplay = formatModelName(parts[parts.length - 1].trim());
      } else {
        modelDisplay = "Auto AI Router";
      }
    }

    // Exact Token Count
    let tokens = null;
    let promptTok = tx.promptTokens || null;
    let compTok = tx.completionTokens || null;

    if (typeof tx.totalTokens === "number" && tx.totalTokens > 0) {
      tokens = tx.totalTokens;
    } else if ((tx.promptTokens || 0) + (tx.completionTokens || 0) > 0) {
      tokens = (tx.promptTokens || 0) + (tx.completionTokens || 0);
    } else if (desc.includes("tokens")) {
      const match = desc.match(/\((\d+)\s*in\s*\/\s*(\d+)\s*out tokens\)/i);
      if (match) {
        promptTok = parseInt(match[1], 10);
        compTok = parseInt(match[2], 10);
        tokens = promptTok + compTok;
      }
    }

    return {
      activity,
      modelDisplay,
      tokens,
      promptTokens: promptTok,
      completionTokens: compTok,
      isPositive,
      isModelUsage,
    };
  };

  // 100% Dynamic 7-Day Rolling Telemetry Graph (Directly Mapped from MongoDB History)
  const dailyUsageData = useMemo(() => {
    const numDays = 7;
    const days = [];
    const now = new Date();

    // Index MongoDB history records by date string YYYY-MM-DD
    const historyMap = new Map();
    (recentHistory || []).forEach((h) => {
      if (h?.date) {
        historyMap.set(h.date, {
          tokens: h.tokensUsedToday || 0,
          messages: h.messagesUsedToday || 0,
          credits: h.creditsUsedToday || 0,
        });
      }
    });

    // Ensure today's live telemetry is included
    const todayKey = new Date().toISOString().split("T")[0];
    if (today) {
      historyMap.set(todayKey, {
        tokens: today.tokensUsed || 0,
        messages: today.messagesUsed || 0,
        credits: today.creditsUsed || 0,
      });
    }

    // Build array for exactly the last 7 calendar days ending today
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const record = historyMap.get(dateKey) || { tokens: 0, messages: 0, credits: 0 };

      days.push({
        dateObj: d,
        dateKey,
        dayLabel: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
        shortDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        tokens: record.tokens,
        messages: record.messages,
        credits: record.credits,
      });
    }

    // Dynamic 7-day token total
    const totalPeriodTokens = days.reduce((sum, d) => sum + (d.tokens || 0), 0);
    const totalPeriodMessages = days.reduce((sum, d) => sum + (d.messages || 0), 0);
    const totalPeriodCredits = days.reduce((sum, d) => sum + (d.credits || 0), 0);

    // SVG Chart Coordinates (360 x 120 viewBox)
    const maxTokens = Math.max(...days.map((d) => d.tokens), 500);
    const width = 360;
    const height = 120;
    const padX = 24;
    const padTop = 18;
    const padBottom = 22;
    const usableW = width - padX * 2;
    const usableH = height - padTop - padBottom;

    const coords = days.map((day, idx) => {
      const x = padX + (idx / (days.length - 1)) * usableW;
      const normalized = maxTokens > 0 ? day.tokens / maxTokens : 0;
      const y = height - padBottom - normalized * usableH;
      return { ...day, x, y };
    });

    let linePath = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cx = p0.x + (p1.x - p0.x) / 2;
      linePath += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }

    const baselineY = height - padBottom;
    const areaPath = `${linePath} L ${coords[coords.length - 1].x},${baselineY} L ${coords[0].x},${baselineY} Z`;

    return {
      coords,
      linePath,
      areaPath,
      maxTokens,
      totalPeriodTokens,
      totalPeriodMessages,
      totalPeriodCredits,
    };
  }, [recentHistory, today]);

  // Credit health metrics
  const creditBalance = typeof user.credits === "number" ? user.credits : 0;
  const creditHealthStatus =
    creditBalance > 100
      ? { label: "Healthy", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", barColor: "bg-emerald-500" }
      : creditBalance > 20
        ? { label: "Moderate", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", barColor: "bg-amber-500" }
        : creditBalance > 0
          ? { label: "Low", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", barColor: "bg-rose-500" }
          : { label: "Depleted", color: "text-rose-500 bg-rose-500/20 border-rose-500/30", barColor: "bg-rose-600" };

  // ─── Theme-aware class tokens ─────────────────────────────────────────────
  const bg            = isDark ? "bg-[#0b0c13]"         : "bg-gray-50";
  const bgCard        = isDark ? "bg-[#131422]"         : "bg-white";
  const bgHeader      = isDark ? "bg-[#11121c]/90"      : "bg-white/90";
  const bgTableHead   = isDark ? "bg-[#161828]"         : "bg-gray-100";
  const bgRowHover    = isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50";
  const bgTableRow    = isDark ? "divide-white/[0.04]"  : "divide-gray-100";
  const border        = isDark ? "border-white/[0.07]"  : "border-gray-200";
  const borderH       = isDark ? "border-white/[0.08]"  : "border-gray-200";
  const borderSub     = isDark ? "border-white/[0.06]"  : "border-gray-100";
  const textBase      = isDark ? "text-slate-200"       : "text-gray-800";
  const textMuted     = isDark ? "text-slate-400"       : "text-gray-500";
  const textTitle     = isDark ? "text-white"           : "text-gray-900";
  const textLabel     = isDark ? "text-slate-300"       : "text-gray-700";
  const textDim       = isDark ? "text-slate-500"       : "text-gray-400";
  const bgProgress    = isDark ? "bg-white/[0.06]"      : "bg-gray-200";
  const bgRefBtn      = isDark ? "bg-[#1a1b2b] hover:bg-[#23253b]" : "bg-gray-100 hover:bg-gray-200";
  const borderBtn     = isDark ? "border-white/10"      : "border-gray-300";
  const bgCloseBtn    = isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200";
  const tooltipBg     = isDark ? "bg-[#161728]/95"      : "bg-white/95";
  const tooltipBorder = isDark ? "border-indigo-500/30" : "border-indigo-200";
  const tooltipTxt    = isDark ? "text-white"           : "text-gray-900";
  const tooltipMuted  = isDark ? "text-slate-400"       : "text-gray-500";
  const tooltipDiv    = isDark ? "border-white/10"      : "border-gray-200";
  const tooltipSep    = isDark ? "bg-white/10"          : "bg-gray-200";
  const tooltipSub    = isDark ? "text-slate-500"       : "text-gray-400";
  const gridLn        = isDark ? "text-white/[0.04]"    : "text-black/[0.06]";
  const gridBase      = isDark ? "text-white/[0.06]"    : "text-black/[0.08]";
  const xBorder       = isDark ? "border-white/[0.05]"  : "border-gray-200";
  const xText         = isDark ? "text-slate-500"       : "text-gray-400";
  const xToday        = isDark ? "text-slate-200"       : "text-gray-800";
  const xHover        = isDark ? "hover:text-slate-300" : "hover:text-gray-600";
  const dotStroke     = isDark ? "#0b0c13"              : "#f9fafb";
  const mobileBtn     = isDark ? "border-white/10 hover:bg-white/5 text-slate-300 hover:text-white" : "border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-gray-900";
  const txTime        = isDark ? "text-slate-400"       : "text-gray-500";
  const txAct         = isDark ? "text-slate-200"       : "text-gray-800";
  const txModel       = isDark ? "text-slate-300"       : "text-gray-700";
  const txTok         = isDark ? "text-slate-300"       : "text-gray-700";
  const txEmpty       = isDark ? "text-slate-500"       : "text-gray-400";
  const txNoData      = isDark ? "text-slate-500"       : "text-gray-400";
  const tableRowBg    = isDark ? "bg-[#151726]/50"      : "bg-gray-50/80";

  return (
    <div className={`w-full h-full flex flex-col ${bg} ${textBase} overflow-hidden font-sans select-none transition-colors`}>
      {/* Top Header Bar */}
      <div className={`py-3.5 px-6 md:px-8 border-b ${borderH} ${bgHeader} backdrop-blur-md flex items-center justify-between shrink-0 z-20`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("toggleMobileSidebar"))}
            className={`md:hidden p-2 rounded-xl border ${mobileBtn} flex items-center justify-center shrink-0 transition`}
            title="Toggle Sidebar"
          >
            <FiMenu className="text-base" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base md:text-lg font-bold tracking-tight ${textTitle} flex items-center gap-2`}>
                Credits &amp; Usage Telemetry
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                {plan.name}
              </span>
            </div>
            <p className={`text-[11px] ${textMuted}`}>
              Live consumption telemetry, balance quotas, and token activity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium ${bgRefBtn} ${textLabel} border ${borderBtn} transition flex items-center gap-1.5 cursor-pointer shadow-xs`}
            title="Refresh Metrics"
          >
            <FiRefreshCw className={`text-xs ${loading ? "animate-spin text-indigo-400" : textMuted}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleBuyCredits}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <FiShoppingBag className="text-xs" />
            <span>Buy Credits</span>
          </button>

          <button
            onClick={handleClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${bgCloseBtn} ${textMuted} transition cursor-pointer border ${borderBtn}`}
            title="Close Panel"
          >
            <FiX className="text-sm" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-5 space-y-4 custom-scrollbar">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <FiAlertTriangle className="text-sm shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TOP ROW: 3 Real-time Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card 1: Credits Balance */}
          <div className={`p-4 rounded-2xl ${bgCard} border ${border} shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition`}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition" />
            <div className="flex items-center justify-between z-10">
              <span className={`text-[11.5px] font-semibold ${textMuted} uppercase tracking-wider`}>
                Credits Balance
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <FiZap className="text-sm" />
              </div>
            </div>
            <div className="mt-3 z-10">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tracking-tight ${textTitle} font-mono`}>
                  {creditBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-xs font-bold text-indigo-400 font-mono">credits</span>
              </div>
              <div className={`flex items-center justify-between text-[11px] ${textMuted} mt-1`}>
                <span>Pay-as-you-go balance</span>
                <button
                  onClick={handleBuyCredits}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer hover:underline"
                >
                  + Top up
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Tokens Used */}
          <div className={`p-4 rounded-2xl ${bgCard} border ${border} shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/30 transition`}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition" />
            <div className="flex items-center justify-between z-10">
              <span className={`text-[11.5px] font-semibold ${textMuted} uppercase tracking-wider`}>
                Tokens Consumed
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
                <FiActivity className="text-sm" />
              </div>
            </div>
            <div className="mt-3 z-10">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tracking-tight ${textTitle} font-mono`}>
                  {formatNumber(lifetime.totalTokens || today.tokensUsed)}
                </span>
                <span className={`text-xs ${textMuted} font-mono`}>tokens</span>
              </div>
              <div className={`flex items-center justify-between text-[11px] ${textMuted} mt-1`}>
                <span>Today: <strong className="text-purple-400 font-mono">{formatNumber(today.tokensUsed || 0)}</strong></span>
                <span>Lifetime total</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total AI Messages */}
          <div className={`p-4 rounded-2xl ${bgCard} border ${border} shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition sm:col-span-2 lg:col-span-1`}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition" />
            <div className="flex items-center justify-between z-10">
              <span className={`text-[11.5px] font-semibold ${textMuted} uppercase tracking-wider`}>
                Total AI Messages
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                <FiLayers className="text-sm" />
              </div>
            </div>
            <div className="mt-3 z-10">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tracking-tight ${textTitle} font-mono`}>
                  {(lifetime.totalRequests || 0).toLocaleString()}
                </span>
                <span className={`text-xs ${textMuted} font-mono`}>messages</span>
              </div>
              <div className={`flex items-center justify-between text-[11px] ${textMuted} mt-1`}>
                <span>Today: <strong className="text-emerald-400 font-mono">{today.messagesUsed || 0}</strong> msgs</span>
                <span>All-time total</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: 7-Day Usage Telemetry Trend & Credit Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card A: 7-Day Rolling Daily Usage Trend */}
          <div className={`p-4 rounded-2xl ${bgCard} border ${border} shadow-lg flex flex-col h-[270px] justify-between relative overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <FiActivity className="text-xs" />
                </div>
                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${textLabel}`}>
                  Daily Usage (Last 7 Days)
                </h3>
              </div>
              <span className={`text-[10px] ${textMuted} font-medium`}>Day-by-day telemetry</span>
            </div>

            {/* Metric Banner */}
            <div className="flex items-baseline justify-between mt-1 shrink-0">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-extrabold tracking-tight ${textTitle} font-mono`}>
                  {formatNumber(dailyUsageData.totalPeriodTokens)}
                </span>
                <span className={`text-[11px] ${textMuted}`}>tokens (7d actual)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span>Live Sync</span>
              </div>
            </div>

            {/* Interactive Creative SVG Spline Area Chart with Telemetry Pillars */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center mt-1">
              {/* Creative Floating Glass Tooltip Card */}
              {hoveredDayPoint && (
                <div
                  className={`absolute z-30 top-1 pointer-events-none ${tooltipBg} ${tooltipTxt} px-3 py-2 rounded-xl shadow-2xl border ${tooltipBorder} backdrop-blur-md flex flex-col gap-1.5 -translate-x-1/2 min-w-[150px]`}
                  style={{
                    left: `${Math.min(78, Math.max(22, (hoveredDayPoint.x / 360) * 100))}%`,
                  }}
                >
                  <div className={`flex items-center justify-between text-[10.5px] font-semibold ${tooltipMuted} border-b ${tooltipDiv} pb-1 w-full`}>
                    <span>{hoveredDayPoint.shortDate} ({hoveredDayPoint.dayLabel})</span>
                    {hoveredDayPoint.dayLabel === "Today" && (
                      <span className="text-[8.5px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">LIVE</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2.5 pt-0.5">
                    {/* Tokens */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-indigo-400">⚡</span>
                      <div className="flex flex-col leading-none">
                        <span className={`font-bold ${tooltipTxt} text-[10.5px] font-mono`}>{formatNumber(hoveredDayPoint.tokens)}</span>
                        <span className={`${tooltipSub} text-[8.5px]`}>tokens</span>
                      </div>
                    </div>
                    <div className={`w-px h-6 ${tooltipSep}`} />
                    {/* Messages */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-400">💬</span>
                      <div className="flex flex-col leading-none">
                        <span className={`font-bold ${tooltipTxt} text-[10.5px] font-mono`}>{hoveredDayPoint.messages}</span>
                        <span className={`${tooltipSub} text-[8.5px]`}>msgs</span>
                      </div>
                    </div>
                    <div className={`w-px h-6 ${tooltipSep}`} />
                    {/* Credits */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-400">🪙</span>
                      <div className="flex flex-col leading-none">
                        <span className={`font-bold ${tooltipTxt} text-[10.5px] font-mono`}>{hoveredDayPoint.credits.toFixed(2)}</span>
                        <span className={`${tooltipSub} text-[8.5px]`}>credits</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 360 120"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Subtle Professional Glow Filter */}
                  <filter id="proGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Professional Unified Indigo Line Stroke */}
                  <linearGradient id="proLineStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>

                  {/* Clean Translucent Area Gradient */}
                  <linearGradient id="proAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="#6366f1" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Telemetry Pillar Bar Gradient */}
                  <linearGradient id="pillarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#4338ca" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Grid Guidelines */}
                <line x1="20" y1="28" x2="340" y2="28" stroke="currentColor" className={gridLn} strokeDasharray="3 3" />
                <line x1="20" y1="62" x2="340" y2="62" stroke="currentColor" className={gridLn} strokeDasharray="3 3" />
                <line x1="20" y1="98" x2="340" y2="98" stroke="currentColor" className={gridBase} />

                {/* Professional Telemetry Pillars */}
                {dailyUsageData.coords.map((pt) => {
                  const barHeight = Math.max(0, 98 - pt.y);
                  const isHovered = hoveredDayPoint?.dateKey === pt.dateKey;

                  return (
                    <g key={`bar-${pt.dateKey}`}>
                      {/* Background Column Hover Highlight Beam */}
                      {isHovered && (
                        <rect
                          x={pt.x - 18}
                          y="10"
                          width="36"
                          height="88"
                          rx="8"
                          className="fill-indigo-500/10 transition-all pointer-events-none"
                        />
                      )}
                      {/* Telemetry Pillar Bar */}
                      {pt.tokens > 0 && (
                        <rect
                          x={pt.x - 6}
                          y={pt.y}
                          width="12"
                          height={barHeight}
                          rx="3"
                          fill="url(#pillarGrad)"
                          className={`transition-all duration-300 ${isHovered ? "opacity-90" : "opacity-45"}`}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Shaded Area Under Curve */}
                <path
                  d={dailyUsageData.areaPath}
                  fill="url(#proAreaGrad)"
                  className="transition-all duration-500 ease-out"
                />

                {/* Smooth Professional Curve */}
                <path
                  d={dailyUsageData.linePath}
                  fill="none"
                  stroke="url(#proLineStroke)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#proGlow)"
                  className="transition-all duration-500 ease-out"
                />

                {/* Interactive Points */}
                {dailyUsageData.coords.map((pt, i) => {
                  const isToday = i === dailyUsageData.coords.length - 1;
                  const isHovered = hoveredDayPoint?.dateKey === pt.dateKey;

                  return (
                    <g key={pt.dateKey}>
                      {isToday && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="8"
                          className="fill-indigo-500/30 animate-ping pointer-events-none"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? "6" : isToday ? "5" : "4"}
                        className={`${isHovered
                          ? "fill-indigo-300"
                          : isToday
                            ? "fill-indigo-400"
                            : "fill-indigo-500"
                          } transition-all duration-150 cursor-pointer`}
                        stroke={dotStroke}
                        strokeWidth="2.5"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="18"
                        className="fill-transparent cursor-pointer"
                        onMouseEnter={() => setHoveredDayPoint(pt)}
                        onMouseLeave={() => setHoveredDayPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-Axis Date Labels */}
            <div className={`flex justify-between px-2 text-[9.5px] font-medium ${xText} pt-1.5 shrink-0 border-t ${xBorder}`}>
              {dailyUsageData.coords.map((pt) => (
                <span
                  key={pt.dateKey}
                  className={`cursor-pointer transition ${hoveredDayPoint?.dateKey === pt.dateKey
                    ? "text-indigo-400 font-bold"
                    : pt.dayLabel === "Today"
                      ? `${xToday} font-bold`
                      : xHover
                    }`}
                  onMouseEnter={() => setHoveredDayPoint(pt)}
                  onMouseLeave={() => setHoveredDayPoint(null)}
                >
                  {pt.dayLabel}
                </span>
              ))}
            </div>
          </div>

          {/* Card B: Quotas & Resource Allocation */}
          <div className={`p-4 rounded-2xl ${bgCard} border ${border} shadow-lg flex flex-col h-[270px] justify-between`}>
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <FiCreditCard className="text-indigo-400 text-xs" />
                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${textLabel}`}>
                  Quota &amp; Allocation
                </h3>
              </div>
              <span className={`text-[10px] ${textMuted} font-mono`}>Resets 00:00 UTC</span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-around py-1 space-y-2">
              {/* Item 1: Daily Messages */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                  <span className={textMuted}>Daily Messages</span>
                  <span className={`font-bold ${textTitle} font-mono`}>
                    {today.messagesUsed || 0} / {isUnlimited ? "Unlimited" : maxCap}
                    {!isUnlimited && (
                      <span className={`text-[10px] ${textMuted} font-normal ml-1.5`}>
                        ({Math.max(0, maxCap - (today.messagesUsed || 0))} remaining)
                      </span>
                    )}
                  </span>
                </div>
                <div className={`w-full ${bgProgress} rounded-full h-1.5 overflow-hidden`}>
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: isUnlimited
                        ? `${Math.min(100, Math.max(8, ((today.messagesUsed || 0) / 100) * 100))}%`
                        : `${Math.min(100, Math.round(((today.messagesUsed || 0) / maxCap) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Item 2: Tokens Consumed Today */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                  <span className={textMuted}>Tokens Used Today</span>
                  <span className={`font-bold ${textTitle} font-mono`}>
                    {formatNumber(today.tokensUsed || 0)}
                    <span className={`text-[10px] ${textMuted} font-normal ml-1`}>
                      (All-time: {formatNumber(lifetime.totalTokens || 0)})
                    </span>
                  </span>
                </div>
                <div className={`w-full ${bgProgress} rounded-full h-1.5 overflow-hidden`}>
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          (today.tokensUsed || 0) > 0 ? 5 : 0,
                          plan?.maxTokensPerDay && plan.maxTokensPerDay > 0
                            ? ((today.tokensUsed || 0) / plan.maxTokensPerDay) * 100
                            : ((today.tokensUsed || 0) / 100000) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Item 3: Credit Balance Health Reserve */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={textMuted}>Available Credits</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${creditHealthStatus.color}`}>
                      {creditHealthStatus.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${textTitle} font-mono`}>
                      {creditBalance.toFixed(2)} credits
                    </span>
                    <button
                      type="button"
                      onClick={handleBuyCredits}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition hover:underline"
                    >
                      + Top up
                    </button>
                  </div>
                </div>
                <div className={`w-full ${bgProgress} rounded-full h-1.5 overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${creditHealthStatus.barColor}`}
                    style={{
                      width: `${Math.min(100, Math.max(creditBalance > 0 ? 6 : 0, (creditBalance / 1000) * 100))}%`,
                    }}
                  />
                </div>
                <div className={`flex justify-between text-[9.5px] ${textDim} mt-1`}>
                  <span>Pay-as-you-go balance • Never expires</span>
                  <span>Deducted per token generation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Recent Activity Telemetry Table */}
        <div className={`rounded-2xl ${bgCard} border ${border} shadow-lg overflow-hidden flex flex-col`}>
          <div className={`px-5 py-3 border-b ${borderSub} flex items-center justify-between shrink-0 ${tableRowBg}`}>
            <div className="flex items-center gap-2">
              <FiClock className="text-indigo-400 text-xs" />
              <h3 className={`text-[11px] font-bold uppercase tracking-wider ${textLabel}`}>
                Recent Activity
              </h3>
            </div>
            <span className={`text-[10.5px] ${textMuted} font-medium`}>
              Showing last {recentTransactions.length} events
            </span>
          </div>

          <div className="overflow-x-auto max-h-[320px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 z-10 ${bgTableHead} border-b ${borderSub}`}>
                <tr className={`text-[9.5px] uppercase font-bold tracking-wider ${textMuted}`}>
                  <th className="px-5 py-2.5">Date/Time</th>
                  <th className="px-5 py-2.5">Activity</th>
                  <th className="px-5 py-2.5">Model</th>
                  <th className="px-5 py-2.5 text-right">Tokens</th>
                  <th className="px-5 py-2.5 text-right">Credits</th>
                  <th className="px-5 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${bgTableRow} text-[11px]`}>
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => {
                    const info = getTransactionInfo(tx);
                    const formattedDate = new Date(tx.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                    const formattedTime = new Date(tx.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={tx._id}
                        className={`${bgRowHover} transition`}
                      >
                        {/* Time */}
                        <td className={`px-5 py-2.5 ${txTime} whitespace-nowrap text-[10.5px] font-mono`}>
                          {formattedDate}, {formattedTime}
                        </td>

                        {/* Activity */}
                        <td className={`px-5 py-2.5 font-medium ${txAct}`}>
                          <div className="flex items-center gap-1.5">
                            {info.isPositive ? (
                              <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] shrink-0">
                                <FiArrowDownRight />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] shrink-0">
                                <FiCpu />
                              </span>
                            )}
                            <span>{info.activity}</span>
                          </div>
                        </td>

                        {/* Model */}
                        <td className={`px-5 py-2.5 ${txModel}`}>
                          {info.modelDisplay !== "—" ? (
                            <span className="font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md text-[10px] inline-flex items-center gap-1">
                              <span>{info.modelDisplay}</span>
                            </span>
                          ) : (
                            <span className={`${txEmpty} text-[10px] font-mono`}>—</span>
                          )}
                        </td>

                        {/* Tokens */}
                        <td
                          className={`px-5 py-2.5 text-right font-mono ${txTok}`}
                          title={
                            info.promptTokens !== null && info.completionTokens !== null
                              ? `${info.promptTokens} in / ${info.completionTokens} out tokens`
                              : ""
                          }
                        >
                          {info.tokens !== null ? (
                            <span className="font-semibold text-purple-500">
                              {formatNumber(info.tokens)}
                            </span>
                          ) : (
                            <span className={txEmpty}>—</span>
                          )}
                        </td>

                        {/* Credits */}
                        <td
                          className={`px-5 py-2.5 text-right font-mono font-bold ${info.isPositive ? "text-emerald-400" : textLabel}`}
                        >
                          {info.isPositive
                            ? `+${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`
                            : `${tx.amount} credits`}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-2.5 text-right">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${info.isPositive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              }`}
                          >
                            {info.isPositive ? "Credit Added" : "Success"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className={`px-5 py-8 text-center ${txNoData} text-xs`}>
                      No recent activity recorded for this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditsModal;