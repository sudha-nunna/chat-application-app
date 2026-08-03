import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiX,
  FiCode,
  FiKey,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiCopy,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiGlobe,
  FiShield,
  FiLock,
  FiEye,
  FiEyeOff
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";

const ApiModal = ({ bot, onClose, onApiUpdated }) => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [generatedKey, setGeneratedKey] = useState(null);
  const [generatedSecretKey, setGeneratedSecretKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  // Form states for optional key metadata
  const [apiName, setApiName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [method, setMethod] = useState("POST");

  // TanStack Query: Initial GET route to check keys status
  const {
    data: apiResponse = null,
    isLoading: isFetchingApis
  } = useQuery({
    queryKey: ["bot-apis", bot?._id],
    queryFn: async () => {
      if (!bot?._id) return null;
      try {
        const res = await NobackEndCall(`/bots/${bot._id}/keys`);
        return res;
      } catch (err) {
        console.error("Failed to fetch bot APIs:", err);
        return null;
      }
    },
    enabled: !!bot?._id
  });

  // Determine if keys exist either from initial GET or from recent generation
  const activeApiKey = generatedKey || apiResponse?.apiKey || null;
  const activeSecretKey = generatedSecretKey || apiResponse?.secretKey || null;
  const hasKeys = (apiResponse?.hasKeys ?? false) || !!activeApiKey;
  const serverMessage =
    apiResponse?.message ||
    (hasKeys
      ? "API Keys are active and configured for this bot."
      : "No API Key or Secret Key has been generated for this bot yet.");

  // TanStack Mutation: Generate API Key using authService (NobackEndCallObj POST)
  const generateApiMutation = useMutation({
    mutationFn: async (payload) => {
      setErrorMsg("");
      return await NobackEndCallObj(`/bots/${bot._id}/keys/generate`, payload, "post");
    },
    onSuccess: (data) => {
      // Invalidate GET query cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["bot-apis", bot?._id] });

      const newApiKey = data?.apiKey || data?.key || data?.api?.apiKey;
      const newSecretKey = data?.secretKey || data?.secret || data?.api?.secretKey;

      setGeneratedKey(newApiKey || `bot_pk_${Math.random().toString(36).substring(2)}${Date.now()}`);
      if (newSecretKey) {
        setGeneratedSecretKey(newSecretKey);
      }

      setShowGenerateForm(false);
      if (onApiUpdated) onApiUpdated();
    },
    onError: (err) => {
      setErrorMsg(
        err?.error || err?.message || "Failed to generate API Key. Please try again."
      );
    }
  });

  const handleGenerateClick = (e) => {
    if (e) e.preventDefault();
    const payload = {
      name: apiName.trim() || `${bot?.name || "Bot"} API Key`,
      url: targetUrl.trim() || `${window.location.origin}/api/v1/bots/${bot?._id}/interact`,
      method: method || "POST",
      authType: "apiKey",
      actionType: "GENERATE_KEY"
    };

    generateApiMutation.mutate(payload);
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "apiKey") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all flex flex-col max-h-[90vh] ${isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
          }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-5 border-b ${isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-100 bg-slate-50"
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 text-xl font-bold">
              <FiKey />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">API Key Manager</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Bot: <span className="font-semibold text-indigo-400">{bot?.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <FiAlertCircle className="shrink-0 text-base" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. INITIAL LOADING STATE (GET ROUTE) */}
          {isFetchingApis ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FiRefreshCw className="animate-spin text-3xl text-indigo-500 mb-3" />
              <p className="text-xs font-bold tracking-tight">Checking API Keys Status...</p>
              <p className={`text-[11px] mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Fetching current bot credentials from backend
              </p>
            </div>
          ) : !hasKeys ? (
            /* 2. NO KEYS EXIST (hasKeys === false) */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-3xl mx-auto mb-4">
                <FiKey />
              </div>
              <h3 className="text-base font-bold mb-1">No API Keys Generated</h3>
              <p className={`text-xs max-w-xs mx-auto mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {serverMessage}
              </p>

              <button
                onClick={handleGenerateClick}
                disabled={generateApiMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold py-3 px-5 rounded-xl shadow-lg shadow-indigo-500/20 transition active:scale-[0.99]"
              >
                {generateApiMutation.isPending ? (
                  <>
                    <FiRefreshCw className="animate-spin text-sm" />
                    <span>Generating API Keys...</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="text-base" />
                    <span>Generate API Keys</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* 3. KEYS ALREADY EXIST (hasKeys === true) */
            <div className="space-y-5">
              {/* Existing Keys Card */}
              <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiShield className="text-emerald-400 text-sm" />
                    <h4 className="text-xs font-bold tracking-tight">Active API Credentials</h4>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                    Active
                  </span>
                </div>

                {/* Public API Key */}
                {activeApiKey && (
                  <div className="mb-3">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-slate-500"
                      }`}>
                      Public API Key (apiKey)
                    </label>
                    <div className={`flex items-center justify-between p-3 rounded-xl border font-mono text-xs ${isDark ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-white border-slate-300 text-emerald-700"
                      }`}>
                      <span className="truncate mr-2 select-all">{activeApiKey}</span>
                      <button
                        onClick={() => copyToClipboard(activeApiKey, "apiKey")}
                        className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0"
                      >
                        {copiedKey ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
                        <span>{copiedKey ? "Copied" : "Copy Key"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Secret Key */}
                {activeSecretKey && (
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-slate-500"
                      }`}>
                      Secret Key (secretKey)
                    </label>
                    <div className={`flex items-center justify-between p-3 rounded-xl border font-mono text-xs ${isDark ? "bg-slate-900 border-slate-800 text-indigo-400" : "bg-white border-slate-300 text-indigo-700"
                      }`}>
                      <span className="truncate mr-2 select-all tracking-wider font-mono">
                        {showSecret
                          ? activeSecretKey
                          : (activeSecretKey.length > 10
                            ? `${activeSecretKey.substring(0, 7)}${"•".repeat(24)}`
                            : "••••••••••••••••••••••••")}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className={`p-1.5 rounded-lg transition ${isDark
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            }`}
                          title={showSecret ? "Hide Secret Key" : "Show Secret Key"}
                        >
                          {showSecret ? <FiEyeOff className="text-base" /> : <FiEye className="text-base" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeSecretKey, "secretKey")}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          {copiedSecret ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
                          <span>{copiedSecret ? "Copied" : "Copy Secret"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {apiResponse?.keyCreatedAt && (
                  <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/40 text-right font-mono">
                    Created: {new Date(apiResponse.keyCreatedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Generate New API Keys Section Below */}
              {!showGenerateForm ? (
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed rounded-xl py-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition"
                >
                  <FiRefreshCw className="text-xs" />
                  <span>Generate New API Keys</span>
                </button>
              ) : (
                <div className={`p-4 rounded-2xl border space-y-4 ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold">Generate New API Keys</h5>
                    <button
                      onClick={() => setShowGenerateForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Generating new keys will overwrite your current active API key pair.
                  </p>

                  <button
                    onClick={handleGenerateClick}
                    disabled={generateApiMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition active:scale-[0.99]"
                  >
                    {generateApiMutation.isPending ? (
                      <>
                        <FiRefreshCw className="animate-spin text-sm" />
                        <span>Generating New Keys...</span>
                      </>
                    ) : (
                      <>
                        <FiKey className="text-sm" />
                        <span>Confirm & Generate New Keys</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiModal;
