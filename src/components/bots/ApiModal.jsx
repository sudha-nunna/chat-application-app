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
  FiEyeOff,
  FiTerminal
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";

const ApiModal = ({ bot, onClose, onApiUpdated }) => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState("keys"); // "keys" | "guide" | "generate"
  const [generatedKey, setGeneratedKey] = useState(null);
  const [generatedSecretKey, setGeneratedSecretKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Copy feedback states
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Integration Guide Code Language
  const [selectedLang, setSelectedLang] = useState("curl"); // "curl" | "javascript" | "python"

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

  // Determine active keys
  const activeApiKey = generatedKey || apiResponse?.apiKey || null;
  const activeSecretKey = generatedSecretKey || apiResponse?.secretKey || null;
  const hasKeys = (apiResponse?.hasKeys ?? false) || !!activeApiKey;
  const serverMessage =
    apiResponse?.message ||
    (hasKeys
      ? "API Keys are active and ready for external integration."
      : "No API Key or Secret Key has been generated for this bot yet.");

  // API Endpoint URLs & Specs
  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const fullEndpointUrl = `${apiBaseUrl}/api/v1/external/bots/chatHeaders`;
  const apiKeyPlaceholder = activeApiKey || "<YOUR_BOT_API_KEY>";
  const secretKeyPlaceholder = activeSecretKey || "<YOUR_BOT_SECRET_KEY>";

  const getCodeSnippet = (lang) => {
    if (lang === "curl") {
      return `curl -X POST "${fullEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -H "X-Bot-Api-Key: ${apiKeyPlaceholder}" \\
  -H "X-Bot-Secret-Key: ${secretKeyPlaceholder}" \\
  -d '{
    "message": "Explain React Hooks in detail with examples"
  }'`;
    }

    if (lang === "javascript") {
      return `// JavaScript (fetch with SSE streaming)
const response = await fetch("${fullEndpointUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
    "X-Bot-Api-Key": "${apiKeyPlaceholder}",
    "X-Bot-Secret-Key": "${secretKeyPlaceholder}"
  },
  body: JSON.stringify({
    message: "Explain React Hooks in detail with examples"
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}`;
    }

    if (lang === "python") {
      return `# Python (requests library with streaming)
import requests

url = "${fullEndpointUrl}"
headers = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
    "X-Bot-Api-Key": "${apiKeyPlaceholder}",
    "X-Bot-Secret-Key": "${secretKeyPlaceholder}"
}

response = requests.post(url, json={"message": "Explain React Hooks"}, headers=headers, stream=True)
for chunk in response.iter_content(chunk_size=1024):
    if chunk:
        print(chunk.decode('utf-8'), end='')`;
    }

    return "";
  };

  // TanStack Mutation: Generate API Key using authService (NobackEndCallObj POST)
  const generateApiMutation = useMutation({
    mutationFn: async (payload) => {
      setErrorMsg("");
      return await NobackEndCallObj(`/bots/${bot._id}/keys/generate`, payload, "post");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bot-apis", bot?._id] });

      const newApiKey = data?.apiKey || data?.key || data?.api?.apiKey;
      const newSecretKey = data?.secretKey || data?.secret || data?.api?.secretKey;

      setGeneratedKey(newApiKey || `bot_pk_${Math.random().toString(36).substring(2)}${Date.now()}`);
      if (newSecretKey) {
        setGeneratedSecretKey(newSecretKey);
      }

      setActiveSubTab("keys");
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

  const copyToClipboard = (text, targetStateKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);

    if (targetStateKey === "apiKey") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (targetStateKey === "secretKey") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else if (targetStateKey === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (targetStateKey === "snippet") {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all flex flex-col max-h-[82vh] ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between p-3.5 px-4 border-b shrink-0 ${
            isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 text-base font-bold">
              <FiKey />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight">API Key Manager & Integration</h2>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Bot: <span className="font-semibold text-indigo-400">{bot?.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition ${
              isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Sub-Tab Navigation Bar */}
        {!isFetchingApis && hasKeys && (
          <div className={`flex items-center border-b px-3 pt-1 shrink-0 ${isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-100 bg-slate-50/50"}`}>
            <button
              onClick={() => setActiveSubTab("keys")}
              className={`flex items-center gap-1.5 py-2 px-3 text-[11px] font-semibold border-b-2 transition ${
                activeSubTab === "keys"
                  ? "border-indigo-500 text-indigo-500"
                  : isDark
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiShield className="text-xs" />
              <span>Active Keys</span>
            </button>

            <button
              onClick={() => setActiveSubTab("guide")}
              className={`flex items-center gap-1.5 py-2 px-3 text-[11px] font-semibold border-b-2 transition ${
                activeSubTab === "guide"
                  ? "border-indigo-500 text-indigo-500"
                  : isDark
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiTerminal className="text-xs" />
              <span>Integration Guide</span>
            </button>

            <button
              onClick={() => setActiveSubTab("generate")}
              className={`flex items-center gap-1.5 py-2 px-3 text-[11px] font-semibold border-b-2 transition ${
                activeSubTab === "generate"
                  ? "border-indigo-500 text-indigo-500"
                  : isDark
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiRefreshCw className="text-xs" />
              <span>Regenerate Keys</span>
            </button>
          </div>
        )}

        {/* Modal Body Area */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <FiAlertCircle className="shrink-0 text-base" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. INITIAL LOADING STATE (GET ROUTE) */}
          {isFetchingApis ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FiRefreshCw className="animate-spin text-2xl text-indigo-500 mb-2" />
              <p className="text-xs font-bold tracking-tight">Checking API Keys Status...</p>
              <p className={`text-[10px] mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Fetching current bot credentials from backend
              </p>
            </div>
          ) : !hasKeys ? (
            /* 2. NO KEYS EXIST (hasKeys === false) */
            <div className="text-center py-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl mx-auto mb-2.5">
                <FiKey />
              </div>
              <h3 className="text-xs font-bold mb-1">No API Keys Generated</h3>
              <p className={`text-[11px] max-w-xs mx-auto mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {serverMessage}
              </p>

              <button
                onClick={handleGenerateClick}
                disabled={generateApiMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition active:scale-[0.99]"
              >
                {generateApiMutation.isPending ? (
                  <>
                    <FiRefreshCw className="animate-spin text-xs" />
                    <span>Generating API Keys...</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="text-xs" />
                    <span>Generate API Keys</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* 3. KEYS EXIST - SUB-TABBED VIEWS */
            <div>
              {/* TAB 1: ACTIVE KEYS */}
              {activeSubTab === "keys" && (
                <div className="space-y-3">
                  <div className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <FiShield className="text-emerald-400 text-xs" />
                        <h4 className="text-xs font-bold tracking-tight">Active API Credentials</h4>
                      </div>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                        Active
                      </span>
                    </div>

                    {/* Public API Key */}
                    {activeApiKey && (
                      <div className="mb-2.5">
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}>
                          Public API Key (apiKey)
                        </label>
                        <div className={`flex items-center justify-between p-2 rounded-lg border font-mono text-xs ${
                          isDark ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-white border-slate-300 text-emerald-700"
                        }`}>
                          <span className="truncate mr-2 select-all">{activeApiKey}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeApiKey, "apiKey")}
                            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition shrink-0"
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
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}>
                          Secret Key (secretKey)
                        </label>
                        <div className={`flex items-center justify-between p-2 rounded-lg border font-mono text-xs ${
                          isDark ? "bg-slate-900 border-slate-800 text-indigo-400" : "bg-white border-slate-300 text-indigo-700"
                        }`}>
                          <span className="truncate mr-2 select-all tracking-wider font-mono">
                            {showSecret
                              ? activeSecretKey
                              : (activeSecretKey.length > 10
                                  ? `${activeSecretKey.substring(0, 7)}${"•".repeat(20)}`
                                  : "••••••••••••••••••••")}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className={`p-1 rounded-md transition ${
                                isDark
                                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              }`}
                              title={showSecret ? "Hide Secret Key" : "Show Secret Key"}
                            >
                              {showSecret ? <FiEyeOff className="text-xs" /> : <FiEye className="text-xs" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeSecretKey, "secretKey")}
                              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition"
                            >
                              {copiedSecret ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
                              <span>{copiedSecret ? "Copied" : "Copy Secret"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {apiResponse?.keyCreatedAt && (
                      <p className="text-[9px] text-slate-500 mt-2 pt-1.5 border-t border-slate-800/40 text-right font-mono">
                        Created: {new Date(apiResponse.keyCreatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Navigation Shortcut to Guide */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => setActiveSubTab("guide")}
                      className="text-[11px] text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <FiTerminal className="text-xs" />
                      <span>View Integration Guide →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPACT INTEGRATION GUIDE */}
              {activeSubTab === "guide" && (
                <div className="space-y-3">
                  {/* Endpoint & Headers Specs Box */}
                  <div className={`p-3 rounded-xl border font-mono text-xs space-y-2 ${
                    isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="flex items-center justify-between border-b pb-1.5 border-slate-800/50">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-indigo-400 text-[10px] px-1.5 py-0.5 bg-indigo-500/10 rounded">POST</span>
                        <span className="truncate text-[11px] text-slate-200 font-semibold">{fullEndpointUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(fullEndpointUrl, "url")}
                        className="text-[10px] font-bold text-indigo-400 hover:underline shrink-0"
                      >
                        {copiedUrl ? "Copied" : "Copy URL"}
                      </button>
                    </div>

                    <div className="text-[10px] space-y-1 text-slate-400 pt-0.5">
                      <p><strong className="text-indigo-400">X-Bot-Api-Key:</strong> <span className="text-emerald-400 select-all">{apiKeyPlaceholder}</span></p>
                      <p><strong className="text-indigo-400">X-Bot-Secret-Key:</strong> <span className="text-emerald-400 select-all">{secretKeyPlaceholder}</span></p>
                      <p><strong className="text-slate-400">Content-Type:</strong> application/json | <strong className="text-slate-400">Accept:</strong> text/event-stream</p>
                    </div>
                  </div>

                  {/* Code Examples Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {["curl", "javascript", "python"].map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => setSelectedLang(lang)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                              selectedLang === lang
                                ? "bg-indigo-600 text-white shadow-xs"
                                : isDark
                                ? "bg-slate-900 text-slate-400 hover:text-slate-200"
                                : "bg-slate-200 text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {lang === "javascript" ? "JS (fetch)" : lang}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(getCodeSnippet(selectedLang), "snippet")}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:underline"
                      >
                        {copiedSnippet ? <FiCheck className="text-xs text-emerald-400" /> : <FiCopy className="text-xs" />}
                        <span>{copiedSnippet ? "Copied Code" : "Copy Code"}</span>
                      </button>
                    </div>

                    {/* Compact Code Block */}
                    <pre className={`p-2.5 rounded-xl border text-[11px] font-mono max-h-36 overflow-auto whitespace-pre custom-scrollbar ${
                      isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-900 border-slate-800 text-slate-200"
                    }`}>
                      <code>{getCodeSnippet(selectedLang)}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: REGENERATE KEYS */}
              {activeSubTab === "generate" && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <FiRefreshCw className="text-indigo-400 text-xs" />
                    <h5 className="text-xs font-bold">Regenerate API Credentials</h5>
                  </div>

                  <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Generating new keys will instantly overwrite your current active API key and Secret key.
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={generateApiMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition active:scale-[0.99]"
                  >
                    {generateApiMutation.isPending ? (
                      <>
                        <FiRefreshCw className="animate-spin text-xs" />
                        <span>Generating New Keys...</span>
                      </>
                    ) : (
                      <>
                        <FiKey className="text-xs" />
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
