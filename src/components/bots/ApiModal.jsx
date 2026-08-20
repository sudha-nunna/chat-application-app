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
  const [generatedChatUrl, setGeneratedChatUrl] = useState(null);
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
    isLoading: isFetchingApis,
    refetch
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
  const fullEndpointUrl =
    generatedChatUrl ||
    apiResponse?.chatUrl ||
    `${apiBaseUrl}/api/v1/external/bots/chat`;
  const apiKeyPlaceholder = activeApiKey;
  const secretKeyPlaceholder = activeSecretKey;

  const getCodeSnippet = (lang) => {
    if (lang === "curl") {
      return `curl -X POST "${fullEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -H "X-Bot-Api-Key: ${apiKeyPlaceholder}" \\
  -H "X-Bot-Secret-Key: ${secretKeyPlaceholder}" \\
  -d '{
    "message": "Explain React Hooks in detail with examples",
    "conversationId": "6a7471e2c7c97ebb992ba481"
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
    message: "Explain React Hooks in detail with examples",
    conversationId: "6a7471e2c7c97ebb992ba481" // Pass null on 1st message, then pass conversationId on follow-ups
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

payload = {
    "message": "Explain React Hooks",
    "conversationId": "6a7471e2c7c97ebb992ba481"  # Pass None/null for 1st message, then conversationId for follow-ups
}

response = requests.post(url, json=payload, headers=headers, stream=True)
for chunk in response.iter_content(chunk_size=1024):
    if chunk:
        print(chunk.decode('utf-8'), end='')`;
    }

    return "";
  };

  // TanStack Mutation: Revoke / Delete API Keys
  const deleteApiKeysMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      return await NobackEndCallObj(`/bots/${bot._id}/keys`, {}, "delete");
    },
    onSuccess: () => {
      // Invalidate and refetch the GET route immediately after delete call
      queryClient.invalidateQueries({ queryKey: ["bot-apis", bot?._id] });
      refetch();

      setGeneratedKey(null);
      setGeneratedSecretKey(null);
      setGeneratedChatUrl(null);
      setActiveSubTab("keys");

      if (onApiUpdated) onApiUpdated();
    },
    onError: (err) => {
      setErrorMsg(
        err?.error || err?.message || "Failed to delete API Keys. Please try again."
      );
    }
  });

  // TanStack Mutation: Generate API Key using authService (NobackEndCallObj POST)
  const generateApiMutation = useMutation({
    mutationFn: async (payload) => {
      setErrorMsg("");
      return await NobackEndCallObj(`/bots/${bot._id}/keys/generate`, payload, "post");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bot-apis", bot?._id] });
      refetch();

      const newApiKey = data?.apiKey || data?.key || data?.api?.apiKey;
      const newSecretKey = data?.secretKey || data?.secret || data?.api?.secretKey;
      const newChatUrl = data?.chatUrl || data?.url || data?.api?.chatUrl;

      setGeneratedKey(newApiKey);
      if (newSecretKey) {
        setGeneratedSecretKey(newSecretKey);
      }
      if (newChatUrl) {
        setGeneratedChatUrl(newChatUrl);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-interactive-base/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all flex flex-col max-h-[82vh] ${"bg-white border-border-primary text-text-primary dark:bg-interactive-active dark:border-border-primary dark:text-text-muted"
          }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between p-3.5 px-4 border-b shrink-0 ${"border-border-primary bg-interactive-base dark:border-border-primary dark:bg-interactive-base/40"
            }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-interactive-base/10 border border-border-primary/20 flex items-center justify-center text-text-primary text-base font-bold">
              <FiKey />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight">API Key Manager & Integration</h2>
              <p className={`text-[10px] ${"text-text-primary dark:text-text-primary"}`}>
                Bot: <span className="font-semibold text-text-primary">{bot?.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition ${"text-text-primary hover:text-text-primary hover:bg-surface-secondary dark:text-text-primary dark:hover:text-text-muted dark:hover:bg-interactive-active"
              }`}
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Sub-Tab Navigation Bar */}
        {!isFetchingApis && hasKeys && (
          <div className={`flex items-center border-b px-3 pt-1 shrink-0 ${"border-border-primary bg-interactive-base/50 dark:border-border-primary dark:bg-interactive-base/20"}`}>
            <button
              onClick={() => setActiveSubTab("keys")}
              className={`flex items-center gap-1.5 py-2 px-3 text-[11px] font-semibold border-b-2 transition ${activeSubTab === "keys"
                ? "border-border-primary text-text-primary"
                : "border-transparent text-text-primary hover:text-text-primary dark:border-transparent dark:text-text-primary dark:hover:text-text-muted"
                }`}
            >
              <FiShield className="text-xs" />
              <span>Active Keys</span>
            </button>

            <button
              onClick={() => setActiveSubTab("guide")}
              className={`flex items-center gap-1.5 py-2 px-3 text-[11px] font-semibold border-b-2 transition ${activeSubTab === "guide"
                ? "border-border-primary text-text-primary"
                : "border-transparent text-text-primary hover:text-text-primary dark:border-transparent dark:text-text-primary dark:hover:text-text-muted"
                }`}
            >
              <FiTerminal className="text-xs" />
              <span>Integration Guide</span>
            </button>

            <button
              onClick={() => setActiveSubTab("generate")}
              className={`flex items-center gap-1.5 py-2 px-3 text-[11px] font-semibold border-b-2 transition ${activeSubTab === "generate"
                ? "border-border-primary text-text-primary"
                : "border-transparent text-text-primary hover:text-text-primary dark:border-transparent dark:text-text-primary dark:hover:text-text-muted"
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
            <div className="mb-3 p-2.5 rounded-xl bg-interactive-base/10 border border-border-primary/20 text-text-primary text-xs flex items-center gap-2">
              <FiAlertCircle className="shrink-0 text-base" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. INITIAL LOADING STATE (GET ROUTE) */}
          {isFetchingApis ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FiRefreshCw className="animate-spin text-2xl text-text-primary mb-2" />
              <p className="text-xs font-bold tracking-tight">Checking API Keys Status...</p>
              <p className={`text-[10px] mt-1 ${"text-text-primary dark:text-text-primary"}`}>
                Fetching current bot credentials from backend
              </p>
            </div>
          ) : !hasKeys ? (
            /* 2. NO KEYS EXIST (hasKeys === false) */
            <div className="text-center py-5">
              <div className="w-12 h-12 rounded-xl bg-interactive-base/10 border border-border-primary/20 flex items-center justify-center text-text-primary text-xl mx-auto mb-2.5">
                <FiKey />
              </div>
              <h3 className="text-xs font-bold mb-1">No API Keys Generated</h3>
              <p className={`text-[11px] max-w-xs mx-auto mb-4 ${"text-text-primary dark:text-text-primary"}`}>
                {serverMessage}
              </p>

              <button
                onClick={handleGenerateClick}
                disabled={generateApiMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-interactive-base to-interactive-hover hover:from-interactive-base hover:to-interactive-hover disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition active:scale-[0.99]"
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
                  <div className={`p-3.5 rounded-xl border ${"bg-interactive-base border-border-primary dark:bg-interactive-base/60 dark:border-border-primary"
                    }`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <FiShield className="text-text-primary text-xs" />
                        <h4 className="text-xs font-bold tracking-tight">Active API Credentials</h4>
                      </div>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-interactive-base/10 text-text-primary font-mono">
                        Active
                      </span>
                    </div>

                    {/* Public API Key */}
                    {activeApiKey && (
                      <div className="mb-2.5">
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${"text-text-primary dark:text-text-primary"
                          }`}>
                          Public API Key (apiKey)
                        </label>
                        <div className={`flex items-center justify-between p-2 rounded-lg border font-mono text-xs ${"bg-white border-border-primary text-text-primary dark:bg-interactive-active dark:border-border-primary dark:text-text-primary"
                          }`}>
                          <span className="truncate mr-2 select-all">{activeApiKey}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeApiKey, "apiKey")}
                            className="flex items-center gap-1 bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition shrink-0"
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
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${"text-text-primary dark:text-text-primary"
                          }`}>
                          Secret Key (secretKey)
                        </label>
                        <div className={`flex items-center justify-between p-2 rounded-lg border font-mono text-xs ${"bg-white border-border-primary text-text-primary dark:bg-interactive-active dark:border-border-primary dark:text-text-primary"
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
                              className={`p-1 rounded-md transition ${"text-text-primary hover:text-text-primary hover:bg-surface-secondary dark:text-text-primary dark:hover:text-text-muted dark:hover:bg-interactive-active"
                                }`}
                              title={showSecret ? "Hide Secret Key" : "Show Secret Key"}
                            >
                              {showSecret ? <FiEyeOff className="text-xs" /> : <FiEye className="text-xs" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeSecretKey, "secretKey")}
                              className="flex items-center gap-1 bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition"
                            >
                              {copiedSecret ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
                              <span>{copiedSecret ? "Copied" : "Copy Secret"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {apiResponse?.keyCreatedAt && (
                      <p className="text-[9px] text-text-primary mt-2 pt-1.5 border-t border-border-primary/40 text-right font-mono">
                        Created: {new Date(apiResponse.keyCreatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Action Bar (Revoke / Guide) */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to revoke and delete your API Keys?")) {
                          deleteApiKeysMutation.mutate();
                        }
                      }}
                      disabled={deleteApiKeysMutation.isPending}
                      className="text-[11px] text-text-primary hover:text-text-muted font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <FiTrash2 className="text-xs" />
                      <span>{deleteApiKeysMutation.isPending ? "Revoking Keys..." : "Revoke / Delete Keys"}</span>
                    </button>

                    <button
                      onClick={() => setActiveSubTab("guide")}
                      className="text-[11px] text-text-primary hover:underline font-semibold flex items-center gap-1"
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
                  <div className={`p-3 rounded-xl border font-mono text-xs space-y-2 ${"bg-interactive-base border-border-primary dark:bg-interactive-base/80 dark:border-border-primary"
                    }`}>
                    <div className="flex items-center justify-between border-b pb-1.5 border-border-primary/50">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-text-primary text-[10px] px-1.5 py-0.5 bg-interactive-base/10 rounded">POST</span>
                        <span className="truncate text-[11px] text-text-muted font-semibold">{fullEndpointUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(fullEndpointUrl, "url")}
                        className="text-[10px] font-bold text-text-primary hover:underline shrink-0"
                      >
                        {copiedUrl ? "Copied" : "Copy URL"}
                      </button>
                    </div>

                    <div className="text-[10px] space-y-1 text-text-primary pt-0.5">
                      <p><strong className="text-text-primary">X-Bot-Api-Key:</strong> <span className="text-text-primary select-all">{apiKeyPlaceholder}</span></p>
                      <p><strong className="text-text-primary">X-Bot-Secret-Key:</strong> <span className="text-text-primary select-all">{secretKeyPlaceholder}</span></p>
                      <p><strong className="text-text-primary">Content-Type:</strong> application/json | <strong className="text-text-primary">Accept:</strong> text/event-stream</p>
                      <p><strong className="text-amber-800">Payload:</strong> <code className="text-text-muted">{"{"} "message": "...", "conversationId": "..." {"}"}</code> <span className="text-text-primary font-sans">(conversationId is null for 1st message)</span></p>
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
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${selectedLang === lang
                              ? "bg-interactive-base text-text-primary dark:text-white shadow-xs"
                              : "bg-surface-secondary text-text-primary hover:text-text-primary dark:bg-interactive-active dark:text-text-primary dark:hover:text-text-muted"
                              }`}
                          >
                            {lang === "javascript" ? "JS (fetch)" : lang}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(getCodeSnippet(selectedLang), "snippet")}
                        className="flex items-center gap-1 text-[10px] font-bold text-text-primary hover:underline"
                      >
                        {copiedSnippet ? <FiCheck className="text-xs text-text-primary" /> : <FiCopy className="text-xs" />}
                        <span>{copiedSnippet ? "Copied Code" : "Copy Code"}</span>
                      </button>
                    </div>

                    {/* Compact Code Block */}
                    <pre className={`p-2.5 rounded-xl border text-[11px] font-mono max-h-36 overflow-auto whitespace-pre custom-scrollbar ${"bg-interactive-active border-border-primary text-text-muted dark:bg-interactive-base dark:border-border-primary dark:text-text-muted"
                      }`}>
                      <code>{getCodeSnippet(selectedLang)}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: REGENERATE KEYS */}
              {activeSubTab === "generate" && (
                <div className={`p-4 rounded-xl border space-y-3 ${"bg-interactive-base border-border-primary dark:bg-interactive-base/40 dark:border-border-primary"
                  }`}>
                  <div className="flex items-center gap-2">
                    <FiRefreshCw className="text-text-primary text-xs" />
                    <h5 className="text-xs font-bold">Regenerate API Credentials</h5>
                  </div>

                  <p className={`text-[11px] ${"text-text-primary dark:text-text-primary"}`}>
                    Generating new keys will instantly overwrite your current active API key and Secret key.
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={generateApiMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-interactive-base to-interactive-hover hover:from-interactive-base hover:to-interactive-hover disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition active:scale-[0.99]"
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
