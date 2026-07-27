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
  FiLock,
  FiArrowRight,
  FiArrowLeft
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
  const [apiAuthType, setApiAuthType] = useState("none");
  const [apiKey, setApiKey] = useState("");

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
        authType: apiAuthType,
        apiKey
      }
    ]);
    setApiName("");
    setApiUrl("");
    setApiKey("");
  };

  const removeStagedApi = (index) => {
    setStagedApis((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompleteBotCreation = async () => {
    if (!name.trim()) {
      setError("Bot Name is required.");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create Bot
      const botRes = await api.post("/bots", {
        name,
        description,
        model: selectedModel,
        initialApis: stagedApis
      });

      const newBot = botRes.data;

      // 2. Upload Staged Files
      if (stagedFiles.length > 0) {
        for (const fileData of stagedFiles) {
          await api.post(`/bots/${newBot._id}/upload`, fileData);
        }
      }

      onBotCreated(newBot);
      onClose();
    } catch (err) {
      console.error("Failed to complete bot creation:", err);
      setError(err.response?.data?.error || "Failed to create bot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FiCpu className="text-blue-500" />
              <span>Create New AI Agent</span>
            </h2>
            <p className="text-xs text-slate-400">Step {currentStep} of 4</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          {[
            { step: 1, label: "1. Info" },
            { step: 2, label: "2. Model" },
            { step: 3, label: "3. Knowledge" },
            { step: 4, label: "4. Integrations" }
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setCurrentStep(item.step)}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition ${
                currentStep === item.step
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : currentStep > item.step
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-medium">
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
                  placeholder="e.g. Allvion CRM, PhonePe Support, HR Assistant"
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

          {/* STEP 3: KNOWLEDGE UPLOAD (PDF, TXT, DOCX) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Upload Knowledge Base Documents (PDF, TXT, DOCX, Markdown)
                </label>

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
                  Add HTTP API Integration (Optional)
                </label>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="API Name (e.g. CRM Contact API)"
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
                    placeholder="API Endpoint URL (e.g. https://api.codegene.io/v1/contacts)"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={apiAuthType}
                      onChange={(e) => setApiAuthType(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                    >
                      <option value="none">No Auth</option>
                      <option value="apiKey">API Key (x-api-key)</option>
                      <option value="bearerToken">Bearer Token</option>
                    </select>

                    {apiAuthType !== "none" && (
                      <input
                        type="password"
                        placeholder="API Key / Token Value"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addStagedApi}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 rounded-lg transition"
                  >
                    <FiPlus /> Add Integration
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
                        <span className="text-slate-500 truncate text-[11px]">({apiItem.url})</span>
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
        </div>

        {/* Modal Footer Controls */}
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

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
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
