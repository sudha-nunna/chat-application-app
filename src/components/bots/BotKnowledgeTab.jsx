import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiUpload,
  FiRefreshCw,
  FiTrash2,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle
} from "react-icons/fi";
import api from "../../services/api";

const BotKnowledgeTab = ({ bot }) => {
  const { botId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [replaceTarget, setReplaceTarget] = useState(null);
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const res = await api.get(`/bots/${botId}/files`);
      setFiles(res.data || []);
    } catch (err) {
      console.error("Failed to load knowledge files:", err);
      setError("Unable to fetch knowledge files right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [botId]);

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

  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      for (const file of selectedFiles) {
        const payload = await readFileAsPayload(file);
        await api.post(`/bots/${botId}/upload`, payload);
      }

      setSuccess(`${selectedFiles.length} knowledge file${selectedFiles.length > 1 ? "s" : ""} added successfully.`);
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to upload knowledge file.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const triggerReplace = (file) => {
    setReplaceTarget(file);
    fileInputRef.current?.click();
  };

  const handleReplace = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !replaceTarget) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = await readFileAsPayload(selectedFile);
      await api.put(`/bots/${botId}/files/${replaceTarget._id}`, payload);
      setSuccess(`Knowledge file replaced successfully.`);
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to replace knowledge file.");
    } finally {
      setSaving(false);
      setReplaceTarget(null);
      event.target.value = "";
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Remove '${file.fileName}' from this bot's knowledge base?`)) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/bots/${botId}/files/${file._id}`);
      setSuccess("Knowledge file removed.");
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to delete knowledge file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleReplace} />

      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Knowledge Base</h3>
              <p className="text-xs text-slate-400 mt-1">
                Add documents to teach this bot. You can also replace or remove files later without changing the chat experience.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-600/20">
              <FiUpload />
              <span>{saving ? "Uploading..." : "Add Document"}</span>
              <input type="file" multiple accept=".pdf,.txt,.docx,.md" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <FiCheckCircle />
            <span>{success}</span>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Current Documents ({files.length})
            </h4>
            <span className="text-[11px] text-slate-400">{bot?.name || "Bot"} can answer from these files.</span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              Loading documents...
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              No documents yet. Add a file to give this bot knowledge.
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file._id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-blue-600/10 p-2 text-blue-400">
                      <FiFileText />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{file.fileName}</p>
                      <p className="text-[11px] text-slate-500">
                        {file.fileType?.toUpperCase()} • {file.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : "Ready"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerReplace(file)}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      <FiRefreshCw /> Replace
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="rounded-lg border border-rose-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/10"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotKnowledgeTab;
