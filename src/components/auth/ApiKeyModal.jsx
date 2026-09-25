import { useState, useEffect } from "react";
import { FiKey, FiPlus, FiTrash2, FiCopy, FiCheck, FiX, FiShield, FiCpu } from "react-icons/fi";
import { backEndCallGet, NobackEndCallObj, backEndCallObjDel } from "../../services/authService";

export default function ApiKeyModal({ isOpen, onClose }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState(null); // Shows new secret key ONCE
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchApiKeys();
      setCreatedKey(null);
      setError("");
    }
  }, [isOpen]);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const res = await backEndCallGet("/api/v1/api-keys");
      if (res?.success) {
        setApiKeys(res.apiKeys || []);
      }
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setError("");
    setIsLoading(true);
    try {
      const res = await NobackEndCallObj("/api/v1/api-keys", { name: keyName.trim() }, "post");
      if (res?.success) {
        setCreatedKey(res.apiKey);
        setKeyName("");
        fetchApiKeys();
      } else {
        setError(res?.message || "Failed to create API key");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create API key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!window.confirm("Are you sure you want to revoke this API key? Applications using it will lose access immediately.")) {
      return;
    }

    try {
      const res = await backEndCallObjDel("/api/v1/api-keys", keyId);
      if (res?.success) {
        fetchApiKeys();
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-surface-card border border-border-primary rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-primary flex items-center justify-between bg-surface-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FiKey className="text-xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Developer API Keys</h3>
              <p className="text-xs text-text-muted">Use API keys to connect external applications with zero model setup.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-secondary transition cursor-pointer"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Newly Created Secret Key Banner (Shown ONCE) */}
          {createdKey && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FiShield className="text-sm" /> Save Your API Key
                </span>
                <span className="text-[11px] font-medium opacity-80">Shown once only</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 p-2.5 rounded-lg border border-emerald-500/20 font-mono text-xs text-text-primary break-all">
                <span className="flex-1 select-all">{createdKey.secretKey}</span>
                <button
                  onClick={() => handleCopy(createdKey.secretKey, "created")}
                  className="px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-md text-xs font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
                >
                  {copiedId === "created" ? <FiCheck /> : <FiCopy />}
                  {copiedId === "created" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] opacity-90">Please copy and save this secret key now. For security reasons, it cannot be displayed again.</p>
            </div>
          )}

          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} className="space-y-3">
            <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider">
              Generate New API Key
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. My Mobile App, Backend Service"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                maxLength={50}
                className="flex-1 px-3.5 py-2.5 bg-surface-secondary border border-border-primary/60 rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-purple-500 transition"
                required
              />
              <button
                type="submit"
                disabled={isLoading || !keyName.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <FiPlus className="text-sm" />
                <span>Create Key</span>
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>

          {/* Active Keys List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Your API Keys ({apiKeys.length})
              </span>
              <span className="text-[11px] text-text-muted font-mono">Endpoint: /api/v1/chat/completions</span>
            </div>

            {isLoading && apiKeys.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">Loading API keys...</div>
            ) : apiKeys.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border-primary rounded-xl text-xs text-text-muted">
                No API keys created yet. Generate one above to access your models programmatically.
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="p-3.5 rounded-xl border border-border-primary/60 bg-surface-secondary/40 flex items-center justify-between gap-3 hover:border-border-primary transition"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary truncate">{key.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                            key.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          {key.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono">
                        <span>{key.keyPrefix}</span>
                        <span>•</span>
                        <span>{key.totalRequests || 0} reqs</span>
                        <span>•</span>
                        <span>{key.totalTokensUsed || 0} tokens</span>
                      </div>
                    </div>

                    {key.status === "ACTIVE" && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer shrink-0"
                        title="Revoke API Key"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-primary bg-surface-secondary/30 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <FiCpu className="text-purple-500" />
            <span>Auto-routes to optimal ServerNode pool</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-secondary hover:bg-surface-dropdown border border-border-primary rounded-xl text-text-primary font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
