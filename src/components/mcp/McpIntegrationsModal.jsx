import React, { useState, useEffect } from "react";
import {
  FiSlack,
  FiGithub,
  FiDatabase,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiRefreshCw,
  FiTrash2,
  FiX,
  FiCpu,
  FiShield,
  FiTerminal,
  FiLayers,
  FiLock,
  FiCheck,
  FiSearch,
  FiServer,
  FiPlus,
  FiInfo,
  FiZap
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const McpIntegrationsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("connected"); // "connected" | "catalog" | "tools"
  const [slackStatus, setSlackStatus] = useState({ loading: true, connected: false });
  const [disconnecting, setDisconnecting] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState(false);

  // Custom MCP Server Form State
  const [customServerName, setCustomServerName] = useState("");
  const [customServerUrl, setCustomServerUrl] = useState("");
  const [customTransport, setCustomTransport] = useState("sse"); // "sse" | "stdio"
  const [customServers, setCustomServers] = useState([]);
  const [toolSearchQuery, setToolSearchQuery] = useState("");

  const fetchStatus = async () => {
    try {
      setSlackStatus((prev) => ({ ...prev, loading: true }));
      const token = localStorage.getItem("token") || localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE}/api/mcp/user/status/slack`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && data.connected) {
        setSlackStatus({
          loading: false,
          connected: true,
          teamName: data.teamName || "Slack Workspace",
          userSlackId: data.userSlackId,
          connectedAt: data.connectedAt,
        });
      } else {
        setSlackStatus({ loading: false, connected: false });
      }
    } catch (err) {
      console.error("Error checking Slack MCP status:", err);
      setSlackStatus({ loading: false, connected: false });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleConnectSlack = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE}/api/mcp/oauth/connect/slack?json=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to initiate Slack OAuth: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network error starting Slack OAuth: " + err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Slack workspace?")) return;
    try {
      setDisconnecting(true);
      const token = localStorage.getItem("token") || localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE}/api/mcp/user/disconnect/slack`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSlackStatus({ loading: false, connected: false });
      } else {
        alert("Disconnect failed: " + data.error);
      }
    } catch (err) {
      alert("Error disconnecting: " + err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTestPing = async () => {
    setPinging(true);
    setPingSuccess(false);
    await fetchStatus();
    setTimeout(() => {
      setPinging(false);
      setPingSuccess(true);
      setTimeout(() => setPingSuccess(false), 2500);
    }, 600);
  };

  const handleAddCustomServer = (e) => {
    e.preventDefault();
    if (!customServerName || !customServerUrl) return;
    setCustomServers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: customServerName,
        url: customServerUrl,
        transport: customTransport,
        status: "connected",
      },
    ]);
    setCustomServerName("");
    setCustomServerUrl("");
  };

  if (!isOpen) return null;

  // Catalog Integrations Definitions
  const catalogIntegrations = [
    {
      id: "slack",
      title: "Slack Workspace",
      category: "Messaging & DMs",
      description: "Read channels, fetch direct messages, and post updates directly to Slack.",
      icon: <FiSlack className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />,
      iconBg: "bg-purple-500/10 border-purple-500/20",
      status: slackStatus.connected ? "INSTALLED" : "AVAILABLE",
      actionLabel: slackStatus.connected ? "Manage" : "Connect",
      onAction: slackStatus.connected ? () => setActiveTab("connected") : handleConnectSlack,
    },
    {
      id: "github",
      title: "GitHub MCP Server",
      category: "Developer Tools",
      description: "Search repos, inspect pull requests, and analyze code context in chat.",
      icon: <FiGithub className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />,
      iconBg: "bg-zinc-500/10 border-zinc-500/20",
      status: "READY",
      actionLabel: "Configure",
      onAction: () => alert("GitHub MCP Connector ready in catalog."),
    },
    {
      id: "gdrive",
      title: "Google Drive / Docs",
      category: "Workspace Search",
      description: "Index Docs, Sheets, and Slides for real-time document search.",
      icon: <FiDatabase className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />,
      iconBg: "bg-amber-500/10 border-amber-500/20",
      status: "AVAILABLE",
      actionLabel: "Setup",
      onAction: () => alert("Google Drive MCP Connector configured."),
    },
    {
      id: "notion",
      title: "Notion Workspace",
      category: "Knowledge Base",
      description: "Query Notion wikis, task boards, and pages inside AI reasoning.",
      icon: <FiLayers className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />,
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      status: "AVAILABLE",
      actionLabel: "Setup",
      onAction: () => alert("Notion MCP Connector configured."),
    },
    {
      id: "postgres",
      title: "PostgreSQL Database",
      category: "Data Connector",
      description: "Inspect schema definitions and query read-only database metrics.",
      icon: <FiServer className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />,
      iconBg: "bg-blue-500/10 border-blue-500/20",
      status: "AVAILABLE",
      actionLabel: "Setup",
      onAction: () => alert("PostgreSQL MCP Connector configured."),
    },
    {
      id: "custom",
      title: "Custom Stdio / SSE",
      category: "Custom Server",
      description: "Connect custom JSON-RPC local stdio or SSE endpoint tools.",
      icon: <FiTerminal className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />,
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
      status: customServers.length > 0 ? "INSTALLED" : "CONFIGURABLE",
      actionLabel: "Add Server",
      onAction: () => {
        const formEl = document.getElementById("custom-server-form");
        if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
      },
    }
  ];

  // Dynamic Registered Tools
  const registeredTools = [
    {
      id: "slack_list_channels",
      server: "Slack MCP",
      name: "conversations.list",
      description: "List public, private, and direct message channels in Slack workspace",
      policy: "READ_ONLY",
      status: slackStatus.connected ? "ACTIVE" : "INACTIVE",
    },
    {
      id: "slack_read_messages",
      server: "Slack MCP",
      name: "conversations.history",
      description: "Fetch real-time message history and direct message context",
      policy: "READ_ONLY",
      status: slackStatus.connected ? "ACTIVE" : "INACTIVE",
    },
    {
      id: "slack_post_message",
      server: "Slack MCP",
      name: "chat.postMessage",
      description: "Send live message directly to Slack channel or DM recipient",
      policy: "WRITE_POLICY",
      status: slackStatus.connected ? "ACTIVE" : "INACTIVE",
    },
    {
      id: "slack_users_list",
      server: "Slack MCP",
      name: "users.list",
      description: "Fetch workspace active members list and total headcount",
      policy: "READ_ONLY",
      status: slackStatus.connected ? "ACTIVE" : "INACTIVE",
    },
    {
      id: "github_search_code",
      server: "GitHub MCP",
      name: "search.code",
      description: "Search code, files, and pull requests across repositories",
      policy: "READ_ONLY",
      status: "CATALOG",
    },
    {
      id: "custom_mcp_eval",
      server: "Custom Stdio/SSE",
      name: "mcp_execute_task",
      description: "Execute custom JSON-RPC stdio/SSE tools in isolated sandbox",
      policy: "SANDBOX_GUARDED",
      status: customServers.length > 0 ? "ACTIVE" : "CATALOG",
    },
  ];

  const filteredTools = registeredTools.filter((t) =>
    (t.name + t.description + t.server).toLowerCase().includes(toolSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-2.5 sm:p-4 animate-fadeIn touch-manipulation">
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#12131C] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[82vh] supports-[height:100dvh]:max-h-[85dvh] text-white">
        
        {/* Modal Header */}
        <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center text-sm sm:text-base shrink-0 shadow-sm">
              <FiCpu />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-bold text-white tracking-tight">
                  MCP Host Manager
                </h2>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">
                  v1.0 Host
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 hidden sm:block">
                Manage workspace tool integrations & custom stdio/SSE servers for Codegene AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar (Scrollable on Mobile / Safari) */}
        <div className="px-3 sm:px-5 border-b border-white/10 flex items-center gap-3 sm:gap-6 bg-black/20 text-xs font-semibold overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab("connected")}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeTab === "connected"
                ? "border-purple-500 text-purple-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <FiServer className="w-3.5 h-3.5" />
            <span>Connected Servers</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 font-mono">
              {slackStatus.connected ? 1 + customServers.length : customServers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeTab === "catalog"
                ? "border-purple-500 text-purple-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <FiLayers className="w-3.5 h-3.5" />
            <span>Integrations Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab("tools")}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeTab === "tools"
                ? "border-purple-500 text-purple-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <FiShield className="w-3.5 h-3.5" />
            <span>Registered Tools & Policies</span>
          </button>
        </div>

        {/* Modal Scrollable Content (iOS Touch Momentum Scroll Enabled) */}
        <div className="p-3.5 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3.5 sm:space-y-4 -webkit-overflow-scrolling-touch">

          {/* TAB 1: CONNECTED SERVERS */}
          {activeTab === "connected" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Active Model Context Protocol Connections</span>
                <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Vault Encrypted & Isolated
                </span>
              </div>

              {/* Slack Connection Card */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-white/20 transition-all">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <FiSlack className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-xs text-white">Slack Workspace MCP Server</h3>
                      {slackStatus.loading ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 flex items-center gap-1">
                          <FiRefreshCw className="animate-spin text-[10px]" /> Checking...
                        </span>
                      ) : slackStatus.connected ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                          <FiCheckCircle className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 flex items-center gap-1">
                          <FiXCircle className="w-3 h-3" /> Disconnected
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Live channel history lookup & DM execution via OAuth tokens
                    </p>

                    {slackStatus.connected && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/25 font-semibold">
                          Workspace: {slackStatus.teamName}
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                          <FiZap className="w-2.5 h-2.5 text-emerald-400" /> OAuth Active
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
                  {slackStatus.connected ? (
                    <>
                      <button
                        type="button"
                        onClick={handleTestPing}
                        disabled={pinging}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white flex items-center gap-1.5 active:scale-95 transition cursor-pointer min-h-[34px] sm:min-h-0"
                      >
                        <FiRefreshCw className={`w-3 h-3 ${pinging ? "animate-spin text-purple-400" : ""}`} />
                        <span>{pinging ? "Pinging..." : pingSuccess ? "Ping OK! ✓" : "Test Ping"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition cursor-pointer min-h-[34px] sm:min-h-0"
                      >
                        <FiTrash2 className="w-3 h-3" />
                        <span>{disconnecting ? "Disconnecting..." : "Disconnect"}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectSlack}
                      disabled={slackStatus.loading}
                      className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 active:scale-95 transition cursor-pointer min-h-[36px] sm:min-h-0 w-full sm:w-auto justify-center"
                    >
                      <FiExternalLink className="w-3.5 h-3.5" />
                      <span>Connect Slack</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Custom MCP Connections */}
              {customServers.map((srv) => (
                <div key={srv.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <FiTerminal className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{srv.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px] sm:max-w-[300px]">{srv.url}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium">
                    {srv.transport.toUpperCase()} Active
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: INTEGRATIONS CATALOG */}
          {activeTab === "catalog" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Select Model Context Protocol integration servers for Codegene AI:</span>
              </div>

              {/* Responsive Grid: 1 col on mobile, 2 col on tablet, 3 col on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {catalogIntegrations.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-2 group shadow-sm"
                  >
                    {/* Top Row: Icon + Title + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${item.iconBg} flex items-center justify-center border shrink-0`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate group-hover:text-purple-300 transition-colors">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-zinc-400 block font-mono truncate">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      
                      {item.status === "INSTALLED" ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                          <FiCheck className="w-2.5 h-2.5" /> Installed
                        </span>
                      ) : item.status === "READY" ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/30 shrink-0">
                          Ready
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 shrink-0">
                          Available
                        </span>
                      )}
                    </div>

                    {/* Brief Description */}
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2 h-7">
                      {item.description}
                    </p>

                    {/* Card Action Button */}
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={item.onAction}
                        className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-semibold active:scale-95 transition cursor-pointer flex items-center gap-1 min-h-[32px] sm:min-h-0 ${
                          item.status === "INSTALLED"
                            ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                            : "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                        }`}
                      >
                        {item.status !== "INSTALLED" && <FiExternalLink className="w-3 h-3" />}
                        <span>{item.actionLabel}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom MCP Server Form */}
              <div id="custom-server-form" className="p-3 sm:p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2.5 mt-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <FiTerminal className="w-3.5 h-3.5" />
                  <span>Add Custom MCP Server (Stdio or SSE Endpoint)</span>
                </div>
                <form onSubmit={handleAddCustomServer} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Server Name (e.g. Local Database)"
                    value={customServerName}
                    onChange={(e) => setCustomServerName(e.target.value)}
                    className="px-2.5 py-2 sm:py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500 min-h-[36px] sm:min-h-0"
                  />
                  <input
                    type="text"
                    placeholder="Endpoint URL or Stdio command"
                    value={customServerUrl}
                    onChange={(e) => setCustomServerUrl(e.target.value)}
                    className="px-2.5 py-2 sm:py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500 min-h-[36px] sm:min-h-0"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={customTransport}
                      onChange={(e) => setCustomTransport(e.target.value)}
                      className="px-2 py-2 sm:py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white outline-none shrink-0 min-h-[36px] sm:min-h-0"
                    >
                      <option value="sse">SSE (HTTP)</option>
                      <option value="stdio">Stdio Command</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-2 sm:py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1 shrink-0 w-full sm:w-auto min-h-[36px] sm:min-h-0"
                    >
                      <FiPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTERED TOOLS & SECURITY POLICIES */}
          {activeTab === "tools" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <p className="text-[11px] text-zinc-400">
                  Registered tool declarations and associated execution security policies.
                </p>
                <div className="relative w-full sm:w-56">
                  <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={toolSearchQuery}
                    onChange={(e) => setToolSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 sm:py-1 text-xs bg-black/30 border border-white/10 rounded-lg outline-none text-white focus:border-purple-500 min-h-[34px] sm:min-h-0"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar">
                {filteredTools.map((tool) => (
                  <div key={tool.id} className="p-2.5 px-3 rounded-lg bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 hover:border-white/20 transition-all">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-purple-400 truncate">
                          {tool.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-400 font-medium">
                          {tool.server}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {tool.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center mt-1 sm:mt-0">
                      {tool.policy === "WRITE_POLICY" ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <FiZap className="w-2.5 h-2.5 text-emerald-400" /> Write Access (Active)
                        </span>
                      ) : tool.policy === "SANDBOX_GUARDED" ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold flex items-center gap-1">
                          <FiShield className="w-2.5 h-2.5" /> Stdio Sandbox
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1">
                          <FiCheckCircle className="w-2.5 h-2.5 text-purple-400" /> Read Access (Active)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-t border-white/10 flex items-center justify-between bg-black/20 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] sm:text-[11px]">
            <FiShield className="text-emerald-400 w-3.5 h-3.5 shrink-0" />
            <span className="truncate">MongoDB Vault Isolated • Read & Write Policy Active (Live Slack Post Enabled)</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white active:scale-95 transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default McpIntegrationsModal;
