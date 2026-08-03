import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiUpload,
  FiRefreshCw,
  FiTrash2,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [replaceTarget, setReplaceTarget] = useState(null);
  const fileInputRef = useRef(null);
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  const targetBotId = botId || bot?._id;

  // 1. GET Route: Fetch Bot Knowledge Files
  const {
    data: files = [],
    isLoading: loading,
    refetch: fetchFiles
  } = useTanStackData(
    ["bot-files", targetBotId],
    async () => {
      if (!targetBotId) return [];
      const res = await NobackEndCall(`/bots/${targetBotId}/files`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    { enabled: !!targetBotId }
  );

  // Upload Files Mutation
  const uploadFilesMutation = useTanStackMutation({
    mutationFn: async (selectedFiles) => {
      for (const file of selectedFiles) {
        const payload = await readFileAsPayload(file);
        await NobackEndCallObj(`/bots/${targetBotId}/upload`, payload, "post");
      }
      return selectedFiles.length;
    },
    onSuccess: (count) => {
      setSuccess(`${count} knowledge file${count > 1 ? "s" : ""} added successfully.`);
      queryClient.invalidateQueries({ queryKey: ["bot-files", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to upload knowledge file.");
    }
  });

  // Replace File Mutation
  const replaceFileMutation = useTanStackMutation({
    mutationFn: async ({ selectedFile, targetFile }) => {
      const payload = await readFileAsPayload(selectedFile);
      return await NobackEndCallObj(`/bots/${targetBotId}/files/${targetFile._id}`, payload, "put");
    },
    onSuccess: () => {
      setSuccess("Knowledge file replaced successfully.");
      setReplaceTarget(null);
      queryClient.invalidateQueries({ queryKey: ["bot-files", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to replace knowledge file.");
      setReplaceTarget(null);
    }
  });

  // Delete File Mutation
  const deleteFileMutation = useTanStackMutation({
    mutationFn: async (fileId) => {
      return await backEndCallObjDel(`/bots/${targetBotId}/files`, fileId);
    },
    onSuccess: () => {
      setSuccess("Knowledge file removed.");
      queryClient.invalidateQueries({ queryKey: ["bot-files", targetBotId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to remove knowledge file.");
    }
  });

  const saving = uploadFilesMutation.isPending || replaceFileMutation.isPending || deleteFileMutation.isPending;

  const readFileAsPayload = async (file) => {
    const ext = (file.name.split(".").pop() || "txt").toLowerCase();
    const isTextFile = ["txt", "md"].includes(ext);

    if (isTextFile) {
      const text = await file.text();
      return {
        fileName: file.name,
        fileType: ext,
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
      fileSize: file.size,
      fileContentBase64: base64,
    };
  };

  const handleUpload = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setError("");
    setSuccess("");
    uploadFilesMutation.mutate(selectedFiles);
    event.target.value = "";
  };

  const triggerReplace = (file) => {
    setReplaceTarget(file);
    fileInputRef.current?.click();
  };

  const handleReplace = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !replaceTarget) return;

    setError("");
    setSuccess("");
    replaceFileMutation.mutate({ selectedFile, targetFile: replaceTarget });
    event.target.value = "";
  };

  const handleDelete = (file) => {
    if (!window.confirm(`Remove '${file.fileName}' from this bot's knowledge base?`)) return;

    setError("");
    setSuccess("");
    deleteFileMutation.mutate(file._id);
  };

  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/40">
        <div>
          <h3 className="text-base font-bold tracking-tight">RAG Knowledge Documents</h3>
          <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Upload knowledge files (PDF, TXT, DOCX, MD) to train this isolated AI Agent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={replaceTarget ? handleReplace : handleUpload}
            multiple={!replaceTarget}
            accept=".pdf,.txt,.docx,.md"
            className="hidden"
          />

          <button
            onClick={() => {
              setReplaceTarget(null);
              fileInputRef.current?.click();
            }}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition"
          >
            {saving ? <FiRefreshCw className="animate-spin text-xs" /> : <FiUpload className="text-xs" />}
            <span>{saving ? "Processing..." : "Upload Document"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <FiAlertCircle className="shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <FiCheckCircle className="shrink-0 text-base" />
          <span>{success}</span>
        </div>
      )}

      {/* Content View */}
      {loading ? (
        <div className={`flex items-center justify-center h-48 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          <FiRefreshCw className="animate-spin text-lg text-indigo-500 mr-2" />
          <span>Loading Knowledge Base Files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className={`text-center py-12 border-2 border-dashed rounded-xl ${isDark ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
          <FiFileText className="text-3xl text-indigo-400 mx-auto mb-2" />
          <h4 className="text-xs font-bold mb-1">No Knowledge Files Attached</h4>
          <p className={`text-[11px] max-w-xs mx-auto mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Upload PDF documents or text files to build dedicated vector embeddings for this bot.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((file) => (
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
                    <span>{(file.fileSize ? file.fileSize / 1024 : 0).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => triggerReplace(file)}
                  disabled={saving}
                  className={`p-1.5 rounded-lg text-xs transition ${
                    isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                  }`}
                  title="Replace File"
                >
                  <FiRefreshCw />
                </button>

                <button
                  onClick={() => handleDelete(file)}
                  disabled={saving}
                  className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition"
                  title="Remove File"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BotKnowledgeTab;
