import { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";
import { VoiceRecorder } from "../../utils/voiceRecorder";
import {
  FiDatabase,
  FiStar,
  FiZap,
  FiFileText,
  FiImage,
  FiX,
  FiPaperclip,
  FiGlobe,
  FiCode,
  FiSearch,
  FiCheck,
  FiCpu,
  FiServer
} from "react-icons/fi";

const DEFAULT_AUTO_MODEL = {
  displayName: "Auto",
  modelId: "auto",
  provider: "auto",
  serverName: "Auto",
  isCluster: true,
  isAuto: true,
};

const ChatInput = ({
  onSend,
  isGenerating,
  onStop,
  autoListenTrigger,
  isWebSearchActive: controlledWebSearchActive,
  setIsWebSearchActive: setControlledWebSearchActive,
  isDevModeActive: controlledDevModeActive,
  setIsDevModeActive: setControlledDevModeActive,
}) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [internalWebSearchActive, setInternalWebSearchActive] = useState(false);
  const isWebSearchActive = controlledWebSearchActive !== undefined ? controlledWebSearchActive : internalWebSearchActive;
  const setIsWebSearchActive = setControlledWebSearchActive || setInternalWebSearchActive;

  const [internalDevModeActive, setInternalDevModeActive] = useState(false);
  const isDevModeActive = controlledDevModeActive !== undefined ? controlledDevModeActive : internalDevModeActive;
  const setIsDevModeActive = setControlledDevModeActive || setInternalDevModeActive;
  const [recognition, setRecognition] = useState(null);
  const voiceRecorderRef = useRef(new VoiceRecorder());
  const { isDark } = useTheme();

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTO_MODEL);
  const isUserSelectedModelRef = useRef(false);
  const [modelsList, setModelsList] = useState([]);
  const [activeTab, setActiveTab] = useState("cluster");
  const [modelSearchQuery, setModelSearchQuery] = useState("");
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

  const [serversList, setServersList] = useState([]);

  const getServerIcon = (format = "", name = "") => {
    const f = (format || "").toLowerCase();
    const n = (name || "").toLowerCase();
    if (f === "ollama" || n.includes("ollama")) return "🦙";
    if (f === "gemini" || n.includes("gemini")) return "✨";
    if (f === "glm" || n.includes("glm") || n.includes("zhipu")) return "🌐";
    if (f === "openai" || n.includes("openai") || n.includes("gpt")) return "🟢";
    if (f === "anthropic" || n.includes("claude")) return "🟣";
    if (f === "groq" || n.includes("groq")) return "⚡";
    return "🖥️";
  };

  const availableTabs = useMemo(() => {
    const realModels = modelsList.filter((m) => !m.isCluster && m.modelId !== "auto");
    const tabs = [
      { key: "cluster", label: "Auto", icon: "⚡", isCluster: true, count: realModels.length }
    ];

    let activeServers = [];
    if (serversList && serversList.length > 0) {
      activeServers = serversList;
    } else {
      // Dynamic fallback: derive active servers directly from the returned models list
      const map = new Map();
      realModels.forEach((m) => {
        const sKey = (m.serverName || m.provider || "server").trim();
        if (!map.has(sKey.toLowerCase())) {
          map.set(sKey.toLowerCase(), {
            id: m.serverId,
            name: sKey,
            format: m.serverFormat || m.provider || "ollama",
          });
        }
      });
      activeServers = Array.from(map.values());
    }

    activeServers.forEach((srv) => {
      const srvKey = (srv.name || "").toLowerCase().trim();
      const srvModels = realModels.filter((m) =>
        (m.serverId && srv.id && String(m.serverId) === String(srv.id)) ||
        (m.serverName && m.serverName.toLowerCase().trim() === srvKey)
      );

      // Only display tabs for active servers that have models in the DB
      if (srvModels.length > 0) {
        tabs.push({
          key: srvKey,
          serverId: srv.id,
          serverName: srv.name,
          label: srv.name.charAt(0).toUpperCase() + srv.name.slice(1),
          icon: getServerIcon(srv.format, srv.name),
          count: srvModels.length,
        });
      }
    });

    return tabs;
  }, [serversList, modelsList]);

  // Keep activeTab aligned with available tabs
  useEffect(() => {
    if (availableTabs.length > 0) {
      const exists = availableTabs.some((t) => t.key === activeTab);
      if (!exists) {
        setActiveTab(availableTabs[0].key);
      }
    }
  }, [availableTabs, activeTab]);

  const activeTabObj = useMemo(() => {
    return availableTabs.find((t) => t.key === activeTab) || availableTabs[0] || { key: "cluster", label: "Auto" };
  }, [availableTabs, activeTab]);

  const displayedModels = useMemo(() => {
    const q = modelSearchQuery.trim().toLowerCase();

    if (activeTab === "cluster") {
      const clusterItem = modelsList.find((m) => m.modelId === "auto" || m.isCluster) || DEFAULT_AUTO_MODEL;
      const normalizedClusterItem = {
        ...clusterItem,
        displayName: "Auto",
        modelId: "auto",
        provider: "auto",
        serverName: "Auto",
        isCluster: true,
        isAuto: true,
        recommended: true,
        description: "Auto-routes dynamically across any active servers in the database"
      };

      if (!q) return [normalizedClusterItem];
      // When searching in Auto tab, search across all models from all active servers
      return modelsList.filter((m) =>
        (m.displayName || "").toLowerCase().includes(q) ||
        (m.modelId || "").toLowerCase().includes(q) ||
        (m.serverName || "").toLowerCase().includes(q)
      );
    }

    // Filter strictly by the active server for this tab
    const currentTabObj = availableTabs.find((t) => t.key === activeTab);
    let filtered = modelsList.filter((m) => {
      if (m.isCluster || m.modelId === "auto") return false;
      if (!m.enabled) return false;
      if (currentTabObj?.serverId && m.serverId) {
        if (String(m.serverId) === String(currentTabObj.serverId)) return true;
      }
      if (m.serverName && m.serverName.toLowerCase().trim() === activeTab.toLowerCase().trim()) {
        return true;
      }
      return false;
    });

    if (q) {
      filtered = filtered.filter((m) =>
        (m.displayName || "").toLowerCase().includes(q) ||
        (m.modelId || "").toLowerCase().includes(q) ||
        (m.serverName || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [modelsList, activeTab, modelSearchQuery, availableTabs]);

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
          setModelsList(data.models);
          if (data.servers && Array.isArray(data.servers)) {
            setServersList(data.servers);
          }
          // If user hasn't explicitly chosen a specific model, always keep Auto
          setSelectedModel((prev) => {
            if (isUserSelectedModelRef.current && prev && prev.modelId && prev.modelId !== "auto" && !prev.isCluster && !prev.isAuto) {
              const matched = data.models.find((m) => m.modelId === prev.modelId);
              if (matched) return matched;
            }
            const clusterModel = data.models.find((m) => m.modelId === "auto" || m.isCluster);
            return clusterModel ? { ...clusterModel, displayName: "Auto", isAuto: true } : DEFAULT_AUTO_MODEL;
          });
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

  const silenceTimerRef = useRef(null);
  const latestTranscriptRef = useRef("");
  const recognitionRef = useRef(null);

  const handleVoiceAutoSubmit = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const promptToSubmit = (latestTranscriptRef.current || text || "").trim();
    if (promptToSubmit && onSend) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      voiceRecorderRef.current?.stopRecording().catch(() => null);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.resume();
        } catch (e) {}
      }

      onSend(
        promptToSubmit,
        null,
        selectedModel?.modelId || "auto",
        attachments,
        undefined,
        true /* isVoiceSubmission */,
        isWebSearchActive
      );
      setText("");
      latestTranscriptRef.current = "";
      setAttachments([]);
    }
  };

  // Initialize Speech Recognition on component mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.lang = "en-US";
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
        // If silence timer was armed, trigger auto-submit immediately upon recognition stop
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
          handleVoiceAutoSubmit();
        }
      };

      rec.onresult = (event) => {
        let accumulated = "";
        for (let i = 0; i < event.results.length; i++) {
          accumulated += event.results[i][0].transcript;
        }
        const trimmed = accumulated.trim();
        if (trimmed) {
          setText(trimmed);
          latestTranscriptRef.current = trimmed;

          // Clear previous silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Trigger auto-submit after 2s of silence
          silenceTimerRef.current = setTimeout(() => {
            handleVoiceAutoSubmit();
          }, 2000);
        }
      };

      rec.onerror = (event) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition warning:", event.error);
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
      };

      setRecognition(rec);
      recognitionRef.current = rec;
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const handleVoiceClick = async () => {
    try {
      if (isListening) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
        }
        await voiceRecorderRef.current?.stopRecording().catch(() => null);

        const promptToSubmit = (latestTranscriptRef.current || text || "").trim();
        if (promptToSubmit && onSend) {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
              window.speechSynthesis.resume();
            } catch (e) {}
          }
          onSend(
            promptToSubmit,
            null,
            selectedModel?.modelId || "auto",
            attachments,
            undefined,
            true /* isVoiceSubmission */,
            isWebSearchActive
          );
          setText("");
          latestTranscriptRef.current = "";
          setAttachments([]);
        }
      } else {
        await startVoiceListening();
      }
    } catch (err) {
      console.warn("Voice toggle error:", err);
      setIsListening(false);
    }
  };

  const startVoiceListening = async () => {
    try {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      latestTranscriptRef.current = "";
      setText("");
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.resume();
        } catch (e) {}
      }
      await voiceRecorderRef.current?.startRecording().catch((err) => {
        console.warn("MediaRecorder start notice:", err.message);
      });
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }, 50);
      }
      setIsListening(true);
    } catch (err) {
      console.warn("Voice start error:", err);
      setIsListening(false);
    }
  };

  // Automatically reopen mic to listen when AI finishes reading aloud (hands-free dialogue)
  useEffect(() => {
    if (autoListenTrigger > 0 && !isListening && !isGenerating) {
      startVoiceListening();
    }
  }, [autoListenTrigger]);

  const hasText = Boolean(text && text.trim());
  const canSubmit = hasText && !isGenerating;

  const handleSend = () => {
    if (isSubmittingRef.current || isGenerating) return;
    if (!canSubmit) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (isListening) {
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    }

    isSubmittingRef.current = true;
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 600);

    onSend(
      text.trim(),
      null,
      selectedModel?.modelId || "auto",
      attachments,
      undefined,
      false /* isVoiceSubmission: regular text send */,
      isWebSearchActive
    );
    setText("");
    latestTranscriptRef.current = "";
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
        w-full relative flex flex-col p-2 sm:p-2.5 md:p-3
        bg-white dark:bg-[#191A24] border border-border-primary dark:border-white/5
        rounded-2xl shadow-lg focus-within:border-border-focus dark:focus-within:border-white/10
        transition-all duration-300
      `}
      >
        {/* ChatGPT Style Attachment Preview Bar */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto custom-scrollbar pt-1 pb-2 sm:pb-2.5 mb-1.5 sm:mb-2 border-b border-border-primary/40 dark:border-white/5">
            {attachments.map((att) => (
              <div key={att.id} className="relative group shrink-0">
                {att.fileType === "image" && att.previewUrl ? (
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm bg-surface-secondary dark:bg-[#202230]">
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-full h-full object-cover rounded-xl sm:rounded-2xl transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </div>
                ) : (
                  <div className="h-12 sm:h-14 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-surface-secondary dark:bg-[#202230] border border-border-primary/60 dark:border-white/10 flex items-center gap-2 sm:gap-2.5 shadow-sm min-w-[120px] sm:min-w-[140px] max-w-[180px] sm:max-w-[200px]">
                    {att.fileType === "pdf" ? (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-500/15 dark:bg-rose-500/25 text-rose-500 flex flex-col items-center justify-center shrink-0">
                        <FiFileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-500/15 dark:bg-blue-500/25 text-blue-500 flex flex-col items-center justify-center shrink-0">
                        <FiFileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 pr-1 sm:pr-2">
                      <span className="text-[11px] sm:text-[12px] font-semibold truncate text-text-primary dark:text-white leading-tight">
                        {att.name}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-text-muted dark:text-[#8a8a93] uppercase tracking-wider font-mono">
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

        {/* Active Speech Recognition Banner */}
        {isListening && (
          <div className="flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 mb-1.5 sm:mb-2 rounded-lg bg-red-500/10 dark:bg-red-500/15 border border-red-500/25 text-[11px] sm:text-xs text-red-600 dark:text-red-400 select-none animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="font-semibold tracking-wide shrink-0">Listening...</span>
              <span className="opacity-80 text-[10.5px] sm:text-[11.5px] truncate hidden xs:inline">Pause 2s to submit</span>
            </div>
            <button
              type="button"
              onClick={handleVoiceClick}
              className="text-[11px] font-medium underline hover:no-underline cursor-pointer ml-auto shrink-0"
            >
              Stop
            </button>
          </div>
        )}

        {isWebSearchActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 mb-1.5 rounded-full bg-accent-primary/10 dark:bg-accent-primary/20 border border-accent-primary/30 text-accent-primary w-fit text-[11px] font-medium animate-in fade-in duration-200">
            <FiGlobe className="w-3.5 h-3.5 shrink-0" />
            <span>Search the Web is active</span>
            <button
              type="button"
              onClick={() => setIsWebSearchActive(false)}
              className="ml-1 p-0.5 hover:bg-accent-primary/20 rounded-full cursor-pointer transition"
              title="Disable web search"
            >
              <FiX className="w-3 h-3" />
            </button>
          </div>
        )}

        {isDevModeActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 mb-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 w-fit text-[11px] font-medium animate-in fade-in duration-200">
            <FiCode className="w-3.5 h-3.5 shrink-0" />
            <span>Dev Mode is active (Live Sandbox)</span>
            <button
              type="button"
              onClick={() => setIsDevModeActive(false)}
              className="ml-1 p-0.5 hover:bg-emerald-500/20 rounded-full cursor-pointer transition"
              title="Disable dev mode"
            >
              <FiX className="w-3 h-3" />
            </button>
          </div>
        )}

        <textarea
          ref={inputRef}
          rows={2}
          value={text}
          placeholder={
            isListening
              ? "Listening... Speak now (pause 2 sec to submit to AI)..."
              : isDevModeActive
              ? "Dev Mode enabled — Ask Codegene to build any app, site, or component..."
              : isWebSearchActive
              ? "Web Search enabled — Ask anything or look up latest live info..."
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
            w-full py-1 px-1.5 sm:px-2.5 text-[13.5px] sm:text-sm md:text-[14px] bg-transparent border-0 text-text-primary dark:text-white mb-1
            resize-none min-h-[42px] sm:min-h-[48px] max-h-[120px] overflow-y-auto custom-scrollbar leading-[20px] sm:leading-[22px]
          `}
        />

        <div className="flex items-center justify-between w-full mt-1 gap-1">
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 md:pl-0.5">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                className="group flex items-center cursor-pointer"
                title="Attach Files (Max 10MB)"
              >
                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] sm:rounded-[10px] border border-border-primary dark:border-white/5 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-200 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted dark:text-[#8A8A93] group-hover:text-text-primary dark:group-hover:text-white transition-colors duration-200"
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
                <div className="absolute bottom-full left-0 mb-2 w-64 max-w-[calc(100vw-24px)] bg-surface-dropdown dark:bg-[#191A24] border border-border-primary dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 transition-all origin-bottom-left">
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
              onClick={() => {
                const next = !isWebSearchActive;
                setIsWebSearchActive(next);
                if (next) {
                  setIsDevModeActive(false);
                }
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 h-7 sm:h-8 rounded-[8px] sm:rounded-[10px] border transition-all duration-200 shadow-xs cursor-pointer shrink-0 ${
                isWebSearchActive
                  ? "border-accent-primary bg-accent-primary text-white shadow-sm font-semibold"
                  : "border-border-primary dark:border-white/5 text-text-muted dark:text-[#8A8A93] hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white"
              }`}
              title={isWebSearchActive ? "Web Search: Enabled (Click to disable)" : "Search the web (Click to enable)"}
            >
              <FiGlobe className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWebSearchActive ? "text-white" : ""}`} />
              <span className="text-[11px] font-medium hidden xs:inline">
                {isWebSearchActive ? "Search ON" : "Search"}
              </span>
            </button>

            {/* Dev / Builder Mode Button */}
            <button
              type="button"
              onClick={() => {
                const next = !isDevModeActive;
                setIsDevModeActive(next);
                if (next) {
                  setIsWebSearchActive(false);
                }
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 h-7 sm:h-8 rounded-[8px] sm:rounded-[10px] border transition-all duration-200 shadow-xs cursor-pointer shrink-0 ${
                isDevModeActive
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm font-semibold animate-in fade-in"
                  : "border-border-primary dark:border-white/5 text-text-muted dark:text-[#8A8A93] hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-white"
              }`}
              title={isDevModeActive ? "Dev Mode: ON (Live Sandbox split-screen enabled)" : "Turn on Dev Mode (Live App/Web Builder)"}
            >
              <FiCode className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDevModeActive ? "text-white" : ""}`} />
              <span className="text-[11px] font-medium hidden xs:inline">
                {isDevModeActive ? "Dev Mode ON" : "Dev Mode"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {/* Model Selector */}
            <div className="relative" ref={modelMenuRef}>
              <button
                type="button"
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="text-text-muted dark:text-[#8A8A93] hover:text-text-primary dark:hover:text-white transition flex items-center gap-1.5 text-[11px] sm:text-[12px] font-medium px-2 py-1 sm:py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0 outline-none focus:outline-none focus:ring-0 border-0"
              >
                {(!selectedModel || selectedModel.isCluster || selectedModel.modelId === "auto" || selectedModel.isAuto) ? (
                  <span className="flex items-center gap-1.5 font-semibold text-accent-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span className="truncate max-w-[75px] xs:max-w-[110px] sm:max-w-[160px] md:max-w-[200px]">Auto</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate max-w-[75px] xs:max-w-[110px] sm:max-w-[160px] md:max-w-[200px] text-left">
                      {selectedModel.displayName || selectedModel.modelId}
                    </span>
                  </span>
                )}
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

              {/* Desktop Dropdown Menu (hidden on mobile) */}
              <div 
                className={`hidden sm:block absolute bottom-full right-0 mb-2 w-[390px] bg-surface-dropdown dark:bg-[#15161F] border border-border-primary dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 origin-bottom-right ${isModelMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
              >
                {/* Header */}
                <div className="px-3.5 pt-3 pb-2 border-b border-border-primary/60 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center text-xs font-bold">
                      <FiCpu className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-text-primary dark:text-white leading-tight">AI Model Routing</h4>
                      <p className="text-[10px] text-text-muted dark:text-[#8A8A93]">Active cluster pool & categorized models</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Pool
                  </span>
                </div>

                {/* Provider Tabs */}
                <div className="px-2 pt-2 pb-1.5 flex items-center gap-1 border-b border-border-primary/40 dark:border-white/5 overflow-x-auto custom-scrollbar">
                  {availableTabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key);
                          setModelSearchQuery("");
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                          isActive
                            ? "bg-accent-primary text-white shadow-xs font-semibold"
                            : "text-text-muted hover:text-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        {tab.key !== "cluster" && tab.count != null && (
                          <span className={`text-[10px] px-1 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10 text-text-muted"}`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                {activeTab !== "cluster" && (
                  <div className="px-3 py-1.5 border-b border-border-primary/40 dark:border-white/5">
                    <div className="relative flex items-center">
                      <FiSearch className="absolute left-2.5 w-3.5 h-3.5 text-text-muted" />
                      <input
                        type="text"
                        value={modelSearchQuery}
                        onChange={(e) => setModelSearchQuery(e.target.value)}
                        placeholder={`Search ${activeTabObj.label} models...`}
                        className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-black/5 dark:bg-white/5 border border-border-primary/40 dark:border-white/10 text-text-primary dark:text-white placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                      />
                      {modelSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setModelSearchQuery("")}
                          className="absolute right-2 text-text-muted hover:text-text-primary dark:hover:text-white"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Model List */}
                <div className="p-2 flex flex-col gap-1 max-h-[290px] overflow-y-auto custom-scrollbar">
                  {/* Auto Route Banner */}
                  {activeTab === "cluster" && !modelSearchQuery && (
                    <div
                      onClick={() => {
                        isUserSelectedModelRef.current = false;
                        setSelectedModel(DEFAULT_AUTO_MODEL);
                        setIsModelMenuOpen(false);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1.5 ${
                        !selectedModel || selectedModel.modelId === "auto" || selectedModel.isCluster || selectedModel.isAuto
                          ? "bg-accent-primary/10 border-accent-primary text-text-primary dark:text-white shadow-xs"
                          : "bg-surface-secondary/40 border-border-primary/60 dark:border-white/10 hover:border-accent-primary/60 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚡</span>
                          <span className="text-xs font-bold text-text-primary dark:text-white">Auto (Smart Auto-Route)</span>
                        </div>
                        {(!selectedModel || selectedModel.modelId === "auto" || selectedModel.isCluster || selectedModel.isAuto) ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-accent-primary">
                            <FiCheck className="w-4 h-4" /> Selected
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Auto-Balance
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted dark:text-[#8A8A93] leading-relaxed">
                        Smart auto-route across all active healthy cluster nodes (Gemini, Ollama, Cloud). Any active server can send response dynamically with instant failover.
                      </p>
                      <div className="flex items-center gap-2 pt-1 border-t border-border-primary/40 dark:border-white/5 text-[10px] text-text-muted">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          All Active Servers
                        </span>
                        <span>•</span>
                        <span>Dynamic Load Balancing</span>
                      </div>
                    </div>
                  )}

                  {/* Render Categorized Model Items */}
                  {displayedModels
                    .filter((m) => !(activeTab === "cluster" && (m.modelId === "auto" || m.isCluster)))
                    .map((model, index) => {
                      const isSelected = selectedModel.modelId === model.modelId && !selectedModel.isCluster && !selectedModel.isAuto;
                      return (
                        <button
                          key={`${model.modelId}-${model.serverId || index}`}
                          type="button"
                          onClick={() => {
                            isUserSelectedModelRef.current = true;
                            setSelectedModel(model);
                            setIsModelMenuOpen(false);
                          }}
                          className={`text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                            isSelected
                              ? "bg-accent-primary/10 border-accent-primary text-text-primary dark:text-white font-medium"
                              : "border-transparent hover:border-border-primary dark:hover:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-text-muted dark:text-[#8A8A93] hover:text-text-primary dark:hover:text-white"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-text-primary dark:text-white truncate">
                                {model.displayName || model.modelId}
                              </span>
                              {model.tier && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                  model.tier === "FAST"
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                }`}>
                                  {model.tier}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted dark:text-[#8A8A93] mt-0.5 truncate">
                              <span className="truncate">{model.serverName || model.provider || "Active Node"}</span>
                              <span>•</span>
                              <span className="font-mono">{model.modelId}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-text-muted dark:text-[#8A8A93]">
                              {model.creditCost != null ? `${model.creditCost} cr` : "0.5 cr"}
                            </span>
                            {isSelected && (
                              <FiCheck className="w-4 h-4 text-accent-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}

                  {displayedModels.length === 0 && (
                    <div className="text-center py-6 text-text-muted text-xs">
                      No models found matching "{modelSearchQuery}".
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Bottom Sheet Drawer (< sm) */}
              {isModelMenuOpen && (
                <div className="sm:hidden fixed inset-0 z-[100] flex flex-col justify-end">
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModelMenuOpen(false);
                    }}
                  />

                  {/* Sheet Modal */}
                  <div
                    className="relative z-10 w-full bg-white dark:bg-[#15161F] border-t border-border-primary dark:border-white/10 rounded-t-3xl shadow-2xl p-4 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Pull Indicator Pill */}
                    <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mb-3" />

                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-border-primary dark:border-white/10">
                      <div>
                        <h3 className="text-[14px] font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                          <FiCpu className="text-accent-primary" />
                          Select AI Model & Cluster
                        </h3>
                        <p className="text-[11px] text-text-muted dark:text-[#8A8A93]">
                          Choose active cluster or specific provider model
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModelMenuOpen(false)}
                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary dark:hover:text-white transition cursor-pointer"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mobile Provider Tabs */}
                    <div className="py-2 flex items-center gap-1.5 border-b border-border-primary/40 dark:border-white/5 overflow-x-auto custom-scrollbar">
                      {availableTabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab.key);
                              setModelSearchQuery("");
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                              isActive
                                ? "bg-accent-primary text-white shadow-xs font-semibold"
                                : "text-text-muted hover:text-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.key !== "cluster" && tab.count != null && (
                              <span className={`text-[10px] px-1 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10 text-text-muted"}`}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Bar on Mobile */}
                    {activeTab !== "cluster" && (
                      <div className="py-2 border-b border-border-primary/40 dark:border-white/5">
                        <div className="relative flex items-center">
                          <FiSearch className="absolute left-2.5 w-3.5 h-3.5 text-text-muted" />
                          <input
                            type="text"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTabObj.label} models...`}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/5 dark:bg-white/5 border border-border-primary/40 dark:border-white/10 text-text-primary dark:text-white placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                          />
                          {modelSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setModelSearchQuery("")}
                              className="absolute right-2 text-text-muted hover:text-text-primary dark:hover:text-white"
                            >
                              <FiX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Model List */}
                    <div className="py-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[50vh]">
                      {activeTab === "cluster" && !modelSearchQuery && (
                        <div
                          onClick={() => {
                            isUserSelectedModelRef.current = false;
                            setSelectedModel(DEFAULT_AUTO_MODEL);
                            setIsModelMenuOpen(false);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col gap-1.5 ${
                            !selectedModel || selectedModel.modelId === "auto" || selectedModel.isCluster || selectedModel.isAuto
                              ? "bg-accent-primary/10 border-accent-primary text-text-primary dark:text-white shadow-xs"
                              : "bg-surface-secondary/40 border-border-primary/60 dark:border-white/10 hover:border-accent-primary/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">⚡</span>
                              <span className="text-xs font-bold text-text-primary dark:text-white">Auto (Smart Auto-Route)</span>
                            </div>
                            {(!selectedModel || selectedModel.modelId === "auto" || selectedModel.isCluster || selectedModel.isAuto) ? (
                              <span className="flex items-center gap-1 text-xs font-semibold text-accent-primary">
                                <FiCheck className="w-4 h-4" /> Selected
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Auto-Balance
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted dark:text-[#8A8A93] leading-relaxed">
                            Smart auto-route across all active healthy servers in the database. Any active server can send response dynamically with instant failover.
                          </p>
                          <div className="flex items-center gap-2 pt-1.5 border-t border-border-primary/40 dark:border-white/5 text-[11px] text-text-muted">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              All Active Servers
                            </span>
                            <span>•</span>
                            <span>Highest Reliability</span>
                          </div>
                        </div>
                      )}

                      {displayedModels
                        .filter((m) => !(activeTab === "cluster" && (m.modelId === "auto" || m.isCluster)))
                        .map((model, index) => {
                          const isSelected = selectedModel.modelId === model.modelId && !selectedModel.isCluster && !selectedModel.isAuto;
                          return (
                            <button
                              key={`${model.modelId}-${model.serverId || index}`}
                              type="button"
                              onClick={() => {
                                isUserSelectedModelRef.current = true;
                                setSelectedModel(model);
                                setIsModelMenuOpen(false);
                              }}
                              className={`text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                                isSelected
                                  ? "bg-accent-primary/10 border-accent-primary text-text-primary dark:text-white font-medium"
                                  : "border-transparent hover:border-border-primary dark:hover:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-text-muted dark:text-[#8A8A93]"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-text-primary dark:text-white truncate">
                                    {model.displayName || model.modelId}
                                  </span>
                                  {model.tier && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                      model.tier === "FAST"
                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                    }`}>
                                      {model.tier}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-text-muted dark:text-[#8A8A93] mt-0.5 truncate">
                                  <span className="truncate">{model.serverName || model.provider || "Active Node"}</span>
                                  <span>•</span>
                                  <span className="font-mono">{model.modelId}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-text-muted dark:text-[#8A8A93]">
                                  {model.creditCost != null ? `${model.creditCost} cr` : "0.5 cr"}
                                </span>
                                {isSelected && (
                                  <FiCheck className="w-4 h-4 text-accent-primary shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}

                      {displayedModels.length === 0 && (
                        <div className="text-center py-8 text-text-muted text-xs">
                          No models found matching "{modelSearchQuery}".
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Microphone Button */}
            <button
              onClick={handleVoiceClick}
              type="button"
              disabled={isGenerating}
              className={`
                transition-colors duration-200 cursor-pointer flex items-center justify-center shrink-0
                w-7 h-7 sm:w-8 sm:h-8 rounded-lg
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
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent-primary flex items-center justify-center shrink-0 transition cursor-pointer active:scale-95 text-white shadow-sm"
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
                  w-7 h-7 sm:w-8 sm:h-8 rounded-lg
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
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
