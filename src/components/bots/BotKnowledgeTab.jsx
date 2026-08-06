import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiUpload,
  FiRefreshCw,
  FiTrash2,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiBookOpen,
  FiShield,
  FiCheckSquare,
  FiList,
  FiPaperclip,
  FiLayers
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj, backEndCallObjDel } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient
} from "../../hooks/useTanStackData";

const BotKnowledgeTab = ({ bot }) => {
  const { botId } = useParams();
  const [activeSubTab, setActiveSubTab] = useState("knowledge"); // "knowledge" | "rules"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Separate replace target state for each section
  const [replaceKnowledgeTarget, setReplaceKnowledgeTarget] = useState(null);
  const [replaceRulesTarget, setReplaceRulesTarget] = useState(null);

  // Dedicated separate file inputs for Knowledge Base vs Rules
  const knowledgeFileInputRef = useRef(null);
  const rulesFileInputRef = useRef(null);
  const replaceKnowledgeInputRef = useRef(null);
  const replaceRulesInputRef = useRef(null);

  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  const targetBotId = botId || bot?._id;

  // 1. GET Route: Fetch Bot Files
  const {
    data: files = [],
    isLoading: loading
  } = useTanStackData(
    ["bot-files", targetBotId],
    async () => {
      if (!targetBotId) return [];
      const res = await NobackEndCall(`/bots/${targetBotId}/files`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!targetBotId }
  );

  // Separate Files into Knowledge vs Rules
  const knowledgeFiles = files.filter((f) => f.fileCategory === "knowledge" || !f.fileCategory);
  const rulesFiles = files.filter((f) => f.fileCategory === "rules");

  // Extract rulesConfig from Bot Details API response
  const rulesConfig = bot?.rulesConfig || {};
  const rulesList = Array.isArray(rulesConfig.rulesList) ? rulesConfig.rulesList : [];
  const rulesCount = rulesConfig.rulesCount !== undefined ? rulesConfig.rulesCount : rulesList.length;
  const sourceFiles = Array.isArray(rulesConfig.sourceFiles) ? rulesConfig.sourceFiles : [];

  // Helper to read file payload with explicit category
  const readFileAsPayload = async (file, category = "knowledge") => {
    const ext = (file.name.split(".").pop() || "txt").toLowerCase();
    const isTextFile = ["txt", "md", "json"].includes(ext);

    if (isTextFile) {
      const text = await file.text();
      return {
        fileName: file.name,
        fileType: ext,
        fileCategory: category,
        fileSize: file.size,
        rawText: text,
      };
    }

    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = (event) => resolve(event.target.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    return {
      fileName: file.name,
      fileType: ext,
      fileCategory: category,
      fileSize: file.size,
      fileContentBase64: base64,
    };
  };

  // Upload Files Mutation
  const uploadFilesMutation = useTanStackMutation({
    mutationFn: async ({ selectedFiles, category }) => {
      for (const file of selectedFiles) {
        const payload = await readFileAsPayload(file, category);
        await NobackEndCallObj(`/bots/${targetBotId}/upload`, payload, "post");
      }
      return selectedFiles.length;
    },
    onSuccess: (count, variables) => {
      const label = variables.category === "rules" ? "Rule Document" : "Knowledge Document";
      setSuccess(`${count} ${label}${count > 1 ? "s" : ""} uploaded successfully.`);
      queryClient.invalidateQueries({ queryKey: ["bot-files", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bot", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to upload file.");
    }
  });

  // Replace File Mutation
  const replaceFileMutation = useTanStackMutation({
    mutationFn: async ({ selectedFile, targetFile }) => {
      const category = targetFile.fileCategory || "knowledge";
      const payload = await readFileAsPayload(selectedFile, category);
      return await NobackEndCallObj(`/bots/${targetBotId}/files/${targetFile._id}`, payload, "put");
    },
    onSuccess: (_, variables) => {
      const categoryLabel = variables.targetFile.fileCategory === "rules" ? "Rule File" : "Knowledge File";
      setSuccess(`${categoryLabel} replaced successfully.`);
      setReplaceKnowledgeTarget(null);
      setReplaceRulesTarget(null);
      queryClient.invalidateQueries({ queryKey: ["bot-files", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bot", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to replace file.");
      setReplaceKnowledgeTarget(null);
      setReplaceRulesTarget(null);
    }
  });

  // Delete File Mutation
  const deleteFileMutation = useTanStackMutation({
    mutationFn: async (fileId) => {
      return await backEndCallObjDel(`/bots/${targetBotId}/files`, fileId);
    },
    onSuccess: () => {
      setSuccess("File removed successfully.");
      queryClient.invalidateQueries({ queryKey: ["bot-files", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bot", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to remove file.");
    }
  });

  const saving = uploadFilesMutation.isPending || replaceFileMutation.isPending || deleteFileMutation.isPending;

  // Separate Upload Triggers for Knowledge vs Rules
  const handleUploadKnowledge = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setError("");
    setSuccess("");
    uploadFilesMutation.mutate({ selectedFiles, category: "knowledge" });
    event.target.value = "";
  };

  const handleUploadRules = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setError("");
    setSuccess("");
    uploadFilesMutation.mutate({ selectedFiles, category: "rules" });
    event.target.value = "";
  };

  // Replace Triggers
  const handleReplaceKnowledge = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !replaceKnowledgeTarget) return;

    setError("");
    setSuccess("");
    replaceFileMutation.mutate({ selectedFile, targetFile: replaceKnowledgeTarget });
    event.target.value = "";
  };

  const handleReplaceRules = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !replaceRulesTarget) return;

    setError("");
    setSuccess("");
    replaceFileMutation.mutate({ selectedFile, targetFile: replaceRulesTarget });
    event.target.value = "";
  };

  const handleDelete = (file) => {
    const categoryLabel = file.fileCategory === "rules" ? "Rules Document" : "Knowledge Document";
    if (!window.confirm(`Remove '${file.fileName}' from this bot's ${categoryLabel}s?`)) return;

    setError("");
    setSuccess("");
    deleteFileMutation.mutate(file._id);
  };

  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
      
      {/* HIDDEN DEDICATED FILE INPUTS FOR KNOWLEDGE AND RULES */}
      <input
        type="file"
        ref={knowledgeFileInputRef}
        onChange={handleUploadKnowledge}
        multiple
        accept=".pdf,.txt,.docx,.md,.json"
        className="hidden"
      />
      <input
        type="file"
        ref={rulesFileInputRef}
        onChange={handleUploadRules}
        multiple
        accept=".pdf,.txt,.docx,.md,.json"
        className="hidden"
      />
      <input
        type="file"
        ref={replaceKnowledgeInputRef}
        onChange={handleReplaceKnowledge}
        accept=".pdf,.txt,.docx,.md,.json"
        className="hidden"
      />
      <input
        type="file"
        ref={replaceRulesInputRef}
        onChange={handleReplaceRules}
        accept=".pdf,.txt,.docx,.md,.json"
        className="hidden"
      />

      {/* PROMINENT SUB-TAB SELECTOR (KNOWLEDGE BASE vs SYSTEM RULES) */}
      <div className={`grid grid-cols-2 p-1.5 rounded-2xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
        <button
          onClick={() => {
            setActiveSubTab("knowledge");
            setError("");
            setSuccess("");
          }}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "knowledge"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.01]"
              : isDark
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-white"
          }`}
        >
          <FiBookOpen className="text-base" />
          <span>Knowledge Documents</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeSubTab === "knowledge" ? "bg-white/20 text-white" : isDark ? "bg-slate-800 text-indigo-400" : "bg-indigo-100 text-indigo-700"
          }`}>
            {knowledgeFiles.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("rules");
            setError("");
            setSuccess("");
          }}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "rules"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 scale-[1.01]"
              : isDark
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-white"
          }`}
        >
          <FiShield className="text-base" />
          <span>Rules Documents</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeSubTab === "rules" ? "bg-white/20 text-white" : isDark ? "bg-slate-800 text-amber-400" : "bg-amber-100 text-amber-700"
          }`}>
            {rulesFiles.length}
          </span>
          {rulesCount > 0 && (
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] rounded-full bg-amber-400/20 text-amber-300 font-extrabold border border-amber-400/30">
              {rulesCount} Rules
            </span>
          )}
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 animate-in fade-in">
          <FiAlertCircle className="shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <FiCheckCircle className="shrink-0 text-base" />
          <span>{success}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 1: KNOWLEDGE BASE DOCUMENTS */}
      {/* ===================================================================== */}
      {activeSubTab === "knowledge" && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/40">
            <div>
              <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
                <FiBookOpen className="text-indigo-500" />
                <span>RAG Knowledge Documents</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Upload knowledge files (PDF, TXT, DOCX, MD) with <code className="text-indigo-400 font-mono">fileCategory="knowledge"</code> to build dedicated vector embeddings.
              </p>
            </div>

            <button
              onClick={() => knowledgeFileInputRef.current?.click()}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              {saving ? <FiRefreshCw className="animate-spin text-xs" /> : <FiUpload className="text-xs" />}
              <span>{saving ? "Uploading..." : "Upload Knowledge Document"}</span>
            </button>
          </div>

          {/* Files List */}
          {loading ? (
            <div className={`flex items-center justify-center h-48 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <FiRefreshCw className="animate-spin text-lg text-indigo-500 mr-2" />
              <span>Loading Knowledge Base Files...</span>
            </div>
          ) : knowledgeFiles.length === 0 ? (
            <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${isDark ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
              <FiBookOpen className="text-4xl text-indigo-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold mb-1">No Knowledge Base Files Attached</h4>
              <p className={`text-[11px] max-w-xs mx-auto mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Upload PDF documents or text files to train this bot's knowledge base.
              </p>
              <button
                onClick={() => knowledgeFileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Upload First Knowledge File
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {knowledgeFiles.map((file) => (
                <div
                  key={file._id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0 text-sm">
                      <FiFileText />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold truncate">{file.fileName}</h4>
                      <div className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <span className="uppercase font-bold text-indigo-400">{file.fileType || "doc"}</span>
                        <span>•</span>
                        <span className="capitalize text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded">knowledge</span>
                        <span>•</span>
                        <span>{(file.fileSize ? file.fileSize / 1024 : 0).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setReplaceKnowledgeTarget(file);
                        replaceKnowledgeInputRef.current?.click();
                      }}
                      disabled={saving}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                      }`}
                      title="Replace Knowledge File"
                    >
                      <FiRefreshCw />
                    </button>

                    <button
                      onClick={() => handleDelete(file)}
                      disabled={saving}
                      className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition"
                      title="Remove Knowledge File"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: RULES DOCUMENTS & RULES CONFIGURATION */}
      {/* ===================================================================== */}
      {activeSubTab === "rules" && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/40">
            <div>
              <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
                <FiShield className="text-amber-500" />
                <span>Bot Behavior Rules Documents</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Upload support rules & constraint files (TXT, PDF, MD) with <code className="text-amber-400 font-mono">fileCategory="rules"</code> to enforce system behavior.
              </p>
            </div>

            <button
              onClick={() => rulesFileInputRef.current?.click()}
              disabled={saving}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              {saving ? <FiRefreshCw className="animate-spin text-xs" /> : <FiUpload className="text-xs" />}
              <span>{saving ? "Uploading..." : "Upload Rules Document"}</span>
            </button>
          </div>

          {/* RULES CONFIG SUMMARY OVERVIEW BANNER */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? "bg-amber-950/20 border-amber-500/30 text-amber-200" : "bg-amber-50/70 border-amber-200 text-amber-900"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                <FiShield className="text-amber-400 text-base" />
                <span>Parsed Rules Configuration (bot.rulesConfig)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  Total Active Rules: {rulesCount}
                </span>
              </div>
            </div>

            {/* Rules Source Files */}
            {sourceFiles.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="font-semibold text-amber-400 flex items-center gap-1">
                  <FiPaperclip /> Source Files:
                </span>
                {sourceFiles.map((sf, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] border ${
                      isDark ? "bg-slate-900 border-amber-500/40 text-slate-300" : "bg-white border-amber-300 text-slate-700"
                    }`}
                  >
                    📄 {sf}
                  </span>
                ))}
              </div>
            )}

            {/* Extracted Rules Checklist */}
            {rulesList.length > 0 ? (
              <div className={`mt-2 p-3.5 rounded-xl border space-y-2 max-h-56 overflow-y-auto custom-scrollbar ${
                isDark ? "bg-slate-950/90 border-amber-500/30" : "bg-white border-amber-200 shadow-sm"
              }`}>
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                  <FiList />
                  <span>Rules List ({rulesList.length}):</span>
                </div>
                {rulesList.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs p-1.5 rounded-lg hover:bg-amber-500/10 transition">
                    <FiCheckSquare className="text-amber-400 text-sm shrink-0 mt-0.5" />
                    <span className={`leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>{rule}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-amber-400/80">
                No active system rules extracted. Upload a rules file (e.g. support_rules.txt) with <code className="font-mono">fileCategory="rules"</code> to calculate rulesConfig.
              </p>
            )}
          </div>

          {/* Rules Files List */}
          {loading ? (
            <div className={`flex items-center justify-center h-48 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <FiRefreshCw className="animate-spin text-lg text-amber-500 mr-2" />
              <span>Loading Rules Files...</span>
            </div>
          ) : rulesFiles.length === 0 ? (
            <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${isDark ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
              <FiShield className="text-4xl text-amber-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold mb-1">No Rules Files Attached</h4>
              <p className={`text-[11px] max-w-xs mx-auto mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Upload support rules text/PDF files with <code className="font-mono">fileCategory="rules"</code> to enforce mandatory bot constraints.
              </p>
              <button
                onClick={() => rulesFileInputRef.current?.click()}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Upload First Rules File
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rulesFiles.map((file) => (
                <div
                  key={file._id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0 text-sm">
                      <FiShield />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold truncate">{file.fileName}</h4>
                      <div className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <span className="uppercase font-bold text-amber-400">{file.fileType || "doc"}</span>
                        <span>•</span>
                        <span className="capitalize text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded font-bold">rules</span>
                        <span>•</span>
                        <span>{(file.fileSize ? file.fileSize / 1024 : 0).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setReplaceRulesTarget(file);
                        replaceRulesInputRef.current?.click();
                      }}
                      disabled={saving}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                      }`}
                      title="Replace Rules File"
                    >
                      <FiRefreshCw />
                    </button>

                    <button
                      onClick={() => handleDelete(file)}
                      disabled={saving}
                      className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition"
                      title="Remove Rules File"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BotKnowledgeTab;
