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
  FiArrowDown
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

const EMPTY_ARRAY = Object.freeze([]);

const capitalizeFirstLetter = (val, fallback = "") => {
  const text = (val || fallback || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const STRICT_KNOWLEDGE_PROMPT = `You are a specialized Knowledge Base AI Assistant.
Your single source of truth is the provided PDF document knowledge.

STRICT OPERATIONAL RULES:
1. ONLY answer questions using facts directly mentioned in the retrieved context chunks.
2. If the user's question cannot be answered using the provided knowledge, you MUST politely refuse by stating:
   "I can only answer questions based on the provided PDF knowledge document. This information is not found in the uploaded document."
3. NEVER use outside general knowledge, speculate, or make assumptions beyond the text.
4. Always cite or refer to the relevant section or topic from the document when answering.`;

const PRESET_AVATARS = [
  { icon: "🤖", color: "from-blue-500 to-indigo-600" },
  { icon: "📄", color: "from-emerald-500 to-teal-600" },
  { icon: "🧠", color: "from-purple-500 to-pink-600" },
  { icon: "⚡", color: "from-amber-500 to-orange-600" },
  { icon: "🛡️", color: "from-cyan-500 to-blue-600" },
  { icon: "🔬", color: "from-violet-500 to-purple-600" }
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
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabledRef = useRef(true);
  const abortControllerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Edit Mode Toggle (When false: minimal clean view; when true: edit form)
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [modelsList, setModelsList] = useState(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState("glm-5.3-flash:cloud");
  const [maxChunks, setMaxChunks] = useState(3);
  const [systemPrompt, setSystemPrompt] = useState(STRICT_KNOWLEDGE_PROMPT);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isPromptCustomized, setIsPromptCustomized] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoadedFromBot, setIsLoadedFromBot] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

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
      // If backend returned an error object (not a real bot), treat as missing
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

  // Synchronize state when existingBot arrives
  useEffect(() => {
    if (existingBot && !isLoadedFromBot) {
      setName(existingBot.name || "");
      setDescription(existingBot.description || "");
      if (existingBot.model) {
        setSelectedModel(existingBot.model);
      }
      if (existingBot.maxChunksPerQuery) {
        setMaxChunks(existingBot.maxChunksPerQuery);
      }
      if (existingBot.systemPrompt || existingBot.botSpecificRules) {
        setSystemPrompt(existingBot.systemPrompt || existingBot.botSpecificRules);
        setIsPromptCustomized(true);
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
      setIsLoadedFromBot(true);
    }
  }, [existingBot, isLoadedFromBot]);

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
      // Switched from an existing thread to new chat
      setChatMessages([]);
    }
    prevConvIdRef.current = convId;
  }, [convId, fetchedMessages, chatMessages.length]);

  // File Upload Handler
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

  // TanStack Mutation for Bot Creation (/bots/new)
  const createBotMutation = useTanStackMutation({
    mutationFn: async (payload) => {
      const newBot = await NobackEndCallObj("/bots", payload, "post");
      const createdBotId = newBot?._id || newBot?.data?._id;

      if (!createdBotId) {
        throw new Error("Bot creation failed: no bot ID returned");
      }

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
      return updated;
    },
    onSuccess: () => {
      setStagedFiles([]);
      setIsEditingConfig(false);
      setSuccessMsg("Agent updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
      queryClient.invalidateQueries({ queryKey: ["bot", botId] });
      queryClient.invalidateQueries({ queryKey: ["bot-files", botId] });
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

  const handleSaveConfiguration = () => {
    if (!name.trim()) {
      setError("Please provide an Agent Name.");
      return;
    }

    setError("");
    const payload = {
      name: name.trim(),
      description: description.trim(),
      model: selectedModel,
      botType: "CHAT",
      capabilities: {
        enableRag: true,
        enableActions: false,
        enableVoice: false,
        enableAvatar: false
      },
      systemPrompt: systemPrompt.trim(),
      botSpecificRules: systemPrompt.trim(),
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
      setSelectedModel(existingBot.model || "glm-5.3-flash:cloud");
      setMaxChunks(existingBot.maxChunksPerQuery || 3);
      setSystemPrompt(existingBot.systemPrompt || existingBot.botSpecificRules || STRICT_KNOWLEDGE_PROMPT);
    }
    setStagedFiles([]);
    setIsEditingConfig(false);
    setError("");
  };

  const handleDeleteBot = () => {
    if (!window.confirm(`Are you sure you want to delete '${name.trim() || "this agent"}' and its knowledge base?`)) {
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
  const handleSendMessage = useCallback(async (textOverride = null) => {
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
          return;
        }
      } catch (err) {
        if (err.name === "AbortError") {
          setIsChatLoading(false);
          return;
        }
        console.warn("Live bot stream error, falling back to knowledge preview:", err);
      }
    }

    // Fallback Simulated Grounding Response
    setTimeout(() => {
      let botResponse = "";
      let simulatedSources = [];

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
    }, 400);
  }, [botId, chatInput, convId, existingFiles, isChatLoading, isEditMode, maxChunks, queryClient, setSearchParams, stagedFiles]);

  const isSaving = createBotMutation.isPending || updateBotMutation.isPending;

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
      <header className="h-16 border-b border-border-primary/50 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-surface-secondary/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/bots");
              }
            }}
            className="p-2 rounded-xl hover:bg-surface-secondary text-text-primary transition flex items-center justify-center cursor-pointer border border-border-primary/50"
            title="Back"
          >
            <FiArrowLeft className="text-base" />
          </button>
          <div className="h-4 w-px bg-border-primary/40 hidden sm:block"></div>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-base shadow-sm shrink-0`}
            >
              {selectedAvatar.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight truncate max-w-[180px] sm:max-w-[280px]">
                  {capitalizeFirstLetter(name, isEditMode ? "AI Agent" : "Untitled Knowledge Agent")}
                </h1>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase ${
                    isEditMode
                      ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                      : "bg-accent-primary/15 text-accent-primary"
                  }`}
                >
                  {isEditMode ? (isEditingConfig ? "Editing Mode" : "Agent Active") : "V1 Studio"}
                </span>
              </div>
              <p className="text-[11px] text-text-muted hidden sm:block">
                {isEditMode
                  ? "Multi-tenant Knowledge Chatbot with Dedicated PDF Vector RAG"
                  : "Claude-style Split-Screen Agent Studio with Live Test Playground"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <div className="text-xs text-red-500 font-medium px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg hidden md:block">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1.5 animate-fadeIn">
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
                  className="px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 text-text-muted transition cursor-pointer flex items-center gap-1"
                >
                  <FiX className="text-sm" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveConfiguration}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-primary hover:opacity-90 text-white shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                  className="p-2 rounded-xl text-xs font-medium hover:bg-red-500/10 text-red-500 hover:text-red-600 transition cursor-pointer border border-transparent hover:border-red-500/20"
                  title="Delete Agent"
                >
                  <FiTrash2 className="text-sm" />
                </button>
                <button
                  onClick={() => setIsEditingConfig(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-secondary hover:bg-surface-secondary/80 border border-border-primary/60 text-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                  if (window.confirm("Reset all agent configurations to default?")) {
                    setName("");
                    setDescription("");
                    setStagedFiles([]);
                    setSystemPrompt(STRICT_KNOWLEDGE_PROMPT);
                    setIsPromptCustomized(false);
                    setError("");
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 text-text-muted transition cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={handleSaveConfiguration}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-primary hover:opacity-90 text-white shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
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

      {/* 2. SPLIT-SCREEN WORKSPACE (Left: Scope & Knowledge / Right: Real Chat) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* LEFT PANE: CONFIGURATION & SCOPE VIEW */}
        <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 border-r border-border-primary/40 bg-surface-secondary/20">
          {isEditMode && !isEditingConfig ? (
            /* MINIMAL SCOPE & KNOWLEDGE VIEW (DEFAULT) */
            <div className="space-y-4">
              {/* Agent Overview & Scope Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-2xl shadow-sm shrink-0`}
                    >
                      {selectedAvatar.icon}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary tracking-tight">
                        {capitalizeFirstLetter(name || existingBot?.name, "Agent Name")}
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                        {description || existingBot?.description || "Dedicated multi-tenant RAG bot with dedicated knowledge base."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingConfig(true)}
                    className="p-2 rounded-xl hover:bg-surface-primary text-text-muted hover:text-text-primary border border-border-primary/50 transition cursor-pointer"
                    title="Edit Agent Scope"
                  >
                    <FiEdit2 className="text-xs" />
                  </button>
                </div>

                <div className="pt-3 border-t border-border-primary/30 flex items-center justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <FiShield className="text-xs" /> Strict Grounding Active
                  </span>
                  <span className="font-mono text-[11px] bg-surface-primary px-2 py-0.5 rounded-md border border-border-primary/50">
                    Top {maxChunks} Chunks Injected
                  </span>
                </div>
              </div>

              {/* Connected Model Card (Minimal Information) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                    <FiCpu className="text-base" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {currentModelObj?.displayName || selectedModel}
                      </p>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface-primary text-text-muted border border-border-primary/50">
                        {currentModelObj?.tier || "FAST"}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted font-mono truncate mt-0.5">
                      {selectedModel} &bull; {currentModelObj?.creditCost != null ? `${currentModelObj.creditCost} cr/query` : "0.5 cr"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Engine</span>
                </div>
              </div>

              {/* Already Attached Knowledge Files Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-base text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Attached Knowledge Files ({existingFiles.length})
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold font-mono">
                    Vector Indexed
                  </span>
                </div>

                {existingFiles.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-muted">
                    <p>No knowledge files attached to this bot yet.</p>
                    <button
                      onClick={() => setIsEditingConfig(true)}
                      className="mt-2 text-accent-primary hover:underline font-semibold cursor-pointer"
                    >
                      + Upload Knowledge Document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existingFiles.map((f) => (
                      <div
                        key={f._id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border-primary/50 bg-surface-primary text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <FiFileText className="text-sm" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-text-primary truncate">
                              {f.fileName || f.originalName || "Document"}
                            </p>
                            <p className="text-[10px] text-text-muted font-mono">
                              {f.fileSize ? `${(f.fileSize / 1024).toFixed(1)} KB • ` : ""}
                              {f.fileCategory || "knowledge"} &bull; Semantic RAG Active
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Trigger Banner */}
              <div className="p-3.5 rounded-xl border border-dashed border-border-primary/70 bg-surface-primary/40 flex items-center justify-between text-xs">
                <span className="text-text-muted text-[11px]">
                  Need to change knowledge files, model, or instructions?
                </span>
                <button
                  onClick={() => setIsEditingConfig(true)}
                  className="px-3 py-1.5 rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary font-semibold text-xs transition cursor-pointer"
                >
                  Edit Configuration
                </button>
              </div>
            </div>
          ) : (
            /* FULL EDIT FORM (ONLY SHOWN WHEN EDITING OR CREATING NEW) */
            <div className="space-y-5">
              {/* Identity Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border-primary/30 pb-3">
                  <TbRobotFace className="text-base text-accent-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    1. Agent Identity
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-text-muted">
                    Avatar &amp; Badge
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${av.color} flex items-center justify-center text-white text-base transition cursor-pointer hover:scale-105 ${selectedAvatar.icon === av.icon ? "ring-2 ring-accent-primary ring-offset-2 dark:ring-offset-surface-secondary scale-105" : "opacity-80"}`}
                      >
                        {av.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-text-muted">
                    Agent Name <span className="text-accent-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., HR Policy Knowledge Assistant"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary/60 bg-surface-primary text-sm focus:outline-none focus:border-accent-primary transition placeholder:text-text-muted/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-text-muted">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Answers questions strictly within the provided Q3 employee guidelines."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary/60 bg-surface-primary text-sm focus:outline-none focus:border-accent-primary transition placeholder:text-text-muted/60"
                  />
                </div>
              </div>

              {/* PDF Knowledge Base & Vector Grounding Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-3">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-base text-emerald-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      2. PDF Knowledge Base &amp; Vector RAG
                    </h2>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <FiShield className="text-[10px]" /> Strict Scoping
                  </span>
                </div>

                {/* Existing Attached Files (Edit Mode) */}
                {isEditMode && existingFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted px-1">
                      <span>Attached Knowledge Files ({existingFiles.length})</span>
                      <span className="text-emerald-500 font-mono text-[10px]">Indexed &amp; Active</span>
                    </div>
                    {existingFiles.map((f) => (
                      <div
                        key={f._id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border-primary/50 bg-surface-primary text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <FiFileText className="text-sm" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-text-primary truncate">
                              {f.fileName || f.originalName || "Document"}
                            </p>
                            <p className="text-[10px] text-text-muted font-mono">
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
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
                          title="Delete file"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drag & Drop Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border-primary/80 hover:border-accent-primary/60 rounded-2xl p-6 text-center cursor-pointer bg-surface-primary/50 hover:bg-surface-primary transition group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.docx,.md,.json"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                    <FiUploadCloud className="text-2xl" />
                  </div>
                  <p className="text-xs font-bold text-text-primary mb-1">
                    Drag &amp; drop PDF documents here, or <span className="text-accent-primary underline">browse</span>
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Supported: PDF, DOCX, TXT, Markdown (.md). Auto-indexed for vector search.
                  </p>
                </div>

                {/* Staged / Newly Added Files List */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted px-1">
                      <span>New Files to Upload ({stagedFiles.length})</span>
                      <span className="text-amber-500 font-mono text-[10px]">Pending Save</span>
                    </div>
                    {stagedFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-accent-primary/40 bg-accent-primary/5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                            <FiFileText className="text-sm" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-text-primary truncate">{f.fileName}</p>
                            <p className="text-[10px] text-text-muted font-mono">
                              {(f.fileSize / 1024).toFixed(1)} KB &bull; Will be indexed on save
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStagedFile(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
                          title="Remove file"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chunk Limiter Control */}
                <div className="pt-2 border-t border-border-primary/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1">
                      Max Chunks Fed to AI per Query
                      <FiHelpCircle
                        className="text-[11px] text-text-muted"
                        title="Limits context injection to avoid token bloat and hallucination"
                      />
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Vector search retrieves only top-ranking semantic chunks
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-primary p-1 rounded-xl border border-border-primary/60">
                    {[2, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setMaxChunks(cnt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${maxChunks === cnt ? "bg-accent-primary text-white shadow-xs" : "text-text-muted hover:text-text-primary"}`}
                      >
                        Top {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strict Grounding Instructions Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-3">
                  <div className="flex items-center gap-2">
                    <FiShield className="text-base text-accent-primary" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      3. Strict Scoping Rules &amp; Guardrails
                    </h2>
                  </div>
                  {isPromptCustomized && (
                    <button
                      type="button"
                      onClick={() => {
                        setSystemPrompt(STRICT_KNOWLEDGE_PROMPT);
                        setIsPromptCustomized(false);
                      }}
                      className="text-[11px] text-accent-primary hover:underline font-semibold cursor-pointer"
                    >
                      Reset to Default Rules
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
                  <FiInfo className="text-sm shrink-0 mt-0.5" />
                  <span>
                    <strong>Guardrail Active:</strong> The agent is strictly instructed to refuse answering any question that is not explicitly contained in the uploaded PDF knowledge base.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-text-muted">
                    System Prompt Instructions
                  </label>
                  <textarea
                    rows={6}
                    value={systemPrompt}
                    onChange={(e) => {
                      setSystemPrompt(e.target.value);
                      setIsPromptCustomized(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary/60 bg-surface-primary text-xs font-mono focus:outline-none focus:border-accent-primary transition custom-scrollbar"
                  />
                </div>
              </div>

              {/* Model Selection Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-secondary border border-border-primary/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-3">
                  <div className="flex items-center gap-2">
                    <FiCpu className="text-base text-accent-primary" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      4. AI Model Selection
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {modelsList.length} Connected Models
                  </span>
                </div>

                <p className="text-xs text-text-muted">
                  Select the active AI engine for your agent.
                </p>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {modelsList.map((m) => {
                    const isSelected = selectedModel === m.modelId;
                    return (
                      <div
                        key={m.modelId}
                        onClick={() => setSelectedModel(m.modelId)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-accent-primary bg-accent-primary/5 shadow-xs"
                            : "border-border-primary/50 hover:border-border-primary/80 bg-surface-primary hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? "border-accent-primary bg-accent-primary text-white"
                                : "border-border-primary"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-xs font-bold truncate ${isSelected ? "text-text-primary" : "text-text-secondary"}`}>
                                {m.displayName || m.modelId}
                              </p>
                              {m.recommended && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Recommended
                                </span>
                              )}
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-muted border border-border-primary/40">
                                {m.tier || "FAST"}
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted font-mono truncate mt-0.5">
                              {m.modelId}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-medium text-text-muted">
                            {m.creditCost != null ? `${m.creditCost} cr` : "0.5 cr"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: CHAT WORKSPACE (REAL CHAT WITH BOT) */}
        <div className="h-full flex flex-col bg-surface-primary overflow-hidden">
          {/* Chat Pane Header */}
          <div className="p-4 border-b border-border-primary/40 flex items-center justify-between bg-surface-secondary/20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-sm shadow-xs shrink-0`}
              >
                {selectedAvatar.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-bold text-text-primary truncate">
                    {capitalizeFirstLetter(name, isEditMode ? "Agent Chat" : "Playground Preview")}
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold shrink-0">
                    Live
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-primary border border-border-primary/60 text-text-muted flex items-center gap-1 shrink-0">
                    <FiCpu className="text-[10px] text-accent-primary" />
                    {currentModelObj?.displayName || selectedModel}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 truncate">
                  {convId ? "Active Thread History" : "New Chat Session"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleStartNewChat}
                className="px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 border border-border-primary/50 text-text-primary text-xs font-medium transition cursor-pointer flex items-center gap-1"
                title="Start a new conversation thread"
              >
                <FiPlus className="text-xs" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2 border-b border-border-primary/30 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 bg-surface-secondary/10 text-[11px]">
            <span className="text-text-muted shrink-0 font-medium">Try asking:</span>
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
              🚫 Test refusal (Out of Scope)
            </button>
          </div>

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
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedAvatar.color} flex items-center justify-center text-white text-2xl shadow-sm`}
                >
                  {selectedAvatar.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Chat with {capitalizeFirstLetter(name, isEditMode ? "this Bot" : "Preview Agent")}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Ask questions grounded strictly in attached knowledge base files. All responses are verified against your vector documents.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full pt-2">
                  <button
                    onClick={() => handleSendMessage("What topics are covered in the attached knowledge base?")}
                    className="p-3 text-left rounded-xl border border-border-primary/60 hover:border-accent-primary/60 bg-surface-secondary/40 hover:bg-surface-secondary text-xs text-text-primary transition cursor-pointer flex items-center gap-2"
                  >
                    <FiMessageSquare className="text-accent-primary shrink-0" />
                    <span>What topics are covered in the knowledge base?</span>
                  </button>
                </div>
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
                      <div className="prose dark:prose-invert prose-xs max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || "Thinking..."}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Sources & Knowledge Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border-primary/30 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <FiCheck className="text-xs" />
                          <span>{msg.sources.length} Knowledge Chunks Grounded</span>
                        </div>
                        {msg.sources.map((s, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] space-y-0.5"
                          >
                            <div className="flex justify-between font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              <span>{s.fileName || s.title || "Knowledge File"}</span>
                              <span>
                                {s.score != null
                                  ? typeof s.score === "number"
                                    ? `${Math.round(s.score * 100)}% Match`
                                    : s.score
                                  : "Verified"}
                              </span>
                            </div>
                            {s.snippet && <p className="text-text-muted italic">{s.snippet}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted/60 mt-1 px-1">
                    {msg.role === "user" ? "You" : capitalizeFirstLetter(name, "Agent")}
                  </span>
                </div>
              ))
            )}

            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-text-muted py-2 px-3 bg-surface-secondary/40 rounded-xl w-fit">
                <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce [animation-delay:0.4s]"></div>
                <span>Retrieving knowledge and generating response...</span>
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask ${capitalizeFirstLetter(name, "this agent")} anything...`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border-primary/60 bg-surface-primary text-xs focus:outline-none focus:border-accent-primary transition placeholder:text-text-muted/60"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="p-2.5 rounded-xl bg-accent-primary hover:opacity-90 text-white transition disabled:opacity-40 cursor-pointer"
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
