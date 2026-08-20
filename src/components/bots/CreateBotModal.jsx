import { useState, useEffect } from "react";
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
  FiAlertCircle,
  FiUploadCloud,
  FiDatabase,
  FiLayers,
  FiUser,
  FiVolume2,
  FiZap,
  FiSliders,
  FiGlobe
} from "react-icons/fi";
import { NobackEndCall, NobackEndCallObj } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import { useTanStackMutation, useTanStackQueryClient } from "../../hooks/useTanStackData";
import VisemeAvatarPlayer from "../global/VisemeAvatarPlayer";
import ThreeVisemeAvatar from "../global/ThreeVisemeAvatar";

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", badge: "Recommended" },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", badge: "Flagship" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", badge: "Fast" },
  { id: "claude-3.5-sonnet", name: "Claude", provider: "Anthropic", badge: "Reasoning" },
  { id: "gemini-1.5-pro", name: "Gemini", provider: "Google", badge: "Long Context" },
  { id: "qwen-2.5", name: "Qwen", provider: "Alibaba AI", badge: "Open Source" },
  { id: "custom-model", name: "Custom Model", provider: "Enterprise", badge: "Self-Hosted" }
];

const BOT_PURPOSES = [
  {
    id: "CHAT",
    title: "💬 Knowledge Chatbot",
    subtitle: "Fast Q&A chatbot with PDF, DOCX, TXT & Knowledge RAG search",
    badge: "Knowledge & RAG",
    requiredFields: ["Bot Name", "AI Model", "System Prompt"],
    recommendedFiles: "PDF, DOCX, TXT, MD, JSON",
    steps: [
      { id: "purpose", label: "1. Purpose & Type" },
      { id: "model", label: "2. AI Model" },
      { id: "knowledge", label: "3. Knowledge Files (Required/Recommended)" },
      { id: "rules", label: "4. System Rules" },
      { id: "publish", label: "5. Publish Agent" }
    ]
  },
  {
    id: "VOICE",
    title: "🎙️ Voice Bot",
    subtitle: "Speech-enabled voice agent with audio synthesis & hands-free mic interaction",
    badge: "Voice Synthesis",
    requiredFields: ["Bot Name", "AI Model", "Voice Profile"],
    recommendedFiles: "Audio Samples (.mp3, .wav) for voice cloning",
    steps: [
      { id: "purpose", label: "1. Purpose & Type" },
      { id: "voice", label: "2. Voice Setup (Required)" },
      { id: "model", label: "3. AI Model" },
      { id: "rules", label: "4. System Rules (Optional)" },
      { id: "publish", label: "5. Publish Agent" }
    ]
  },
  {
    id: "ACTION",
    title: "⚡ Action / API Bot",
    subtitle: "Tool calling agent executing REST APIs & workflows (0ms RAG overhead)",
    badge: "REST Tool Calling",
    requiredFields: ["Bot Name", "AI Model", "At least 1 API Tool / Postman File"],
    recommendedFiles: "Postman Collection (.json)",
    steps: [
      { id: "purpose", label: "1. Purpose & Type" },
      { id: "model", label: "2. AI Model" },
      { id: "apis", label: "3. API Tools & Postman (Required)" },
      { id: "rules", label: "4. System Rules (Optional)" },
      { id: "publish", label: "5. Publish Agent" }
    ]
  },
  {
    id: "AVATAR",
    title: "🎭 Avatar Bot",
    subtitle: "Digital human talking avatar with natural voice & 3D viseme lip sync",
    badge: "3D Talking Head",
    requiredFields: ["Bot Name", "AI Model", "3D Model / Face Photo", "Voice Profile"],
    recommendedFiles: "3D Model (.vrm, .glb) or Face Photo (.png, .jpg)",
    steps: [
      { id: "purpose", label: "1. Purpose & Type" },
      { id: "avatar", label: "2. 3D Avatar (Required)" },
      { id: "voice", label: "3. Voice Setup (Required)" },
      { id: "model", label: "4. AI Model" },
      { id: "publish", label: "5. Publish Agent" }
    ]
  },
  {
    id: "HYBRID",
    title: "🌐 Hybrid Assistant",
    subtitle: "All-in-one agent combining Chat, Voice, Avatar, Knowledge RAG, and APIs",
    badge: "All Capabilities",
    requiredFields: ["Bot Name", "AI Model", "System Rules"],
    recommendedFiles: "PDFs, Postman Collections, 3D VRM Models, Voice Samples",
    steps: [
      { id: "purpose", label: "1. Purpose & Type" },
      { id: "model", label: "2. AI Model" },
      { id: "knowledge", label: "3. Knowledge Base" },
      { id: "apis", label: "4. API Integrations" },
      { id: "rules", label: "5. Rules & Policies" },
      { id: "voice_avatar", label: "6. Voice & Avatar" },
      { id: "publish", label: "7. Publish Agent" }
    ]
  }
];

const PRESET_VOICES = [
  { id: "default-en", name: "Sarah (Warm Female)", language: "English (US)" },
  { id: "energetic-male", name: "Alex (Energetic Male)", language: "English (US)" },
  { id: "professional-female", name: "Emily (Professional Female)", language: "English (UK)" },
  { id: "casual-male", name: "Michael (Casual Male)", language: "English (AU)" }
];

const PRESET_3D_MODELS = [
  { id: "viverse-vrm", name: "Enterprise Viverse VRM AI Agent", presetKey: "/models/viverse_avatar_model_210287.vrm" }
];

const DEFAULT_AVATAR_PRESET = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";

const CreateBotModal = ({ onClose, onBotCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const { isDark } = useTheme();
  const queryClient = useTanStackQueryClient();

  // Basic Info & Purpose
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [botType, setBotType] = useState("AVATAR");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectsList, setProjectsList] = useState([]);

  // Avatar & Voice State
  const [avatarProvider, setAvatarProvider] = useState("THREE_3D");
  const [selected3DPresetId, setSelected3DPresetId] = useState("viverse-vrm");
  const [selected3DModelUrl, setSelected3DModelUrl] = useState("/models/viverse_avatar_model_210287.vrm");
  const [avatarImageBase64, setAvatarImageBase64] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(DEFAULT_AVATAR_PRESET);
  const [selectedVoiceId, setSelectedVoiceId] = useState("default-en");

  // Model State
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  // Knowledge Base State
  const [stagedFiles, setStagedFiles] = useState([]);

  // Rules State
  const [rulesInnerTab, setRulesInnerTab] = useState("editor");
  const [rulesEditorContent, setRulesEditorContent] = useState("");

  // API Integrations State
  const [stagedApis, setStagedApis] = useState([]);
  const [apiOptionTab, setApiOptionTab] = useState("manual");
  const [apiName, setApiName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiActionType, setApiActionType] = useState("GENERIC");
  const [apiAuthType, setApiAuthType] = useState("none");
  const [apiKey, setApiKey] = useState("");
  const [postmanJsonText, setPostmanJsonText] = useState("");
  const [postmanFileName, setPostmanFileName] = useState("");

  useEffect(() => {
    NobackEndCall("/projects")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setProjectsList(list);
      })
      .catch(() => { });
  }, []);

  const activePurposeObj = BOT_PURPOSES.find((p) => p.id === botType) || BOT_PURPOSES[0];
  const activeSteps = activePurposeObj.steps;
  const currentStepObj = activeSteps[currentStep - 1] || activeSteps[0];

  const handlePurposeChange = (newType) => {
    setBotType(newType);
    setCurrentStep(1);
    setError("");
  };

  // TanStack Mutation for complete Bot Creation
  const createBotMutation = useTanStackMutation({
    mutationFn: async (payload) => {
      const newBot = await NobackEndCallObj("/bots", payload, "post");

      // Upload knowledge/rules files if staged
      if (stagedFiles.length > 0 && newBot?._id) {
        for (const file of stagedFiles) {
          const uploadPayload = {
            fileName: file.fileName,
            fileType: file.fileType,
            fileCategory: file.fileCategory || "knowledge",
            fileSize: file.fileSize,
            fileContentBase64: file.fileContentBase64,
            rawText: file.rawText
          };
          await NobackEndCallObj(`/bots/${newBot._id}/upload`, uploadPayload, "post");
        }
      }

      // Upload avatar face photo if staged
      if (avatarImageBase64 && newBot?._id) {
        await NobackEndCallObj(`/bots/${newBot._id}/avatar`, { fileData: avatarImageBase64 }, "post");
      }

      return newBot;
    },
    onSuccess: (newBot) => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      onBotCreated(newBot);
      onClose();
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to finalize bot creation.");
    }
  });

  const loading = createBotMutation.isPending;

  const handleAvatarFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      if (["glb", "gltf"].includes(ext)) {
        setSelected3DPresetId("custom");
        setSelected3DModelUrl(base64Data);
        setAvatarProvider("THREE_3D");
      } else {
        setAvatarImageBase64(base64Data);
        setAvatarPreviewUrl(base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e, category = "knowledge") => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "txt", "docx", "md", "json"].includes(ext)) {
        alert(`File format .${ext} is not supported. Please upload PDF, TXT, DOCX, JSON, or Markdown (.md).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target.result;
        const base64 = typeof fileContent === "string" && fileContent.includes(",") ? fileContent.split(",")[1] : "";
        const rawTextVal = ["txt", "md", "json"].includes(ext) ? fileContent : "";

        setStagedFiles((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileType: ext,
            fileCategory: category,
            fileSize: file.size,
            fileContentBase64: base64,
            rawText: rawTextVal
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeStagedFile = (index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostmanFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPostmanFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const jsonObj = JSON.parse(text);
        const parsedApis = [];

        const extractRequests = (items) => {
          if (!Array.isArray(items)) return;
          items.forEach((item) => {
            if (item.request) {
              const req = item.request;
              let urlStr = "";
              if (typeof req.url === "string") {
                urlStr = req.url;
              } else if (req.url?.raw) {
                urlStr = req.url.raw;
              } else if (req.url?.host && Array.isArray(req.url.host)) {
                urlStr = (req.url.protocol ? req.url.protocol + "://" : "https://") + req.url.host.join(".") + (req.url.path ? "/" + req.url.path.join("/") : "");
              }
              if (urlStr) {
                parsedApis.push({
                  name: item.name || "Imported Postman Tool",
                  url: urlStr,
                  method: (req.method || "GET").toUpperCase(),
                  actionType: "POSTMAN",
                  authType: req.auth?.type || "none",
                  apiKey: ""
                });
              }
            }
            if (item.item) extractRequests(item.item);
          });
        };

        extractRequests(jsonObj.item || jsonObj.items || [jsonObj]);

        if (parsedApis.length > 0) {
          setStagedApis((prev) => [...prev, ...parsedApis]);
          alert(`Successfully imported ${parsedApis.length} API tool endpoints from ${file.name}!`);
        } else {
          alert("No valid request endpoints found in the provided Postman collection JSON file.");
        }
      } catch (err) {
        alert("Failed to parse Postman JSON file. Please ensure it is a valid Postman v2/v2.1 collection file.");
      }
    };
    reader.readAsText(file);
  };

  const handleNextStep = () => {
    setError("");
    if (currentStepObj.id === "purpose" && !name.trim()) {
      setError("Please provide a Bot Name.");
      return;
    }
    if (currentStepObj.id === "apis" && botType === "ACTION" && stagedApis.length === 0) {
      if (!window.confirm("Action Bots perform REST tool calls. You haven't added any API tools yet. Do you want to proceed anyway?")) {
        return;
      }
    }
    if (currentStep < activeSteps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCompleteBotCreation = () => {
    if (!name.trim()) {
      setError("Please provide a Bot Name.");
      setCurrentStep(1);
      return;
    }

    setError("");
    createBotMutation.mutate({
      name: name.trim(),
      description: description ? description.trim() : "",
      model: selectedModel,
      botType,
      capabilities: {
        enableRag: ["CHAT", "VOICE", "AVATAR", "HYBRID"].includes(botType),
        enableActions: ["ACTION", "HYBRID"].includes(botType),
        enableVoice: ["VOICE", "AVATAR", "HYBRID"].includes(botType),
        enableAvatar: ["AVATAR", "HYBRID"].includes(botType)
      },
      projectId: selectedProjectId || null,
      avatarImage: avatarImageBase64 || "",
      avatar3DModel: selected3DModelUrl || "",
      avatarProvider: avatarProvider || "THREE_3D",
      avatarConfig: {
        avatarProvider: avatarProvider || "THREE_3D",
        faceModelUrl: selected3DModelUrl,
        avatar3DModel: selected3DModelUrl,
        faceImageUrl: avatarImageBase64 || ""
      },
      voiceProfile: { voiceId: selectedVoiceId, voiceType: "PRESET" },
      voiceConfig: { voiceId: selectedVoiceId },
      rulesText: rulesEditorContent,
      botSpecificRules: rulesEditorContent,
      systemPrompt: rulesEditorContent || `You are a specialized ${activePurposeObj.title} AI assistant.`,
      initialApis: stagedApis,
      stagedFiles
    });
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4 sm:p-6 ${"bg-interactive-active/60 dark:bg-black/80"}`}>
      <div className={`border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[800px] ${"bg-white border-border-primary text-text-primary dark:bg-interactive-active dark:border-border-primary dark:text-text-muted"}`}>

        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex justify-between items-center shrink-0 ${"border-border-primary bg-interactive-base dark:border-border-primary dark:bg-interactive-base/70"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-interactive-base to-interactive-hover flex items-center justify-center text-white font-bold shadow-lg shadow-black/10/20">
              <FiCpu className="text-xl" />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${"text-text-primary dark:text-text-muted"}`}>
                Create AI Agent Wizard
              </h2>
              <p className={`text-xs ${"text-text-primary dark:text-text-primary"}`}>
                Capability-Based Dynamic Builder &mdash; <span className="font-semibold text-text-primary">{activePurposeObj.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${"text-text-primary hover:text-text-primary hover:bg-surface-secondary dark:text-text-primary dark:hover:text-text-muted dark:hover:bg-interactive-active"}`}
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Dynamic Stepper Navigation */}
        <div className={`flex items-center text-center text-xs font-semibold border-b overflow-x-auto select-none custom-scrollbar shrink-0 ${"border-border-primary bg-surface-secondary/60 dark:border-border-primary dark:bg-interactive-base/40"}`}>
          {activeSteps.map((s, idx) => {
            const stepNum = idx + 1;
            const isCurrent = currentStep === stepNum;
            const isDone = currentStep > stepNum;

            return (
              <div
                key={s.id}
                onClick={() => {
                  if (stepNum < currentStep) setCurrentStep(stepNum);
                }}
                className={`py-3 px-4 transition border-b-2 shrink-0 cursor-pointer flex items-center gap-1.5 ${isCurrent
                  ? "border-border-primary text-text-primary font-bold bg-interactive-base/10"
                  : isDone
                    ? "border-border-primary text-text-primary font-medium"
                    : "border-transparent text-text-primary hover:text-text-primary dark:border-transparent dark:text-text-primary dark:hover:text-text-primary"
                  }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center font-bold ${
                  isCurrent ? "bg-interactive-base text-text-primary dark:text-white" : isDone ? "bg-interactive-base text-text-primary dark:text-white" : "bg-interactive-active text-text-primary"
                }`}>
                  {stepNum}
                </span>
                <span>{s.label.replace(/^\d+\.\s*/, '')}</span>
              </div>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-primary text-xs flex items-center gap-2 font-medium">
              <FiAlertCircle className="shrink-0 text-sm" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP: PURPOSE & BASIC INFO */}
          {currentStepObj.id === "purpose" && (
            <div className="space-y-6">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${"text-text-primary dark:text-text-muted"}`}>
                  1. Choose Bot Purpose & Primary Capability <span className="text-text-primary">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {BOT_PURPOSES.map((purpose) => (
                    <div
                      key={purpose.id}
                      onClick={() => handlePurposeChange(purpose.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${botType === purpose.id
                        ? "bg-interactive-base/15 border-border-primary text-text-primary ring-2 ring-border-focus/30 shadow-lg shadow-black/10/10 font-semibold"
                        : "bg-interactive-base border-border-primary text-text-primary hover:border-border-primary hover:bg-white dark:bg-interactive-base/70 dark:border-border-primary dark:text-text-muted dark:hover:border-border-primary dark:hover:bg-interactive-active/50"
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold">{purpose.title}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-interactive-base/10 text-text-primary font-mono border border-border-primary/20 shrink-0 font-semibold">
                            {purpose.badge}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 mt-1.5 leading-relaxed">{purpose.subtitle}</p>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-border-primary/40 text-[10px] space-y-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-text-primary font-medium">Required Setup:</span>
                          <span className="font-semibold text-amber-800">{purpose.requiredFields.join(", ")}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-text-primary font-medium">Supported Formats:</span>
                          <span className="font-mono text-text-primary">{purpose.recommendedFiles}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${"text-text-primary dark:text-text-muted"}`}>
                  Bot Name <span className="text-text-primary">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Assistant / CRM Action Bot / Support Voice Agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-border-focus transition ${"bg-interactive-base border-border-primary text-text-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-muted dark:placeholder:text-text-primary"}`}
                />
              </div>

              {projectsList.length > 0 && (
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${"text-text-primary dark:text-text-muted"}`}>
                    Select Project / Brand (Optional)
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-border-focus transition ${"bg-interactive-base border-border-primary text-text-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-muted"}`}
                  >
                    <option value="">No Project (Standalone Bot)</option>
                    {projectsList.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (Shared Knowledge)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${"text-text-primary dark:text-text-muted"}`}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe what this bot does and its main goal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:border-border-focus transition ${"bg-interactive-base border-border-primary text-text-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-muted dark:placeholder:text-text-primary"}`}
                />
              </div>
            </div>
          )}

          {/* STEP: AVATAR SETUP */}
          {currentStepObj.id === "avatar" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-primary text-xs flex items-center justify-between">
                <span>🎭 <strong>3D Avatar Setup</strong> (Required for Avatar Agent)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-interactive-base/20 text-text-muted font-mono font-bold">
                  Files: .vrm, .glb, .png, .jpg
                </span>
              </div>

              {/* Avatar Engine Mode Selector */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${"text-text-primary dark:text-text-muted"}`}>Avatar Engine Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "THREE_3D", label: "🎭 3D Model Canvas" },
                    { id: "LOCAL_VISEME", label: "🖼️ 2D Photo Visemes" },
                    { id: "VIDEO_AVATAR", label: "📹 Video Avatar" }
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setAvatarProvider(prov.id)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition ${avatarProvider === prov.id
                        ? "bg-interactive-base/20 border-border-primary text-text-primary ring-1 ring-border-focus/30"
                        : "bg-interactive-base border-border-primary text-text-primary hover:text-text-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-primary dark:hover:text-text-muted"
                        }`}
                    >
                      {prov.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Presets Selection */}
              {avatarProvider === "THREE_3D" && (
                <div className="space-y-1.5">
                  <label className={`block text-xs font-bold ${"text-text-primary dark:text-text-muted"}`}>Select Realistic 3D Avatar Preset</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_3D_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelected3DPresetId(m.id);
                          setSelected3DModelUrl(m.presetKey);
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition ${selected3DPresetId === m.id
                          ? "bg-interactive-base/20 border-border-primary text-text-primary font-bold ring-1 ring-border-focus/30"
                          : "bg-interactive-base border-border-primary text-text-primary hover:border-border-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-muted dark:hover:border-border-primary"
                          }`}
                      >
                        <div className="truncate font-semibold">{m.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${"border-border-primary bg-interactive-base hover:border-border-primary/50 dark:border-border-primary dark:bg-interactive-base/40 dark:hover:border-border-primary/50"}`}>
                  <FiUser className="text-3xl text-text-primary mx-auto mb-2" />
                  <p className={`text-xs font-semibold ${"text-text-primary dark:text-text-muted"}`}>
                    Upload Custom 3D Model or Photo
                  </p>
                  <p className="text-[10px] text-text-primary mt-1">.glb, .gltf, .png, or .jpg</p>
                  <input
                    type="file"
                    accept="image/*,video/*,.glb,.gltf"
                    onChange={handleAvatarFileSelected}
                    className="hidden"
                    id="wizard-avatar-upload"
                  />
                  <label
                    htmlFor="wizard-avatar-upload"
                    className="mt-3 inline-block bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-black/10/20"
                  >
                    Select File
                  </label>
                </div>

                <div className="flex flex-col items-center justify-center p-3 border rounded-2xl bg-interactive-base/50 border-border-primary h-44 overflow-hidden relative">
                  {avatarProvider === "THREE_3D" ? (
                    <div className="w-full h-32 rounded-xl overflow-hidden">
                      <ThreeVisemeAvatar
                        modelUrl={selected3DModelUrl}
                        isPlaying={false}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-border-primary/50 shadow-md">
                      <img src={avatarPreviewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-text-primary mt-1">Active Avatar Preview</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP: VOICE SETUP */}
          {currentStepObj.id === "voice" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-primary text-xs flex items-center justify-between">
                <span>🎙️ <strong>Voice Selection</strong> (Required for Speech Output)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-interactive-base/20 text-text-muted font-mono font-bold">
                  Audio: Natural Voice Synthesis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_VOICES.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoiceId(v.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${selectedVoiceId === v.id
                      ? "bg-interactive-base/15 border-border-primary text-text-primary font-semibold ring-2 ring-border-focus/20"
                      : "bg-interactive-base border-border-primary text-text-primary hover:border-border-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-muted dark:hover:border-border-primary"
                      }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{v.name}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{v.language}</div>
                    </div>
                    <FiVolume2 className="text-base shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: AI MODEL SELECTION */}
          {currentStepObj.id === "model" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODELS.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${selectedModel === m.id
                      ? "bg-interactive-base/15 border-border-primary text-text-primary ring-2 ring-border-focus/20 font-semibold"
                      : "bg-interactive-base border-border-primary text-text-primary hover:border-border-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-muted dark:hover:border-border-primary"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{m.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-interactive-base/10 text-text-primary font-mono border border-border-primary/20">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[10px] opacity-75 mt-2 font-mono">Provider: {m.provider}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: KNOWLEDGE BASE UPLOAD */}
          {currentStepObj.id === "knowledge" && (
            <div className="space-y-4">
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                botType === "CHAT"
                  ? "bg-interactive-base/15 border-border-primary/40 text-text-muted"
                  : "bg-interactive-active/40 border-border-primary text-text-primary"
              }`}>
                <span>
                  {botType === "CHAT" ? "📘 REQUIRED / HIGHLY RECOMMENDED FOR RAG SEARCH:" : "ℹ️ OPTIONAL KNOWLEDGE DOCUMENTS:"}{" "}
                  Upload files to build your bot's custom memory bank.
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-interactive-base/20 text-text-muted">
                  PDF, DOCX, TXT, JSON, MD
                </span>
              </div>

              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${"border-border-primary bg-interactive-base hover:border-border-primary/50 dark:border-border-primary dark:bg-interactive-base/40 dark:hover:border-border-primary/50"}`}>
                <FiUpload className="text-3xl text-text-primary mx-auto mb-2" />
                <p className={`text-xs font-semibold ${"text-text-primary dark:text-text-muted"}`}>
                  Upload Knowledge Base Documents
                </p>
                <p className="text-[11px] text-text-primary mt-1">PDF, DOCX, TXT, JSON, or Markdown (.md)</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx,.md,.json"
                  onChange={(e) => handleFileUpload(e, "knowledge")}
                  className="hidden"
                  id="modal-knowledge-file-upload"
                />
                <label
                  htmlFor="modal-knowledge-file-upload"
                  className="mt-3 inline-block bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-black/10/20"
                >
                  Browse Knowledge Files
                </label>
              </div>

              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-text-primary">Staged Documents ({stagedFiles.length})</h4>
                  {stagedFiles.map((file, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${"bg-interactive-base border-border-primary dark:bg-interactive-base dark:border-border-primary"}`}>
                      <div className="flex items-center gap-2">
                        <FiFileText className="text-text-primary" />
                        <span className="font-medium">{file.fileName}</span>
                      </div>
                      <button onClick={() => removeStagedFile(idx)} className="text-text-primary hover:text-text-muted">
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP: API INTEGRATIONS */}
          {currentStepObj.id === "apis" && (
            <div className="space-y-4">
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                botType === "ACTION"
                  ? "bg-amber-900/15 border-amber-800/40 text-amber-600"
                  : "bg-interactive-active/40 border-border-primary text-text-primary"
              }`}>
                <span>
                  {botType === "ACTION" ? "⚡ REQUIRED FOR TOOL CALLING:" : "ℹ️ OPTIONAL API INTEGRATIONS:"}{" "}
                  Add REST endpoints or import a Postman Collection JSON.
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/20 text-amber-600">
                  Postman Collection .json
                </span>
              </div>

              {/* POSTMAN COLLECTION UPLOAD BOX */}
              <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition ${"border-amber-300 bg-amber-50 hover:border-amber-400 dark:border-amber-800/30 dark:bg-amber-900/5 dark:hover:border-amber-800/60"}`}>
                <FiCode className="text-2xl text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-amber-800">Import Postman Collection (.json)</p>
                <p className="text-[10px] text-text-primary mt-0.5">Automatically parses API requests & endpoints</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handlePostmanFileImport}
                  className="hidden"
                  id="wizard-postman-upload"
                />
                <label
                  htmlFor="wizard-postman-upload"
                  className="mt-2 inline-block bg-amber-600 hover:bg-amber-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow-md"
                >
                  Select Postman File
                </label>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border-primary"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-text-primary">or Add API Manually</span>
                <div className="flex-grow border-t border-border-primary"></div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="API Name (e.g. Check Order Status)"
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${"bg-interactive-base border-border-primary dark:bg-interactive-base dark:border-border-primary"}`}
                />
                <div className="flex gap-2">
                  <select
                    value={apiMethod}
                    onChange={(e) => setApiMethod(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none ${"bg-interactive-base border-border-primary text-amber-600 dark:bg-interactive-base dark:border-border-primary dark:text-amber-800"}`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Endpoint URL (https://api.example.com/orders)"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className={`flex-1 border rounded-xl px-3 py-2 text-xs outline-none ${"bg-interactive-base border-border-primary dark:bg-interactive-base dark:border-border-primary"}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!apiName.trim() || !apiUrl.trim()) {
                      alert("API Name and Endpoint URL are required.");
                      return;
                    }
                    setStagedApis((prev) => [
                      ...prev,
                      {
                        name: apiName.trim(),
                        url: apiUrl.trim(),
                        method: apiMethod,
                        actionType: apiActionType,
                        authType: apiAuthType,
                        apiKey: apiKey.trim()
                      }
                    ]);
                    setApiName("");
                    setApiUrl("");
                    setApiKey("");
                  }}
                  className="bg-amber-600 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Add API Tool
                </button>

                {stagedApis.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <h4 className="text-xs font-semibold text-text-primary">Staged APIs ({stagedApis.length})</h4>
                    {stagedApis.map((api, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${"bg-interactive-base border-border-primary dark:bg-interactive-base dark:border-border-primary"}`}>
                        <div>
                          <span className="font-bold text-amber-800 mr-2">[{api.method}]</span>
                          <span className="font-medium">{api.name}</span>
                          <div className="text-[10px] opacity-75 font-mono">{api.url}</div>
                        </div>
                        <button onClick={() => removeStagedApi(idx)} className="text-text-primary hover:text-text-muted">
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP: RULES & POLICIES */}
          {currentStepObj.id === "rules" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-primary text-xs">
                📜 <strong>System Rules</strong>: Enter specific system instructions & policy constraints. Optional at creation time!
              </div>

              <textarea
                rows={5}
                placeholder="e.g. Speak politely, answer concisely, never hallucinate pricing info..."
                value={rulesEditorContent}
                onChange={(e) => setRulesEditorContent(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:border-border-focus transition font-mono ${"bg-interactive-base border-border-primary text-text-primary dark:bg-interactive-base dark:border-border-primary dark:text-text-muted"}`}
              />
            </div>
          )}

          {/* STEP: VOICE & AVATAR (VOICE / AVATAR / HYBRID BOTS) */}
          {currentStepObj.id === "voice_avatar" && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-interactive-base/10 border border-border-primary/30 text-text-muted text-xs font-medium flex items-center justify-between">
                <span>🎙️ <strong>Neural Voice Synthesis & Custom Voice Cloning</strong>: Choose a neural voice or upload a custom audio recording to clone.</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-interactive-base/20 text-text-muted border border-border-primary/30 shrink-0">Studio Engine</span>
              </div>

              {/* Voice Profile Cards Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">1. Select Voice Profile</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVoiceId(v.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        selectedVoiceId === v.id
                          ? "bg-interactive-base/20 border-border-primary text-text-muted ring-2 ring-border-focus/30 font-semibold"
                          : "bg-interactive-base border-border-primary text-text-primary hover:border-border-primary hover:text-text-primary dark:bg-interactive-base/70 dark:border-border-primary dark:text-text-primary dark:hover:border-border-primary dark:hover:text-text-muted"
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{v.name}</div>
                      <div className="text-[10px] opacity-75 mt-1 font-mono">{v.id === "custom-clone" ? "✨ AI Voice Clone" : "Neural TTS"}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Face Photo & Custom Voice Cloning Dropzone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Custom Voice Cloning Dropzone */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${"bg-interactive-base border-border-primary dark:bg-interactive-base/70 dark:border-border-primary"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                      <FiVolume2 className="text-text-primary" />
                      <span>Custom Voice Clone (.mp3)</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-interactive-base/10 text-text-primary border border-border-primary/20 font-mono">Instant Clone</span>
                  </div>
                  <p className="text-[11px] text-text-primary leading-relaxed">
                    Upload a 10–30 sec clear audio recording sample. The neural engine extracts vocal timbres for real-time speech cloning.
                  </p>
                  <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-border-primary/40 hover:border-border-primary rounded-xl cursor-pointer bg-interactive-base/5 hover:bg-interactive-base/10 transition text-center group">
                    <FiUpload className="text-sm text-text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-text-muted">Upload Voice Sample</span>
                    <input type="file" accept="audio/*" className="hidden" />
                  </label>
                </div>

                {/* Avatar Portrait Photo Upload */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${"bg-interactive-base border-border-primary dark:bg-interactive-base/70 dark:border-border-primary"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                      <FiUser className="text-text-primary" />
                      <span>Avatar Portrait Photo</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-interactive-base/10 text-text-primary border border-border-primary/20 font-mono">Optional</span>
                  </div>
                  <p className="text-[11px] text-text-primary leading-relaxed">
                    Upload a front-facing portrait photo or 3D VRM model file for real-time lip-synced avatar generation.
                  </p>
                  <div>
                    <input type="file" accept="image/*,.glb,.vrm" onChange={handleAvatarFileSelected} className="hidden" id="hybrid-avatar-upload" />
                    <label htmlFor="hybrid-avatar-upload" className="flex items-center justify-center gap-2 p-3 border border-dashed border-border-primary/40 hover:border-border-primary rounded-xl cursor-pointer bg-interactive-base/5 hover:bg-interactive-base/10 transition text-center group">
                      <FiUpload className="text-sm text-text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-text-muted">Select Portrait / 3D Model</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP: PUBLISH & FINISH */}
          {currentStepObj.id === "publish" && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-interactive-base/20 border-2 border-border-primary text-text-primary flex items-center justify-center mx-auto text-3xl shadow-lg shadow-black/10/20 animate-pulse">
                <FiCheckCircle />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Ready to Publish AI Agent</h3>
                <p className="text-xs text-text-primary mt-1 max-w-md mx-auto">
                  Your <strong>{name}</strong> agent will be published with dynamic capability architecture.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-left space-y-2 max-w-md mx-auto ${"bg-interactive-base border-border-primary dark:bg-interactive-base dark:border-border-primary"}`}>
                <div className="flex justify-between text-xs">
                  <span className="text-text-primary">Bot Type:</span>
                  <span className="font-bold text-text-primary">{activePurposeObj.title}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-primary">AI Model:</span>
                  <span className="font-bold text-text-muted">{selectedModel}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-primary">Knowledge Files Staged:</span>
                  <span className="font-bold text-text-primary">{stagedFiles.length} files</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-primary">API Tools Staged:</span>
                  <span className="font-bold text-amber-800">{stagedApis.length} APIs</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className={`p-4 border-t flex justify-between items-center shrink-0 ${"border-border-primary bg-interactive-base dark:border-border-primary dark:bg-interactive-base/80"}`}>
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || loading}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${currentStep === 1 || loading
              ? "opacity-40 cursor-not-allowed border border-transparent"
              : "bg-surface-secondary text-text-primary hover:bg-interactive-base dark:bg-interactive-active dark:text-text-muted dark:hover:bg-interactive-base"
              }`}
          >
            <FiArrowLeft />
            <span>Previous</span>
          </button>

          {currentStepObj.id !== "publish" ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-black/10/20 cursor-pointer"
            >
              <span>Next</span>
              <FiArrowRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteBotCreation}
              disabled={loading}
              className="bg-gradient-to-r from-interactive-base to-interactive-hover hover:from-interactive-base hover:to-interactive-hover text-text-primary dark:text-white text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-black/10/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FiCpu className="animate-spin text-sm" />
                  <span>Publishing Agent...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="text-sm" />
                  <span>Publish & Complete</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default CreateBotModal;
