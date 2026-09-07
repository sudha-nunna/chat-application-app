import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiArrowLeft,
  FiUploadCloud,
  FiTrash2,
  FiFileText,
  FiSend,
  FiCheck,
  FiShield,
  FiInfo,
  FiCpu,
  FiHelpCircle,
  FiSave,
  FiCheckCircle,
  FiEdit2,
  FiX,
  FiPlus,
  FiMessageSquare,
  FiStopCircle,
  FiArrowDown,
  FiMic,
  FiVolume2,
  FiVolumeX,
  FiPlay,
  FiSquare,
  FiCode,
  FiDatabase,
  FiSliders,
  FiGlobe,
  FiLayers,
  FiTerminal,
  FiCheckSquare,
  FiExternalLink,
  FiChevronDown
} from "react-icons/fi";
import { TbRobotFace } from "react-icons/tb";
import {
  NobackEndCall,
  NobackEndCallObj,
  backEndCallObjDel
} from "../services/authService";
import {
  useTanStackData,
  useTanStackMutation,
  useTanStackQueryClient
} from "../hooks/useTanStackData";
import { speakText, stopSpeech, getBestVoiceForPreset } from "../utils/speechUtils";
import VoiceConversationManager, { isSelfEcho } from "../components/avatar/VoiceConversationManager";

const EMPTY_ARRAY = Object.freeze([]);

const capitalizeFirstLetter = (val, fallback = "") => {
  const text = (val || fallback || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// System Prompt Templates for Specialized Bots
const STRICT_KNOWLEDGE_PROMPT = `You are a specialized Knowledge Base AI Assistant.
Your single source of truth is the provided PDF document knowledge.

STRICT OPERATIONAL RULES:
1. ONLY answer questions using facts directly mentioned in the retrieved context chunks.
2. If the user's question cannot be answered using the provided knowledge, you MUST politely refuse by stating:
   "I can only answer questions based on the provided PDF knowledge document. This information is not found in the uploaded document."
3. NEVER use outside general knowledge, speculate, or make assumptions beyond the text.
4. Always cite or refer to the relevant section or topic from the document when answering.`;

const VOICE_AGENT_PROMPT = `You are a natural, expressive AI Voice Agent designed for real-time speech conversation.

VOICE OPERATIONAL RULES:
1. Keep replies concise, conversational, and direct (1 to 3 sentences per turn whenever possible).
2. Avoid bullet points, markdown tables, asterisks, or citation tags that sound robotic when read aloud by Text-To-Speech.
3. Speak in an engaging, human tone with natural phrasing and smooth transitions.
4. Ask clarifying questions naturally when needed, just like a helpful human conversation partner.`;

const ACTION_BOT_PROMPT = `You are an Autonomous Action & API Integration AI Agent.
You have access to configured REST API endpoints and tool integrations.

ACTION & TOOL CALLING RULES:
1. Accurately identify when a user request requires calling an external API or tool.
2. Parse required parameters, query strings, and payloads precisely matching the API specification.
3. When executing an action, explain clearly what you are doing, verify parameters, and summarize the API response in human-friendly terms.
4. If an endpoint encounters an error or missing parameter, inform the user clearly and propose the required correction.`;

const AVATAR_BOT_PROMPT = `You are an interactive 3D Avatar AI Assistant.
You combine expressive visual persona, real-time voice synthesis, and intelligent conversation.

AVATAR OPERATIONAL RULES:
1. Maintain an approachable, engaging, and professional digital persona.
2. Respond with clear, natural conversational cadence suitable for synchronized 3D lip-sync and viseme rendering.
3. Be attentive, helpful, and empathetic to user inquiries.`;

// Bot Categories / Types
const BOT_TYPES = [
  {
    type: "CHAT",
    name: "Knowledge Chatbot",
    shortName: "Chat Bot",
    icon: "💬",
    badge: "Vector RAG",
    tagColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    activeBorder: "border-emerald-500/60 dark:border-emerald-400/70",
    activeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    activeGlow: "shadow-emerald-500/15",
    accentColor: "emerald",
    desc: "Grounds responses strictly in uploaded PDF, DOCX & text documents."
  },
  {
    type: "VOICE",
    name: "Voice Agent",
    shortName: "Voice Bot",
    icon: "🎙️",
    badge: "Speech Synthesis",
    tagColor: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/25",
    activeBorder: "border-violet-500/60 dark:border-violet-400/70",
    activeBg: "bg-violet-500/10 dark:bg-violet-500/15",
    activeGlow: "shadow-violet-500/15",
    accentColor: "violet",
    desc: "Real-time voice profiles with audio preview, pacing & pitch controls."
  },
  {
    type: "ACTION",
    name: "Action / API Bot",
    shortName: "Action Bot",
    icon: "⚡",
    badge: "REST Tool Calls",
    tagColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
    activeBorder: "border-amber-500/60 dark:border-amber-400/70",
    activeBg: "bg-amber-500/10 dark:bg-amber-500/15",
    activeGlow: "shadow-amber-500/15",
    accentColor: "amber",
    desc: "Autonomous REST tool calling with Postman Collection (.json) import."
  },
  {
    type: "AVATAR",
    name: "3D Avatar Bot",
    shortName: "Avatar Bot",
    icon: "🎭",
    badge: "3D Viseme Sync",
    tagColor: "text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/25",
    activeBorder: "border-pink-500/60 dark:border-pink-400/70",
    activeBg: "bg-pink-500/10 dark:bg-pink-500/15",
    activeGlow: "shadow-pink-500/15",
    accentColor: "pink",
    desc: "Expressive 3D VRM digital avatar with real-time lip-sync synthesis."
  }
];

// Preset Voice Profiles for Voice Studio
const PRESET_VOICES = [
  {
    id: "default-en",
    name: "Sarah",
    persona: "Warm Female",
    accent: "English (US)",
    gender: "female",
    sampleText: "Hello there! I'm Sarah. I speak with a warm, natural tone and I'm ready to converse with you.",
    color: "from-pink-500 to-rose-500"
  },
  {
    id: "energetic-male",
    name: "Alex",
    persona: "Energetic Male",
    accent: "English (US)",
    gender: "male",
    sampleText: "Hey! I'm Alex. Let's get things done quickly, efficiently, and with high energy.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "professional-female",
    name: "Emily",
    persona: "Professional Female",
    accent: "English (UK)",
    gender: "female",
    sampleText: "Greetings. I'm Emily. I provide articulate, structured, and executive-level responses.",
    color: "from-purple-500 to-indigo-500"
  },
  {
    id: "casual-male",
    name: "Michael",
    persona: "Casual Male",
    accent: "English (AU)",
    gender: "male",
    sampleText: "G'day! I'm Michael. Relaxed, easygoing, and here to make your day smoother.",
    color: "from-emerald-500 to-teal-500"
  }
];

const PRESET_AVATARS = [
  { icon: "🤖", label: "Assistant", color: "from-blue-500 to-indigo-600" },
  { icon: "🎙️", label: "Voice Host", color: "from-violet-500 to-purple-600" },
  { icon: "⚡", label: "Action Bot", color: "from-amber-500 to-orange-600" },
  { icon: "🎭", label: "Persona", color: "from-pink-500 to-rose-600" },
  { icon: "📄", label: "Doc Analyst", color: "from-emerald-500 to-teal-600" },
  { icon: "🧠", label: "Neural Brain", color: "from-fuchsia-500 to-purple-600" },
  { icon: "🛡️", label: "Security Guard", color: "from-cyan-500 to-blue-600" },
  { icon: "🔬", label: "Researcher", color: "from-teal-500 to-emerald-600" }
];

const FALLBACK_MODELS = [
  {
    modelId: "glm-5.3-flash:cloud",
    displayName: "Glm 5.3 Flash Cloud",
    tier: "FAST",
    creditCost: 0.5,
    recommended: true,
    description: "Hosted on active server: codegene"
  },
  {
    modelId: "deepseek-v4-flash:cloud",
    displayName: "Deepseek V4 Flash Cloud",
    tier: "FAST",
    creditCost: 0.5,
    description: "Hosted on active server: codegene"
  },
  {
    modelId: "gemma4:cloud",
    displayName: "Gemma4 Cloud",
    tier: "BALANCED",
    creditCost: 1.0,
    description: "Hosted on active server: codegene"
  },
  {
    modelId: "kimi-k2.7-code:cloud",
    displayName: "Kimi K2.7 Code Cloud",
    tier: "BALANCED",
    creditCost: 1.0,
    description: "Hosted on active server: codegene"
  },
  {
    modelId: "qwen3.5:2b-q4_K_M",
    displayName: "Qwen3.5 2b Q4 K M",
    tier: "BALANCED",
    creditCost: 1.0,
    description: "Hosted on active server: codegene"
  }
];

const AgentStudioPage = () => {
  const navigate = useNavigate();
  const { botId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const convId = searchParams.get("convId");

  const isEditMode = Boolean(botId && botId !== "new");
  const queryClient = useTanStackQueryClient();
  const fileInputRef = useRef(null);
  const postmanInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabledRef = useRef(true);
  const abortControllerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Bot Category Selection (Reads from URL ?type=... on new creations)
  const initialTypeParam = (searchParams.get("type") || "").toUpperCase();
  const initialBotType = ["CHAT", "VOICE", "ACTION", "AVATAR"].includes(initialTypeParam)
    ? initialTypeParam
    : "CHAT";
  const [botType, setBotType] = useState(initialBotType);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);

  // Close type dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Edit Mode Toggle (When false: minimal clean view; when true: edit form)
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(
    initialBotType === "VOICE"
      ? { icon: "🎙️", color: "from-violet-500 to-purple-600" }
      : initialBotType === "ACTION"
      ? { icon: "⚡", color: "from-amber-500 to-orange-600" }
      : initialBotType === "AVATAR"
      ? { icon: "🎭", color: "from-purple-500 to-pink-600" }
      : PRESET_AVATARS[0]
  );
  const [modelsList, setModelsList] = useState(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState("glm-5.3-flash:cloud");
  const [maxChunks, setMaxChunks] = useState(3);
  const [systemPrompt, setSystemPrompt] = useState(
    initialBotType === "VOICE"
      ? VOICE_AGENT_PROMPT
      : initialBotType === "ACTION"
      ? ACTION_BOT_PROMPT
      : initialBotType === "AVATAR"
      ? AVATAR_BOT_PROMPT
      : STRICT_KNOWLEDGE_PROMPT
  );
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isQuickUploading, setIsQuickUploading] = useState(false);
  const quickFileInputRef = useRef(null);
  const [isPromptCustomized, setIsPromptCustomized] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadedBotId, setLoadedBotId] = useState(null);

  // Voice Studio State
  const [selectedVoiceId, setSelectedVoiceId] = useState("default-en");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [customVoiceTestText, setCustomVoiceTestText] = useState("");

  // Voice Agent Real-Time Conversation State
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [voiceState, setVoiceState] = useState("IDLE"); // "IDLE" | "LISTENING" | "THINKING" | "SPEAKING"
  const [sttInterimText, setSttInterimText] = useState("");
  const [isAutoSpeak, setIsAutoSpeak] = useState(true);
  const [micError, setMicError] = useState("");
  const voiceManagerRef = useRef(null);
  const isAutoSpeakRef = useRef(true);
  const isVoiceModeActiveRef = useRef(false);
  const voiceStateRef = useRef("IDLE");
  const handleSendMessageRef = useRef(null);
  const lastAssistantSpokenTextRef = useRef("");

  // Action / API Studio State
  const [stagedApis, setStagedApis] = useState([]);
  const [postmanRawJson, setPostmanRawJson] = useState(null);
  const [postmanImportSummary, setPostmanImportSummary] = useState(null);
  const [showAddManualApi, setShowAddManualApi] = useState(false);
  const [manualApiName, setManualApiName] = useState("");
  const [manualApiMethod, setManualApiMethod] = useState("GET");
  const [manualApiUrl, setManualApiUrl] = useState("");
  const [manualApiAuthType, setManualApiAuthType] = useState("none");
  const [manualApiKey, setManualApiKey] = useState("");
  const [manualApiDesc, setManualApiDesc] = useState("");

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [playingMessageIdx, setPlayingMessageIdx] = useState(null);

  // Auto-scroll mechanics identical to ChatGPT / Claude / ChatArea
  const scrollToBottom = useCallback((force = true) => {
    if (messagesContainerRef.current) {
      if (force) {
        isAutoScrollEnabledRef.current = true;
        setShowScrollBottom(false);
      }
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isAutoScrollEnabledRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setShowScrollBottom(false);
    }
  }, [chatMessages, isChatLoading]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= 80;
    setShowScrollBottom(distanceFromBottom > 100);
    isAutoScrollEnabledRef.current = isAtBottom;
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      isAutoScrollEnabledRef.current = false;
      setShowScrollBottom(true);
    }
  };

  const {
    data: existingBot = null,
    isLoading: isBotLoading,
    isError: isBotError
  } = useTanStackData(
    ["bot", botId],
    async () => {
      const res = await NobackEndCall(`/bots/${botId}`);
      if (!res || res.success === false || res.error) return null;
      return res?.data || res;
    },
    { enabled: isEditMode, retry: 0, staleTime: 30000 }
  );

  // Fetch Existing Bot Files if in Edit Mode
  const { data: existingFiles = EMPTY_ARRAY } = useTanStackData(
    ["bot-files", botId],
    async () => {
      const res = await NobackEndCall(`/bots/${botId}/files`);
      if (!res || res.success === false || res.error) return EMPTY_ARRAY;
      return Array.isArray(res) ? res : res?.data || res?.files || EMPTY_ARRAY;
    },
    { enabled: isEditMode, retry: 0, staleTime: 30000 }
  );

  // Fetch Existing Bot APIs if in Edit Mode
  const { data: existingApis = EMPTY_ARRAY } = useTanStackData(
    ["bot-apis", botId],
    async () => {
      const res = await NobackEndCall(`/bots/${botId}/postman-apis`);
      if (!res || res.success === false || res.error) return EMPTY_ARRAY;
      return Array.isArray(res) ? res : res?.data || res?.endpoints || EMPTY_ARRAY;
    },
    { enabled: isEditMode && !!botId, retry: 0, staleTime: 30000 }
  );

  // Synchronize state when existingBot arrives or updates
  useEffect(() => {
    if (existingBot && loadedBotId !== existingBot._id) {
      setName(existingBot.name || "");
      setDescription(existingBot.description || "");
      if (existingBot.botType) {
        setBotType(existingBot.botType);
      }
      if (existingBot.model) {
        setSelectedModel(existingBot.model);
      }
      if (existingBot.maxChunksPerQuery) {
        setMaxChunks(existingBot.maxChunksPerQuery);
      }
      if (existingBot.systemPrompt || existingBot.botSpecificRules || existingBot.rulesConfig?.rulesText) {
        setSystemPrompt(existingBot.systemPrompt || existingBot.botSpecificRules || existingBot.rulesConfig?.rulesText);
        setIsPromptCustomized(true);
      }
      if (existingBot.voiceProfile?.voiceId || existingBot.voiceConfig?.voiceId) {
        setSelectedVoiceId(existingBot.voiceProfile?.voiceId || existingBot.voiceConfig?.voiceId);
      }
      if (existingBot.voiceProfile?.speed || existingBot.voiceConfig?.rate) {
        setVoiceSpeed(existingBot.voiceProfile?.speed || existingBot.voiceConfig?.rate || 1.0);
      }
      if (existingBot.voiceProfile?.pitch || existingBot.voiceConfig?.pitch) {
        setVoicePitch(existingBot.voiceProfile?.pitch || existingBot.voiceConfig?.pitch || 1.0);
      }
      if (existingBot.avatarEmoji) {
        const found = PRESET_AVATARS.find((a) => a.icon === existingBot.avatarEmoji);
        if (found) {
          setSelectedAvatar(found);
        } else {
          setSelectedAvatar({
            icon: existingBot.avatarEmoji,
            color: existingBot.avatarColor || "from-blue-500 to-indigo-600"
          });
        }
      }
      setLoadedBotId(existingBot._id);
    }
  }, [existingBot, loadedBotId]);

  // Fetch connected models from server
  useEffect(() => {
    NobackEndCall("/models/available")
      .then((res) => {
        const list = res?.models || (Array.isArray(res) ? res : []);
        const active = list.filter((m) => m.enabled !== false && m.modelId !== "auto");
        if (active.length > 0) {
          setModelsList(active);
          setSelectedModel((prev) => {
            if (active.some((m) => m.modelId === prev)) return prev;
            const defaultModel = active.find((m) => m.recommended) || active[0];
            return defaultModel?.modelId || prev;
          });
        }
      })
      .catch((err) => {
        console.warn("Using fallback server models list:", err);
      });
  }, []);

  const currentModelObj = modelsList.find((m) => m.modelId === selectedModel) || modelsList[0];

  // Fetch conversation messages with TanStack Query
  const {
    data: fetchedMessages = EMPTY_ARRAY,
    isFetching: isFetchingMessages
  } = useTanStackData(
    ["botMessages", botId, convId],
    async () => {
      if (!convId || !botId) return EMPTY_ARRAY;
      const res = await NobackEndCall(`/bots/${botId}/conversations/${convId}/messages`);
      return Array.isArray(res) ? res : res?.data || EMPTY_ARRAY;
    },
    { enabled: isEditMode && !!botId && !!convId }
  );

  const prevConvIdRef = useRef(convId);
  const skipNextMessageFetchRef = useRef(false);

  useEffect(() => {
    if (skipNextMessageFetchRef.current) {
      skipNextMessageFetchRef.current = false;
      prevConvIdRef.current = convId;
      return;
    }

    if (convId) {
      if (prevConvIdRef.current !== convId || (fetchedMessages.length > 0 && chatMessages.length === 0)) {
        setChatMessages(fetchedMessages);
        setTimeout(() => {
          scrollToBottom(true);
        }, 50);
      }
    } else if (prevConvIdRef.current !== null && prevConvIdRef.current !== undefined) {
      setChatMessages([]);
    }
    prevConvIdRef.current = convId;
  }, [convId, fetchedMessages, chatMessages.length, scrollToBottom]);

  // Handle Category Switching
  const handleTypeSelect = (newType) => {
    setBotType(newType);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("type", newType);
      return next;
    }, { replace: true });

    // Switch default template prompt if user hasn't edited custom prompt
    if (!isPromptCustomized) {
      if (newType === "VOICE") setSystemPrompt(VOICE_AGENT_PROMPT);
      else if (newType === "ACTION") setSystemPrompt(ACTION_BOT_PROMPT);
      else if (newType === "AVATAR") setSystemPrompt(AVATAR_BOT_PROMPT);
      else setSystemPrompt(STRICT_KNOWLEDGE_PROMPT);
    }

    // Auto-select fitting avatar
    if (newType === "VOICE") {
      setSelectedAvatar({ icon: "🎙️", color: "from-violet-500 to-purple-600" });
    } else if (newType === "ACTION") {
      setSelectedAvatar({ icon: "⚡", color: "from-amber-500 to-orange-600" });
    } else if (newType === "AVATAR") {
      setSelectedAvatar({ icon: "🎭", color: "from-purple-500 to-pink-600" });
    } else {
      setSelectedAvatar(PRESET_AVATARS[0]);
    }
  };

  // Voice Preview Handler (Using Web Speech API with Natural Voice Matching)
  const handlePlayVoicePreview = (voice) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (playingVoiceId === voice.id) {
      stopSpeech();
      setPlayingVoiceId(null);
      return;
    }

    stopSpeech();
    setPlayingVoiceId(voice.id);

    const matchedVoice = getBestVoiceForPreset(voice);
    const isMale = voice.gender === "male";
    let calculatedPitch = voicePitch;
    if (isMale) {
      const vName = (matchedVoice?.name || "").toLowerCase();
      const isKnownMale = ["guy", "ryan", "mark", "david", "male", "alex", "eric", "george", "daniel", "tom", "oliver"].some((m) => vName.includes(m));
      if (!isKnownMale) {
        calculatedPitch = Math.min(voicePitch * 0.82, 0.85);
      }
    }

    const utterance = new SpeechSynthesisUtterance(customVoiceTestText.trim() || voice.sampleText);
    utterance.lang = "en-US";
    utterance.rate = voiceSpeed;
    utterance.pitch = calculatedPitch;
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => setPlayingVoiceId(null);
    utterance.onerror = () => setPlayingVoiceId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Sync refs for live voice cycle
  useEffect(() => {
    isAutoSpeakRef.current = isAutoSpeak;
  }, [isAutoSpeak]);

  useEffect(() => {
    isVoiceModeActiveRef.current = isVoiceModeActive;
  }, [isVoiceModeActive]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // Voice Conversation Manager with Barge-In Speech Interruption
  useEffect(() => {
    voiceManagerRef.current = new VoiceConversationManager({
      onListeningStart: () => {
        setVoiceState("LISTENING");
        setMicError("");
      },
      onSpeechDetected: (text) => {
        // Discard any sound picked up while the assistant is speaking
        if (voiceManagerRef.current?.isAssistantSpeaking) return;
        setSttInterimText(text);
        setVoiceState("LISTENING");
      },
      onSpeechEnded: () => {
        // Recognition cycle completed
      },
      onBargeIn: () => {
        // Barge-in handled via direct user interaction
      },
      onTranscriptComplete: (finalTranscript) => {
        const query = finalTranscript?.trim();
        if (query) {
          // Acoustic Anti-Echo Guard: Discard if the microphone caught the assistant's own voice
          if (isSelfEcho(query, lastAssistantSpokenTextRef.current)) {
            console.info("🛡️ [Voice Anti-Echo] Dropped self-echo transcript:", query);
            return;
          }
          setSttInterimText("");
          setVoiceState("THINKING");
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(query);
          }
        }
      },
      onError: (err) => {
        console.warn("Voice Recognition Error:", err);
        if (err && (String(err).includes("not-allowed") || String(err).includes("permission") || String(err).includes("not supported"))) {
          setMicError("Microphone permission denied or not supported in this browser.");
          setVoiceState("IDLE");
          setIsVoiceModeActive(false);
        }
      }
    });

    return () => {
      stopSpeech();
      if (voiceManagerRef.current) {
        voiceManagerRef.current.stopListening();
      }
    };
  }, []);

  // Cleanup voice session when switching away from VOICE bot
  useEffect(() => {
    if (botType !== "VOICE") {
      setIsVoiceModeActive(false);
      setVoiceState("IDLE");
      setSttInterimText("");
      stopSpeech();
      if (voiceManagerRef.current) {
        voiceManagerRef.current.stopListening();
      }
    }
  }, [botType]);

  // Playground Audio Playback with voice profile matching & hands-free auto-listen loop
  const handlePlayMessageAudio = useCallback((text, idx) => {
    if (playingMessageIdx === idx && voiceStateRef.current === "SPEAKING") {
      stopSpeech();
      setPlayingMessageIdx(null);
      setVoiceState("IDLE");
      return;
    }

    stopSpeech();
    setPlayingMessageIdx(idx);
    setVoiceState("SPEAKING");

    // Track spoken text for acoustic anti-echo filter
    lastAssistantSpokenTextRef.current = text || "";

    // Mute microphone immediately before assistant speaks so AI never hears itself
    if (voiceManagerRef.current) {
      voiceManagerRef.current.setAssistantSpeaking(true, text);
    }

    // Match configured voice persona
    const preset = PRESET_VOICES.find((v) => v.id === selectedVoiceId) || PRESET_VOICES[0];
    const matchedVoice = getBestVoiceForPreset(preset);

    speakText(text, {
      rate: voiceSpeed,
      pitch: voicePitch,
      voice: matchedVoice,
      gender: preset?.gender || "female",
      onStart: () => {
        setVoiceState("SPEAKING");
        if (voiceManagerRef.current) {
          voiceManagerRef.current.setAssistantSpeaking(true, text);
        }
      },
      onEnd: () => {
        setPlayingMessageIdx(null);
        if (voiceManagerRef.current) {
          voiceManagerRef.current.setAssistantSpeaking(false);
        }
        // If continuous hands-free voice call mode is active, transition back to listening
        if (isVoiceModeActiveRef.current && botType === "VOICE") {
          setVoiceState("LISTENING");
        } else {
          setVoiceState("IDLE");
        }
      },
      onError: () => {
        setPlayingMessageIdx(null);
        setVoiceState("IDLE");
        if (voiceManagerRef.current) {
          voiceManagerRef.current.setAssistantSpeaking(false);
        }
      }
    });
  }, [playingMessageIdx, selectedVoiceId, voiceSpeed, voicePitch, botType]);

  const handleToggleVoiceListening = () => {
    if (voiceState === "LISTENING") {
      if (voiceManagerRef.current) {
        voiceManagerRef.current.stopListening();
      }
      setVoiceState("IDLE");
      const current = (sttInterimText || chatInput).trim();
      if (current) {
        setSttInterimText("");
        handleSendMessage(current);
      }
    } else {
      // User tapped mic button: Stop any AI speech immediately, un-mute mic, and listen to user
      stopSpeech();
      setPlayingMessageIdx(null);
      setSttInterimText("");
      if (voiceManagerRef.current) {
        voiceManagerRef.current.setAssistantSpeaking(false);
        voiceManagerRef.current.startListening(isVoiceModeActive ? "HANDS_FREE" : "PUSH_TO_TALK");
      }
      setVoiceState("LISTENING");
    }
  };

  const handleToggleLiveVoiceMode = () => {
    const nextState = !isVoiceModeActive;
    setIsVoiceModeActive(nextState);
    if (nextState) {
      stopSpeech();
      setPlayingMessageIdx(null);
      setSttInterimText("");
      if (voiceManagerRef.current) {
        voiceManagerRef.current.startListening("HANDS_FREE");
      }
      setVoiceState("LISTENING");
    } else {
      if (voiceManagerRef.current) {
        voiceManagerRef.current.stopListening();
      }
      stopSpeech();
      setVoiceState("IDLE");
      setSttInterimText("");
    }
  };

  // Knowledge File Upload Handler
  const handleFileUpload = (files) => {
    setError("");
    const fileList = Array.from(files);

    fileList.forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "txt", "docx", "md", "json"].includes(ext)) {
        setError(`File .${ext} is not supported. Please upload PDF, TXT, DOCX, or Markdown files.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        const base64 =
          typeof fileContent === "string" && fileContent.includes(",")
            ? fileContent.split(",")[1]
            : "";

        setStagedFiles((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileType: ext,
            fileCategory: "knowledge",
            fileSize: file.size,
            fileContentBase64: base64
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeStagedFile = (idx) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Instant Quick Upload Handler for Active Bots
  const handleQuickUpload = async (files) => {
    if (!files || files.length === 0) return;
    if (!botId) {
      handleFileUpload(files);
      return;
    }
    setError("");
    setIsQuickUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["pdf", "txt", "docx", "md", "json"].includes(ext)) {
          setError(`File .${ext} is not supported. Please upload PDF, TXT, DOCX, or Markdown files.`);
          continue;
        }

        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result;
            resolve(typeof res === "string" && res.includes(",") ? res.split(",")[1] : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await NobackEndCallObj(
          `/bots/${botId}/upload`,
          {
            fileName: file.name,
            fileType: ext,
            fileCategory: "knowledge",
            fileSize: file.size,
            fileContentBase64: base64
          },
          "post"
        );
      }
      queryClient.invalidateQueries({ queryKey: ["bot-files", botId] });
      queryClient.invalidateQueries({ queryKey: ["bot", botId] });
      setSuccessMsg("Knowledge document(s) uploaded and vector-indexed!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err?.error || err?.message || "Failed to upload document.");
    } finally {
      setIsQuickUploading(false);
    }
  };

  // Postman Collection JSON Import
  const handlePostmanFile = (files) => {
    setError("");
    const file = files && files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Please upload a valid Postman collection JSON file (.json).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const json = JSON.parse(text);

        setPostmanRawJson(text);

        const collectionName = json.info?.name || file.name.replace(/\.json$/i, "");
        const collectionDesc = json.info?.description || "";

        const parsed = [];
        const extractItems = (items) => {
          if (!Array.isArray(items)) return;
          for (const item of items) {
            if (item.item) {
              extractItems(item.item);
            } else if (item.request) {
              const req = item.request;
              let urlStr = "";
              if (typeof req.url === "string") {
                urlStr = req.url;
              } else if (req.url?.raw) {
                urlStr = req.url.raw;
              } else if (req.url?.host) {
                const proto = req.url.protocol ? req.url.protocol + "://" : "https://";
                const host = Array.isArray(req.url.host) ? req.url.host.join(".") : req.url.host;
                const path = Array.isArray(req.url.path) ? "/" + req.url.path.join("/") : "";
                urlStr = `${proto}${host}${path}`;
              }

              parsed.push({
                name: item.name || "API Endpoint",
                method: (req.method || "GET").toUpperCase(),
                url: urlStr || "https://api.example.com/v1/resource",
                authType: req.auth?.type || "none",
                apiKey: "",
                description: item.description || req.description || "",
                source: "postman"
              });
            }
          }
        };

        extractItems(json.item || json.items || [json]);

        if (parsed.length > 0) {
          setStagedApis((prev) => [...prev, ...parsed]);
          setPostmanImportSummary({
            name: collectionName,
            count: parsed.length,
            description: collectionDesc
          });
          setSuccessMsg(`Imported ${parsed.length} endpoints from Postman collection "${collectionName}"!`);
          setTimeout(() => setSuccessMsg(""), 4000);
        } else {
          setError("No valid request endpoints found in the provided Postman collection JSON file.");
        }
      } catch {
        setError("Failed to parse Postman JSON file. Please ensure it is a valid v2/v2.1 collection.");
      }
    };
    reader.readAsText(file);
  };

  // Manual REST API Addition
  const handleAddManualApi = () => {
    if (!manualApiName.trim() || !manualApiUrl.trim()) {
      setError("Please provide an API Name and Endpoint URL.");
      return;
    }
    setError("");
    setStagedApis((prev) => [
      ...prev,
      {
        name: manualApiName.trim(),
        method: manualApiMethod,
        url: manualApiUrl.trim(),
        authType: manualApiAuthType,
        apiKey: manualApiKey.trim(),
        description: manualApiDesc.trim(),
        source: "manual"
      }
    ]);
    setManualApiName("");
    setManualApiUrl("");
    setManualApiDesc("");
    setManualApiKey("");
    setShowAddManualApi(false);
    setSuccessMsg("Added API endpoint tool!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleRemoveStagedApi = (idx) => {
    setStagedApis((prev) => prev.filter((_, i) => i !== idx));
  };

  // TanStack Mutation for Bot Creation (/bots/new)
  const createBotMutation = useTanStackMutation({
    mutationFn: async (payload) => {
      const newBot = await NobackEndCallObj("/bots", payload, "post");
      const createdBotId = newBot?._id || newBot?.data?._id;

      if (!createdBotId) {
        throw new Error("Bot creation failed: no bot ID returned");
      }

      // Upload staged files if any
      if (stagedFiles.length > 0) {
        for (const file of stagedFiles) {
          const uploadPayload = {
            fileName: file.fileName,
            fileType: file.fileType,
            fileCategory: "knowledge",
            fileSize: file.fileSize,
            fileContentBase64: file.fileContentBase64
          };
          await NobackEndCallObj(`/bots/${createdBotId}/upload`, uploadPayload, "post");
        }
      }

      // Import Postman collection if provided
      if (postmanRawJson) {
        try {
          await NobackEndCallObj(
            `/bots/${createdBotId}/postman-import`,
            { collectionJson: postmanRawJson },
            "post"
          );
        } catch (postmanErr) {
          console.warn("Postman import during creation:", postmanErr);
        }
      }

      return newBot;
    },
    onSuccess: (newBot) => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      const createdBotId = newBot?._id || newBot?.data?._id;
      navigate(`/bots/${createdBotId}`);
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to create and publish agent. Please try again.");
    }
  });

  // TanStack Mutation for Bot Update (Edit Mode)
  const updateBotMutation = useTanStackMutation({
    mutationFn: async (payload) => {
      const updated = await NobackEndCallObj(`/bots/${botId}`, payload, "put");
      if (stagedFiles.length > 0) {
        for (const file of stagedFiles) {
          const uploadPayload = {
            fileName: file.fileName,
            fileType: file.fileType,
            fileCategory: "knowledge",
            fileSize: file.fileSize,
            fileContentBase64: file.fileContentBase64
          };
          await NobackEndCallObj(`/bots/${botId}/upload`, uploadPayload, "post");
        }
      }
      if (postmanRawJson) {
        try {
          await NobackEndCallObj(
            `/bots/${botId}/postman-import`,
            { collectionJson: postmanRawJson },
            "post"
          );
        } catch (postmanErr) {
          console.warn("Postman import during update:", postmanErr);
        }
      }
      return updated;
    },
    onSuccess: () => {
      setStagedFiles([]);
      setPostmanRawJson(null);
      setIsEditingConfig(false);
      setLoadedBotId(null);
      setSuccessMsg("Agent updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
      queryClient.invalidateQueries({ queryKey: ["bot", botId] });
      queryClient.invalidateQueries({ queryKey: ["bot-files", botId] });
      queryClient.invalidateQueries({ queryKey: ["bot-apis", botId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to update agent.");
    }
  });

  // Delete Bot Mutation
  const deleteBotMutation = useTanStackMutation({
    mutationFn: async () => {
      return await backEndCallObjDel("/bots", botId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      navigate("/bots");
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to delete agent.");
    }
  });

  // Delete File Mutation
  const deleteFileMutation = useTanStackMutation({
    mutationFn: async (fileId) => {
      return await backEndCallObjDel(`/bots/${botId}/files`, fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-files", botId] });
      queryClient.invalidateQueries({ queryKey: ["bot", botId] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to delete file.");
    }
  });

  // Delete Postman API Mutation
  const deleteApiMutation = useTanStackMutation({
    mutationFn: async (apiId) => {
      return await backEndCallObjDel(`/bots/${botId}/postman-apis`, apiId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-apis", botId] });
    },
    onError: (err) => {
      setError(err?.error || err?.message || "Failed to delete API endpoint.");
    }
  });

  const handleSaveConfiguration = () => {
    if (!name.trim()) {
      setError("Please provide an Agent Name.");
      return;
    }

    setError("");
    const selectedVoiceObj = PRESET_VOICES.find((v) => v.id === selectedVoiceId) || PRESET_VOICES[0];

    const payload = {
      name: name.trim(),
      description: description.trim(),
      model: selectedModel,
      botType: botType,
      capabilities: {
        enableRag: ["CHAT", "VOICE", "AVATAR", "HYBRID"].includes(botType),
        enableActions: ["ACTION", "HYBRID"].includes(botType),
        enableVoice: ["VOICE", "AVATAR", "HYBRID"].includes(botType),
        enableAvatar: ["AVATAR", "HYBRID"].includes(botType)
      },
      voiceProfile: {
        voiceId: selectedVoiceId,
        voiceName: selectedVoiceObj.name,
        voiceType: "PRESET",
        speed: voiceSpeed,
        pitch: voicePitch,
        gender: selectedVoiceObj.gender,
        lang: selectedVoiceObj.accent
      },
      voiceConfig: {
        voiceId: selectedVoiceId,
        rate: voiceSpeed,
        pitch: voicePitch
      },
      initialApis: stagedApis.map((a) => ({
        name: a.name,
        url: a.url,
        method: a.method,
        authType: a.authType,
        apiKey: a.apiKey
      })),
      systemPrompt: systemPrompt.trim(),
      botSpecificRules: systemPrompt.trim(),
      rulesText: systemPrompt.trim(),
      maxChunksPerQuery: maxChunks,
      avatarEmoji: selectedAvatar.icon,
      avatarColor: selectedAvatar.color
    };

    if (isEditMode) {
      updateBotMutation.mutate(payload);
    } else {
      createBotMutation.mutate(payload);
    }
  };

  const handleCancelEdit = () => {
    if (existingBot) {
      setName(existingBot.name || "");
      setDescription(existingBot.description || "");
      setBotType(existingBot.botType || "CHAT");
      setSelectedModel(existingBot.model || "glm-5.3-flash:cloud");
      setMaxChunks(existingBot.maxChunksPerQuery || 3);
      setSystemPrompt(
        existingBot.systemPrompt ||
          existingBot.botSpecificRules ||
          existingBot.rulesConfig?.rulesText ||
          STRICT_KNOWLEDGE_PROMPT
      );
      if (existingBot.voiceProfile?.voiceId || existingBot.voiceConfig?.voiceId) {
        setSelectedVoiceId(existingBot.voiceProfile?.voiceId || existingBot.voiceConfig?.voiceId);
      }
      if (existingBot.voiceProfile?.speed || existingBot.voiceConfig?.rate) {
        setVoiceSpeed(existingBot.voiceProfile?.speed || existingBot.voiceConfig?.rate || 1.0);
      }
      if (existingBot.voiceProfile?.pitch || existingBot.voiceConfig?.pitch) {
        setVoicePitch(existingBot.voiceProfile?.pitch || existingBot.voiceConfig?.pitch || 1.0);
      }
      if (existingBot.avatarEmoji) {
        const found = PRESET_AVATARS.find((a) => a.icon === existingBot.avatarEmoji);
        if (found) {
          setSelectedAvatar(found);
        }
      }
    }
    setStagedFiles([]);
    setStagedApis([]);
    setPostmanRawJson(null);
    setIsEditingConfig(false);
    setError("");
  };

  const handleDeleteBot = () => {
    if (!window.confirm(`Are you sure you want to delete '${name.trim() || "this agent"}'?`)) {
      return;
    }
    deleteBotMutation.mutate();
  };

  // Start a fresh conversation
  const handleStartNewChat = () => {
    setSearchParams({}, { replace: true });
    setChatMessages([]);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsChatLoading(false);
  };

  // Send message and stream reply from bot endpoint
  const handleSendMessage = useCallback(
    async (textOverride = null) => {
      const query = (textOverride !== null ? textOverride : chatInput).trim();
      if (!query || isChatLoading) return;

      if (textOverride === null) setChatInput("");
      setIsChatLoading(true);

      let targetConvId = convId;

      // Auto-create conversation if not yet created
      if (isEditMode && botId && !targetConvId) {
        try {
          const createRes = await NobackEndCallObj(
            `/bots/${botId}/conversations`,
            { title: query.slice(0, 30) || "New Conversation" },
            "post"
          );
          targetConvId = createRes?._id || createRes?.data?._id;
          if (targetConvId) {
            skipNextMessageFetchRef.current = true;
            setSearchParams({ convId: targetConvId }, { replace: true });
            queryClient.invalidateQueries({ queryKey: ["botConversations", botId] });
          }
        } catch (err) {
          console.error("Failed to auto-create conversation:", err);
        }
      }

      const userMsg = { role: "user", content: query, timestamp: new Date().toISOString() };
      const botMsg = { role: "assistant", content: "", sources: [], timestamp: new Date().toISOString() };
      setChatMessages((prev) => [...prev, userMsg, botMsg]);
      scrollToBottom(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const token = localStorage.getItem("token");

      // If bot exists, stream live response
      if (isEditMode && botId && token) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/bots/${botId}/chat/stream`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                conversationId: targetConvId,
                message: query
              }),
              signal: controller.signal
            }
          );

          if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedAnswer = "";
            let accumulatedSources = [];
            let buffer = "";

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("data: ")) {
                    const dataStr = trimmed.replace("data: ", "").trim();
                    if (dataStr === "[DONE]") continue;

                    try {
                      const parsed = JSON.parse(dataStr);
                      const tokenChunk = parsed.chunk ?? parsed.text ?? parsed.content ?? parsed.response ?? "";
                      if (tokenChunk) {
                        accumulatedAnswer += tokenChunk;
                      }
                      if (parsed.sources && Array.isArray(parsed.sources)) {
                        accumulatedSources = parsed.sources;
                      }

                      setChatMessages((prev) => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === "assistant") {
                          return [
                            ...prev.slice(0, -1),
                            {
                              ...last,
                              content: accumulatedAnswer,
                              sources: accumulatedSources.length > 0 ? accumulatedSources : (last.sources || [])
                            }
                          ];
                        }
                        return [
                          ...prev,
                          {
                            role: "assistant",
                            content: accumulatedAnswer,
                            sources: accumulatedSources
                          }
                        ];
                      });
                    } catch {
                      // Non-JSON SSE payload
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }

            setIsChatLoading(false);
            abortControllerRef.current = null;
            queryClient.invalidateQueries({ queryKey: ["botConversations", botId] });
            setTimeout(() => {
              scrollToBottom(true);
            }, 50);

            // Auto-speak response out loud for Voice Agent
            if (botType === "VOICE" && isAutoSpeakRef.current && accumulatedAnswer) {
              setTimeout(() => {
                setChatMessages((latest) => {
                  const targetIdx = latest.length - 1;
                  handlePlayMessageAudio(accumulatedAnswer, targetIdx);
                  return latest;
                });
              }, 150);
            }
            return;
          }
        } catch (err) {
          if (err.name === "AbortError") {
            setIsChatLoading(false);
            return;
          }
          console.warn("Live bot stream error, falling back to simulated preview:", err);
        }
      }

      // Fallback Simulated Preview Response tailored to botType
      setTimeout(() => {
        let botResponse = "";
        let simulatedSources = [];

        if (botType === "VOICE") {
          botResponse = `Hello! I heard your message: "${query}". As your real-time Voice Assistant, I listen to your speech and respond out loud with natural voice synthesis and smooth pacing. How can I help you today?`;
        } else if (botType === "ACTION") {
          const sampleApi = stagedApis[0] || existingApis[0];
          if (sampleApi) {
            botResponse = `⚡ **Autonomous Tool Execution Simulated**:\n- **Invoked**: \`${sampleApi.method} ${sampleApi.url}\`\n- **Target Operation**: ${sampleApi.name}\n- **Status**: \`200 OK\`\n\nProcessed query "${query}" and returned clean, synthesized results from connected API endpoint.`;
          } else {
            botResponse = `⚡ **Action Bot Ready**: No REST endpoints have been staged yet. You can import a Postman Collection or add REST API tools on the left to enable autonomous tool dispatch for "${query}".`;
          }
        } else {
          // Knowledge Chatbot
          const lowerQuery = query.toLowerCase();
          const isOutScope =
            lowerQuery.includes("capital of") ||
            lowerQuery.includes("weather") ||
            lowerQuery.includes("president") ||
            lowerQuery.includes("who won");

          const totalFilesCount = (existingFiles?.length || 0) + stagedFiles.length;

          if (totalFilesCount === 0) {
            botResponse =
              "No PDF knowledge documents have been attached yet. Please upload documents on the left to ground my answers in your content.";
          } else if (isOutScope) {
            botResponse =
              "I can only answer questions based on the provided PDF knowledge document. This information is not found in the uploaded document.";
          } else {
            const topFile =
              existingFiles[0]?.fileName ||
              existingFiles[0]?.originalName ||
              stagedFiles[0]?.fileName ||
              "knowledge-document.pdf";

            botResponse = `Based strictly on your attached knowledge document "${topFile}":\n\nThis is a live response answering your query about "${query}". The system performs semantic vector cosine similarity search against your embeddings, retrieving up to ${maxChunks} contextual chunks.`;
            simulatedSources = [
              {
                index: 1,
                fileName: topFile,
                score: 0.94,
                snippet: `Direct excerpt matching "${query}" extracted from ${topFile}.`
              },
              {
                index: 2,
                fileName: topFile,
                score: 0.88,
                snippet: `Supporting contextual chunk adhering to strict knowledge boundary rules.`
              }
            ];
          }
        }

        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                content: botResponse,
                sources: simulatedSources
              }
            ];
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: botResponse,
              sources: simulatedSources
            }
          ];
        });
        setIsChatLoading(false);
        abortControllerRef.current = null;

        setTimeout(() => {
          scrollToBottom(true);
        }, 50);

        // Auto-speak response out loud for Voice Agent
        if (botType === "VOICE" && isAutoSpeakRef.current && botResponse) {
          setTimeout(() => {
            setChatMessages((latest) => {
              const targetIdx = latest.length - 1;
              handlePlayMessageAudio(botResponse, targetIdx);
              return latest;
            });
          }, 150);
        }
      }, 400);
    },
    [
      botId,
      botType,
      chatInput,
      convId,
      existingApis,
      existingFiles,
      handlePlayMessageAudio,
      isChatLoading,
      isEditMode,
      maxChunks,
      queryClient,
      scrollToBottom,
      setSearchParams,
      stagedApis,
      stagedFiles
    ]
  );

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const isSaving = createBotMutation.isPending || updateBotMutation.isPending;
  const currentBotTypeObj = BOT_TYPES.find((b) => b.type === botType) || BOT_TYPES[0];

  if (isEditMode && isBotLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface-primary text-text-primary text-xs font-medium">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Agent Workspace...</span>
        </div>
      </div>
    );
  }

  if (isEditMode && isBotError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-surface-primary text-text-primary gap-4 p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 text-2xl">⚠️</div>
        <div className="text-center">
          <h2 className="text-sm font-bold text-text-primary mb-1">Agent Not Found</h2>
          <p className="text-xs text-text-muted">This agent may have been deleted or you don&apos;t have access to it.</p>
        </div>
        <button
          onClick={() => navigate("/bots")}
          className="px-4 py-2 rounded-xl bg-accent-primary text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer flex items-center gap-2"
        >
          <FiArrowLeft className="text-sm" /> Back to Agents
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-surface-primary text-text-primary overflow-hidden">
      {/* 1. TOP HEADER BAR */}
      <header className="h-14 sm:h-16 border-b border-border-primary/50 px-3 sm:px-6 flex items-center justify-between shrink-0 bg-surface-secondary/40 backdrop-blur-md z-10 gap-2 sm:gap-4 w-full">
        {/* Left: Navigation & Agent Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/bots");
              }
            }}
            className="p-2 rounded-xl hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-all flex items-center justify-center cursor-pointer border border-border-primary/60 bg-surface-primary/70 shadow-2xs hover:shadow-xs shrink-0"
            title="Back to Bots"
          >
            <FiArrowLeft className="text-base" />
          </button>

          <div className="h-5 w-px bg-border-primary/40 hidden sm:block shrink-0"></div>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* Compact Agent Avatar Icon */}
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-sm shadow-xs shrink-0 ring-1 ring-black/5 dark:ring-white/10`}
            >
              {selectedAvatar.icon}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-nowrap">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-text-primary whitespace-nowrap truncate max-w-[110px] sm:max-w-[180px] md:max-w-[260px]">
                {capitalizeFirstLetter(name, isEditMode ? "AI Agent" : `New ${currentBotTypeObj.shortName}`)}
              </h1>

              <span
                className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase border flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs ${currentBotTypeObj.tagColor}`}
              >
                <span>{currentBotTypeObj.icon}</span>
                <span>{currentBotTypeObj.shortName}</span>
              </span>

              {isEditMode && (
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0 whitespace-nowrap">
                  {isEditingConfig ? "Editing" : "Active"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Notifications & Studio Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
          {error && (
            <div
              className="hidden lg:flex items-center gap-1.5 text-[11px] text-red-500 font-medium px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg max-w-[180px] truncate shrink-0 cursor-pointer"
              title={error}
              onClick={() => setError("")}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse"></span>
              <span className="truncate">Limit Reached</span>
            </div>
          )}
          {successMsg && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1.5 animate-fadeIn shadow-2xs shrink-0">
              <FiCheckCircle className="text-xs" />
              <span>{successMsg}</span>
            </div>
          )}

          {isEditMode ? (
            isEditingConfig ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary transition-all cursor-pointer flex items-center gap-1.5 border border-border-primary/50"
                >
                  <FiX className="text-sm" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveConfiguration}
                  disabled={isSaving}
                  className="px-4.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-accent-primary hover:opacity-95 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="text-sm" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDeleteBot}
                  disabled={deleteBotMutation.isPending}
                  className="p-2.5 rounded-xl text-xs font-medium hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-all cursor-pointer border border-transparent hover:border-red-500/20"
                  title="Delete Agent"
                >
                  <FiTrash2 className="text-sm" />
                </button>
                <button
                  onClick={() => setIsEditingConfig(true)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-surface-secondary hover:bg-surface-secondary/80 border border-border-primary/60 text-text-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <FiEdit2 className="text-xs text-accent-primary" />
                  <span>Edit Configuration</span>
                </button>
              </>
            )
          ) : (
            <>
              <button
                onClick={() => {
                  if (window.confirm("Reset agent configurations to default?")) {
                    setName("");
                    setDescription("");
                    setStagedFiles([]);
                    setStagedApis([]);
                    setPostmanRawJson(null);
                    setPostmanImportSummary(null);
                    if (botType === "VOICE") setSystemPrompt(VOICE_AGENT_PROMPT);
                    else if (botType === "ACTION") setSystemPrompt(ACTION_BOT_PROMPT);
                    else setSystemPrompt(STRICT_KNOWLEDGE_PROMPT);
                    setIsPromptCustomized(false);
                    setError("");
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-secondary border border-transparent hover:border-border-primary/50 transition-all cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={handleSaveConfiguration}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-accent-primary hover:opacity-95 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Publishing Agent...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="text-sm" />
                    <span>Save &amp; Publish Agent</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. SPLIT-SCREEN WORKSPACE (Left: Studio Configuration / Right: Real Chat) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr] overflow-hidden">
        {/* LEFT PANE: CONFIGURATION & STUDIO FORMS */}
        <div className="h-full overflow-y-auto custom-scrollbar p-2 sm:p-3 border-r border-border-primary/40 bg-surface-secondary/10">
          <div className="space-y-2 w-full">
            {/* Full Error Alert Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-medium flex items-center justify-between gap-2 animate-fadeIn shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
                  <span className="leading-snug">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="p-1 hover:bg-red-500/10 rounded-lg cursor-pointer shrink-0 text-red-400 hover:text-red-500"
                  title="Dismiss error"
                >
                  <FiX className="text-sm" />
                </button>
              </div>
            )}

            {/* 1. AGENT CATEGORY SELECTOR (SLEEK SEGMENTED STUDIO SWITCHER) */}
            {(!isEditMode || isEditingConfig) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <FiLayers className="text-xs text-accent-primary" />
                    Agent Modality Architecture
                  </span>
                  <span className="text-[9px] font-mono text-text-muted bg-surface-primary px-1.5 py-0.2 rounded border border-border-primary/50">
                    4 Multi-Agent Modes
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {BOT_TYPES.map((bt) => {
                    const isSelected = botType === bt.type;
                    return (
                      <button
                        key={bt.type}
                        type="button"
                        onClick={() => handleTypeSelect(bt.type)}
                        className={`p-2 rounded-lg border text-left transition-all duration-150 cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                          isSelected
                            ? `${bt.activeBorder} ${bt.activeBg} ring-1 ring-accent-primary/30 shadow-2xs`
                            : "border-border-primary/60 bg-surface-primary hover:border-border-primary/90 hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs">{bt.icon}</span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-[11px] font-bold leading-tight truncate ${
                              isSelected ? "text-text-primary" : "text-text-secondary"
                            }`}
                          >
                            {bt.shortName}
                          </p>
                          <p className="text-[9px] font-mono text-text-muted truncate">
                            {bt.badge}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Type Purpose & Badge Banner */}
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-primary border border-border-primary/70 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs shrink-0">{currentBotTypeObj.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-muted leading-tight">
                        <strong className="text-text-primary font-semibold">{currentBotTypeObj.name}:</strong>{" "}
                        {currentBotTypeObj.desc}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border shrink-0 whitespace-nowrap shadow-2xs ${currentBotTypeObj.tagColor}`}
                  >
                    {currentBotTypeObj.badge}
                  </span>
                </div>
              </div>
            )}

          {isEditMode && !isEditingConfig ? (
            /* MINIMAL SCOPE & ACTIVE OVERVIEW VIEW (DEFAULT IN EDIT MODE) */
            <div className="space-y-2">
              {/* Agent Overview & Scope Card */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-sm shadow-xs shrink-0`}
                    >
                      {selectedAvatar.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-xs sm:text-sm font-bold text-text-primary tracking-tight truncate">
                          {capitalizeFirstLetter(name || existingBot?.name, "Agent Name")}
                        </h2>
                        <span
                          className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold uppercase border shrink-0 ${currentBotTypeObj.tagColor}`}
                        >
                          {currentBotTypeObj.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-snug">
                        {description || existingBot?.description || currentBotTypeObj.desc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingConfig(true)}
                    className="p-1.5 rounded-lg hover:bg-surface-primary text-text-muted hover:text-text-primary border border-border-primary/50 transition cursor-pointer shrink-0"
                    title="Edit Agent Scope"
                  >
                    <FiEdit2 className="text-xs" />
                  </button>
                </div>

                <div className="pt-2 border-t border-border-primary/30 flex items-center justify-between text-[11px] text-text-muted">
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 text-[10px]">
                    <FiShield className="text-[11px]" /> Guardrail Active
                  </span>
                  <span className="font-mono text-[10px] bg-surface-primary px-1.5 py-0.2 rounded border border-border-primary/50">
                    {botType === "VOICE"
                      ? `Voice: ${PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.name || "Sarah"}`
                      : botType === "ACTION"
                      ? `${existingApis.length} APIs`
                      : `${existingFiles.length} Docs`}
                  </span>
                </div>
              </div>

              {/* Connected Model Card */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                    <FiCpu className="text-xs" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-bold text-text-primary truncate">
                        {currentModelObj?.displayName || selectedModel}
                      </p>
                      <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-surface-primary text-text-muted border border-border-primary/50">
                        {currentModelObj?.tier || "FAST"}
                      </span>
                    </div>
                    <p className="text-[9px] text-text-muted font-mono truncate mt-0.5">
                      {selectedModel} &bull; {currentModelObj?.creditCost != null ? `${currentModelObj.creditCost} cr/query` : "0.5 cr"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-500 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Engine</span>
                </div>
              </div>

              {/* Bot-Specific Minimal Cards */}
              {botType === "VOICE" && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between border-b border-border-primary/30 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <FiMic className="text-xs text-violet-500" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        Configured Voice Profile
                      </h3>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold font-mono">
                      Speech Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border-primary/50 bg-surface-primary text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white text-xs shrink-0">
                        🎙️
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-text-primary text-[11px] truncate">
                          {PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.name || "Sarah"} &bull;{" "}
                          <span className="font-normal text-text-muted">
                            {PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.persona || "Warm Female"}
                          </span>
                        </p>
                        <p className="text-[9px] text-text-muted font-mono truncate">
                          Speed: {voiceSpeed}x &bull; Pitch: {voicePitch} &bull;{" "}
                          {PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.accent || "English (US)"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handlePlayVoicePreview(
                          PRESET_VOICES.find((v) => v.id === selectedVoiceId) || PRESET_VOICES[0]
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-semibold text-[10px] transition cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {playingVoiceId === selectedVoiceId ? (
                        <>
                          <FiSquare className="text-[9px]" /> Stop
                        </>
                      ) : (
                        <>
                          <FiPlay className="text-[9px]" /> Preview
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {botType === "ACTION" && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between border-b border-border-primary/30 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <FiTerminal className="text-xs text-amber-500" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        Connected REST Endpoints ({existingApis.length})
                      </h3>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold font-mono">
                      Tool Calling Active
                    </span>
                  </div>

                  {existingApis.length === 0 ? (
                    <div className="py-3 text-center text-xs text-text-muted">
                      <p className="text-[11px]">No REST endpoints attached yet.</p>
                      <button
                        onClick={() => setIsEditingConfig(true)}
                        className="mt-1 text-accent-primary hover:underline font-semibold text-[11px] cursor-pointer"
                      >
                        + Import Postman Collection or Add API
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {existingApis.map((api, idx) => (
                        <div
                          key={api._id || idx}
                          className="flex items-center justify-between p-2 rounded-lg border border-border-primary/50 bg-surface-primary text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                api.method === "POST"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : api.method === "PUT"
                                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                                  : api.method === "DELETE"
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {api.method || "GET"}
                            </span>
                            <div className="truncate">
                              <p className="font-semibold text-text-primary text-[11px] truncate">{api.name}</p>
                              <p className="text-[8px] text-text-muted font-mono truncate">{api.url}</p>
                            </div>
                          </div>
                          {api._id && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete endpoint '${api.name}'?`)) {
                                  deleteApiMutation.mutate(api._id);
                                }
                              }}
                              className="p-1 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
                              title="Delete API"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Knowledge Base Documents (Accessible for Voice, Chat, and Avatar Bots!) */}
              {(botType === "CHAT" || botType === "VOICE" || botType === "AVATAR") && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between border-b border-border-primary/30 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <FiFileText className="text-xs text-emerald-500" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        Knowledge Documents ({existingFiles.length})
                      </h3>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold font-mono">
                      {existingFiles.length > 0 ? "Vector Grounded" : "Conversational"}
                    </span>
                  </div>

                  {existingFiles.length === 0 ? (
                    <div className="py-2 px-1 text-xs text-text-muted">
                      <p className="text-[10px] leading-relaxed">
                        {botType === "VOICE"
                          ? "No documents attached. Agent answers freely using real-time speech synthesis. Upload documents below to ground spoken responses on documentation."
                          : "No documents attached yet. Upload documentation to enable semantic RAG."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                      {existingFiles.map((f) => (
                        <div
                          key={f._id}
                          className="flex items-center justify-between p-2 rounded-lg border border-border-primary/50 bg-surface-primary text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 text-xs">
                              <FiFileText />
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-text-primary truncate text-[11px]">
                                {f.fileName || f.originalName || "Document"}
                              </p>
                              <p className="text-[8px] text-text-muted font-mono">
                                {f.fileSize ? `${(f.fileSize / 1024).toFixed(1)} KB • ` : ""}
                                Vector Indexed
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove '${f.fileName || "this document"}'?`)) {
                                deleteFileMutation.mutate(f._id);
                              }
                            }}
                            disabled={deleteFileMutation.isPending}
                            className="p-1 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
                            title="Delete file"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Direct Document Upload Dropzone & File Picker */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleQuickUpload(e.dataTransfer.files);
                    }}
                    onClick={() => quickFileInputRef.current?.click()}
                    className="border border-dashed border-accent-primary/40 hover:border-accent-primary/80 rounded-lg py-2 px-2.5 text-center cursor-pointer bg-accent-primary/5 hover:bg-accent-primary/10 transition group flex items-center justify-center gap-2"
                  >
                    <input
                      ref={quickFileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.txt,.docx,.md,.json"
                      onChange={(e) => handleQuickUpload(e.target.files)}
                      className="hidden"
                    />
                    <div className="w-5 h-5 rounded-md bg-accent-primary/15 text-accent-primary flex items-center justify-center text-xs group-hover:scale-105 transition shrink-0">
                      {isQuickUploading ? (
                        <div className="w-3 h-3 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiUploadCloud />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[10px] font-bold text-text-primary truncate">
                        {isQuickUploading ? (
                          "Uploading & vector indexing..."
                        ) : (
                          <span>
                            Upload PDF / Docs or <span className="text-accent-primary underline">browse</span>
                          </span>
                        )}
                      </p>
                      <p className="text-[8px] text-text-muted truncate">
                        PDF, DOCX, TXT, MD &bull; Auto-indexes for vector RAG
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Trigger Banner */}
              <div className="p-2.5 rounded-lg border border-dashed border-border-primary/60 bg-surface-primary/40 flex items-center justify-between text-xs">
                <span className="text-text-muted text-[10px] truncate">
                  Need to change configurations or prompt?
                </span>
                <button
                  onClick={() => setIsEditingConfig(true)}
                  className="px-2.5 py-1 rounded-md bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary font-semibold text-[10px] transition cursor-pointer shrink-0 ml-2"
                >
                  Edit Configuration
                </button>
              </div>
            </div>
          ) : (
            /* FULL CREATION / EDIT FORM */
            <div className="space-y-2">
              {/* 1. AGENT IDENTITY CARD */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-border-primary/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-accent-primary/10 text-accent-primary text-[10px] font-bold flex items-center justify-center shrink-0 border border-accent-primary/20 shadow-2xs">
                      1
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Agent Identity &amp; Profile
                    </h2>
                  </div>
                  <span className="text-[9px] px-2 py-0.2 rounded-full bg-surface-primary border border-border-primary/60 text-text-muted font-mono font-medium">
                    {currentBotTypeObj.shortName}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Row 1: Active Avatar Preview + Agent Name (Compact & Spacious) */}
                  <div className="flex items-center gap-2.5">
                    {/* Selected Avatar Hero Preview - Reduced to sleek 30px-32px */}
                    <div className="shrink-0">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-xs sm:text-sm shadow-2xs ring-1 ring-accent-primary/30 ring-offset-1 dark:ring-offset-surface-secondary transition-transform`}
                        title="Active Agent Avatar"
                      >
                        {selectedAvatar.icon}
                      </div>
                    </div>

                    {/* Agent Name Input */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[11px] font-semibold text-text-primary">
                          Agent Name <span className="text-accent-primary font-bold">*</span>
                        </label>
                        <span className="text-[9px] text-text-muted font-mono">
                          {name.trim().length > 0 ? `${name.trim().length} chars` : "Required"}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={
                          botType === "VOICE"
                            ? "e.g., Customer Concierge Voice Assistant"
                            : botType === "ACTION"
                            ? "e.g., Order Dispatch & API Automation Agent"
                            : botType === "AVATAR"
                            ? "e.g., Interactive 3D Concierge Avatar"
                            : "e.g., HR Policy Knowledge Assistant"
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border-primary/70 bg-surface-primary text-xs font-medium text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1.5 focus:ring-accent-primary/25 focus:border-accent-primary transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Row 2: Choose Persona Avatar (Compact row) */}
                  <div className="pt-2 border-t border-border-primary/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-semibold text-text-muted">
                        Select Persona Avatar
                      </label>
                      <span className="text-[9px] text-text-muted">
                        8 curated visual presets
                      </span>
                    </div>

                    <div className="grid grid-cols-8 gap-1.5">
                      {PRESET_AVATARS.map((av, idx) => {
                        const isChosen = selectedAvatar.icon === av.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedAvatar(av)}
                            title={av.label || `Avatar ${av.icon}`}
                            className={`h-6 sm:h-7 rounded-md bg-gradient-to-tr ${av.color} flex items-center justify-center text-white text-[11px] sm:text-xs transition-all cursor-pointer relative ${
                              isChosen
                                ? "ring-1.5 ring-accent-primary ring-offset-1 dark:ring-offset-surface-secondary scale-105 shadow-xs z-10"
                                : "opacity-70 hover:opacity-100 hover:scale-105"
                            }`}
                          >
                            <span>{av.icon}</span>
                            {isChosen && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent-primary text-white flex items-center justify-center text-[6px] shadow-xs border border-white dark:border-surface-secondary">
                                <FiCheck />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 3: Description / Primary Purpose */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-semibold text-text-muted">
                        Description / Primary Purpose
                      </label>
                      <span className="text-[9px] text-text-muted">
                        Scope &amp; Objective
                      </span>
                    </div>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        botType === "VOICE"
                          ? "e.g., Conducts natural, voice-synthesized conversational phone and web interactions."
                          : botType === "ACTION"
                          ? "e.g., Autonomously triggers REST APIs and synthesizes responses into actionable summaries."
                          : botType === "AVATAR"
                          ? "e.g., Interactive 3D VRM digital avatar with synchronized real-time speech visemes."
                          : "e.g., Answers questions strictly within the provided Q3 employee guidelines."
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border-primary/70 bg-surface-primary text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1.5 focus:ring-accent-primary/25 focus:border-accent-primary transition shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SPECIALIZED STUDIO SECTION 2: BASED ON BOT TYPE
                 ========================================================================= */}

              {/* 2A. VOICE BOT STUDIO */}
              {botType === "VOICE" && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border-primary/40">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-violet-500/10 text-violet-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        Voice Profile &amp; Speech Engine
                      </h2>
                    </div>
                    <span className="text-[9px] px-2 py-0.2 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
                      <FiVolume2 className="text-[10px]" /> Live Audio
                    </span>
                  </div>

                  {/* Preset Voice Cards Grid */}
                  <div>
                    <label className="block text-[10px] font-semibold mb-1 text-text-muted">
                      Select Voice Persona
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {PRESET_VOICES.map((v) => {
                        const isSelected = selectedVoiceId === v.id;
                        const isPlaying = playingVoiceId === v.id;
                        const countryTag = v.accent.includes("US")
                          ? "US"
                          : v.accent.includes("UK")
                          ? "UK"
                          : v.accent.includes("AU")
                          ? "AU"
                          : "EN";
                        return (
                          <div
                            key={v.id}
                            onClick={() => setSelectedVoiceId(v.id)}
                            className={`p-1.5 rounded-lg border cursor-pointer transition flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/30 shadow-2xs"
                                : "border-border-primary/60 hover:border-border-primary bg-surface-primary hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-md bg-gradient-to-tr ${v.color} flex items-center justify-center text-white text-[10px] shrink-0 shadow-2xs`}
                              >
                                🎙️
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-text-primary truncate">
                                    {v.name}
                                  </span>
                                  <span className="text-[7px] font-mono px-1 py-0.2 rounded bg-surface-secondary text-text-muted border border-border-primary/40 shrink-0">
                                    {countryTag}
                                  </span>
                                </div>
                                <p className="text-[9px] text-text-muted truncate">
                                  {v.persona}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayVoicePreview(v);
                                }}
                                title={isPlaying ? "Stop Preview" : `Preview ${v.name}'s voice`}
                                className={`w-5 h-5 rounded-md text-[10px] flex items-center justify-center transition cursor-pointer ${
                                  isPlaying
                                    ? "bg-violet-600 text-white shadow-xs"
                                    : "bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25"
                                }`}
                              >
                                {isPlaying ? (
                                  <div className="flex items-center gap-0.5">
                                    <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse [animation-delay:0.15s]" />
                                  </div>
                                ) : (
                                  <FiPlay className="text-[8px] ml-0.5" />
                                )}
                              </button>

                              <div
                                className={`w-3 h-3 rounded-full border flex items-center justify-center transition ${
                                  isSelected
                                    ? "border-violet-500 bg-violet-500 text-white"
                                    : "border-border-primary/80"
                                }`}
                              >
                                {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Speech Parameters (Speed & Pitch) */}
                  <div className="pt-1.5 border-t border-border-primary/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-text-primary">
                          Cadence ({voiceSpeed.toFixed(2)}x)
                        </span>
                        <div className="flex gap-1">
                          {[0.9, 1.0, 1.15].map((rateVal) => (
                            <button
                              key={rateVal}
                              type="button"
                              onClick={() => setVoiceSpeed(rateVal)}
                              className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                                voiceSpeed === rateVal
                                    ? "bg-violet-500 text-white font-bold"
                                    : "bg-surface-primary text-text-muted hover:text-text-primary border border-border-primary/40"
                              }`}
                            >
                              {rateVal}x
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.35"
                        step="0.05"
                        value={voiceSpeed}
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        className="w-full accent-violet-500 cursor-pointer h-1"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-text-primary">
                          Pitch ({voicePitch.toFixed(2)})
                        </span>
                        <div className="flex gap-1">
                          {[0.9, 1.0, 1.1].map((pitchVal) => (
                            <button
                              key={pitchVal}
                              type="button"
                              onClick={() => setVoicePitch(pitchVal)}
                              className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                                voicePitch === pitchVal
                                    ? "bg-violet-500 text-white font-bold"
                                    : "bg-surface-primary text-text-muted hover:text-text-primary border border-border-primary/40"
                              }`}
                            >
                              {pitchVal}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="1.2"
                        step="0.05"
                        value={voicePitch}
                        onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                        className="w-full accent-violet-500 cursor-pointer h-1"
                      />
                    </div>
                  </div>

                  {/* Optional Custom Test Phrase */}
                  <div>
                    <input
                      type="text"
                      value={customVoiceTestText}
                      onChange={(e) => setCustomVoiceTestText(e.target.value)}
                      placeholder="Type test sentence and click Preview above..."
                      className="w-full px-2 py-1 rounded-lg border border-border-primary/50 bg-surface-primary text-xs focus:outline-none focus:border-violet-500 transition placeholder:text-text-muted/50"
                    />
                  </div>
                </div>
              )}

              {/* 2B. ACTION / API BOT STUDIO */}
              {botType === "ACTION" && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border-primary/40">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        REST API Tools &amp; Postman
                      </h2>
                    </div>
                    <span className="text-[9px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <FiCode className="text-[10px]" /> Tool Calling
                    </span>
                  </div>

                  {/* Postman Drag & Drop Zone */}
                  <div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handlePostmanFile(e.dataTransfer.files);
                      }}
                      onClick={() => postmanInputRef.current?.click()}
                      className="border border-dashed border-amber-500/40 hover:border-amber-500/80 rounded-lg py-2 px-3 text-center cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 transition group flex items-center justify-center gap-2.5"
                    >
                      <input
                        ref={postmanInputRef}
                        type="file"
                        accept=".json"
                        onChange={(e) => handlePostmanFile(e.target.files)}
                        className="hidden"
                      />
                      <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm group-hover:scale-105 transition shrink-0">
                        <FiUploadCloud />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">
                          Drop Postman collection <span className="text-amber-600 dark:text-amber-400 underline">.json</span> file
                        </p>
                        <p className="text-[9px] text-text-muted truncate">
                          Auto-extracts endpoints and methods for tool calling.
                        </p>
                      </div>
                    </div>

                    {postmanImportSummary && (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                        <div className="flex items-center gap-1.5">
                          <FiCheckCircle className="text-xs shrink-0" />
                          <span className="text-[10px]">
                            <strong>{postmanImportSummary.name}</strong> &mdash; {postmanImportSummary.count} endpoints imported!
                          </span>
                        </div>
                        <span className="text-[8px] font-mono uppercase bg-emerald-500/20 px-1 py-0.2 rounded">
                          Parsed
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Manual API Builder Expandable Button */}
                  <div className="pt-1 border-t border-border-primary/30 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-text-primary">Manual REST Tool</p>
                      <p className="text-[9px] text-text-muted">Add individual endpoint</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddManualApi(!showAddManualApi)}
                      className="px-2 py-0.5 rounded-lg bg-surface-primary hover:bg-black/5 dark:hover:bg-white/5 border border-border-primary/60 text-xs font-semibold text-text-primary transition cursor-pointer flex items-center gap-1"
                    >
                      <FiPlus className="text-xs text-accent-primary" />
                      <span>{showAddManualApi ? "Close" : "Add Endpoint"}</span>
                    </button>
                  </div>

                  {/* Manual Endpoint Form */}
                  {showAddManualApi && (
                    <div className="p-2.5 rounded-lg border border-border-primary/60 bg-surface-primary/50 space-y-2 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        <div>
                          <label className="block text-[9px] font-semibold mb-0.5 text-text-muted">
                            Method
                          </label>
                          <select
                            value={manualApiMethod}
                            onChange={(e) => setManualApiMethod(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-border-primary/60 bg-surface-primary text-xs font-mono font-bold"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-semibold mb-0.5 text-text-muted">
                            Tool Name <span className="text-accent-primary">*</span>
                          </label>
                          <input
                            type="text"
                            value={manualApiName}
                            onChange={(e) => setManualApiName(e.target.value)}
                            placeholder="e.g., Get Order Status"
                            className="w-full px-2 py-1 rounded-lg border border-border-primary/60 bg-surface-primary text-xs focus:outline-none focus:border-accent-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-semibold mb-0.5 text-text-muted">
                          Endpoint URL <span className="text-accent-primary">*</span>
                        </label>
                        <input
                          type="text"
                          value={manualApiUrl}
                          onChange={(e) => setManualApiUrl(e.target.value)}
                          placeholder="https://api.example.com/v1/orders/{id}"
                          className="w-full px-2 py-1 rounded-lg border border-border-primary/60 bg-surface-primary text-xs font-mono focus:outline-none focus:border-accent-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[9px] font-semibold mb-0.5 text-text-muted">
                            Authentication
                          </label>
                          <select
                            value={manualApiAuthType}
                            onChange={(e) => setManualApiAuthType(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-border-primary/60 bg-surface-primary text-xs"
                          >
                            <option value="none">No Auth (Public)</option>
                            <option value="bearer">Bearer Token</option>
                            <option value="apikey">API Key Header</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold mb-0.5 text-text-muted">
                            Key / Token (Optional)
                          </label>
                          <input
                            type="password"
                            value={manualApiKey}
                            onChange={(e) => setManualApiKey(e.target.value)}
                            placeholder="Optional Bearer token"
                            className="w-full px-2 py-1 rounded-lg border border-border-primary/60 bg-surface-primary text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={handleAddManualApi}
                          className="px-2.5 py-1 rounded-lg bg-accent-primary hover:opacity-90 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          + Add Endpoint Tool
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Staged & Connected APIs List */}
                  {stagedApis.length > 0 && (
                    <div className="space-y-1 mt-1">
                      <div className="flex items-center justify-between text-[9px] font-semibold text-text-muted px-1">
                        <span>Configured Tools ({stagedApis.length})</span>
                        <span className="text-amber-500 font-mono">Ready to Bind</span>
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                        {stagedApis.map((api, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded uppercase shrink-0 ${
                                  api.method === "POST"
                                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                    : api.method === "PUT"
                                    ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                                    : api.method === "DELETE"
                                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {api.method || "GET"}
                              </span>
                              <div className="truncate">
                                <p className="font-semibold text-text-primary text-xs truncate">{api.name}</p>
                                <p className="text-[8px] text-text-muted font-mono truncate">{api.url}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedApi(idx)}
                              className="p-1 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
                              title="Remove API Tool"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2C. KNOWLEDGE BASE & VECTOR RAG STUDIO */}
              {(botType === "CHAT" || botType === "VOICE" || botType === "AVATAR") && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border-primary/40">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0 border border-emerald-500/20">
                        {botType === "VOICE" ? "3" : "2"}
                      </span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        PDF Knowledge Base &amp; Vector RAG
                      </h2>
                    </div>
                    <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <FiShield className="text-[10px]" /> Strict Scoping
                    </span>
                  </div>

                  {/* Existing Attached Files (Edit Mode) */}
                  {isEditMode && existingFiles.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-text-muted px-1">
                        <span>Attached Knowledge Files ({existingFiles.length})</span>
                        <span className="text-emerald-500 font-mono text-[9px]">Indexed &amp; Active</span>
                      </div>
                      {existingFiles.map((f) => (
                        <div
                          key={f._id}
                          className="flex items-center justify-between p-1.5 rounded-lg border border-border-primary/50 bg-surface-primary text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 text-xs">
                              <FiFileText />
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-text-primary truncate text-xs">
                                {f.fileName || f.originalName || "Document"}
                              </p>
                              <p className="text-[9px] text-text-muted font-mono">
                                {f.fileSize ? `${(f.fileSize / 1024).toFixed(1)} KB • ` : ""}
                                {f.fileCategory || "knowledge"} &bull; Vector Indexed
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove '${f.fileName || "this file"}' from knowledge base?`)) {
                                deleteFileMutation.mutate(f._id);
                              }
                            }}
                            disabled={deleteFileMutation.isPending}
                            className="p-1 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
                            title="Delete file"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compact Drag & Drop Box */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileUpload(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-border-primary/80 hover:border-accent-primary/60 rounded-lg py-2 px-3 text-center cursor-pointer bg-surface-primary/40 hover:bg-surface-primary transition group flex items-center justify-center gap-2.5"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.txt,.docx,.md,.json"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                    <div className="w-6 h-6 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center text-sm group-hover:scale-105 transition shrink-0">
                      <FiUploadCloud />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">
                        Drag &amp; drop PDF documents, or <span className="text-accent-primary underline">browse</span>
                      </p>
                      <p className="text-[9px] text-text-muted truncate">
                        PDF, DOCX, TXT, MD &bull; Auto-indexed for vector semantic search.
                      </p>
                    </div>
                  </div>

                  {/* Staged Files List */}
                  {stagedFiles.length > 0 && (
                    <div className="space-y-1 mt-1.5">
                      <div className="flex items-center justify-between text-[9px] font-semibold text-text-muted px-1">
                        <span>New Files ({stagedFiles.length})</span>
                        <span className="text-amber-500 font-mono">Pending Save</span>
                      </div>
                      {stagedFiles.map((f, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded-lg border border-accent-primary/40 bg-accent-primary/5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0 text-xs">
                              <FiFileText />
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-text-primary truncate text-xs">{f.fileName}</p>
                              <p className="text-[9px] text-text-muted font-mono">
                                {(f.fileSize / 1024).toFixed(1)} KB &bull; Will index on save
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeStagedFile(idx)}
                            className="p-1 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
                            title="Remove file"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chunk Limiter Control */}
                  <div className="pt-1.5 border-t border-border-primary/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-text-primary flex items-center gap-1">
                        Max Chunks Injected
                        <FiHelpCircle
                          className="text-[9px] text-text-muted"
                          title="Limits context injection to avoid token bloat and hallucination"
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-surface-primary p-0.5 rounded-md border border-border-primary/50">
                      {[2, 3, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setMaxChunks(cnt)}
                          className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                            maxChunks === cnt
                              ? "bg-accent-primary text-white shadow-xs"
                              : "text-text-muted hover:text-text-primary"
                          }`}
                        >
                          Top {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2D. 3D AVATAR BOT STUDIO */}
              {botType === "AVATAR" && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border-primary/40">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-purple-500/10 text-purple-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        3D Model &amp; Viseme Synchronizer
                      </h2>
                    </div>
                    <span className="text-[9px] px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                      <FiLayers className="text-[10px]" /> Three.js VRM
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary">Enterprise Viverse 3D Model</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Synchronizes real-time visemes (aa, ih, ou, ee, oh) for live 3D speech lip-sync.
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                      VRM Canvas
                    </span>
                  </div>
                </div>
              )}

              {/* 3. SYSTEM PROMPT & GUARDRAILS CARD */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-border-primary/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-accent-primary/10 text-accent-primary text-[10px] font-bold flex items-center justify-center shrink-0 border border-accent-primary/20">
                      3
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Operational Rules &amp; Guardrails
                    </h2>
                  </div>
                  {isPromptCustomized && (
                    <button
                      type="button"
                      onClick={() => {
                        if (botType === "VOICE") setSystemPrompt(VOICE_AGENT_PROMPT);
                        else if (botType === "ACTION") setSystemPrompt(ACTION_BOT_PROMPT);
                        else if (botType === "AVATAR") setSystemPrompt(AVATAR_BOT_PROMPT);
                        else setSystemPrompt(STRICT_KNOWLEDGE_PROMPT);
                        setIsPromptCustomized(false);
                      }}
                      className="text-[10px] text-accent-primary hover:underline font-semibold cursor-pointer"
                    >
                      Reset Rules
                    </button>
                  )}
                </div>

                <div className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                  <FiInfo className="text-xs shrink-0" />
                  <span className="truncate">
                    <strong>{currentBotTypeObj.name} Guardrail Active:</strong> Behavioral boundaries applied.
                  </span>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => {
                      setSystemPrompt(e.target.value);
                      setIsPromptCustomized(true);
                    }}
                    className="w-full p-2 rounded-lg border border-border-primary/60 bg-surface-primary text-[10px] font-mono leading-relaxed focus:outline-none focus:border-accent-primary transition custom-scrollbar"
                  />
                </div>
              </div>

              {/* 4. CONNECTED AI ENGINE CARD */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-border-primary/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-accent-primary/10 text-accent-primary text-[10px] font-bold flex items-center justify-center shrink-0 border border-accent-primary/20">
                      4
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      AI Reasoning Engine
                    </h2>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {modelsList.length} Connected
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {modelsList.map((m) => {
                    const isSelected = selectedModel === m.modelId;
                    return (
                      <div
                        key={m.modelId}
                        onClick={() => setSelectedModel(m.modelId)}
                        className={`py-1.5 px-2 rounded-lg border cursor-pointer transition flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? "border-accent-primary bg-accent-primary/5 shadow-2xs ring-1 ring-accent-primary/30"
                            : "border-border-primary/50 hover:border-border-primary/80 bg-surface-primary hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? "border-accent-primary bg-accent-primary text-white"
                                : "border-border-primary"
                            }`}
                          >
                            {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className={`text-[11px] font-bold truncate ${isSelected ? "text-text-primary" : "text-text-secondary"}`}>
                                {m.displayName || m.modelId}
                              </p>
                              {m.recommended && (
                                <span className="text-[7px] font-semibold px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                  Rec
                                </span>
                              )}
                            </div>
                            <p className="text-[8px] text-text-muted font-mono truncate">
                              {m.tier || "FAST"} &bull; {m.creditCost != null ? `${m.creditCost} cr` : "0.5 cr"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* RIGHT PANE: CHAT WORKSPACE (PLAYGROUND PREVIEW) */}
        <div className="h-full flex flex-col bg-surface-primary overflow-hidden">
          {/* Chat Pane Header */}
          <div className="px-3 py-2 border-b border-border-primary/40 flex items-center justify-between bg-surface-secondary/20 shrink-0 gap-2 min-h-[48px]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-xs shadow-xs shrink-0 relative`}
              >
                {selectedAvatar.icon}
                {botType === "VOICE" && voiceState === "SPEAKING" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                )}
                {botType === "VOICE" && voiceState === "LISTENING" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-bold text-text-primary truncate">
                    {capitalizeFirstLetter(name, isEditMode ? "Agent Chat" : `${currentBotTypeObj.shortName} Playground`)}
                  </h3>
                  <span
                    className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold uppercase border shrink-0 ${currentBotTypeObj.tagColor}`}
                  >
                    {currentBotTypeObj.shortName}
                  </span>
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-surface-primary border border-border-primary/60 text-text-muted items-center gap-1 shrink-0 hidden md:inline-flex">
                    <FiCpu className="text-[9px] text-accent-primary" />
                    {currentModelObj?.displayName || selectedModel}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted truncate mt-0.2">
                  {botType === "VOICE"
                    ? `Voice: ${PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.name || "Sarah"} (${voiceSpeed}x)`
                    : convId ? "Active Thread" : "New Session"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Voice Agent Specialized Controls */}
              {botType === "VOICE" && (
                <>
                  {/* Live Hands-Free Call Mode Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleLiveVoiceMode}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      isVoiceModeActive
                        ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 shadow-xs"
                        : "bg-surface-primary hover:bg-surface-secondary border border-border-primary/60 text-text-primary"
                    }`}
                    title={isVoiceModeActive ? "End hands-free voice call" : "Start hands-free live voice conversation"}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isVoiceModeActive ? "bg-emerald-500 animate-ping" : "bg-text-muted"}`} />
                    <FiMic className="text-xs" />
                    <span>{isVoiceModeActive ? "Live Call" : "Voice Call"}</span>
                  </button>

                  {/* Auto-Speak Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceState === "SPEAKING") stopSpeech();
                      setIsAutoSpeak(!isAutoSpeak);
                    }}
                    className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition cursor-pointer ${
                      isAutoSpeak
                        ? "bg-violet-500/10 border-violet-500/30 text-violet-500 hover:bg-violet-500/20"
                        : "bg-surface-primary border-border-primary/50 text-text-muted hover:text-text-primary"
                    }`}
                    title={isAutoSpeak ? "Voice output enabled (Click to mute)" : "Voice output muted (Click to unmute)"}
                  >
                    {isAutoSpeak ? <FiVolume2 className="text-xs" /> : <FiVolumeX className="text-xs" />}
                  </button>
                </>
              )}

              <button
                onClick={handleStartNewChat}
                className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 border border-border-primary/50 text-text-primary text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                title="Start a new conversation thread"
              >
                <FiPlus className="text-xs" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips Tailored to botType */}
          <div className="px-4 py-2 border-b border-border-primary/30 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 bg-surface-secondary/10 text-[11px]">
            <span className="text-text-muted shrink-0 font-medium">Try asking:</span>
            {botType === "VOICE" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Say hello and introduce yourself naturally.")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-violet-500/60 transition shrink-0 cursor-pointer flex items-center gap-1"
                >
                  🎙️ Introduce yourself
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Explain quantum physics in two concise, conversational sentences.")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-violet-500/60 transition shrink-0 cursor-pointer flex items-center gap-1"
                >
                  💬 2-sentence explanation
                </button>
              </>
            )}

            {botType === "ACTION" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Check the current status of order #1024.")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-amber-500/60 transition shrink-0 cursor-pointer flex items-center gap-1"
                >
                  ⚡ Check order status
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("List all available REST operations you can execute.")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-amber-500/60 transition shrink-0 cursor-pointer flex items-center gap-1"
                >
                  📋 List API tools
                </button>
              </>
            )}

            {botType === "CHAT" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Summarize the key takeaways from the document.")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-accent-primary/60 transition shrink-0 cursor-pointer"
                >
                  📄 Summarize document
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("What are the main procedures outlined in the PDF?")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-accent-primary/60 transition shrink-0 cursor-pointer"
                >
                  ❓ Key procedures
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Who is the president of France?")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-amber-500/60 transition shrink-0 cursor-pointer text-amber-600 dark:text-amber-400"
                >
                  🚫 Test refusal
                </button>
              </>
            )}

            {botType === "AVATAR" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Give a warm welcome to new visitors.")}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border-primary/50 text-text-primary hover:border-purple-500/60 transition shrink-0 cursor-pointer flex items-center gap-1"
                >
                  🎭 Warm welcome
                </button>
              </>
            )}
          </div>

          {/* Active Voice Interaction Banner */}
          {botType === "VOICE" && (voiceState === "LISTENING" || voiceState === "SPEAKING" || isVoiceModeActive) && (
            <div className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] transition-colors shrink-0 ${
              voiceState === "SPEAKING"
                ? "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-300"
                : voiceState === "LISTENING"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                : "bg-surface-secondary/40 border-border-primary/40 text-text-primary"
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {voiceState === "SPEAKING" ? (
                  <>
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:0s]" />
                      <span className="w-0.5 h-3 bg-violet-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-0.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                      <span className="w-0.5 h-2.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.45s]" />
                    </div>
                    <span className="font-semibold text-[11px]">
                      {PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.name || "Voice Agent"} is speaking...
                    </span>
                  </>
                ) : voiceState === "LISTENING" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span className="font-semibold shrink-0 text-[11px]">
                      Listening:
                    </span>
                    <span className="text-text-muted italic truncate max-w-[180px] sm:max-w-md text-[10px]">
                      {sttInterimText ? `"${sttInterimText}"` : "Speak into your mic..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-medium text-[10px]">Live Call Active. Speak anytime.</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {voiceState === "SPEAKING" && (
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeech();
                      setPlayingMessageIdx(null);
                      setVoiceState("IDLE");
                    }}
                    className="px-2 py-0.5 rounded bg-red-500/15 text-red-500 hover:bg-red-500/25 transition cursor-pointer text-[10px] font-semibold flex items-center gap-1"
                  >
                    <FiSquare className="text-[8px]" /> Stop
                  </button>
                )}
                {voiceState === "LISTENING" && sttInterimText && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = sttInterimText;
                      setSttInterimText("");
                      if (voiceManagerRef.current) voiceManagerRef.current.stopListening();
                      handleSendMessage(text);
                    }}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <FiSend className="text-[9px]" /> Send
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 relative"
          >
            {isFetchingMessages ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading thread messages...</span>
                </div>
              </div>
            ) : chatMessages.length === 0 ? (
              /* Welcome Hero */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto my-auto">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-2xl shadow-sm relative ${
                    botType === "VOICE" ? "ring-4 ring-violet-500/20 shadow-violet-500/10" : ""
                  }`}
                >
                  {selectedAvatar.icon}
                  {botType === "VOICE" && voiceState === "LISTENING" && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    {botType === "VOICE"
                      ? `Talk with ${capitalizeFirstLetter(name, "Voice Agent")}`
                      : `Chat with ${capitalizeFirstLetter(name, isEditMode ? "this Bot" : `Preview ${currentBotTypeObj.shortName}`)}`}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {botType === "VOICE"
                      ? "Speak directly using your microphone. The agent will listen to you in real-time and speak back naturally with voice synthesis."
                      : botType === "ACTION"
                      ? "Autonomous action bot ready to execute REST API endpoints and summarize results."
                      : "Ask questions grounded strictly in attached knowledge base files. All responses are verified against your vector documents."}
                  </p>
                </div>

                {/* Big Tap-To-Talk Button for Voice Agent */}
                {botType === "VOICE" ? (
                  <div className="flex flex-col items-center gap-3 w-full pt-1">
                    <button
                      type="button"
                      onClick={handleToggleVoiceListening}
                      className={`px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2.5 shadow-md active:scale-95 ${
                        voiceState === "LISTENING"
                          ? "bg-red-500 text-white animate-pulse shadow-red-500/30 ring-4 ring-red-500/20"
                          : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/20 hover:shadow-violet-500/30"
                      }`}
                    >
                      <FiMic className="text-base" />
                      <span>{voiceState === "LISTENING" ? "Listening... Tap to Send" : "Tap to Speak (Live Voice)"}</span>
                    </button>

                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <span>Voice Profile:</span>
                      <span className="font-semibold text-text-primary">
                        {PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.name || "Sarah"} ({voiceSpeed}x)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 w-full pt-2">
                      <button
                        onClick={() => handleSendMessage("Hello! Introduce yourself and tell me what voice capabilities you have.")}
                        className="p-3 text-left rounded-xl border border-border-primary/60 hover:border-violet-500/50 bg-surface-secondary/40 hover:bg-surface-secondary text-xs text-text-primary transition cursor-pointer flex items-center gap-2"
                      >
                        <FiMic className="text-violet-500 shrink-0" />
                        <span>"Hello! Introduce yourself and your voice capabilities."</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 w-full pt-2">
                    <button
                      onClick={() =>
                        handleSendMessage(
                          botType === "ACTION"
                            ? "What API tools do you currently have connected?"
                            : "What topics are covered in the attached knowledge base?"
                        )
                      }
                      className="p-3 text-left rounded-xl border border-border-primary/60 hover:border-accent-primary/60 bg-surface-secondary/40 hover:bg-surface-secondary text-xs text-text-primary transition cursor-pointer flex items-center gap-2"
                    >
                      <FiMessageSquare className="text-accent-primary shrink-0" />
                      <span>
                        {botType === "ACTION"
                          ? "What API tools do you currently have connected?"
                          : "What topics are covered in the knowledge base?"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent-primary text-white rounded-br-none shadow-sm whitespace-pre-wrap"
                        : "bg-white dark:bg-surface-secondary border border-border-primary/60 text-text-primary rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <>
                        <div className="prose dark:prose-invert prose-xs max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content || "Thinking..."}
                          </ReactMarkdown>
                        </div>

                        {/* Speech Synthesis Audio Button on Assistant Message */}
                        {msg.content && (botType === "VOICE" || botType === "AVATAR") && (
                          <div className="mt-2.5 pt-2 border-t border-border-primary/20 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handlePlayMessageAudio(msg.content, idx)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                playingMessageIdx === idx
                                  ? "bg-violet-600 text-white shadow-xs"
                                  : "bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20"
                              }`}
                            >
                              {playingMessageIdx === idx ? (
                                <>
                                  <div className="flex items-end gap-0.5 h-2.5 mr-0.5">
                                    <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-delay:0s]" />
                                    <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0.15s]" />
                                    <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.3s]" />
                                  </div>
                                  <span>Stop Speaking</span>
                                </>
                              ) : (
                                <>
                                  <FiVolume2 className="text-[10px]" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                            <span className="text-[10px] text-text-muted font-mono">
                              Voice: {PRESET_VOICES.find((v) => v.id === selectedVoiceId)?.name || "Sarah"}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Sources & Knowledge Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border-primary/30 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <FiCheck className="text-xs" />
                          <span>{msg.sources.length} Knowledge Chunks Grounded</span>
                        </div>
                        <div className="space-y-1 pl-1">
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="text-[10px] text-text-muted bg-surface-primary p-1.5 rounded border border-border-primary/40 font-mono"
                            >
                              <span className="font-semibold text-text-primary">
                                [{sIdx + 1}] {src.fileName || "Document"}
                              </span>{" "}
                              {src.score ? `(${Math.round(src.score * 100)}% match)` : ""}:{" "}
                              <span className="italic">
                                {src.snippet?.slice(0, 100) || "Matched context chunk"}...
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-text-muted mt-1 px-1">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                  </span>
                </div>
              ))
            )}

            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-text-muted py-2 px-3 bg-surface-secondary/40 rounded-xl w-fit">
                <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce [animation-delay:0.4s]"></div>
                <span>
                  {botType === "VOICE"
                    ? "Generating voice response..."
                    : botType === "ACTION"
                    ? "Dispatching action tools..."
                    : "Retrieving knowledge & generating..."}
                </span>
                <button
                  onClick={handleStopGeneration}
                  className="ml-2 text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-500/10 cursor-pointer"
                  title="Stop generating"
                >
                  <FiStopCircle className="text-xs" />
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                className="sticky bottom-2 ml-auto mr-2 p-2 rounded-full bg-surface-primary hover:bg-surface-secondary border border-border-primary/80 shadow-md text-text-primary transition flex items-center gap-1.5 text-[11px] font-medium z-10 cursor-pointer"
                title="Scroll to bottom"
              >
                <FiArrowDown className="text-xs" />
                <span className="hidden sm:inline">Latest</span>
              </button>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-border-primary/40 bg-surface-secondary/20 shrink-0">
            {micError && (
              <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center justify-between">
                <span>{micError}</span>
                <button type="button" onClick={() => setMicError("")} className="cursor-pointer">
                  <FiX className="text-xs" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Prominent Mic Button for Voice interaction */}
              <button
                type="button"
                onClick={handleToggleVoiceListening}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                  voiceState === "LISTENING"
                    ? "bg-red-500 text-white border-red-500 animate-pulse shadow-md shadow-red-500/30"
                    : botType === "VOICE"
                    ? "bg-violet-500/15 border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25"
                    : "bg-surface-primary hover:bg-surface-secondary border-border-primary/60 text-text-muted hover:text-text-primary"
                }`}
                title={voiceState === "LISTENING" ? "Listening... Click to stop and send" : "Speak to agent with microphone"}
              >
                <FiMic className={`text-base ${voiceState === "LISTENING" ? "animate-bounce" : ""}`} />
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  voiceState === "LISTENING"
                    ? "Listening to you speak..."
                    : botType === "VOICE"
                    ? `Talk or type to ${capitalizeFirstLetter(name, currentBotTypeObj.shortName)}...`
                    : `Ask ${capitalizeFirstLetter(name, currentBotTypeObj.shortName)} anything...`
                }
                className={`flex-1 px-4 py-2.5 rounded-xl border bg-surface-primary text-xs focus:outline-none transition placeholder:text-text-muted/60 ${
                  voiceState === "LISTENING"
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-medium"
                    : "border-border-primary/60 focus:border-accent-primary"
                }`}
              />

              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="p-2.5 rounded-xl bg-accent-primary hover:opacity-90 text-white transition disabled:opacity-40 cursor-pointer shrink-0"
                title="Send message"
              >
                <FiSend className="text-sm" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentStudioPage;
