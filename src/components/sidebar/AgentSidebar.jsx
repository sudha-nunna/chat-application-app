import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Bot,
  BookOpen,
  Phone,
  PhoneCall,
  History,
  MessageSquare,
  Users,
  BarChart2,
  Headphones,
  ShieldCheck,
  Bell,
  Link2,
  CreditCard,
  Settings,
  Plus
} from "lucide-react";

const SIDEBAR_SECTIONS = [
  {
    header: null,
    items: [
      { id: "home", label: "Home", icon: Home, path: "/dashboard" }
    ]
  },
  {
    header: "BUILD",
    items: [
      { id: "agents", label: "Agents", icon: Bot, path: "/agents", hasAddAction: true },
      { id: "knowledge-base", label: "Knowledge Base", icon: BookOpen, path: "/knowledge-base" }
    ]
  },
  {
    header: "DEPLOY",
    items: [
      { id: "phone-numbers", label: "Phone Numbers", icon: Phone, path: "/phone-numbers" },
      { id: "batch-call", label: "Batch Call", icon: PhoneCall, path: "/batch-call" }
    ]
  },
  {
    header: "DATA",
    items: [
      { id: "call-history", label: "Call History", icon: History, path: "/call-history" },
      { id: "chat-history", label: "Chat History", icon: MessageSquare, path: "/chat" },
      { id: "contacts", label: "Contacts", icon: Users, path: "/contacts" }
    ]
  },
  {
    header: "MONITOR",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart2, path: "/analytics" },
      { id: "live-monitoring", label: "Live Monitoring", icon: Headphones, path: "/live-monitoring" },
      { id: "ai-qa", label: "AI Quality Assurance", icon: ShieldCheck, path: "/ai-qa" },
      { id: "alerting", label: "Alerting", icon: Bell, path: "/alerting" }
    ]
  },
  {
    header: "SYSTEM",
    items: [
      { id: "integrations", label: "Integrations", icon: Link2, path: "/integrations" },
      { id: "billing", label: "Billing", icon: CreditCard, path: "/subscription" },
      { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
    ]
  }
];

const AgentSidebar = ({
  isSidebarCollapsed,
  isMobile,
  navigate: propNavigate,
  setIsMobileMenuOpen
}) => {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const navigate = propNavigate || routerNavigate;

  const currentPath = location.pathname;

  const isItemActive = (item) => {
    if (item.id === "home") {
      return currentPath === "/dashboard" || currentPath === "/";
    }
    if (item.id === "agents") {
      return currentPath.startsWith("/agents") || currentPath.startsWith("/bots");
    }
    if (item.id === "billing") {
      return currentPath.startsWith("/subscription");
    }
    if (item.id === "chat-history") {
      return currentPath.startsWith("/chat");
    }
    return currentPath === item.path;
  };

  const handleItemClick = (e, item) => {
    e.preventDefault();
    navigate(item.path);
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleCreateAgent = (e) => {
    e.stopPropagation();
    navigate("/agents/new");
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 select-none">
      {/* Scrollable Navigation Area */}
      <div
        className={`flex-1 relative ${
          isSidebarCollapsed && !isMobile
            ? "overflow-visible"
            : "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <div
          className={`py-2 space-y-3.5 ${
            isSidebarCollapsed && !isMobile ? "px-1 space-y-2.5!" : "px-3"
          }`}
        >
          {SIDEBAR_SECTIONS.map((section, sIndex) => (
            <div key={sIndex} className="space-y-0.5">
              {/* Section Header */}
              {section.header && (!isSidebarCollapsed || isMobile) && (
                <div className="text-[11px] font-bold text-text-muted/80 dark:text-text-muted px-3 pt-2 pb-1 tracking-wider uppercase">
                  {section.header}
                </div>
              )}

              {/* Section Divider when Collapsed */}
              {section.header && isSidebarCollapsed && !isMobile && (
                <div className="my-1.5 mx-auto w-6 h-[1px] bg-border-primary/50" />
              )}

              {/* Section Items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;

                  if (isSidebarCollapsed && !isMobile) {
                    return (
                      <div key={item.id} className="relative group flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => handleItemClick(e, item)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            active
                              ? "bg-black/8 text-text-primary dark:bg-white/10 dark:text-white font-semibold"
                              : "text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${active ? "text-accent-primary" : ""}`} />
                        </button>
                        {/* Hover Tooltip Popover */}
                        <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-dropdown border border-border-primary rounded-lg text-xs font-semibold text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-xl pointer-events-none">
                          {item.label}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => handleItemClick(e, item)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] cursor-pointer transition-colors ${
                        active
                          ? "bg-[#EAECEF] text-[#111318] dark:bg-[#1E202B] dark:text-white font-semibold"
                          : "text-[#4B5262] dark:text-[#9CA3AF] hover:text-[#111318] dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                            active
                              ? "text-accent-primary"
                              : "text-[#6E7687] dark:text-[#9CA3AF] group-hover:text-text-primary"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {/* Optional inline + action for Agents */}
                      {item.hasAddAction && (
                        <button
                          type="button"
                          onClick={handleCreateAgent}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-accent-primary transition cursor-pointer shrink-0"
                          title="Create an Agent"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
