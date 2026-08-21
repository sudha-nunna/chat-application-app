import { useState } from "react";
import { FiX, FiEdit2, FiSave, FiAlertCircle } from "react-icons/fi";
import { backEndCallObjPut } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import { useTanStackMutation, useTanStackQueryClient } from "../../hooks/useTanStackData";

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", badge: "Recommended" },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", badge: "Flagship" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", badge: "Fast" },
  { id: "claude-3.5-sonnet", name: "Claude", provider: "Anthropic", badge: "Reasoning" },
  { id: "gemini-1.5-pro", name: "Gemini", provider: "Google", badge: "Long Context" },
  { id: "qwen-2.5", name: "Qwen", provider: "Alibaba AI", badge: "Open Source" },
  { id: "custom-model", name: "Custom Model", provider: "Enterprise", badge: "Self-Hosted" }
];

const EditBotModal = ({ bot, onClose, onBotUpdated }) => {
  const [name, setName] = useState(bot?.name || "");
  const [selectedModel, setSelectedModel] = useState(bot?.model || "gpt-4o");
  const [error, setError] = useState("");

  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  const updateBotMutation = useTanStackMutation({
    mutationFn: async (payload) => {
      return await backEndCallObjPut(`/bots/${bot._id}`, payload);
    },
    onSuccess: (updatedBot) => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      queryClient.invalidateQueries({ queryKey: ["bot", bot._id] });
      if (onBotUpdated) onBotUpdated(updatedBot);
      onClose();
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to update bot name and model.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !name.trim()) {
      setError("Bot name is required.");
      return;
    }
    setError("");
    updateBotMutation.mutate({
      name: name.trim(),
      model: selectedModel
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${"bg-surface-secondary border-border-primary text-text-primary dark:bg-[#0A0A0A] dark:border-border-primary dark:text-text-primary"
          }`}
      >
        {/* Modal Header */}
        <div className={`p-4 md:p-5 border-b flex items-center justify-between ${"border-border-primary bg-white dark:border-border-primary dark:bg-[#121212]"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-interactive-base/10 border border-border-primary/30 flex items-center justify-center text-text-primary font-bold">
              <FiEdit2 />
            </div>
            <div>
              <h2 className="text-base font-bold">Edit Bot Name & Model</h2>
              <p className={`text-xs ${"text-text-primary dark:text-text-primary"}`}>
                Change the bot display name and AI model.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${"text-text-primary hover:text-text-primary hover:bg-surface-secondary dark:text-text-primary dark:hover:text-white dark:hover:bg-interactive-active"}`}
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-primary">
              <FiAlertCircle className="shrink-0 text-sm" />
              <span>{error}</span>
            </div>
          )}

          {/* Bot Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Bot Name <span className="text-text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Codegene Assistant"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition focus:ring-2 focus:ring-border-focus ${"bg-white border-border-primary text-text-primary dark:bg-[#121212] dark:border-border-primary dark:text-text-primary"
                }`}
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">Primary LLM Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition focus:ring-2 focus:ring-border-focus ${"bg-white border-border-primary text-text-primary dark:bg-[#121212] dark:border-border-primary dark:text-text-primary"
                }`}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider}) - {m.badge}
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border-primary/40">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${"border-border-primary hover:bg-white text-text-primary dark:border-border-primary dark:hover:bg-interactive-active dark:text-text-muted"
                }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateBotMutation.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-interactive-base to-interactive-hover hover:from-interactive-base hover:to-interactive-hover text-text-primary dark:text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-lg shadow-black/10/20 transition disabled:opacity-50"
            >
              <FiSave className="text-sm" />
              <span>{updateBotMutation.isPending ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBotModal;
