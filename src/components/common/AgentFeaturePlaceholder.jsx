import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Phone,
  PhoneCall,
  History,
  Users,
  BarChart2,
  Headphones,
  ShieldCheck,
  Bell,
  Link2,
  Settings,
  BookOpen,
  ArrowLeft,
  Sparkles
} from "lucide-react";

const FEATURE_META = {
  "/knowledge-base": {
    title: "Knowledge Base",
    section: "BUILD",
    icon: BookOpen,
    desc: "Centralize documentation, documents, and website sources to train your conversational agents."
  },
  "/phone-numbers": {
    title: "Phone Numbers",
    section: "DEPLOY",
    icon: Phone,
    desc: "Purchase and manage phone numbers to route incoming and outgoing voice calls."
  },
  "/batch-call": {
    title: "Batch Call",
    section: "DEPLOY",
    icon: PhoneCall,
    desc: "Launch automated outbound voice campaigns and dispatch agents to contact lists."
  },
  "/call-history": {
    title: "Call History",
    section: "DATA",
    icon: History,
    desc: "Inspect call transcripts, duration, audio recordings, latency, and sentiment analysis."
  },
  "/contacts": {
    title: "Contacts",
    section: "DATA",
    icon: Users,
    desc: "Manage customer profiles, CRM synchronizations, and caller identities."
  },
  "/analytics": {
    title: "Analytics",
    section: "MONITOR",
    icon: BarChart2,
    desc: "Monitor conversion rates, call durations, token consumption, and agent performance."
  },
  "/live-monitoring": {
    title: "Live Monitoring",
    section: "MONITOR",
    icon: Headphones,
    desc: "Listen to live ongoing voice calls in real-time and intervene or whisper to agents."
  },
  "/ai-qa": {
    title: "AI Quality Assurance",
    section: "MONITOR",
    icon: ShieldCheck,
    desc: "Automated scoring, evaluation metrics, and compliance checks across all calls."
  },
  "/alerting": {
    title: "Alerting",
    section: "MONITOR",
    icon: Bell,
    desc: "Set up Webhook, Slack, and SMS alerts for failed calls or anomalous sentiment."
  },
  "/integrations": {
    title: "Integrations",
    section: "SYSTEM",
    icon: Link2,
    desc: "Connect CRM systems, webhooks, telephony, and automation workflows."
  },
  "/settings": {
    title: "Settings",
    section: "SYSTEM",
    icon: Settings,
    desc: "Manage workspace configurations, API keys, concurrency limits, and team permissions."
  }
};

const AgentFeaturePlaceholder = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const meta = FEATURE_META[location.pathname] || {
    title: "Voice Studio Feature",
    section: "MODULE",
    icon: Sparkles,
    desc: "This module is being connected as part of the unified Voice Agent architecture."
  };

  const IconComponent = meta.icon;

  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-6 bg-white dark:bg-[#0B0C12] text-text-primary">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center">
        {/* Section Badge */}
        <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
          <Sparkles className="w-3 h-3" />
          <span>{meta.section} MODULE</span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-surface-secondary dark:bg-white/5 border border-border-primary flex items-center justify-center mb-4 shadow-sm">
          <IconComponent className="w-8 h-8 text-accent-primary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-text-primary">
          {meta.title}
        </h2>

        {/* Description */}
        <p className="text-sm text-text-muted mb-8 leading-relaxed max-w-md">
          {meta.desc}
        </p>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/agents")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary text-white font-medium text-xs hover:opacity-90 transition cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to All Agents</span>
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-xl border border-border-primary hover:bg-black/5 dark:hover:bg-white/5 font-medium text-xs text-text-primary transition cursor-pointer"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentFeaturePlaceholder;
