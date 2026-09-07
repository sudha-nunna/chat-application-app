import { useState, useRef, useCallback, useEffect } from "react";
import {
  FiPlus,
  FiSidebar,
  FiChevronLeft,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiCheck,
  FiX,
  FiFileText,
  FiUploadCloud,
  FiTrash2,
  FiSearch
} from "react-icons/fi";
import { TbRobotFace, TbSparkles } from "react-icons/tb";
import { NobackEndCall, NobackEndCallObj } from "../../services/authService";
import { NODE_TEMPLATES } from "./studioConstants";

export default function NodePalette({
  isCollapsed,
  onToggleCollapse,
  onAddNode,
  agentId,
  // Agent Settings props for Info tab
  voiceProfile,
  onOpenVoiceModal,
  selectedModel = "glm-5.3-flash:cloud",
  onModelChange,
  knowledgeSources = [],
  onKnowledgeSourcesChange,
  onEnsureSavedAgentId
}) {
  const [activeTab, setActiveTab] = useState("info"); // 1st is Info by default; "info" | "nodes"
  const [panelWidth, setPanelWidth] = useState(300); // Adjustable width
  const isResizingRef = useRef(false);

  // Accordions open by default so user sees all details initially
  const [isAgentSettingsOpen, setIsAgentSettingsOpen] = useState(true);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(true);

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelDropdownPos, setModelDropdownPos] = useState({ top: 180, left: 320 });
  const modelButtonRef = useRef(null);
  const paletteContainerRef = useRef(null);

  // Knowledge Base State
  const [knowledgeFiles, setKnowledgeFiles] = useState(() =>
    Array.isArray(knowledgeSources) ? knowledgeSources : []
  );
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const prevSourcesRef = useRef(knowledgeSources);
  useEffect(() => {
    if (
      knowledgeSources &&
      Array.isArray(knowledgeSources) &&
      knowledgeSources.length > 0 &&
      knowledgeSources !== prevSourcesRef.current
    ) {
      prevSourcesRef.current = knowledgeSources;
      const t = setTimeout(() => {
        setKnowledgeFiles(knowledgeSources);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [knowledgeSources]);

  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "0 KB";
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const newFile = files[0];
    const formattedSize = formatFileSize(newFile.size);
    const tempId = `kf-${Date.now()}`;
    const fileExt = newFile.name.split(".").pop().toLowerCase();

    // 1. Immediately show in UI with status: "Uploading..."
    const pendingItem = {
      id: tempId,
      name: newFile.name,
      size: formattedSize,
      status: "Uploading...",
      isUploading: true
    };
    setKnowledgeFiles((prev) => [...prev, pendingItem]);
    setIsUploadingFile(true);

    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      // 2. Read file as base64 (for PDF / DOCX) and text
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result || "";
          const base64 = typeof result === "string" ? result.split(",")[1] || "" : "";
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(newFile);
      });

      let rawText = "";
      if (fileExt === "txt") {
        try {
          rawText = await newFile.text();
        } catch {
          rawText = "";
        }
      }

      // 3. Ensure agent ID exists in database (auto-save new draft if needed)
      let targetAgentId = agentId && agentId !== "new" ? agentId : null;
      if (!targetAgentId && onEnsureSavedAgentId) {
        targetAgentId = await onEnsureSavedAgentId();
      }

      if (targetAgentId) {
        const res = await NobackEndCallObj(
          `/agents/${targetAgentId}/knowledge/upload`,
          {
            fileName: newFile.name,
            fileType: fileExt,
            fileSize: newFile.size,
            rawText,
            fileContentBase64: base64Data
          },
          "POST"
        );

        if (res && (res.success || res.data)) {
          const itemData = res.data || {};
          const finalItem = {
            ...itemData,
            id: itemData.id || itemData._id || tempId,
            name: itemData.name || newFile.name,
            size: itemData.size || formattedSize,
            status: "Ready",
            isUploading: false
          };
          setKnowledgeFiles((prev) =>
            prev.map((item) => (item.id === tempId ? finalItem : item))
          );
          if (onKnowledgeSourcesChange) {
            onKnowledgeSourcesChange((prev) => {
              const filtered = (prev || []).filter((item) => item.id !== tempId);
              return [...filtered, finalItem];
            });
          }
          setIsUploadingFile(false);
          return;
        }
      }

      // Fallback local ready state
      const fallbackItem = {
        id: tempId,
        name: newFile.name,
        size: formattedSize,
        status: "Ready",
        isUploading: false
      };
      setKnowledgeFiles((prev) =>
        prev.map((item) => (item.id === tempId ? fallbackItem : item))
      );
      if (onKnowledgeSourcesChange) {
        onKnowledgeSourcesChange((prev) => {
          const filtered = (prev || []).filter((item) => item.id !== tempId);
          return [...filtered, fallbackItem];
        });
      }
    } catch (err) {
      console.warn("Upload error:", err.message);
      const readyItem = {
        id: tempId,
        name: newFile.name,
        size: formattedSize,
        status: "Ready",
        isUploading: false
      };
      setKnowledgeFiles((prev) =>
        prev.map((item) => (item.id === tempId ? readyItem : item))
      );
      if (onKnowledgeSourcesChange) {
        onKnowledgeSourcesChange((prev) => {
          const filtered = (prev || []).filter((item) => item.id !== tempId);
          return [...filtered, readyItem];
        });
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteKnowledgeItem = async (id) => {
    setKnowledgeFiles((prev) => prev.filter((item) => item.id !== id));
    if (onKnowledgeSourcesChange) {
      onKnowledgeSourcesChange((prev) => prev.filter((item) => item.id !== id));
    }
    if (agentId && agentId !== "new") {
      try {
        await NobackEndCallObj(`/agents/${agentId}/knowledge/${id}`, {}, "DELETE");
      } catch (err) {
        console.warn("Delete knowledge notice:", err.message);
      }
    }
  };

  // Resize handler from right edge (supports right-to-left / left-to-right dragging)
  const startResizing = useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const startX = mouseDownEvent.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (mouseMoveEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = mouseMoveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 230), 550);
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [panelWidth]);

  const [serverModels, setServerModels] = useState([]);
  const [modelSearch, setModelSearch] = useState("");
  const modelDropdownRef = useRef(null);

  // Fetch real available models from backend /models/available
  useEffect(() => {
    let isMounted = true;
    NobackEndCall("/models/available")
      .then((res) => {
        if (!isMounted) return;
        const list = res?.models || (Array.isArray(res) ? res : []);
        const active = list.filter((m) => m.enabled !== false && m.modelId !== "auto");
        if (active.length > 0) {
          const formatted = active.map((m) => ({
            id: m.modelId,
            label: m.displayName || m.name || m.modelId,
            tier: m.tier || "FAST",
            badge: m.recommended ? "Recommended" : (m.tier || "Active"),
            recommended: !!m.recommended
          }));
          setServerModels(formatted);
        }
      })
      .catch((err) => {
        console.error("Failed to load models:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate exact position directly underneath the model input select
  const handleToggleModelDropdown = () => {
    if (!showModelDropdown && modelButtonRef.current) {
      const btnRect = modelButtonRef.current.getBoundingClientRect();
      const flyoutHeight = 360;
      const flyoutWidth = Math.min(320, window.innerWidth - 32);

      // Align directly with the left edge of the input button (directly below the input)
      const leftPos = Math.max(12, Math.min(window.innerWidth - flyoutWidth - 12, btnRect.left));

      // Open directly below the input button if space permits, otherwise open above
      const spaceBelow = window.innerHeight - btnRect.bottom;
      const topPos = spaceBelow >= 300
        ? btnRect.bottom + 6
        : Math.max(60, btnRect.top - flyoutHeight - 6);

      setModelDropdownPos({
        top: Math.round(topPos),
        left: Math.round(leftPos)
      });
    }
    setShowModelDropdown((prev) => !prev);
  };

  // Close dropdown on outside click or panel scroll
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target) &&
        modelButtonRef.current &&
        !modelButtonRef.current.contains(e.target)
      ) {
        setShowModelDropdown(false);
      }
    };
    const handleScroll = () => {
      if (showModelDropdown) {
        setShowModelDropdown(false);
      }
    };

    if (showModelDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showModelDropdown]);

  const displayedModels = serverModels.length > 0 ? serverModels : [
    { id: "glm-5.3-flash:cloud", label: "Glm 5.3 Flash Cloud", tier: "FAST", badge: "Recommended" },
    { id: "deepseek-v4-flash:0731", label: "Deepseek V4 Flash 0731", tier: "FAST", badge: "Fast" },
    { id: "minimax-m3", label: "Minimax M3", tier: "FAST", badge: "Fast" },
    { id: "glm-5.3-flash", label: "Glm 5.3 Flash", tier: "FAST", badge: "Fast" },
    { id: "kimi-k2.7-code", label: "Kimi K2.7 Code", tier: "BALANCED", badge: "Code & Logic" },
    { id: "qwen3.5:397b", label: "Qwen3.5 397b", tier: "BALANCED", badge: "Balanced" }
  ];

  const filteredModels = displayedModels.filter((m) =>
    (m.label || "").toLowerCase().includes(modelSearch.toLowerCase()) ||
    (m.id || "").toLowerCase().includes(modelSearch.toLowerCase())
  );

  const currentModelObj = displayedModels.find((m) => m.id === selectedModel);
  const currentModelLabel = currentModelObj?.label || selectedModel;

  // Collapsed floating mode
  if (isCollapsed) {
    return (
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAddNode("conversation")}
          className="w-8 h-8 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shadow-md hover:scale-105 transition cursor-pointer"
          title="Add Node"
        >
          <FiPlus className="text-base" />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-xl bg-surface-primary border border-border-primary text-text-muted hover:text-text-primary flex items-center justify-center shadow-md hover:bg-surface-secondary transition cursor-pointer"
          title="Expand Node Palette"
        >
          <FiSidebar className="text-sm" />
        </button>
      </div>
    );
  }

  // Expanded panel mode with adjustable width
  return (
    <div
      ref={paletteContainerRef}
      style={{ width: `${panelWidth}px` }}
      className="h-full border-r border-border-primary/60 bg-surface-primary/90 backdrop-blur-md flex flex-col justify-between shrink-0 z-20 select-none relative"
    >
      {/* Right Edge Resizing Drag Handle */}
      <div
        onMouseDown={startResizing}
        className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-accent-primary/50 active:bg-accent-primary transition-colors group z-30 flex items-center justify-center"
        title="Drag left/right to adjust width"
      >
        <div className="w-[2px] h-8 rounded-full bg-border-primary/80 group-hover:bg-accent-primary group-active:bg-accent-primary transition-colors" />
      </div>

      {/* Top Header & Tab Switcher: 1st is Info, 2nd is Nodes */}
      <div className="p-3 border-b border-border-primary/40 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          {/* Segmented switch: 1. Info & Config | 2. Nodes */}
          <div className="flex items-center bg-surface-secondary/70 p-1 rounded-xl border border-border-primary/50 text-xs w-full max-w-[210px]">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex-1 py-1 rounded-lg font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                activeTab === "info"
                  ? "bg-surface-primary text-text-primary shadow-2xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <FiInfo className="text-[11px]" />
              <span>Info &amp; Config</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("nodes")}
              className={`flex-1 py-1 rounded-lg font-semibold transition cursor-pointer text-center ${
                activeTab === "nodes"
                  ? "bg-surface-primary text-text-primary shadow-2xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Nodes
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition cursor-pointer"
            title="Collapse palette"
          >
            <FiChevronLeft className="text-base" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {activeTab === "nodes" ? (
          /* NODES LIST */
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2 py-1 block">
              Core Conversation Nodes
            </span>
            {NODE_TEMPLATES.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", node.type);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onAddNode(node.type)}
                  className="flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:border-border-primary/60 hover:bg-surface-secondary/60 transition-all cursor-pointer group active:scale-[0.98]"
                  title={node.desc}
                >
                  <div className={`w-7 h-7 rounded-lg ${node.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon className="text-sm" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary block truncate">
                      {node.title}
                    </span>
                    <span className="text-[10px] text-text-muted block truncate">
                      {node.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* INFO & AGENT CONFIGURATION TAB */
          <div className="space-y-4 text-xs leading-relaxed">
            {/* 1. AGENT SETTINGS ACCORDION (Matches Image 1) */}
            <div className="rounded-2xl border border-border-primary/60 bg-surface-primary dark:bg-surface-secondary shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAgentSettingsOpen(!isAgentSettingsOpen)}
                className="w-full p-3 flex items-center justify-between hover:bg-surface-secondary/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <TbRobotFace className="text-sm" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">Agent Settings</span>
                </div>
                {isAgentSettingsOpen ? (
                  <FiChevronUp className="text-xs text-text-muted" />
                ) : (
                  <FiChevronDown className="text-xs text-text-muted" />
                )}
              </button>

              {isAgentSettingsOpen && (
                <div className="p-3 pt-0 border-t border-border-primary/30 space-y-3 mt-1">
                  {/* Voice & Language Selection */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10.5px] font-semibold text-text-muted">
                      Voice &amp; Language
                    </label>

                    <div className="flex items-center gap-1.5">
                      {/* Voice avatar button (First with more width) */}
                      <button
                        type="button"
                        onClick={onOpenVoiceModal}
                        className="flex-1 min-w-0 flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary border border-border-primary/60 transition cursor-pointer"
                        title="Change voice profile"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={
                              voiceProfile?.avatarUrl ||
                              "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80"
                            }
                            alt="Voice"
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-border-primary shrink-0"
                          />
                          <span className="text-[11px] font-bold text-text-primary truncate">
                            {voiceProfile?.name || "Cimo"}
                          </span>
                        </div>
                        <FiChevronDown className="text-xs text-text-muted shrink-0 ml-1" />
                      </button>

                      {/* Small compact English shortcut badge */}
                      <div
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-surface-secondary/60 border border-border-primary/60 text-xs select-none"
                        title="Language: English (Default)"
                      >
                        <span className="text-xs">🇺🇸</span>
                        <span className="text-[11px] font-bold text-text-primary uppercase tracking-wide">
                          EN
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Global Settings (Model & Handbook) */}
                  <div className="space-y-2 pt-1 border-t border-border-primary/30">
                    <label className="text-[10.5px] font-semibold text-text-muted">
                      Global Settings
                    </label>

                    {/* Model selector */}
                    <div className="relative w-full">
                      <button
                        ref={modelButtonRef}
                        type="button"
                        onClick={handleToggleModelDropdown}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          showModelDropdown
                            ? "bg-surface-secondary border-accent-primary text-text-primary shadow-xs"
                            : "bg-surface-secondary/60 hover:bg-surface-secondary border-border-primary/60 text-text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate text-[11px]">
                          <TbSparkles className="text-xs text-emerald-500 shrink-0" />
                          <span className="truncate">{currentModelLabel}</span>
                        </div>
                        <FiChevronDown
                          className={`text-xs text-text-muted shrink-0 ml-1 transition-transform ${
                            showModelDropdown ? "rotate-180 text-accent-primary" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. KNOWLEDGE BASE ACCORDION */}
            <div className="rounded-2xl border border-border-primary/60 bg-surface-primary dark:bg-surface-secondary shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setIsKnowledgeBaseOpen(!isKnowledgeBaseOpen)}
                className="w-full p-3 flex items-center justify-between hover:bg-surface-secondary/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FiFileText className="text-sm" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">Knowledge Base</span>
                </div>
                {isKnowledgeBaseOpen ? (
                  <FiChevronUp className="text-xs text-text-muted" />
                ) : (
                  <FiChevronDown className="text-xs text-text-muted" />
                )}
              </button>

              {isKnowledgeBaseOpen && (
                <div className="p-3 pt-0 border-t border-border-primary/30 space-y-3 mt-1">
                  <p className="text-[11px] text-text-muted pt-2 leading-relaxed">
                    Ground agent responses in factual documents and dynamic knowledge sources.
                  </p>

                  {/* Upload file button / hidden input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                      className="flex-1 py-2 px-2.5 rounded-xl border border-dashed border-border-primary/80 hover:border-accent-primary bg-surface-secondary/40 hover:bg-surface-secondary text-text-primary text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingFile ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                          <span>Uploading &amp; Indexing...</span>
                        </>
                      ) : (
                        <>
                          <FiUploadCloud className="text-xs text-accent-primary" />
                          <span>Upload Document</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Attached knowledge items list */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                      Active Sources ({knowledgeFiles.length})
                    </span>
                    {knowledgeFiles.length === 0 ? (
                      <div className="text-center py-3.5 px-2.5 rounded-xl border border-dashed border-border-primary/70 bg-surface-secondary/20 text-text-muted text-[11px] leading-relaxed">
                        No active sources yet. Upload a document (PDF, DOCX, TXT) above.
                      </div>
                    ) : (
                      knowledgeFiles.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary/50 border border-border-primary/50 text-[11px]"
                        >
                          <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                            <FiFileText className="text-xs text-text-muted shrink-0" />
                            <div className="truncate">
                              <span className="font-semibold text-text-primary block truncate">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-text-muted flex items-center gap-1.5">
                                <span>{item.size}</span>
                                <span>•</span>
                                {item.isUploading || item.status === "Uploading..." ? (
                                  <span className="text-accent-primary font-medium flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full border-2 border-accent-primary border-t-transparent animate-spin inline-block" />
                                    <span>Indexing...</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                    <span>Ready</span>
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteKnowledgeItem(item.id)}
                            className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-surface-secondary transition cursor-pointer shrink-0"
                            title="Remove source"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right-side Floating Model Selection Flyout */}
      {showModelDropdown && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-transparent"
            onClick={() => {
              setShowModelDropdown(false);
              setModelSearch("");
            }}
          />

          <div
            ref={modelDropdownRef}
            style={{
              top: `${modelDropdownPos.top}px`,
              left: `${modelDropdownPos.left}px`
            }}
            className="fixed z-[100] w-[300px] sm:w-[320px] bg-surface-primary dark:bg-[#18181b] border border-border-primary rounded-2xl shadow-2xl p-3 animate-fadeIn flex flex-col"
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-primary/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <TbSparkles className="text-sm" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">Select AI Model</h4>
                <p className="text-[10px] text-text-muted">Choose your foundation engine</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowModelDropdown(false);
                setModelSearch("");
              }}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition cursor-pointer"
            >
              <FiX className="text-xs" />
            </button>
          </div>

          {/* Filter Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-secondary/70 border border-border-primary/60 text-xs mb-2">
            <FiSearch className="text-text-muted shrink-0 text-xs" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Filter available models..."
              className="w-full bg-transparent text-text-primary text-xs focus:outline-hidden placeholder:text-text-muted/60"
              autoFocus
            />
            {modelSearch && (
              <button
                type="button"
                onClick={() => setModelSearch("")}
                className="text-text-muted hover:text-text-primary text-xs cursor-pointer"
              >
                <FiX />
              </button>
            )}
          </div>

          {/* Scrollable list of available models */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredModels.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-muted">
                No matching models found
              </div>
            ) : (
              filteredModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onModelChange(m.id);
                    setShowModelDropdown(false);
                    setModelSearch("");
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                    selectedModel === m.id
                      ? "bg-accent-primary/10 text-accent-primary font-bold border border-accent-primary/30"
                      : "text-text-primary hover:bg-surface-secondary/80 border border-transparent"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate block">
                        {m.label}
                      </span>
                      {m.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                            m.badge === "Recommended"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-surface-secondary text-text-muted border border-border-primary/40"
                          }`}
                        >
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted block truncate font-mono mt-0.5">
                      {m.id}
                    </span>
                  </div>

                  {selectedModel === m.id && (
                    <div className="w-5 h-5 rounded-full bg-accent-primary text-white flex items-center justify-center shrink-0">
                      <FiCheck className="text-xs" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </>
    )}
    </div>
  );
}
