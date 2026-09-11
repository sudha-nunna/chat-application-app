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
  FiTerminal,
  FiTrash2,
  FiZap,
  FiImage,
} from "react-icons/fi";
import { generateSandboxHtml, downloadFile } from "../../utils/codeExportUtils";
import { VirtualFileSystem } from "../../utils/virtualFileSystem";
import { SandpackProvider, SandpackPreview, SandpackConsole, SandpackLayout } from "@codesandbox/sandpack-react";
import FileExplorerSidebar from "./FileExplorerSidebar";
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
  const iframeRef = useRef(null);
  const [viewportMode, setViewportMode] = useState("desktop"); // 'desktop' | 'tablet' | 'mobile'
  const [isCopied, setIsCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Developer Console & Diagnostics State
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState("all"); // 'all' | 'error' | 'warn' | 'info'
  const [diagnostics, setDiagnostics] = useState(null);

  // Captured Image State
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState(null);

  // In-panel Code Editing State: map of { [fileName]: editedCodeString }
  const [editedFiles, setEditedFiles] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const editorLineNumbersRef = useRef(null);
  const editorTextareaRef = useRef(null);

  // Sidebar visibility & Virtual File System state
  const [showSidebar, setShowSidebar] = useState(false);

  // Maintain live VFS workspace instance
  const [vfs, setVfs] = useState(() => {
    if (artifact?.vfs) return artifact.vfs;
    if (artifact?.files) return VirtualFileSystem.fromObject(artifact.files);
    const fallback = new VirtualFileSystem();
    const fileName = artifact?.activeFile || "App.jsx";
    fallback.createFile(fileName, artifact?.code || "", artifact?.language || "jsx");
    return fallback;
  });

  // Re-sync VFS when incoming artifact changes
  useEffect(() => {
    if (artifact?.vfs) {
      setVfs(artifact.vfs);
    } else if (artifact?.files) {
      setVfs(VirtualFileSystem.fromObject(artifact.files));
    }
  }, [artifact]);

  // Multi-file selection
  const [userSelectedFileName, setUserSelectedFileName] = useState(null);

  const selectedFileName =
    userSelectedFileName && vfs.hasFile(userSelectedFileName)
      ? userSelectedFileName
      : artifact?.activeFile || (artifact?.fileNames && artifact.fileNames[0]) || vfs.entryPath || "App.jsx";

  const handleCreateFile = (filePath) => {
    vfs.createFile(filePath, "", null);
    setVfs(VirtualFileSystem.fromObject(vfs.toObject()));
    setUserSelectedFileName(filePath);
    setActiveTab("code");
    setIsEditMode(true);
  };

  const handleRenameFile = (oldPath, newPath) => {
    vfs.renameFile(oldPath, newPath);
    setVfs(VirtualFileSystem.fromObject(vfs.toObject()));
    if (selectedFileName === oldPath) {
      setUserSelectedFileName(newPath);
    }
  };

  const handleDeleteFile = (filePath) => {
    vfs.deleteFile(filePath);
    setVfs(VirtualFileSystem.fromObject(vfs.toObject()));
    if (selectedFileName === filePath) {
      const remaining = vfs.listFiles();
      setUserSelectedFileName(remaining[0] || "App.jsx");
    }
  };

  // Listen for iframe postMessage events (Console Capture, Diagnostics & Image Telemetry)
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || typeof event.data !== "object") return;
      const { type, payload } = event.data;
      if (type === "SANDBOX_CONSOLE_LOG" && payload) {
        setConsoleLogs((prev) => [...prev.slice(-199), { ...payload, id: Math.random() + Date.now() }]);
      } else if (type === "SANDBOX_DIAGNOSTICS" && payload) {
        setDiagnostics(payload);
      } else if ((type === "SANDBOX_HAS_IMAGE" || type === "SANDBOX_IMAGE_CAPTURED") && payload?.dataUrl) {
        setCapturedImageDataUrl(payload.dataUrl);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Reset console logs, diagnostics & captured image when preview reloads
  useEffect(() => {
    setConsoleLogs([]);
    setDiagnostics(null);
    setCapturedImageDataUrl(null);
  }, [refreshKey, artifact?.code]);

  // Filtered console logs for dev panel
  const filteredLogs = useMemo(() => {
    if (consoleFilter === "error") return consoleLogs.filter((l) => l.level === "error");
    if (consoleFilter === "warn") return consoleLogs.filter((l) => l.level === "warn");
    if (consoleFilter === "info") return consoleLogs.filter((l) => l.level === "info" || l.level === "log");
    return consoleLogs;
  }, [consoleLogs, consoleFilter]);

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

  // Pre-preview project dependency validator with Critical vs Warning classification
  const validationResult = useMemo(() => {
    const res = {
      isValid: true,
      criticalErrors: [],
      warnings: [],
      brokenChains: [],
      unusedImports: [],
      dependencyGraph: {},
    };
    if (!vfs) return res;

    const filePaths = vfs.listFiles();
    if (filePaths.length === 0) return res;

    const normalize = (p) => {
      if (!p) return "";
      let clean = p.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
      if (clean.startsWith("src/")) clean = clean.substring(4);
      return clean;
    };

    const pathSet = new Set(filePaths.map((p) => normalize(p)));
    const importedCount = new Map();
    filePaths.forEach((p) => {
      const norm = normalize(p);
      importedCount.set(norm, 0);
      res.dependencyGraph[norm] = [];
    });

    const resolvePath = (fromPath, specifier) => {
      let spec = specifier.trim();
      if (spec.startsWith("@/")) {
        spec = spec.substring(2);
      } else if (spec.startsWith("./") || spec.startsWith("../")) {
        const parts = fromPath.split("/");
        parts.pop(); // remove file basename
        const specParts = spec.split("/");
        for (const p of specParts) {
          if (p === ".") continue;
          if (p === "..") {
            if (parts.length > 0) parts.pop();
          } else {
            parts.push(p);
          }
        }
        spec = parts.join("/");
      } else if (spec.startsWith("/")) {
        spec = spec.substring(1);
      }
      return normalize(spec);
    };

    const isNonExecutableAsset = (pathStr) => {
      return /\.(css|scss|sass|less|json|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf)$/i.test(pathStr);
    };

    const getAssetType = (pathStr) => {
      if (/\.(css|scss|sass|less)$/i.test(pathStr)) return "CSS/Styles";
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathStr)) return "Image/Asset";
      if (/\.(woff|woff2|ttf|eot|otf)$/i.test(pathStr)) return "Font";
      if (/\.json$/i.test(pathStr)) return "JSON";
      return "Static Asset";
    };

    const importRegex = /(?:from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;

    filePaths.forEach((filePath) => {
      const file = vfs.getFile(filePath);
      if (!file || !file.content) return;

      const normFrom = normalize(filePath);
      const code = file.content;
      let match;

      while ((match = importRegex.exec(code)) !== null) {
        const specifier = match[1] || match[2] || match[3];
        if (!specifier) continue;

        // Check relative / local project imports
        if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("@/")) {
          const resolved = resolvePath(normFrom, specifier);

          const extensions = ["", ".jsx", ".tsx", ".js", ".ts", ".css", ".scss", ".json", ".html"];
          let found = false;
          let matchedPath = "";

          for (const ext of extensions) {
            const testPath = resolved.endsWith(ext) ? resolved : resolved + ext;
            if (pathSet.has(testPath)) {
              found = true;
              matchedPath = testPath;
              break;
            }
          }

          if (!found) {
            const indexFiles = ["/index.jsx", "/index.tsx", "/index.js", "/index.ts"];
            for (const idx of indexFiles) {
              if (pathSet.has(resolved + idx)) {
                found = true;
                matchedPath = resolved + idx;
                break;
              }
            }
          }

          if (found) {
            importedCount.set(matchedPath, (importedCount.get(matchedPath) || 0) + 1);
            if (res.dependencyGraph[normFrom]) {
              res.dependencyGraph[normFrom].push({
                path: matchedPath,
                isMissing: false,
                isWarning: false,
              });
            }
          } else {
            const isWarning = isNonExecutableAsset(specifier) || isNonExecutableAsset(resolved);

            if (res.dependencyGraph[normFrom]) {
              res.dependencyGraph[normFrom].push({
                path: resolved,
                isMissing: true,
                isWarning: isWarning,
              });
            }

            if (isWarning) {
              res.warnings.push({
                from: normFrom,
                imported: specifier,
                resolved: resolved,
                type: getAssetType(resolved || specifier),
              });
            } else {
              res.criticalErrors.push({
                from: normFrom,
                imported: specifier,
                resolved: resolved,
              });
              res.brokenChains.push({
                from: normFrom,
                imported: specifier,
                resolved: resolved,
              });
            }
          }
        }
      }
    });

    // Calculate unused imports
    filePaths.forEach((p) => {
      const norm = normalize(p);
      const count = importedCount.get(norm) || 0;
      const isEntry =
        /^app\.(jsx|tsx|js)/i.test(norm) ||
        /^index\.(html|jsx|js)/i.test(norm) ||
        /^main\.(jsx|js)/i.test(norm) ||
        /^styles\.css$/i.test(norm) ||
        /^vite\.config\./i.test(norm);

      if (count === 0 && !isEntry) {
        res.unusedImports.push(norm);
      }
    });

    res.isValid = res.criticalErrors.length === 0;
    return res;
  }, [vfs, effectiveArtifact]);

  // Real-time sandbox bundle mounted strictly from physical VFS files
  const sandpackFiles = useMemo(() => {
    const files = {};
    if (!effectiveArtifact) return files;

    // Add default Vite config
    files["/vite.config.js"] = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

    let hasUserIndexJs = false;
    let primaryHtmlPath = null;

    if (effectiveArtifact.files) {
      Object.values(effectiveArtifact.files).forEach((f) => {
        let normPath = f.name;
        if (normPath.startsWith("src/")) normPath = normPath.substring(4);
        if (normPath.startsWith("/src/")) normPath = normPath.substring(5);
        let name = normPath.startsWith("/") ? normPath : "/" + normPath;
        files[name] = f.code;

        if (name === "/index.js" || name === "/src/index.js") {
          hasUserIndexJs = true;
        }

        if (name.endsWith(".html")) {
          if (!primaryHtmlPath || name === "/index.html" || name === "/register.html") {
            primaryHtmlPath = name;
          }
        }
      });
    } else if (effectiveArtifact.code) {
      const isHtml = effectiveArtifact.language === "html" || effectiveArtifact.language === "htm";
      if (isHtml) {
        files["/index.html"] = effectiveArtifact.code;
        primaryHtmlPath = "/index.html";
      } else {
        const ext = effectiveArtifact.language === "ts" || effectiveArtifact.language === "tsx" ? "tsx" : "jsx";
        files["/App." + ext] = effectiveArtifact.code;
      }
    }

    // Override Sandpack's default vanilla index.js script if user did not provide custom index.js
    // This prevents `document.getElementById('app').innerHTML` null errors on static HTML projects
    if (!hasUserIndexJs) {
      files["/index.js"] = "";
    }

    // Map primary HTML file to /index.html for static/vanilla previews if not set
    if (primaryHtmlPath && !files["/index.html"]) {
      files["/index.html"] = files[primaryHtmlPath];
    }

    return files;
  }, [effectiveArtifact]);

  // Dynamically resolve npm dependencies based on import statements across all files
  const sandpackDependencies = useMemo(() => {
    const deps = {
      "lucide-react": "^0.263.1",
      "framer-motion": "^10.16.4",
      "clsx": "^2.0.0",
      "tailwind-merge": "^2.0.0"
    };
    if (!effectiveArtifact) return deps;

    const importRegex = /import\s+(?:[\s\S]*?)from\s+['"]([^'"]+)['"]/g;
    const codes = effectiveArtifact.files ? Object.values(effectiveArtifact.files).map(f => f.code) : [effectiveArtifact.code];

    codes.forEach(code => {
      if (!code) return;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        let pkg = match[1];
        // If it's a bare module import (npm package)
        if (!pkg.startsWith(".") && !pkg.startsWith("/") && !pkg.startsWith("@/")) {
          // Extract base package name handling scoped packages
          if (pkg.startsWith("@")) {
            pkg = pkg.split("/").slice(0, 2).join("/");
          } else {
            pkg = pkg.split("/")[0];
          }
          if (pkg && pkg !== "react" && pkg !== "react-dom" && pkg !== "vite") {
            deps[pkg] = "latest";
          }
        }
      }
    });
    
    return deps;
  }, [effectiveArtifact]);

  const sandboxHtml = useMemo(() => {
    if (!effectiveArtifact || effectiveArtifact.isStreaming) return "";
    return generateSandboxHtml(effectiveArtifact);
  }, [effectiveArtifact]);

  const handleCodeChange = (newCode) => {
    setEditedFiles((prev) => ({
      ...prev,
      [selectedFileName]: newCode,
    }));
    if (vfs) {
      vfs.updateFile(selectedFileName, newCode);
      setVfs(VirtualFileSystem.fromObject(vfs.toObject()));
    }
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

  const handleDownloadImage = (overrideUrl) => {
    const targetUrl = overrideUrl || capturedImageDataUrl;
    if (!targetUrl) {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: "REQUEST_SANDBOX_IMAGE_CAPTURE" }, "*");
      }
      return;
    }
    const safeTitle = (artifact?.title || "processed-logo")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = `${safeTitle}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = (e) => {
    e?.stopPropagation?.();
    if (capturedImageDataUrl) {
      handleDownloadImage();
      return;
    }
    const safeTitle = (artifact?.title || "web-project")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-") || "web-project";

    if (activeTab === "code" && currentFile?.code) {
      const ext = currentFile.language === "tsx" ? "tsx" : currentFile.language === "jsx" ? "jsx" : currentFile.language === "css" ? "css" : currentFile.language === "js" ? "js" : "html";
      const name = currentFile.name || `${safeTitle}.${ext}`;
      downloadFile(name, currentFile.code, "text/plain");
      return;
    }

    let htmlContent = sandboxHtml;
    if (!htmlContent && effectiveArtifact) {
      htmlContent = generateSandboxHtml(effectiveArtifact);
    }
    if (htmlContent) {
      downloadFile(`${safeTitle}.html`, htmlContent, "text/html");
    } else if (currentFile?.code) {
      downloadFile(`${safeTitle}.html`, currentFile.code, "text/html");
    }
  };

  const handleDownloadHtml = () => {
    let htmlContent = sandboxHtml;
    if (!htmlContent && effectiveArtifact) {
      htmlContent = generateSandboxHtml(effectiveArtifact);
    }
    if (!htmlContent) return;
    const safeTitle = (artifact?.title || "web-project")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-") || "web-project";
    downloadFile(`${safeTitle}.html`, htmlContent, "text/html");
  };

  const handleDownloadSourceCode = () => {
    const codeStr = currentFile?.code || effectiveArtifact?.code || artifact?.code;
    if (!codeStr) return;
    const ext = currentFile?.language === "tsx" ? "tsx" : currentFile?.language === "jsx" ? "jsx" : currentFile?.language === "css" ? "css" : currentFile?.language === "js" ? "js" : "html";
    const name = currentFile?.name || `source.${ext}`;
    downloadFile(name, codeStr, "text/plain");
  };

  const handleOpenNewTab = () => {
    let htmlContent = sandboxHtml;
    if (!htmlContent && effectiveArtifact) {
      htmlContent = generateSandboxHtml(effectiveArtifact);
    }
    if (!htmlContent) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(htmlContent);
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
        <div className="flex items-center gap-2 min-w-0 shrink overflow-hidden">
          <div className="w-6 h-6 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
            <FiLayers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 shrink overflow-hidden">
            <h3 className="text-xs sm:text-sm font-semibold truncate">
              {artifact.title || "Web Preview"}
            </h3>
          </div>
          {artifact?.isStreaming ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap" title="Generating AI Code...">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="hidden md:inline">Writing Code...</span>
            </span>
          ) : totalVersions > 0 ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/5 dark:bg-white/10 text-text-muted shrink-0 whitespace-nowrap">
              v{versionNumber}
            </span>
          ) : null}

          {/* Diagnostic telemetry badge */}
          {diagnostics && activeTab === "preview" && (
            <span
              className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap"
              title="Execution & Render Diagnostics"
            >
              <FiZap className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>{diagnostics.compileTimeMs || 0}ms</span>
              <span className="opacity-40">•</span>
              <span>{diagnostics.fileCount || 1} {diagnostics.fileCount === 1 ? "file" : "files"}</span>
            </span>
          )}
        </div>

        {/* Center: Tabs & Viewport Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* File Explorer Sidebar Toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
              showSidebar
                ? "bg-accent-primary/15 text-accent-primary font-bold border border-accent-primary/30"
                : "text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            title="Toggle File Explorer Sidebar"
          >
            <FiFolder className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Files</span>
          </button>

          {/* Preview / Code Tab Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-primary/40 dark:border-white/5 shrink-0">
            <button
              onClick={() => {
                setActiveTab("preview");
                setShowSidebar(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "preview"
                  ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Live Interactive Preview"
            >
              <FiEye className="w-3.5 h-3.5 shrink-0" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("code");
                setShowSidebar(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "code"
                  ? "bg-white dark:bg-white/20 text-accent-primary dark:text-white shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="View Source Code"
            >
              <FiCode className="w-3.5 h-3.5 shrink-0" />
              <span>Code</span>
            </button>
          </div>

          {/* Developer Console Toggle */}
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`relative flex items-center justify-center p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
              showConsole
                ? isDark
                  ? "bg-zinc-800 text-emerald-400 font-medium shadow-xs border border-zinc-700"
                  : "bg-slate-100 text-emerald-600 font-medium border border-slate-200 shadow-xs"
                : "hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary"
            }`}
            title={`Console${consoleLogs.length > 0 ? ` (${consoleLogs.length} ${consoleLogs.length === 1 ? "log" : "logs"})` : ""}`}
          >
            <FiTerminal className="w-3.5 h-3.5" />
            {consoleLogs.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] font-bold leading-none ${
                  consoleLogs.some((l) => l.level === "error")
                    ? "bg-red-500 text-white shadow-xs"
                    : "bg-emerald-500 text-white shadow-xs"
                }`}
              >
                {consoleLogs.length > 99 ? "99+" : consoleLogs.length}
              </span>
            )}
          </button>

        </div>

        {/* Right Action Icons: Refresh, New Tab, Copy, Download, Close */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition cursor-pointer"
            title="Reload Preview / Reset"
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

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition cursor-pointer flex items-center justify-center"
            title="Download"
          >
            <FiDownload className="w-3.5 h-3.5" />
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
      <div className="flex-1 w-full h-full overflow-hidden relative flex flex-row bg-zinc-100 dark:bg-[#07080b]">
        {showSidebar && (
          <FileExplorerSidebar
            vfs={vfs}
            activeFilePath={selectedFileName}
            onSelectFile={(path) => {
              setUserSelectedFileName(path);
              setActiveTab("code");
            }}
            onCreateFile={handleCreateFile}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            editedFiles={editedFiles}
            isDark={isDark}
          />
        )}
        <div className="flex-1 w-full h-full overflow-hidden relative flex items-center justify-center min-w-0">

          {activeTab === "preview" ? (
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
              {/* Floating Canvas Viewport Mode Switcher */}
              <div className="absolute top-3 z-20 flex items-center p-0.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 shadow-md backdrop-blur-md border border-border-primary/50 dark:border-white/10 transition-all">
                <button
                  onClick={() => setViewportMode("desktop")}
                  className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                    viewportMode === "desktop"
                      ? "bg-accent-primary text-white shadow-xs"
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
                      ? "bg-accent-primary text-white shadow-xs"
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
                      ? "bg-accent-primary text-white shadow-xs"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Mobile View (390px)"
                >
                  <FiSmartphone className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                className={`w-full h-full flex items-center justify-center transition-all duration-300 overflow-hidden ${getViewportWidthClass()}`}
              >
                {effectiveArtifact?.isStreaming ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#07080b]">
                    <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm font-medium text-text-primary">Generating preview...</p>
                    <p className="text-xs text-text-muted mt-1">Live preview will render once code generation finishes</p>
                  </div>
                ) : !validationResult.isValid ? (
                  <div className="w-full h-full flex flex-col p-6 bg-zinc-950 text-white font-mono overflow-auto custom-scrollbar">
                    <div className="flex items-center gap-3 border-b border-red-500/30 pb-4 mb-6 shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-lg border border-red-500/30 shrink-0">
                        ✕
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-red-400">Project validation failed.</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Critical executable code dependencies (.js, .jsx, .ts, .tsx, components, hooks, services) are missing. Preview stopped.
                        </p>
                      </div>
                    </div>

                    {/* Critical Errors */}
                    {validationResult.criticalErrors.length > 0 && (
                      <div className="mb-6 shrink-0">
                        <h3 className="text-xs uppercase font-bold text-red-400 tracking-wider mb-2 flex items-center gap-2">
                          Critical Errors ({validationResult.criticalErrors.length}):
                        </h3>
                        <ul className="space-y-1 bg-red-950/20 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
                          {validationResult.criticalErrors.map((err, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-red-500 font-bold">•</span>
                              <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-red-200">{err.resolved}</code>
                              <span className="text-red-400/80 text-[11px]">(imported in {err.from})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warnings (Non-blocking) */}
                    {validationResult.warnings.length > 0 && (
                      <div className="mb-6 shrink-0">
                        <h3 className="text-xs uppercase font-bold text-amber-400 tracking-wider mb-2 flex items-center gap-2">
                          Warnings ({validationResult.warnings.length}):
                        </h3>
                        <ul className="space-y-1 bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
                          {validationResult.warnings.map((warn, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-amber-500 font-bold">•</span>
                              <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-amber-200">{warn.resolved}</code>
                              <span className="text-amber-400/80 text-[11px]">({warn.type} missing in {warn.from})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Broken Dependency Chain */}
                    {validationResult.brokenChains.length > 0 && (
                      <div className="mb-6 shrink-0">
                        <h3 className="text-xs uppercase font-bold text-amber-400 tracking-wider mb-2">
                          Broken Dependency Chain:
                        </h3>
                        <div className="space-y-2 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono">
                          {validationResult.brokenChains.map((chain, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-zinc-300">
                              <span className="text-zinc-500 font-bold">•</span>
                              <div>
                                <span className="text-white font-semibold">{chain.from}</span>
                                <span className="text-zinc-500 px-1.5">➔</span>
                                <span className="text-red-400 font-semibold">{chain.imported}</span>
                                <span className="text-red-500/80 text-[11px] ml-1.5">(missing)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dependency Graph */}
                    {Object.keys(validationResult.dependencyGraph).length > 0 && (
                      <div className="mb-6 shrink-0">
                        <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
                          Dependency Graph:
                        </h3>
                        <div className="space-y-2 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono max-h-48 overflow-y-auto custom-scrollbar">
                          {Object.entries(validationResult.dependencyGraph).map(([file, deps], idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                                <span className="text-accent-primary">📄</span> {file}
                              </div>
                              {deps.length > 0 ? (
                                <div className="pl-4 space-y-0.5">
                                  {deps.map((dep, dIdx) => (
                                    <div key={dIdx} className="text-zinc-400 flex items-center gap-1.5">
                                      <span>└──</span>
                                      <span className={dep.isMissing ? (dep.isWarning ? "text-amber-400" : "text-red-400 font-semibold") : "text-zinc-300"}>
                                        {dep.path}
                                      </span>
                                      {dep.isMissing && (
                                        <span className={dep.isWarning ? "text-amber-500/80 text-[11px]" : "text-red-500/80 text-[11px]"}>
                                          {dep.isWarning ? "(warning)" : "(missing)"}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="pl-4 text-zinc-600 italic text-[11px]">No local dependencies</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unused Imports */}
                    {validationResult.unusedImports.length > 0 && (
                      <div className="shrink-0">
                        <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
                          Unused Imports ({validationResult.unusedImports.length}):
                        </h3>
                        <ul className="space-y-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400">
                          {validationResult.unusedImports.map((file, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-zinc-600">•</span>
                              <span>{file}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {validationResult.warnings.length > 0 && (
                      <div className="absolute top-2 left-4 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 dark:bg-amber-950/60 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-mono shadow-xs backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>{validationResult.warnings.length} non-critical asset {validationResult.warnings.length === 1 ? "warning" : "warnings"} ({validationResult.warnings.map(w => w.type).join(", ")}) — Preview Active</span>
                      </div>
                    )}
                    <style>{`
                      .sp-wrapper, .sp-layout {
                        height: 100% !important;
                        min-height: 100% !important;
                        width: 100% !important;
                        border: none !important;
                        border-radius: 0 !important;
                        flex: 1 !important;
                      }
                      .sp-preview {
                        height: 100% !important;
                        min-height: 100% !important;
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                      }
                      .sp-preview-container {
                        height: 100% !important;
                        min-height: 100% !important;
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                      }
                      .sp-preview-iframe {
                        height: 100% !important;
                        min-height: 100% !important;
                        flex: 1 !important;
                      }
                    `}</style>
                    <SandpackProvider 
                    key={`${refreshKey}-${Object.keys(sandpackDependencies).sort().join(',')}`}
                    template={effectiveArtifact?.isWebProject || Boolean(sandpackFiles['/index.html'] && !sandpackFiles['/App.jsx'] && !sandpackFiles['/App.tsx']) ? "vanilla" : "vite-react"} 
                    theme={isDark ? "dark" : "light"}
                    files={sandpackFiles}
                    customSetup={{
                      dependencies: sandpackDependencies
                    }}
                  >
                    <SandpackLayout style={{ height: '100%', width: '100%', flex: 1, border: 'none', borderRadius: 0 }}>
                      <SandpackPreview 
                        showNavigator={false} 
                        showRefreshButton={false} 
                        showOpenInCodeSandbox={false}
                        style={{ height: '100%', width: '100%', flex: 1 }}
                      />
                    </SandpackLayout>
                  </SandpackProvider>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              ref={codeContainerRef}
              className={`w-full h-full overflow-hidden relative flex flex-col ${
                isDark ? "bg-[#0b0c10] text-gray-200" : "bg-[#fafafa] text-gray-800"
              }`}
            >
              {/* In-Editor View / Edit Mode Switcher */}
              {!artifact?.isStreaming && (
                <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 p-0.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 shadow-md backdrop-blur-md border border-border-primary/50 dark:border-white/10">
                  <button
                    onClick={() => setIsEditMode(false)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                      !isEditMode
                        ? "bg-accent-primary text-white shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                    title="View formatted syntax-highlighted code"
                  >
                    <FiEye className="w-3 h-3" />
                    <span>View</span>
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
                    <span>Edit</span>
                  </button>
                  {currentFile.isEdited && (
                    <button
                      onClick={handleRevertCurrentFile}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition cursor-pointer"
                      title="Revert file to original AI generated code"
                    >
                      <FiRotateCcw className="w-3 h-3" />
                      <span>Revert</span>
                    </button>
                  )}
                </div>
              )}
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

        {/* Developer Console Drawer Panel */}
        {showConsole && (
          <div
            className={`w-full border-t flex flex-col transition-all duration-200 shrink-0 ${
              isDark
                ? "bg-[#0c0d12] border-white/10 text-zinc-300"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
            style={{ height: "180px", minHeight: "120px", maxHeight: "300px" }}
          >
            {/* Dev Console Toolbar Header */}
            <div
              className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 shrink-0 text-xs font-mono ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-slate-200 bg-slate-100/80"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold flex items-center gap-1 ${
                    isDark ? "text-emerald-400" : "text-emerald-600"
                  }`}
                >
                  <FiTerminal className="w-3.5 h-3.5" /> Developer Console
                </span>
                <div className="flex items-center gap-1 ml-2">
                  {["all", "error", "warn", "info"].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setConsoleFilter(lvl)}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition cursor-pointer ${
                        consoleFilter === lvl
                          ? isDark
                            ? "bg-white/20 text-white"
                            : "bg-slate-700 text-white"
                          : isDark
                          ? "text-zinc-400 hover:text-zinc-200"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {lvl} ({lvl === "all" ? consoleLogs.length : consoleLogs.filter((l) => l.level === (lvl === "info" ? "log" : lvl) || l.level === lvl).length})
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setConsoleLogs([])}
                className={`p-1 rounded transition cursor-pointer ${
                  isDark
                    ? "hover:bg-white/10 text-zinc-400 hover:text-red-400"
                    : "hover:bg-slate-200 text-slate-400 hover:text-red-500"
                }`}
                title="Clear Console Logs"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dev Console Logs List */}
            <div className="flex-1 overflow-auto p-2 font-mono text-[11.5px] leading-relaxed space-y-1 custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div
                  className={`italic p-2 text-center text-xs ${
                    isDark ? "text-zinc-500" : "text-slate-400"
                  }`}
                >
                  No console output captured yet. Interaction logs and runtime warnings will appear here.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 px-2 py-1 rounded ${
                      log.level === "error"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : log.level === "warn"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20"
                        : isDark
                        ? "text-zinc-300 border-b border-white/5"
                        : "text-slate-600 border-b border-slate-200/60"
                    }`}
                  >
                    <span
                      className={`text-[10px] shrink-0 select-none ${
                        isDark ? "text-zinc-500" : "text-slate-400"
                      }`}
                    >
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`px-1 py-0.2 text-[9px] rounded font-bold uppercase shrink-0 ${
                        log.level === "error"
                          ? "bg-red-500/20 text-red-500"
                          : log.level === "warn"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                          : isDark
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="whitespace-pre-wrap break-all flex-1">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactPreviewPanel;
