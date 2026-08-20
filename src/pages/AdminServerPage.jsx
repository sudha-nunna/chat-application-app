import { useState } from "react";
import {
  FiServer,
  FiPlus,
  FiRefreshCw,
  FiEdit3,
  FiTrash2,
  FiCheckCircle,
  FiAlertTriangle,
  FiActivity,
  FiZap,
  FiSliders,
  FiX
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj, backEndCallObjDel } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient
} from "../hooks/useTanStackData";

const AdminServerPage = () => {
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  const [pingingId, setPingingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal & Validation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ name: "", url: "" });
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    secretKey: "",
    defaultModel: "llama3.2:3b",
    format: "openai",
    priority: 10,
    isActive: true
  });

  // 1. GET Route: Admin Server Nodes
  const {
    data: nodesData = null,
    isLoading: loading,
    refetch: fetchNodes
  } = useTanStackData(
    ["admin-nodes"],
    async () => {
      const res = await NobackEndCall("/admin/nodes");
      return res;
    }
  );

  const nodes = nodesData?.nodes || (Array.isArray(nodesData) ? nodesData : []);

  // Mutations
  const saveNodeMutation = useTanStackMutation({
    mutationFn: async ({ isEdit, nodeId, data }) => {
      if (isEdit) {
        return await NobackEndCallObj(`/admin/nodes/${nodeId}`, data, "put");
      } else {
        return await NobackEndCallObj("/admin/nodes", data, "post");
      }
    },
    onSuccess: (resData, variables) => {
      const nodeName = resData?.node?.name || variables.data?.name || "Server node";
      setSuccessMsg(`Server node "${nodeName}" ${variables.isEdit ? "updated" : "created"} successfully!`);
      queryClient.invalidateQueries({ queryKey: ["admin-nodes"] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      setErrorMsg(err?.error || err?.message || "Failed to save server node.");
    }
  });

  const deleteNodeMutation = useTanStackMutation({
    mutationFn: async (id) => {
      return await backEndCallObjDel("/admin/nodes", id);
    },
    onSuccess: () => {
      setSuccessMsg("Server node deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-nodes"] });
    },
    onError: (err) => {
      setErrorMsg(err?.error || err?.message || "Failed to delete server node.");
    }
  });

  const pingNodeMutation = useTanStackMutation({
    mutationFn: async (id) => {
      setPingingId(id);
      return await NobackEndCallObj(`/admin/nodes/${id}/ping`, {}, "post");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-nodes"] });
      setSuccessMsg(`Ping result for ${data?.name || "node"}: ${data?.status || "OK"} (${data?.latencyMs || 0} ms)`);
      setPingingId(null);
    },
    onError: (err) => {
      setErrorMsg(err?.error || err?.message || "Ping failed to reach server node.");
      setPingingId(null);
    }
  });

  const toggleActiveMutation = useTanStackMutation({
    mutationFn: async (node) => {
      return await NobackEndCallObj(`/admin/nodes/${node._id}`, { isActive: !node.isActive }, "put");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-nodes"] });
    },
    onError: () => {
      setErrorMsg("Failed to toggle server node status.");
    }
  });

  const handleOpenAddModal = () => {
    setEditingNode(null);
    setFieldErrors({ name: "", url: "" });
    setFormData({
      name: "",
      url: "",
      secretKey: "",
      defaultModel: "llama3.2:3b",
      format: "openai",
      priority: 10,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (node) => {
    setEditingNode(node);
    setFieldErrors({ name: "", url: "" });
    setFormData({
      name: node.name,
      url: node.url,
      secretKey: node.secretKey || "",
      defaultModel: node.defaultModel || "llama3.2:3b",
      format: node.format || "openai",
      priority: node.priority || 10,
      isActive: node.isActive !== undefined ? node.isActive : true
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const errors = { name: "", url: "" };
    let hasError = false;

    if (!formData.name || !formData.name.trim()) {
      errors.name = "Server Name is required.";
      hasError = true;
    }

    if (!formData.url || !formData.url.trim()) {
      errors.url = "Server URL / Tunnel Endpoint is required.";
      hasError = true;
    } else {
      let urlToTest = formData.url.trim();
      const isApiKeyInput = /^(AQ\.Ab|AIzaSy|sk-proj-|sk-|gsk_|nvapi-)/i.test(urlToTest) || formData.format === "glm" || formData.format === "gemini";

      if (!isApiKeyInput) {
        if (!urlToTest.startsWith("http://") && !urlToTest.startsWith("https://")) {
          urlToTest = `https://${urlToTest}`;
        }

        try {
          const parsed = new URL(urlToTest);
          const host = parsed.hostname.toLowerCase();
          const isLocalhost = host === "localhost" || host === "127.0.0.1";
          const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
          const hasDomainDot = host.includes(".") && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host);

          if (!isLocalhost && !isIp && !hasDomainDot) {
            errors.url = `Invalid URL format "${formData.url}". High-quality domain name, IP address, or localhost required (e.g., http://localhost:11434 or https://my-tunnel.trycloudflare.com).`;
            hasError = true;
          } else if (host.length < 3 || /^(aa|aaa|test|demo|abc|qwerty|foo|bar|123)$/i.test(host)) {
            errors.url = `Invalid URL format "${formData.url}". Dummy URLs like 'aa' are strictly rejected.`;
            hasError = true;
          }
        } catch (err) {
          errors.url = `Invalid URL syntax "${formData.url}". Please enter a valid HTTP/HTTPS endpoint or API key.`;
          hasError = true;
        }
      }
    }

    setFieldErrors(errors);
    if (hasError) return;

    saveNodeMutation.mutate({
      isEdit: !!editingNode,
      nodeId: editingNode?._id,
      data: formData
    });
  };

  const handleDeleteNode = (id, name) => {
    if (!window.confirm(`Are you sure you want to delete server node "${name}"?`)) return;
    deleteNodeMutation.mutate(id);
  };

  const handlePingNode = (id) => {
    pingNodeMutation.mutate(id);
  };

  const handleToggleActive = (node) => {
    toggleActiveMutation.mutate(node);
  };

  return (
    <div className={`p-4 md:p-8 flex-1 h-full w-full overflow-y-auto custom-scrollbar ${"bg-transparent text-text-primary"}`}>
      {/* Top Banner */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <FiServer />
            <span>Infrastructure Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Server Nodes & Routing</h1>
          <p className={`text-xs md:text-sm mt-1 ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            Manage, edit, or test local/cloud LLaMA server node URLs in real-time. Changes take effect instantly without restarting the backend!
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchNodes()}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition whitespace-nowrap shrink-0 ${isDark ? "border-border-primary hover:bg-interactive-active text-text-muted" : "border-border-primary hover:bg-surface-secondary text-text-primary"
              }`}
            title="Refresh Server List"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-interactive-base to-interactive-hover hover:from-interactive-base hover:to-interactive-hover text-text-primary dark:text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-black/10/20 transition active:scale-95 whitespace-nowrap shrink-0"
          >
            <FiPlus className="text-sm shrink-0" />
            <span>Add Server Node</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="max-w-6xl mx-auto mb-4 p-3 rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-primary text-xs font-medium flex items-center gap-2">
          <FiAlertTriangle className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="max-w-6xl mx-auto mb-4 p-3 rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-primary text-xs font-medium flex items-center gap-2">
          <FiCheckCircle className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Server Grid */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className={`text-center py-16 text-xs ${isDark ? "text-text-primary" : "text-text-primary"}`}>
            <FiRefreshCw className="animate-spin text-2xl mx-auto mb-2 text-text-primary" />
            Loading AI Server Nodes...
          </div>
        ) : nodes.length === 0 ? (
          <div className={`p-8 rounded-2xl border border-dashed text-center ${isDark ? "border-border-primary bg-interactive-active/50" : "border-border-primary bg-white"}`}>
            <FiServer className="text-3xl text-text-primary mx-auto mb-2" />
            <h3 className="font-bold text-sm">No Server Nodes Configured</h3>
            <p className="text-xs text-text-primary mt-1 max-w-md mx-auto">
              Add your first local LLaMA node (vLLM, Ollama, LM Studio) or Cloudflare tunnel URL to start routing AI requests.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 bg-interactive-base text-text-primary dark:text-white text-xs font-bold px-4 py-2 rounded-xl shadow"
            >
              <FiPlus /> Add Server Node Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nodes.map((node) => {
              const isHealthy = node.isActive && (!node.status || node.status === "ACTIVE" || node.status.startsWith("HEALTHY") || node.status === "OK");
              return (
                <div
                  key={node._id}
                  className={`p-5 rounded-2xl border transition relative flex flex-col justify-between ${isDark
                      ? "bg-interactive-active/80 border-border-primary hover:border-border-primary"
                      : "bg-white border-border-primary hover:border-border-primary shadow-sm"
                    } ${!node.isActive ? "opacity-60" : ""}`}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isHealthy ? "bg-green-400 animate-pulse" : "bg-text-muted/50"}`} />
                        <h3 className="font-bold text-sm tracking-tight">{node.name}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          node.format === "gemini" || (node.url && node.url.includes("googleapis.com"))
                            ? "bg-interactive-base/20 text-text-primary border border-border-primary/30"
                            : node.format === "glm" || (node.url && node.url.includes("integrate.api.nvidia.com"))
                            ? "bg-interactive-base/20 text-text-primary border border-border-primary/30"
                            : node.format === "openai"
                            ? "bg-interactive-base/20 text-text-primary border border-border-primary/30"
                            : "bg-interactive-base/20 text-text-primary border border-border-primary/30"
                          }`}>
                          {node.format === "gemini" || (node.url && node.url.includes("googleapis.com"))
                            ? "Google Gemini API"
                            : node.format === "glm" || (node.url && node.url.includes("integrate.api.nvidia.com"))
                            ? "NVIDIA GLM API"
                            : node.format === "openai"
                            ? "vLLM / OpenAI API"
                            : "Ollama Native API"}
                        </span>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={node.isActive}
                            onChange={() => handleToggleActive(node)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-black/10 dark:bg-black/40 ring-1 ring-inset ring-border-primary/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-primary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-text-primary dark:peer-checked:bg-white dark:peer-checked:after:bg-black dark:peer-checked:after:border-black peer-checked:ring-text-primary dark:peer-checked:ring-white"></div>
                        </label>
                      </div>
                    </div>

                    {/* URL & Secret Key Display */}
                    <div className="space-y-1.5 mb-3">
                      <div className={`p-2 px-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
                        isDark ? "bg-interactive-base border-border-primary text-text-primary" : "bg-surface-secondary border-border-primary text-text-primary"
                      }`}>
                        <span className="text-[10px] text-text-primary uppercase font-sans font-bold shrink-0">Endpoint:</span>
                        <span className="truncate">{node.url}</span>
                      </div>

                      <div className={`p-2 px-3 rounded-xl border text-[11px] font-mono flex items-center justify-between gap-2 ${
                        isDark ? "bg-interactive-base/60 border-border-primary/80 text-amber-800" : "bg-amber-50/50 border-amber-200 text-amber-800"
                      }`}>
                        <span className="text-[10px] text-text-primary uppercase font-sans font-bold shrink-0">API Key:</span>
                        <span className="truncate">
                          {node.secretKey ? `🔑 ${node.secretKey} (Stored & Encrypted)` : "🔓 None (Open Endpoint)"}
                        </span>
                      </div>
                    </div>

                    {/* Info Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] mb-4">
                      <div className={`p-2 rounded-lg border ${isDark ? "bg-interactive-base/60 border-border-primary" : "bg-interactive-base border-border-primary"}`}>
                        <div className="text-text-primary text-[10px]">Target Model</div>
                        <div className="font-semibold truncate">{node.defaultModel || "llama3.2:3b"}</div>
                      </div>

                      <div className={`p-2 rounded-lg border ${isDark ? "bg-interactive-base/60 border-border-primary" : "bg-interactive-base border-border-primary"}`}>
                        <div className="text-text-primary text-[10px]">Ping Latency</div>
                        <div className="font-semibold text-text-primary flex items-center gap-1">
                          <FiActivity />
                          <span>{node.lastLatencyMs ? `${node.lastLatencyMs} ms` : "Untested"}</span>
                        </div>
                      </div>

                      <div className={`p-2 rounded-lg border ${isDark ? "bg-interactive-base/60 border-border-primary" : "bg-interactive-base border-border-primary"}`}>
                        <div className="text-text-primary text-[10px]">Priority Tier</div>
                        <div className="font-semibold flex items-center gap-1 text-amber-800">
                          <FiZap />
                          <span>Tier {node.priority || 10}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className={`pt-3 border-t flex items-center justify-between ${isDark ? "border-border-primary" : "border-border-primary"}`}>
                    <button
                      onClick={() => handlePingNode(node._id)}
                      disabled={pingingId === node._id}
                      className="flex items-center gap-1.5 bg-interactive-base/10 hover:bg-interactive-base/20 text-text-primary border border-border-primary/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      <FiRefreshCw className={pingingId === node._id ? "animate-spin" : ""} />
                      <span>Test Health</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(node)}
                        className={`p-2 rounded-lg border text-xs transition ${isDark ? "border-border-primary hover:bg-interactive-active text-text-muted" : "border-border-primary hover:bg-surface-secondary text-text-primary"
                          }`}
                        title="Edit URL & Settings"
                      >
                        <FiEdit3 />
                      </button>

                      <button
                        onClick={() => handleDeleteNode(node._id, node.name)}
                        className="p-2 rounded-lg border border-border-primary/30 bg-interactive-base/10 hover:bg-interactive-base/20 text-text-primary text-xs transition"
                        title="Delete Server Node"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${isDark ? "bg-interactive-active border-border-primary text-text-muted" : "bg-white border-border-primary text-text-primary"
            }`}>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-text-primary hover:text-white"
            >
              <FiX className="text-lg" />
            </button>

            <h2 className="text-lg font-bold mb-1">
              {editingNode ? "Edit Server Node" : "Add New Server Node"}
            </h2>
            <p className="text-xs text-text-primary mb-4">
              Enter your LLaMA server URL (local IP or Cloudflare tunnel) and configuration.
            </p>

            <form onSubmit={handleSubmitForm} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Server Name <span className="text-text-primary">*</span>
                </label>
                <input
                  type="text"
                  name="server_node_name"
                  autoComplete="off"
                  placeholder="e.g. Primary LLaMA Server"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: "" }));
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition ${
                    fieldErrors.name
                      ? "border-border-primary ring-2 ring-border-focus/30 text-text-primary bg-interactive-base/5"
                      : isDark ? "bg-interactive-base border-border-primary focus:border-border-focus text-text-muted" : "bg-interactive-base border-border-primary focus:border-border-focus text-text-primary"
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-text-primary font-semibold mt-1 flex items-center gap-1">
                    <span>⚠️</span> {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Server URL / Tunnel Endpoint <span className="text-text-primary">*</span>
                </label>

                <input
                  type="text"
                  name="server_node_url"
                  autoComplete="new-password"
                  placeholder="e.g. https://my-tunnel.trycloudflare.com or http://localhost:11434"
                  value={formData.url}
                  onChange={(e) => {
                    setFormData({ ...formData, url: e.target.value });
                    if (fieldErrors.url) setFieldErrors(prev => ({ ...prev, url: "" }));
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none transition ${
                    fieldErrors.url
                      ? "border-border-primary ring-2 ring-border-focus/30 text-text-primary bg-interactive-base/5"
                      : isDark ? "bg-interactive-base border-border-primary focus:border-border-focus text-text-primary" : "bg-interactive-base border-border-primary focus:border-border-focus text-text-primary"
                  }`}
                />

                {fieldErrors.url && (
                  <p className="text-[11px] text-text-primary font-semibold mt-1 flex items-center gap-1">
                    <span>⚠️</span> {fieldErrors.url}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Authorization Secret Key (Optional)</label>
                <input
                  type="password"
                  name="server_node_secret"
                  autoComplete="new-password"
                  placeholder="e.g. Bearer token / Secret Key for server header authorization"
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:border-border-focus ${isDark ? "bg-interactive-base border-border-primary text-amber-800" : "bg-interactive-base border-border-primary text-amber-700"
                    }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Default Model</label>
                  <input
                    type="text"
                    placeholder="e.g. llama3.2:3b"
                    value={formData.defaultModel}
                    onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-border-focus ${isDark ? "bg-interactive-base border-border-primary text-text-muted" : "bg-interactive-base border-border-primary text-text-primary"
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">API Protocol</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-border-focus ${isDark ? "bg-interactive-base border-border-primary text-text-muted" : "bg-interactive-base border-border-primary text-text-primary"
                      }`}
                  >
                    <option value="openai">vLLM / LM Studio / OpenAI (/v1)</option>
                    <option value="gemini">Google Gemini API (Cloud)</option>
                    <option value="glm">NVIDIA GLM API (Cloud)</option>
                    <option value="ollama">Ollama Native (/api/chat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Priority Tier (1-100)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })}
                    min="1"
                    max="100"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-border-focus ${isDark ? "bg-interactive-base border-border-primary text-amber-800 font-bold" : "bg-interactive-base border-border-primary text-amber-700 font-bold"
                      }`}
                  />
                </div>
              </div>

              {/* Priority Tier Explanation Note */}
              <div className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                isDark ? "bg-amber-900/10 border-amber-800/20 text-amber-600" : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <span className="text-amber-800 font-bold shrink-0">💡 Note:</span>
                <span>
                  <strong>Priority Tier Load Balancing (1 to 100):</strong> Set <strong>100</strong> for Highest Priority (Primary GPU Server used first). Set <strong>10</strong> for Secondary / Fallback Servers.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border-primary text-xs font-semibold text-text-primary hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saveNodeMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-xs font-bold shadow-lg shadow-black/10/20"
                >
                  {saveNodeMutation.isPending ? "Saving..." : editingNode ? "Save Changes" : "Create Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServerPage;
