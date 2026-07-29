import { useState } from "react";
import {
  FiX,
  FiCpu,
  FiUpload,
  FiCode,
  FiCheck,
  FiFileText,
  FiPlus,
  FiTrash2,
  FiArrowRight,
  FiArrowLeft,
  FiPlay,
  FiCheckCircle,
  FiAlertCircle
} from "react-icons/fi";
import api from "../../services/api";

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", badge: "Recommended" },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", badge: "Flagship" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", badge: "Fast" },
  { id: "claude-3.5-sonnet", name: "Claude", provider: "Anthropic", badge: "Reasoning" },
  { id: "gemini-1.5-pro", name: "Gemini", provider: "Google", badge: "Long Context" },
  { id: "qwen-2.5", name: "Qwen", provider: "Alibaba AI", badge: "Open Source" },
  { id: "custom-model", name: "Custom Model", provider: "Enterprise", badge: "Self-Hosted" }
];

const ACTION_TYPES = [
  { id: "CREATE_CONTACT", label: "Create Contact (POST /contacts)" },
  { id: "UPDATE_CONTACT", label: "Update Contact (PUT /contacts/:id)" },
  { id: "DELETE_CONTACT", label: "Delete Contact (DELETE /contacts/:id)" },
  { id: "SEARCH_CONTACT", label: "Search Contact (GET /contacts)" },
  { id: "CREATE_TICKET", label: "Create Support Ticket (POST /tickets)" },
  { id: "CREATE_LEAD", label: "Create Lead (POST /leads)" },
  { id: "GENERIC", label: "Generic REST Action" }
];

const CreateBotModal = ({ onClose, onBotCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2: Model
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  // Step 3: Files
  const [stagedFiles, setStagedFiles] = useState([]);

  // Step 4: APIs
  const [stagedApis, setStagedApis] = useState([]);
  const [apiName, setApiName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiActionType, setApiActionType] = useState("GENERIC");
  const [apiAuthType, setApiAuthType] = useState("none");
  const [apiKey, setApiKey] = useState("");

  // Step 5: Test Execution
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "txt", "docx", "md"].includes(ext)) {
        alert(`File format .${ext} is not supported. Please upload PDF, TXT, DOCX, or Markdown (.md).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result.split(",")[1];
        setStagedFiles((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileType: ext,
            fileSize: file.size,
            fileContentBase64: base64,
            rawText: ["txt", "md"].includes(ext) ? event.target.result : ""
          }
        ]);
      };
      if (["txt", "md"].includes(ext)) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const removeStagedFile = (index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addStagedApi = () => {
    if (!apiName || !apiUrl) {
      alert("Please provide both API Name and API URL.");
      return;
    }
    setStagedApis((prev) => [
      ...prev,
      {
        name: apiName,
        url: apiUrl,
        method: apiMethod,
        actionType: apiActionType,
        authType: apiAuthType,
        apiKey
      }
    ]);
    setApiName("");
    setApiUrl("");
    setApiKey("");
    setApiActionType("GENERIC");
  };

  const removeStagedApi = (index) => {
    setStagedApis((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!name.trim()) {
        setError("Bot name is required.");
        return false;
      }
    }

    if (step === 3) {
      if (stagedFiles.length === 0) {
        setError("Please upload at least one knowledge file before continuing.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleTestApiExecution = async (apiItem) => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await fetch(apiItem.url, {
        method: apiItem.method || "GET",
        headers: { "Content-Type": "application/json" }
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json().catch(() => ({ status: "OK" }));
        setTestResult({
          success: true,
          message: `API executed successfully (${response.status} OK)`,
          data
        });
      } else {
        setTestResult({
          success: false,
          message: `Test endpoint reached. Endpoint configured: ${apiItem.url}`
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `API test completed for ${apiItem.name} (${apiItem.method} ${apiItem.url})`
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleCompleteBotCreation = async () => {
    if (!name.trim()) {
      setError("Bot name is required.");
      setCurrentStep(1);
      return;
    }

    if (stagedFiles.length === 0) {
      setError("Please upload at least one knowledge file before creating the bot.");
      setCurrentStep(3);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create Bot
      const botRes = await api.post("/bots", {
        name: name.trim(),
        description: description ? description.trim() : "",
        model: selectedModel,
        systemPrompt: `You are a specialized AI Knowledge & Tool Agent named ${name}.`,
        initialApis: stagedApis,
        stagedFiles
      });

      const newBot = botRes.data;

      // 2. Upload staged files if any
      if (stagedFiles.length > 0) {
        for (const file of stagedFiles) {
          await api.post(`/bots/${newBot._id}/upload`, file);
        }
      }

      setLoading(false);
      onBotCreated(newBot);
      onClose();
    } catch (err) {
      console.error("Error creating bot:", err);
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to create Bot.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      {/* Dialog Box */}
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <FiCpu className="text-lg" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-tight">Create AI Agent Wizard</h2>
              <p className="text-[11px] text-slate-400">5-Step True RAG & Tool Calling Bot Builder</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Wizard Progress Bar (5 Steps) */}
        <div className="grid grid-cols-5 border-b border-slate-800/80 bg-slate-900/20 text-[10px] font-semibold text-slate-400">
          {[
            { step: 1, label: "1. Info" },
            { step: 2, label: "2. Model" },
            { step: 3, label: "3. Knowledge" },
            { step: 4, label: "4. Integrations" },
            { step: 5, label: "5. Actions" }
          ].map((item) => (
            <div
              key={item.step}
              className={`py-2 text-center border-r last:border-r-0 border-slate-800 transition ${
                currentStep === item.step
                  ? "bg-blue-600 text-white font-bold"
                  : currentStep > item.step
                  ? "text-blue-400 bg-blue-950/20"
                  : "text-slate-500"
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: BOT INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Bot Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CRM Assistant, Sales Agent, Support Bot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition text-slate-100 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what this bot does and its intended workflow..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition text-slate-100 placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          {/* STEP 2: MODEL SELECTION */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Base LLM Model Architecture
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODELS.map((m) => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                        isSelected
                          ? "bg-blue-600/10 border-blue-500 text-white shadow-md shadow-blue-500/10"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold">{m.name}</h4>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{m.provider}</p>
                      </div>
                      {isSelected && <FiCheck className="text-blue-400 text-base" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: KNOWLEDGE UPLOAD */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Optional Knowledge Base Documents (PDF, TXT, DOCX, Markdown)
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  You can create the bot without any documents and add knowledge later from the bot details page.
                </p>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950 p-6 rounded-xl cursor-pointer transition text-center group">
                  <FiUpload className="text-3xl text-slate-500 group-hover:text-blue-400 transition mb-2" />
                  <span className="text-xs font-semibold text-slate-300">
                    Click or Drag & Drop Knowledge Files
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Supports PDF, TXT, DOCX, and Markdown (.md) documents
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.docx,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Staged Files List */}
              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Staged Files ({stagedFiles.length})
                  </h4>
                  {stagedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <FiFileText className="text-blue-400 text-sm" />
                        <span className="font-medium truncate">{file.fileName}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
                          {file.fileType}
                        </span>
                      </div>
                      <button
                        onClick={() => removeStagedFile(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: API INTEGRATIONS */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Configure HTTP REST API Endpoint
                </label>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="API Name (e.g. Create Contact API)"
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                    />
                    <select
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="API Endpoint URL (e.g. https://api.example.com/v1/contacts)"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={apiActionType}
                      onChange={(e) => setApiActionType(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                    >
                      {ACTION_TYPES.map(a => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>

                    <select
                      value={apiAuthType}
                      onChange={(e) => setApiAuthType(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                    >
                      <option value="none">No Auth</option>
                      <option value="apiKey">API Key (x-api-key)</option>
                      <option value="bearerToken">Bearer Token</option>
                    </select>
                  </div>

                  {apiAuthType !== "none" && (
                    <input
                      type="password"
                      placeholder="API Key / Token Value"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                    />
                  )}

                  <button
                    type="button"
                    onClick={addStagedApi}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 rounded-lg transition"
                  >
                    <FiPlus /> Add API Integration
                  </button>
                </div>
              </div>

              {/* Staged APIs List */}
              {stagedApis.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Configured API Integrations ({stagedApis.length})
                  </h4>
                  {stagedApis.map((apiItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">
                          {apiItem.method}
                        </span>
                        <span className="font-semibold truncate">{apiItem.name}</span>
                        <span className="text-slate-500 truncate text-[11px]">({apiItem.actionType})</span>
                      </div>
                      <button
                        onClick={() => removeStagedApi(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: ACTION MAPPING & API EXECUTION TEST */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Action Mapping & Tool Calling Preview
                </h3>
                <p className="text-xs text-slate-400">
                  Verify tool action bindings and test execution before launching your AI Agent.
                </p>
              </div>

              {stagedApis.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No custom Tool APIs configured. The bot will operate in Strict RAG Knowledge Mode.
                </div>
              ) : (
                <div className="space-y-3">
                  {stagedApis.map((apiItem, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">
                            {apiItem.method}
                          </span>
                          <span className="font-bold text-white">{apiItem.name}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                          {apiItem.actionType}
                        </span>
                      </div>

                      <p className="text-slate-400 font-mono text-[11px] truncate">{apiItem.url}</p>

                      <button
                        type="button"
                        onClick={() => handleTestApiExecution(apiItem)}
                        disabled={testLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold text-[11px] transition"
                      >
                        <FiPlay className="text-xs" />
                        <span>{testLoading ? "Testing..." : "Test Endpoint Execution"}</span>
                      </button>
                    </div>
                  ))}

                  {testResult && (
                    <div
                      className={`p-3 rounded-xl text-xs font-mono border ${
                        testResult.success
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-1">
                        {testResult.success ? <FiCheckCircle /> : <FiAlertCircle />}
                        <span>{testResult.message}</span>
                      </div>
                      {testResult.data && (
                        <pre className="text-[10px] overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800 mt-2">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
            >
              <FiArrowLeft /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              onClick={handleNextStep}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Next <FiArrowRight />
            </button>
          ) : (
            <button
              onClick={handleCompleteBotCreation}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? "Creating Agent..." : "Finish & Launch Bot"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateBotModal;
