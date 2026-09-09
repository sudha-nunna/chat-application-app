import { useState, useEffect, useMemo, useRef } from "react";
import {
  FiEye,
  FiCode,
  FiSmartphone,
  FiTablet,
  FiMonitor,
  FiRefreshCw,
  FiExternalLink,
  FiCopy,
  FiCheck,
  FiDownload,
  FiX,
  FiLayers,
  FiFolder,
  FiFileText,
  FiEdit2,
  FiRotateCcw,
} from "react-icons/fi";
import { generateSandboxHtml, downloadFile } from "../../utils/codeExportUtils";
import { useTheme } from "../../context/ThemeContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const ArtifactPreviewPanel = ({
  artifact,
  onClose,
  versionNumber = 1,
  totalVersions = 1,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("preview"); // 'preview' | 'code'
  const wasStreamingRef = useRef(Boolean(artifact?.isStreaming));
  const codeContainerRef = useRef(null);
  const [viewportMode, setViewportMode] = useState("desktop"); // 'desktop' | 'tablet' | 'mobile'
  const [isCopied, setIsCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // In-panel Code Editing State: map of { [fileName]: editedCodeString }
  const [editedFiles, setEditedFiles] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const editorLineNumbersRef = useRef(null);
  const editorTextareaRef = useRef(null);

  // Multi-file tab selection
  const [userSelectedFileName, setUserSelectedFileName] = useState(null);

  const selectedFileName =
    userSelectedFileName && (artifact?.files?.[userSelectedFileName] || artifact?.fileNames?.includes(userSelectedFileName))
      ? userSelectedFileName
      : artifact?.activeFile || (artifact?.fileNames && artifact.fileNames[0]) || "App.jsx";

  // Current active file data for the Code tab (merged with user edits)
  const currentFile = useMemo(() => {
    const rawFile =
      artifact?.files && artifact.files[selectedFileName]
        ? artifact.files[selectedFileName]
        : {
            name: selectedFileName || "App.jsx",
            code: artifact?.code || "",
            language: artifact?.language || "html",
          };

    const hasUserEdit = editedFiles[selectedFileName] !== undefined;
    const finalCode = hasUserEdit ? editedFiles[selectedFileName] : rawFile.code;

    return {
      ...rawFile,
      code: finalCode,
      isEdited: hasUserEdit && finalCode !== rawFile.code,
    };
  }, [artifact, selectedFileName, editedFiles]);

  // Unified artifact representation with user edits injected for live preview compilation
  const effectiveArtifact = useMemo(() => {
    if (!artifact) return null;
    const hasEdits = Object.keys(editedFiles).length > 0;
    if (!hasEdits) return artifact;

    if (artifact.files) {
      const mergedFiles = {};
      Object.keys(artifact.files).forEach((fn) => {
        mergedFiles[fn] = {
          ...artifact.files[fn],
          code: editedFiles[fn] !== undefined ? editedFiles[fn] : artifact.files[fn].code,
        };
      });
      return {
        ...artifact,
        files: mergedFiles,
        code: mergedFiles[selectedFileName]?.code || artifact.code,
      };
    }

    return {
      ...artifact,
      code: editedFiles[selectedFileName] !== undefined ? editedFiles[selectedFileName] : artifact.code,
    };
  }, [artifact, editedFiles, selectedFileName]);

  // When streaming finishes, ensure preview tab is active
  useEffect(() => {
    if (wasStreamingRef.current && !artifact?.isStreaming && artifact?.code) {
      setActiveTab("preview");
    }
    wasStreamingRef.current = Boolean(artifact?.isStreaming);
  }, [artifact?.isStreaming, artifact?.code]);

  // Auto-scroll code container as code streams in
  useEffect(() => {
    if (artifact?.isStreaming && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [artifact?.code, artifact?.isStreaming]);

  // Real-time sandbox bundle derived from effectiveArtifact (incorporates user edits instantly)
  const sandboxHtml = useMemo(() => {
    if (!effectiveArtifact) return "";
    // Avoid expensive babel transpilation & iframe reload while tokens are actively streaming
    if (effectiveArtifact.isStreaming && activeTab !== "preview") return "";
    return generateSandboxHtml(effectiveArtifact);
  }, [effectiveArtifact, activeTab]);

  const handleCodeChange = (newCode) => {
    setEditedFiles((prev) => ({
      ...prev,
      [selectedFileName]: newCode,
    }));
  };

  const handleRevertCurrentFile = () => {
    setEditedFiles((prev) => {
      const next = { ...prev };
      delete next[selectedFileName];
      return next;
    });
  };

  const handleEditorKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const newVal = val.substring(0, start) + "  " + val.substring(end);
      handleCodeChange(newVal);
      requestAnimationFrame(() => {
        if (editorTextareaRef.current) {
          editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const handleEditorScroll = (e) => {
    if (editorLineNumbersRef.current) {
      editorLineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const currentCodeLines = useMemo(() => {
    const text = currentFile.code || "";
    return text.split("\n");
  }, [currentFile.code]);

  const handleCopyCode = async () => {
    const codeToCopy = currentFile?.code || effectiveArtifact?.code || artifact?.code;
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleDownload = () => {
    if (!sandboxHtml) return;
    const safeTitle = (artifact?.title || "web-project")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    downloadFile(`${safeTitle}.html`, sandboxHtml, "text/html");
  };

  const handleOpenNewTab = () => {
    if (!sandboxHtml) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(sandboxHtml);
      newWindow.document.close();
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const getViewportWidthClass = () => {
    if (viewportMode === "mobile") return "max-w-[390px] shadow-2xl rounded-2xl border border-border-primary/60 dark:border-white/10 my-4 h-[92%]";
    if (viewportMode === "tablet") return "max-w-[768px] shadow-2xl rounded-2xl border border-border-primary/60 dark:border-white/10 my-3 h-[96%]";
    return "w-full h-full";
  };

  if (!artifact) return null;

  return (
    <div
      className={`h-full w-full flex flex-col border-l transition-all duration-300 ${
        isDark ? "bg-[#0b0c10] border-white/10 text-white" : "bg-white border-border-primary/60 text-text-primary"
      }`}
    >
      {/* Top Toolbar */}
      <header
        className={`px-3 sm:px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 backdrop-blur-md ${
          isDark ? "bg-[#101118]/80 border-white/10" : "bg-surface-secondary/70 border-border-primary/60"
        }`}
      >
        {/* Left: Title & Version Pill */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
            <FiLayers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold truncate max-w-[130px] sm:max-w-[200px]">
              {artifact.title || "Web Preview"}
            </h3>
          </div>
          {artifact?.isStreaming ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Writing Code...
            </span>
          ) : totalVersions > 0 ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/5 dark:bg-white/10 text-text-muted shrink-0">
              v{versionNumber}
            </span>
          ) : null}
        </div>

        {/* Center: Tabs & Viewport Switcher */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Preview / Code Tab Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-primary/40 dark:border-white/5">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === "preview"
                  ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Live Interactive Preview"
            >
              <FiEye className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === "code"
                  ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="View Source Code"
            >
              <FiCode className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Code</span>
            </button>
          </div>

          {/* Edit / View Switcher (when in code tab and not streaming) */}
          {activeTab === "code" && !artifact?.isStreaming && (
            <div className="flex items-center p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-primary/40 dark:border-white/5">
              <button
                onClick={() => setIsEditMode(false)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                  !isEditMode
                    ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="View formatted syntax-highlighted code"
              >
                <FiEye className="w-3 h-3" />
                <span className="hidden xs:inline">View</span>
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                  isEditMode
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Edit code directly in browser"
              >
                <FiEdit2 className="w-3 h-3" />
                <span className="hidden xs:inline">Edit</span>
              </button>
            </div>
          )}

          {activeTab === "code" && currentFile.isEdited && (
            <button
              onClick={handleRevertCurrentFile}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition cursor-pointer shrink-0"
              title="Revert file to original AI generated code"
            >
              <FiRotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Revert</span>
            </button>
          )}

          {/* Viewport Width (Desktop / Tablet / Mobile) - only in preview tab */}
          {activeTab === "preview" && (
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-primary/40 dark:border-white/5">
              <button
                onClick={() => setViewportMode("desktop")}
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  viewportMode === "desktop"
                    ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Desktop View (100%)"
              >
                <FiMonitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode("tablet")}
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  viewportMode === "tablet"
                    ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Tablet View (768px)"
              >
                <FiTablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode("mobile")}
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  viewportMode === "mobile"
                    ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Mobile View (390px)"
              >
                <FiSmartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Action Icons: Refresh, New Tab, Copy, Download, Close */}
        <div className="flex items-center gap-1 shrink-0">
          {activeTab === "preview" && (
            <>
              <button
                onClick={handleRefresh}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition cursor-pointer"
                title="Reload Preview"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleOpenNewTab}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition cursor-pointer"
                title="Open Live in New Window"
              >
                <FiExternalLink className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition cursor-pointer"
            title="Copy Code"
          >
            {isCopied ? (
              <FiCheck className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <FiCopy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/90 active:scale-95 text-xs font-semibold transition shadow-xs cursor-pointer"
            title="Download complete runnable HTML file"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Download</span>
          </button>

          <div className="h-4 w-[1px] bg-border-primary dark:bg-white/10 mx-0.5" />

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition cursor-pointer"
            title="Close Preview Panel"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Multi-File Tab Bar (for React multi-component projects) */}
      {artifact?.isMultiFile && artifact?.fileNames?.length > 1 && (
        <div
          className={`px-3 py-1.5 border-b flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 text-xs ${
            isDark ? "bg-[#0e0f14] border-white/5" : "bg-surface-secondary/50 border-border-primary/50"
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-text-muted mr-1 flex items-center gap-1 shrink-0">
            <FiFolder className="w-3 h-3" /> Files ({artifact.fileNames.length}):
          </span>
          {artifact.fileNames.map((fn) => {
            const isSelected = fn === selectedFileName;
            const isModified = editedFiles[fn] !== undefined;
            return (
              <button
                key={fn}
                onClick={() => {
                  setUserSelectedFileName(fn);
                  setActiveTab("code");
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-accent-primary text-white shadow-xs font-semibold"
                    : "hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary"
                }`}
              >
                <FiFileText className="w-3 h-3" />
                <span>{fn}</span>
                {isModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area: Preview Iframe OR Code Editor */}
      <div className="flex-1 w-full h-full overflow-hidden relative flex items-center justify-center bg-zinc-100 dark:bg-[#07080b]">
        {activeTab === "preview" ? (
          <div
            className={`w-full h-full flex items-center justify-center transition-all duration-300 overflow-hidden ${getViewportWidthClass()}`}
          >
            <iframe
              key={refreshKey}
              title={artifact.title || "Live Preview"}
              srcDoc={sandboxHtml}
              sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              className="w-full h-full border-0 bg-white rounded-inherit"
            />
          </div>
        ) : (
          <div
            ref={codeContainerRef}
            className={`w-full h-full overflow-hidden flex flex-col ${
              isDark ? "bg-[#0b0c10] text-gray-200" : "bg-[#fafafa] text-gray-800"
            }`}
          >
            {artifact?.isStreaming ? (
              <div className="w-full h-full overflow-auto custom-scrollbar">
                <pre className="p-5 font-mono text-[12px] leading-[1.6] whitespace-pre-wrap select-text">
                  <code>
                    {currentFile.code || ""}
                    <span className="inline-block w-2 h-4 bg-emerald-500 ml-0.5 animate-pulse align-middle" />
                  </code>
                </pre>
              </div>
            ) : isEditMode ? (
              <div className="flex-1 w-full h-full flex flex-row overflow-hidden relative font-mono text-[12px] leading-[1.6]">
                {/* Real-time Synchronized Line Numbers Column */}
                <div
                  ref={editorLineNumbersRef}
                  className={`py-4 px-2 select-none text-right border-r shrink-0 overflow-hidden font-mono text-[11px] leading-[1.6] ${
                    isDark ? "bg-[#08090d] text-gray-600 border-white/5" : "bg-[#f3f4f6] text-gray-400 border-gray-200"
                  }`}
                  style={{ minWidth: "44px" }}
                >
                  {currentCodeLines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Direct Live Code Editor Textarea */}
                <textarea
                  ref={editorTextareaRef}
                  value={currentFile.code || ""}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  onScroll={handleEditorScroll}
                  spellCheck="false"
                  autoCapitalize="off"
                  autoComplete="off"
                  placeholder="Type or edit code here..."
                  className={`flex-1 w-full h-full p-4 resize-none outline-none border-0 custom-scrollbar font-mono text-[12px] leading-[1.6] whitespace-pre overflow-auto ${
                    isDark
                      ? "bg-[#0b0c10] text-emerald-300 selection:bg-emerald-500/30"
                      : "bg-[#fafafa] text-slate-900 selection:bg-emerald-500/20"
                  }`}
                />
              </div>
            ) : (
              <div className="w-full h-full overflow-auto custom-scrollbar">
                <SyntaxHighlighter
                  style={isDark ? vscDarkPlus : oneLight}
                  language={currentFile.language || "html"}
                  showLineNumbers={true}
                  customStyle={{
                    margin: 0,
                    padding: "1.25rem",
                    background: "transparent",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  {currentFile.code || ""}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactPreviewPanel;
