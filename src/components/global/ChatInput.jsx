import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { VoiceRecorder } from "../../utils/voiceRecorder";
import { FiDatabase, FiStar, FiZap, FiFileText, FiImage, FiX, FiPaperclip, FiGlobe } from "react-icons/fi";

const ChatInput = ({ onSend, isGenerating, onStop }) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const voiceRecorderRef = useRef(new VoiceRecorder());
  const { isDark } = useTheme();

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState({
    displayName: "Glm 5.3 Flash Cloud",
    modelId: "glm-5.3-flash:cloud",
    provider: "glm",
  });
  const [modelsList, setModelsList] = useState([]);
  const [activeTab, setActiveTab] = useState("All Servers");
  const [userCredits, setUserCredits] = useState(0);
  const modelMenuRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const isSubmittingRef = useRef(false);

  /**
   * Determines if the currently selected model supports image/vision input.
   * Based on known provider/model patterns — no backend change needed.
   */
  const isVisionModel = (m) => {
    if (!m) return false;
    const id = (m.modelId || "").toLowerCase();
    const provider = (m.provider || m.serverFormat || "").toLowerCase();

    // All Gemini models support vision
    if (provider === "gemini" || id.includes("gemini")) return true;
    // OpenAI GPT-4 vision models
    if (id.includes("gpt-4") || id.includes("gpt-4o") || id.includes("o1") || id.includes("o3")) return true;
    // Anthropic Claude (all versions support vision)
    if (provider === "anthropic" || provider === "claude" || id.includes("claude")) return true;
    // GLM-4V and GLM-5 vision models
    if (id.includes("glm-4v") || id.includes("glm-5") || id.includes("glm5")) return true;
    // Ollama vision models: LLaVA, BakLLaVA, moondream, cogvlm, minicpm-v, qwen2-vl
    if (id.includes("llava") || id.includes("bakllava") || id.includes("moondream") ||
        id.includes("cogvlm") || id.includes("minicpm-v") || id.includes("qwen2-vl") ||
        id.includes("qwen2.5-vl") || id.includes("vision") || id.includes("vl")) return true;
    // CodeGene cloud vision models
    if (id.includes("glm-5.3-flash") || id.includes("gemma4")) return true;
    // "auto" cluster — we allow it (backend will pick a vision node)
    if (id === "auto" || id === "best") return true;

    return false;
  };

  const [visionWarning, setVisionWarning] = useState("");
  const visionWarningTimerRef = useRef(null);

  const showVisionWarning = (msg) => {
    setVisionWarning(msg);
    clearTimeout(visionWarningTimerRef.current);
    visionWarningTimerRef.current = setTimeout(() => setVisionWarning(""), 4000);
  };

  const compressImage = (dataUrl, maxDimension = 1280, quality = 0.8) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64Data = compressedDataUrl.split(",")[1] || "";
        const estimatedSize = Math.round((base64Data.length * 3) / 4);
        resolve({ compressedDataUrl, base64Data, estimatedSize });
      };
      img.onerror = () => {
        const base64Data = dataUrl.split(",")[1] || "";
        resolve({ compressedDataUrl: dataUrl, base64Data, estimatedSize: dataUrl.length });
      };
      img.src = dataUrl;
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check if any selected file is an image and the current model doesn't support vision
    const hasImage = files.some((f) => f.type.startsWith("image/"));
    if (hasImage && !isVisionModel(selectedModel)) {
      showVisionWarning(
        `"${selectedModel.displayName || selectedModel.modelId}" doesn't support image uploads. Switch to a vision-capable model like Gemini, GPT-4o, or LLaVA.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    files.forEach((file) => {
      if (file.size > 15 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 15MB limit.`);
        return;
      }


      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target.result;
        const isImg = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
        const fileType = isImg ? "image" : isPdf ? "pdf" : "txt";

        let finalDataUrl = rawDataUrl;
        let base64Data = rawDataUrl.split(",")[1] || "";
        let finalSize = file.size;
        let finalMime = file.type || (isImg ? "image/png" : isPdf ? "application/pdf" : "text/plain");

        if (isImg) {
          try {
            const compressed = await compressImage(rawDataUrl, 1280, 0.8);
            finalDataUrl = compressed.compressedDataUrl;
            base64Data = compressed.base64Data;
            finalSize = compressed.estimatedSize;
            finalMime = "image/jpeg";
          } catch (err) {
            console.warn("Image compression fallback:", err);
          }
        }

        const newAtt = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          fileType,
          mimeType: finalMime,
          data: base64Data,
          size: finalSize,
          previewUrl: isImg ? finalDataUrl : null,
        };

        setAttachments((prev) => [...prev, newAtt]);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  useEffect(() => {
    if (!isGenerating) {
      inputRef.current?.focus();
    }
  }, [isGenerating]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 120)}px`;
    }
  }, [text]);

  useEffect(() => {
    if (isModelMenuOpen) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.credits !== undefined) setUserCredits(u.credits);
        } catch (e) {}
      }
    }
  }, [isModelMenuOpen]);

  const getProvider = (m) => {
    let p = m.provider || m.serverFormat || "";
    p = p.toLowerCase().trim();
    if (!p || p === "system") {
      const mid = (m.modelId || "").toLowerCase();
      if (mid.includes("gemini")) return "gemini";
      if (mid.includes("gpt")) return "openai";
      if (mid.includes("llama")) return "ollama";
      if (mid.includes("glm")) return "glm";
      if (p) return p;
      return "other";
    }
    return p;
  };

  const providers = [
    "All Servers",
    ...new Set(modelsList.map((m) => getProvider(m)).filter(Boolean)),
  ];
  const filteredModels =
    activeTab === "All Servers"
      ? modelsList.filter((m) => m.enabled && m.modelId !== "auto")
      : modelsList.filter(
          (m) =>
            m.enabled && getProvider(m) === activeTab && m.modelId !== "auto",
        );

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/models/available`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();

        if (data.success && data.models) {
          const allProviders = data.models.map((m) => m.provider);
          const uniqueProviders = [...new Set(allProviders)];
          console.log("📦 All Providers from Data:", allProviders);
          console.log("✨ Unique Providers:", uniqueProviders);

          setModelsList(data.models);
          const defaultGlm =
            data.models.find(
              (m) =>
                m.enabled &&
                (m.modelId === "glm-5.3-flash:cloud" ||
                  m.displayName === "Glm 5.3 Flash Cloud" ||
                  (m.modelId && m.modelId.toLowerCase().includes("glm-5.3-flash")) ||
                  (m.displayName && m.displayName.toLowerCase().includes("glm 5.3 flash")))
            ) ||
            data.models.find((m) => m.recommended && m.enabled) ||
            data.models.find((m) => m.enabled);
          if (defaultGlm) setSelectedModel(defaultGlm);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target)
      ) {
        setIsModelMenuOpen(false);
      }
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target)
      ) {
        setIsAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize Speech Recognition on component mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "en-US";
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript && transcript.trim()) {
          setText(transcript);
        }
      };

      rec.onerror = (event) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition warning:", event.error);
        }
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleVoiceClick = async () => {
    try {
      if (isListening) {
        setIsListening(false);
        if (recognition) {
          try {
            recognition.stop();
          } catch (e) {}
        }
        const audioBlob = await voiceRecorderRef.current
          .stopRecording()
          .catch(() => null);
        if (audioBlob && onSend) {
          onSend(text, audioBlob, selectedModel.modelId, attachments);
          setText("");
          setAttachments([]);
        }
      } else {
        await voiceRecorderRef.current.startRecording().catch((err) => {
          console.warn("MediaRecorder start notice:", err.message);
        });
        if (recognition) {
          try {
            recognition.abort();
            setTimeout(() => recognition.start(), 50);
          } catch (e) {}
        }
        setIsListening(true);
      }
    } catch (err) {
      console.warn("Voice toggle error:", err);
      setIsListening(false);
    }
  };

  const hasText = Boolean(text && text.trim());
  const canSubmit = hasText && !isGenerating;

  const handleSend = () => {
    if (isSubmittingRef.current || isGenerating) return;
    // Only image cannot be uploaded without text prompt (ChatGPT behavior)
    if (!canSubmit) return;

    isSubmittingRef.current = true;
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 600);

    onSend(text.trim(), null, selectedModel?.modelId || "auto", attachments);
    setText("");
    setAttachments([]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return (
    <div className="w-full bg-transparent">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.txt,text/plain,.md,.json,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Vision model warning toast */}
      {visionWarning && (
        <div
          className="w-full mb-2 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl
            bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/40
            text-orange-700 dark:text-orange-300 text-[12.5px] leading-snug
            animate-[slideInUp_0.22s_ease-out]"
          style={{ animation: "slideInUp 0.22s ease-out" }}
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-orange-500 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>{visionWarning}</span>
          <button
            type="button"
            onClick={() => setVisionWarning("")}
            className="ml-auto shrink-0 text-orange-400 hover:text-orange-600 dark:hover:text-orange-200 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) handleSend();
        }}
        className={`
        w-full relative flex flex-col p-2.5 md:p-3
        bg-white dark:bg-[#191A24] border border-border-primary dark:border-white/5
        rounded-xl shadow-lg focus-within:border-border-focus dark:focus-within:border-white/10
        transition-all duration-300
      `}
      >
        {/* ChatGPT Style Attachment Preview Bar */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pt-1 pb-2.5 mb-2 border-b border-border-primary/40 dark:border-white/5">
            {attachments.map((att) => (
              <div key={att.id} className="relative group shrink-0">
                {att.fileType === "image" && att.previewUrl ? (
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm bg-surface-secondary dark:bg-[#202230]">
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-full h-full object-cover rounded-2xl transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </div>
                ) : (
                  <div className="h-14 px-3 py-2 rounded-2xl bg-surface-secondary dark:bg-[#202230] border border-border-primary/60 dark:border-white/10 flex items-center gap-2.5 shadow-sm min-w-[140px] max-w-[200px]">
                    {att.fileType === "pdf" ? (
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 dark:bg-rose-500/25 text-rose-500 flex flex-col items-center justify-center shrink-0">
                        <FiFileText className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 dark:bg-blue-500/25 text-blue-500 flex flex-col items-center justify-center shrink-0">
                        <FiFileText className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[12px] font-semibold truncate text-text-primary dark:text-white leading-tight">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-[#8a8a93] uppercase tracking-wider font-mono">
                        {att.fileType} • {formatFileSize(att.size)}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 flex items-center justify-center shadow-md hover:bg-rose-600 dark:hover:bg-rose-600 dark:hover:text-white transition-all cursor-pointer z-10"
                  title="Remove attachment"
                >
                  <FiX className="text-[11px]" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          rows={2}
          value={text}
          placeholder={
            isListening
              ? "Listening..."
              : attachments.length > 0
              ? "Add a prompt for your attachment..."
              : "Ask Codegene to build, explain, or explore..."
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) handleSend();
            }
          }}
          className={`
            outline-none transition-all placeholder:text-text-muted
            w-full py-1 px-2.5 text-sm md:text-[14px] bg-transparent border-0 text-text-primary dark:text-white mb-1.5
            resize-none min-h-[48px] max-h-[120px] overflow-y-auto custom-scrollbar leading-[22px]
          `}
        />

        <div className="flex items-center justify-between w-full mt-1">
          <div className="flex items-center gap-1.5 md:pl-1">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                className="group flex items-center cursor-pointer"
                title="Attach Files (Max 10MB)"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-[10px] border border-border-primary dark:border-white/5 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-200 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-text-muted dark:text-[#8A8A93] group-hover:text-text-primary dark:group-hover:text-white transition-colors duration-200"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                    />
                  </svg>
                </div>
              </button>

              {/* ChatGPT Style Attach Popover Menu */}
              {isAttachMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface-dropdown dark:bg-[#191A24] border border-border-primary dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 transition-all origin-bottom-left">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isVisionModel(selectedModel)) {
                        showVisionWarning(
                          `"${selectedModel.displayName || selectedModel.modelId}" doesn't support image uploads. Switch to Gemini, GPT-4o, LLaVA, or another vision model.`
                        );
                        setIsAttachMenuOpen(false);
                        return;
                      }
                      setIsAttachMenuOpen(false);
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "image/*";
                        fileInputRef.current.click();
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left group ${
                      isVisionModel(selectedModel)
                        ? "hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform ${
                      isVisionModel(selectedModel)
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500"
                    }`}>
                      <FiImage className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold text-text-primary dark:text-white leading-tight flex items-center gap-1.5">
                        Upload Image
                        {!isVisionModel(selectedModel) && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                            Not Supported
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-[#8a8a93]">
                        {isVisionModel(selectedModel)
                          ? "PNG, JPG, WebP, GIF"
                          : "Switch to a vision model to upload images"}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false);
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "application/pdf,.pdf,.txt,text/plain,.md,.json,.csv";
                        fileInputRef.current.click();
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform">
                      <FiFileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold text-text-primary dark:text-white leading-tight">
                        Upload Document
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-[#8a8a93]">
                        PDF, TXT, Markdown, CSV
                      </span>
                    </div>
                  </button>

                  <div className="mt-1 pt-2 border-t border-border-primary/40 dark:border-white/5 px-2.5 pb-1 flex items-center justify-between text-[10px] text-text-muted dark:text-[#8a8a93]">
                    <span>Max size per file</span>
                    <span className="font-semibold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-text-primary dark:text-white font-mono">
                      10 MB
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsWebSearchActive(!isWebSearchActive)}
              className={`flex items-center justify-center w-8 h-8 rounded-[10px] border transition-all duration-200 shadow-sm cursor-pointer ${
                isWebSearchActive
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-primary dark:border-white/5 text-text-muted dark:text-[#8A8A93] hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white"
              }`}
              title={isWebSearchActive ? "Web Search: Enabled" : "Search the web"}
            >
              <FiGlobe className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Model Selector */}
            <div className="relative" ref={modelMenuRef}>
              <button
                type="button"
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="text-text-muted dark:text-[#8A8A93] hover:text-text-primary dark:hover:text-white transition flex items-center gap-1 md:gap-1.5 text-[12px] font-medium px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0 outline-none focus:outline-none focus:ring-0 border-0"
              >
                <span className="truncate max-w-[100px] sm:max-w-[160px] md:max-w-[220px] text-left">
                  {selectedModel.displayName}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-3 h-3 ml-0.5 shrink-0 transition-transform duration-200 ${isModelMenuOpen ? "rotate-180" : ""}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div 
                className={`absolute bottom-full right-0 mb-2 w-64 bg-surface-dropdown dark:bg-[#191A24] border border-border-primary dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 origin-bottom-right ${isModelMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
              >
                <div className="p-1.5 flex flex-col gap-0.5 max-h-[260px] overflow-y-auto custom-scrollbar">
                  {filteredModels.map((model, index) => (
                    <button
                      key={`${model.modelId}-${model.serverId || index}`}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model);
                        setIsModelMenuOpen(false);
                      }}
                      className={`text-left px-3 py-2 text-[12px] md:text-[13px] font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        selectedModel.modelId === model.modelId 
                          ? "bg-accent-primary/10 text-text-primary dark:text-[#e5e5e5]" 
                          : "text-text-muted dark:text-[#8A8A93] hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-[#e5e5e5]"
                      }`}
                    >
                      <span className="truncate flex-1">{model.displayName || model.modelId}</span>
                      {selectedModel.modelId === model.modelId && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent-primary shrink-0">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                  {filteredModels.length === 0 && (
                    <div className="text-center py-4 text-text-muted dark:text-[#888] text-xs">
                      No models found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Microphone Button */}
            <button
              onClick={handleVoiceClick}
              type="button"
              disabled={isGenerating}
              className={`
                transition-colors duration-200 cursor-pointer flex items-center justify-center
                w-8 h-8 rounded-lg
                ${
                  isListening
                    ? "bg-accent-primary text-white animate-pulse"
                    : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white"
                }
              `}
              title={isListening ? "Stop Recording" : "Record Voice"}
            >
              {isListening ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
                  />
                </svg>
              )}
            </button>

            {/* Send / Stop Button */}
            {isGenerating ? (
              <button
                onClick={onStop}
                type="button"
                className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center transition cursor-pointer active:scale-95 text-white shadow-sm"
                title="Stop Generating"
              >
                <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit}
                className={`
                  shrink-0 font-medium transition-all duration-200 flex items-center justify-center
                  w-8 h-8 rounded-lg
                  ${
                    canSubmit
                      ? "bg-accent-primary text-white hover:opacity-95 active:scale-95 cursor-pointer shadow-md"
                      : "bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed opacity-60"
                  }
                `}
                title={
                  canSubmit
                    ? "Send Message"
                    : attachments.length > 0
                    ? "Enter a prompt for your attachment to send"
                    : "Enter a prompt to send"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
