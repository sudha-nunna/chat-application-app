import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiUser,
  FiRotateCw,
  FiAlertTriangle,
  FiCopy,
  FiEdit2,
  FiCheck,
  FiThumbsUp,
  FiThumbsDown,
  FiCode,
  FiFileText,
  FiImage,
  FiX,
  FiMaximize2,
  FiVolume2,
  FiVolumeX,
  FiGlobe,
  FiCompass,
  FiArrowRight,
  FiChevronDown,
  FiExternalLink,
  FiEye,
  FiLayers,
  FiPlay,
} from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const formatMarkdownBreaks = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/([^\n])\n([^\n])/g, "$1  \n$2");
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const CodeBlock = ({ node, inline, className, children, isUser, isDark, isStreaming, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  const isMultiLine = String(children).includes("\n");
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (inline || (!match && !isMultiLine && !isStreaming)) {
    return (
      <code
        className={`px-1.5 py-0.5 rounded-[6px] font-mono text-[13px] font-normal break-words [overflow-wrap:anywhere] ${
          isUser
            ? "bg-white/20 text-white"
            : isDark
            ? "bg-white/[0.09] text-[#e5e7eb] border border-white/[0.08]"
            : "bg-black/[0.06] text-[#1f2328] border border-black/[0.06]"
        }`}
        {...props}
      >
        {children}
      </code>
    );
  }

  const rawCode = String(children).trim();
  const lang = (match ? match[1] : "").toLowerCase();
  const isPreviewable =
    ["html", "jsx", "tsx", "javascript", "js", "css"].includes(lang) ||
    /<(!DOCTYPE|html|div|main|section|header|nav|body|h[1-6]|p|button|form|input|script|style)/i.test(rawCode) ||
    /(export\s+default\s+function|function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=\s*\(|return\s*\(\s*<)/.test(rawCode);
  const lineCount = rawCode.split("\n").length;

  // While code is actively streaming: render an animated status card instead of streaming raw code into chat!
  if (isStreaming) {
    return (
      <div
        className={`my-3 w-full p-4 rounded-2xl border transition-all shadow-xs animate-in fade-in duration-200 ${
          isDark
            ? "bg-[#10131d] border-emerald-500/30 text-white"
            : "bg-emerald-50/60 border-emerald-300 text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <FiCode className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold truncate">
                  Writing Code in Code Preview...
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate mt-0.5">
                Streaming code directly into the right-hand Code Preview panel
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("open-artifact", {
                  detail: {
                    code: rawCode,
                    language: lang || "html",
                    title: "Live Code Preview",
                  },
                })
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Open Live Preview"
          >
            <FiEye className="w-3.5 h-3.5" />
            <span>Open Preview</span>
          </button>
        </div>
      </div>
    );
  }

  // If code is previewable UI code or multi-line (> 2 lines), render a sleek Artifact Card instead of dumping 500 lines of raw code in chat!
  if (isPreviewable || lineCount > 2) {
    return (
      <div
        className={`my-3 w-full p-4 rounded-2xl border transition-all shadow-xs ${
          isDark
            ? "bg-[#13141f] border-white/10 text-white"
            : "bg-surface-secondary/80 border-border-primary text-text-primary"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
              <FiLayers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold truncate">
                  Interactive Web Preview
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-bold uppercase font-mono">
                  {lang || "html"}
                </span>
                <span className="text-[10px] text-text-muted">
                  ({lineCount} lines)
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate mt-0.5">
                Code & live sandbox ready in the Code Preview panel on the right
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-artifact", {
                    detail: {
                      code: rawCode,
                      language: lang || "html",
                      title: "Interactive Preview",
                    },
                  })
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-primary text-white hover:bg-accent-primary/90 text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
              title="Open in Right Panel Live Sandbox"
            >
              <FiEye className="w-3.5 h-3.5" />
              <span>Open Preview</span>
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl border border-border-primary/60 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-text-muted hover:text-text-primary"
              title="Copy code"
            >
              {isCopied ? (
                <FiCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <FiCopy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`my-3 w-full max-w-full overflow-hidden rounded-xl border ${
        isDark ? "border-white/5 bg-[#16171d]" : "border-border-primary bg-surface-secondary"
      }`}
    >
      {match && (
        <div
          className={`flex items-center justify-between px-4 py-2 ${
            isDark ? "border-b border-white/5 text-gray-400" : "border-b border-border-primary text-text-muted"
          } text-xs font-sans select-none`}
        >
          <span className="flex items-center gap-1.5 lowercase">
            <FiCode className="w-3.5 h-3.5" />
            {match[1]}
          </span>
          <div className="flex items-center gap-2">
            {["html", "jsx", "tsx"].includes((match[1] || "").toLowerCase()) && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("open-artifact", {
                      detail: {
                        code: String(children),
                        language: match[1],
                        title: "Code Preview",
                      },
                    })
                  );
                }}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition cursor-pointer font-medium"
                title="Open in Live Interactive Sandbox"
              >
                <FiEye className="w-3 h-3" />
                <span>Live Preview</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="hover:text-text-primary transition cursor-pointer flex items-center gap-1.5"
              title="Copy code"
            >
              {isCopied ? (
                <FiCheck className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <FiCopy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
      <div className="custom-scrollbar overflow-x-auto w-full">
        <SyntaxHighlighter
          style={isDark ? vscDarkPlus : oneLight}
          language={match ? match[1] : "text"}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1.25rem",
            background: "transparent",
            fontSize: "13px",
          }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const renderWithCursor = (children) => {
  if (!children) return children;
  if (typeof children === "string") {
    if (!children.includes("▍")) return children;
    const parts = children.split("▍");
    return parts.map((part, idx) =>
      idx < parts.length - 1 ? (
        <React.Fragment key={idx}>
          {part}
          <span className="inline-block w-[6px] h-[15px] ml-1 bg-accent-primary dark:bg-white/90 animate-pulse rounded-[1px] align-middle select-none shadow-xs" />
        </React.Fragment>
      ) : (
        part
      )
    );
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) =>
      typeof child === "string" && child.includes("▍") ? (
        <React.Fragment key={idx}>{renderWithCursor(child)}</React.Fragment>
      ) : (
        child
      )
    );
  }
  return children;
};

const MessageBubble = ({
  role,
  content,
  attachments = [],
  onRetry,
  isStreaming = false,
  isThinking = false,
  isWebSearching = false,
  enableSearch = false,
  searchExecuted = false,
  isSpeaking = false,
  onToggleSpeak,
  followUps = [],
  onSelectFollowUp,
  isLatestAssistant = false,
  sources = [],
  requiresWebSearch = false,
  onEnableSearchAndRetry,
  isStoppedMidway = false,
  onContinueGeneration,
}) => {
  const isUser = role === "user";
  const { isDark } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [isCopied, setIsCopied] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [showSources, setShowSources] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const hasPauseNotice =
    content &&
    typeof content === "string" &&
    (content.includes("Stream paused due to higher-priority request") ||
      content.includes("Click Resume"));

  const rawDisplayContent = hasPauseNotice
    ? content
        .replace(
          /\n\n⚠️ Stream paused due to higher-priority request\.( Click Resume\.)?/,
          "",
        )
        .trim() || "*(Response paused)*"
    : content;

  const displayContent = formatMarkdownBreaks(rawDisplayContent);
  const displayContentWithCursor =
    isStreaming && !isThinking && displayContent
      ? typeof displayContent === "string" && displayContent.endsWith(" ")
        ? `${displayContent}▍`
        : `${displayContent} ▍`
      : displayContent;

  return (
    <div
      className={`flex items-start ${
        isUser
          ? isEditing
            ? "w-full max-w-full"
            : "self-end ml-auto w-fit max-w-[85%] md:max-w-[70%]"
          : "mr-auto w-full max-w-full"
      } my-2.5 min-w-0`}
    >
      {/* Bubble Container & Actions */}
      <div
        className={`flex flex-col group ${
          isUser && !isEditing ? "items-end w-fit max-w-full" : "items-start w-full"
        } min-w-0`}
      >
        {/* Attachments Section */}
        {attachments && attachments.length > 0 && (
          <div
            className={`flex flex-wrap gap-2.5 mb-2 ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            {attachments.map((att, idx) => {
              const isImg =
                att.fileType === "image" || att.mimeType?.startsWith("image/");
              const isPdf =
                att.fileType === "pdf" ||
                att.mimeType === "application/pdf" ||
                att.name?.endsWith(".pdf");
              const imgSrc =
                att.previewUrl ||
                (att.data
                  ? att.data.startsWith("data:")
                    ? att.data
                    : `data:${att.mimeType || "image/png"};base64,${att.data}`
                  : null);

              if (isImg && imgSrc) {
                return (
                  <div
                    key={idx}
                    onClick={() => setModalImage(imgSrc)}
                    className="relative group/img rounded-2xl overflow-hidden cursor-pointer border border-black/10 dark:border-white/15 shadow-md max-w-[240px] max-h-[240px] bg-black/5 dark:bg-white/5 transition-transform duration-200 hover:scale-[1.02]"
                  >
                    <img
                      src={imgSrc}
                      alt={att.name || "Attachment"}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white backdrop-blur-[2px]">
                      <div className="p-2 rounded-full bg-black/50 text-white shadow-lg">
                        <FiMaximize2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs border border-border-primary dark:border-white/10 bg-surface-secondary dark:bg-[#1c1d27] text-text-primary dark:text-white shadow-sm"
                >
                  {isPdf ? (
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <FiFileText className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <FiFileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="font-semibold text-[12px] truncate max-w-[150px] leading-tight">
                      {att.name}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono uppercase">
                      {att.fileType || "file"}{" "}
                      {att.size ? `• ${formatFileSize(att.size)}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message Content Container */}
        <div
          className={`min-w-0 leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] ${
            isUser
              ? isEditing
                ? "w-full rounded-[20px] p-4 md:p-5 bg-surface-secondary dark:bg-[#1e1f2b] border border-border-primary/60 dark:border-white/10 shadow-sm text-text-primary"
                : "w-fit max-w-full rounded-2xl px-4 py-2.5 bg-accent-primary text-white text-[15px] shadow-sm border-none ml-auto"
              : "w-full rounded-lg py-0.5 text-text-primary dark:text-[#e5e5e5] bg-transparent border-transparent"
          }`}
        >
          <div className={`${isUser && !isEditing ? "w-fit max-w-full" : "w-full"} min-w-0`}>
          {/* Expandable Web Search Explored Banner */}
          {!isUser && Array.isArray(sources) && sources.length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowSources((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-text-secondary dark:text-gray-300 transition cursor-pointer border border-border-primary/40 dark:border-white/10 select-none shadow-2xs"
                title="Click to view web sources explored"
              >
                <FiCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Explored search_web ({sources.length} sources)</span>
                <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSources ? "rotate-180" : ""}`} />
              </button>

              {showSources && (
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-secondary/70 dark:bg-[#191a24] border border-border-primary/50 dark:border-white/10 animate-in fade-in duration-200">
                  {sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition group text-left"
                    >
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${s.domain || "google.com"}&sz=32`}
                        alt=""
                        className="w-4 h-4 mt-0.5 rounded shrink-0"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-text-primary dark:text-gray-200 truncate group-hover:text-accent-primary transition">
                          {s.title}
                        </div>
                        <div className="text-[10.5px] text-text-muted truncate">
                          {s.domain}
                        </div>
                      </div>
                      <FiExternalLink className="w-3 h-3 text-text-muted group-hover:text-accent-primary shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Thinking / Bubbling Animation — shown while waiting for first token */}
          {isThinking && !content ? (
            isWebSearching ? (
              <div className="flex items-center gap-2 h-7 select-none py-1 text-xs text-accent-primary dark:text-accent-primary/90 font-medium animate-pulse">
                <FiGlobe className="w-3.5 h-3.5 animate-spin shrink-0 text-accent-primary" />
                <span>Searching the web...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 h-7 select-none py-1">
                <span
                  className="w-2 h-2 rounded-full bg-accent-primary dark:bg-white/80 animate-bounce"
                  style={{ animationDelay: "-0.32s" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-accent-primary dark:bg-white/80 animate-bounce"
                  style={{ animationDelay: "-0.16s" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-accent-primary dark:bg-white/80 animate-bounce"
                  style={{ animationDelay: "0s" }}
                />
              </div>
            )
          ) : isEditing && isUser ? (
            <div className="flex flex-col w-full">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={(e) => {
                  const val = e.target.value;
                  e.target.value = "";
                  e.target.value = val;
                }}
                className="w-full bg-transparent text-text-primary dark:text-white outline-none resize-none text-[15px] leading-relaxed custom-scrollbar placeholder:text-text-muted"
                rows={Math.max(2, editValue.split("\n").length)}
                autoFocus
              />
              <div className="flex justify-end items-center gap-2.5 mt-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(content);
                  }}
                  className="px-4 py-1.5 text-xs font-medium rounded-full bg-white hover:bg-gray-100 dark:bg-white/10 dark:hover:bg-white/15 text-text-primary dark:text-white border border-border-primary dark:border-white/10 transition shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!editValue.trim()}
                  onClick={() => {
                    setIsEditing(false);
                    if (onRetry) onRetry(editValue);
                  }}
                  className="px-4 py-1.5 text-xs font-medium rounded-full bg-text-primary text-text-inverse dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40 transition shadow-xs cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="w-full max-w-full overflow-x-auto my-4 rounded-xl border border-border-primary dark:border-white/10 bg-surface-primary dark:bg-[#16171d] custom-scrollbar shadow-sm">
                    <table
                      className="w-full border-collapse text-left text-[13px] min-w-full table-auto"
                      {...props}
                    />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead
                    className="uppercase text-[11px] font-bold tracking-wider border-b border-border-primary dark:border-white/10 bg-surface-secondary dark:bg-[#1c1d27] text-text-muted dark:text-[#a1a1aa]"
                    {...props}
                  />
                ),
                th: ({ node, ...props }) => (
                  <th
                    className="px-4 py-3 font-semibold select-none whitespace-nowrap align-middle"
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td
                    className="px-4 py-3 border-b align-middle whitespace-nowrap text-text-primary dark:text-[#d1d1d6] border-border-primary/50 dark:border-white/5"
                    {...props}
                  />
                ),
                tr: ({ node, ...props }) => (
                  <tr
                    className="transition-colors last:border-none hover:bg-black/5 dark:hover:bg-white/5 even:bg-black/[0.02] dark:even:bg-white/[0.02]"
                    {...props}
                  />
                ),
                h1: ({ node, ...props }) => (
                  <h1
                    className={`text-[19px] font-bold tracking-tight mt-5 mb-2.5 break-words ${isUser ? "text-white" : "text-text-primary dark:text-[#F4F4F5]"}`}
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className={`text-[16px] font-bold tracking-tight mt-4 mb-2 break-words ${isUser ? "text-white" : "text-text-primary dark:text-[#F4F4F5]"}`}
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className={`text-[14.5px] font-semibold tracking-tight mt-3 mb-1.5 break-words ${isUser ? "text-white" : "text-text-primary dark:text-[#F4F4F5]"}`}
                    {...props}
                  />
                ),
                h4: ({ node, ...props }) => (
                  <h4
                    className={`text-[14px] font-semibold tracking-tight mt-2.5 mb-1 break-words ${isUser ? "text-white" : "text-text-primary dark:text-[#F4F4F5]"}`}
                    {...props}
                  />
                ),
                img: ({ node, ...props }) => (
                  <div
                    className={`my-3 rounded-xl overflow-hidden border p-1 max-w-full ${"border-border-primary bg-interactive-base dark:bg-interactive-active"}`}
                  >
                    <img
                      className="max-w-full h-auto object-contain mx-auto rounded-lg"
                      loading="lazy"
                      {...props}
                      alt={props.alt || "Diagram"}
                    />
                  </div>
                ),
                code: (props) => (
                  <CodeBlock {...props} isUser={isUser} isDark={isDark} isStreaming={isStreaming} />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className={`mb-2.5 last:mb-0 font-normal whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] text-[15px] leading-relaxed ${isUser ? "text-white" : "text-text-primary dark:text-text-primary"}`}
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong
                    className={`font-semibold ${isUser ? "text-white font-bold" : "text-text-primary dark:text-white"}`}
                    {...props}
                  />
                ),
                a: ({ node, children, href, ...props }) => {
                  const linkText = String(children || "");
                  const isCitation = /^(\[\d+\]|\d+|Source\s*\d+|Yahoo|Google|NSE|BSE|Reuters|Bloomberg|CNBC)/i.test(linkText) || linkText.length < 28;
                  return (
                    <a
                      href={href}
                      className={
                        isUser
                          ? "text-white underline font-semibold break-all"
                          : isCitation
                          ? "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-medium bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/25 transition no-underline align-baseline align-middle shadow-2xs"
                          : "text-accent-primary hover:underline font-medium break-all"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                ul: ({ node, ...props }) => (
                  <ul
                    className={`list-disc pl-5 my-3 space-y-1.5 break-words text-[15px] leading-relaxed ${isUser ? "text-white marker:text-white" : isDark ? "text-[#d1d1d6] marker:text-text-muted" : "text-text-primary marker:text-text-muted"}`}
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className={`list-decimal pl-5 my-3 space-y-1.5 break-words text-[15px] leading-relaxed ${isUser ? "text-white marker:text-white" : isDark ? "text-[#d1d1d6] marker:text-text-muted" : "text-text-primary marker:text-text-muted"}`}
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    className={`break-words pl-1 ${isUser ? "text-white" : isDark ? "text-[#d1d1d6]" : "text-text-primary"}`}
                    {...props}
                  />
                ),
                hr: ({ node, ...props }) => (
                  <hr
                    className={`my-5 border-t ${isDark ? "border-white/5" : "border-black/10"}`}
                    {...props}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className={`my-3 px-3.5 py-2 rounded-xl border text-[13px] font-mono flex items-center gap-3 shadow-sm ${isDark ? "bg-[#16171d] border-white/5 text-[#a1a1aa]" : "bg-gray-50 border-gray-200 text-gray-600"}`}
                    {...props}
                  />
                ),
              }}
            >
              {/* Append blinking cursor during streaming */}
              {isStreaming && !isThinking && displayContent
                ? (typeof displayContent === "string" && displayContent.endsWith(" ")
                    ? `${displayContent}▍`
                    : `${displayContent} ▍`)
                : displayContent}
            </ReactMarkdown>
          )}

          {/* ChatGPT-Style Pause / Retry Interactive Warning Banner */}
          {hasPauseNotice && (
            <div
              className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${"bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/10 dark:border-amber-800/30 dark:text-amber-600"}`}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <FiAlertTriangle className="text-amber-500 text-sm shrink-0" />
                <span>Stream paused due to higher-priority request.</span>
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 bg-amber-900 hover:bg-amber-600 text-text-primary font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 cursor-pointer"
                >
                  <FiRotateCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          )}
          {/* Web Search Required Guidance Action Button */}
          {!isUser && (requiresWebSearch || /(don't have access to real-time|don't have real-time|switch on the .*web search|turn on the .*web search|enable web search|cannot provide real-time|real-time.*data.*(unable|cannot|don't)|live.*data.*(unable|cannot|don't)|no access to live)/i.test(content || "")) && (
            <div className="mt-3 pt-1">
              <button
                type="button"
                onClick={() => onEnableSearchAndRetry && onEnableSearchAndRetry()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 transition active:scale-95 cursor-pointer shadow-xs"
                title="Enable Web Search and retry this query"
              >
                <FiGlobe className="w-3.5 h-3.5 shrink-0" />
                <span>Turn On Web Search & Check Now</span>
                <FiArrowRight className="w-3 h-3 shrink-0" />
              </button>
            </div>
          )}

          {/* Sources Cards Tray at Bottom of Response */}
          {!isUser && !isStreaming && !isThinking && Array.isArray(sources) && sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border-primary/40 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted select-none mb-2">
                <FiGlobe className="w-3.5 h-3.5 text-accent-primary shrink-0" />
                <span>Sources</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-secondary/50 dark:bg-white/5 hover:bg-accent-primary/5 dark:hover:bg-white/10 border border-border-primary/60 dark:border-white/10 transition group text-left"
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${s.domain || "google.com"}&sz=32`}
                      alt=""
                      className="w-4 h-4 rounded shrink-0"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-medium text-text-primary dark:text-gray-200 truncate group-hover:text-accent-primary transition">
                        {s.title}
                      </div>
                      <div className="text-[10px] text-text-muted truncate">
                        {s.domain}
                      </div>
                    </div>
                    <FiExternalLink className="w-3 h-3 text-text-muted group-hover:text-accent-primary shrink-0 opacity-0 group-hover:opacity-100 transition" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons for AI Message — hidden during thinking/streaming */}
          {!isUser && !hasPauseNotice && !isStreaming && !isThinking && content && (
            <div className="flex items-center gap-1.5 mt-2 opacity-100 transition-opacity text-text-muted">
              <button
                onClick={() => handleCopy(rawDisplayContent)}
                className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition flex items-center gap-1.5"
                title="Copy"
              >
                {isCopied ? (
                  <>
                    <FiCheck className="w-4 h-4 text-green-500" />
                    <span className="text-[11px] font-medium text-green-500">
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <FiCopy className="w-4 h-4" />
                    <span className="text-[11px] font-medium">Copy</span>
                  </>
                )}
              </button>

              {onToggleSpeak && (
                <button
                  onClick={() => onToggleSpeak(rawDisplayContent)}
                  className={`p-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    isSpeaking
                      ? "text-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20"
                      : "hover:bg-surface-secondary hover:text-text-primary"
                  }`}
                  title={isSpeaking ? "Stop reading" : "Read aloud"}
                >
                  {isSpeaking ? (
                    <FiVolumeX className="w-4 h-4 text-accent-primary animate-pulse" />
                  ) : (
                    <FiVolume2 className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition cursor-pointer"
                title="Good response"
              >
                <FiThumbsUp className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition"
                title="Bad response"
              >
                <FiThumbsDown className="w-4 h-4" />
              </button>
              {onRetry && (
                <button
                  onClick={() => onRetry()}
                  className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition"
                  title="Regenerate"
                >
                  <FiRotateCw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Continue Generating Button (When response was stopped midway) */}
          {!isUser && isStoppedMidway && onContinueGeneration && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onContinueGeneration}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-primary text-white hover:bg-accent-primary/90 text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
                title="Resume generating from where it stopped"
              >
                <FiPlay className="w-3.5 h-3.5 fill-current" />
                <span>Continue Generating</span>
              </button>
              <span className="text-[11px] text-text-muted">
                Generation stopped midway
              </span>
            </div>
          )}

          {/* AI Follow-up Suggestions (ChatGPT / OpenWebUI Style) */}
          {!isUser && !hasPauseNotice && !isStreaming && !isThinking && isLatestAssistant && Array.isArray(followUps) && followUps.length > 0 && (
            <div className="mt-3.5 pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted select-none">
                <FiCompass className="w-3.5 h-3.5 text-accent-primary shrink-0" />
                <span>Suggested follow-ups</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {followUps.map((question, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectFollowUp && onSelectFollowUp(question)}
                    className="text-left text-xs px-3 py-2 rounded-xl bg-surface-secondary/70 dark:bg-white/5 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/15 border border-border-primary/80 dark:border-white/10 text-text-primary dark:text-[#e5e5e5] hover:text-accent-primary dark:hover:text-accent-primary hover:border-accent-primary/40 transition-all duration-150 cursor-pointer shadow-2xs active:scale-98 flex items-center justify-between gap-2 group max-w-full"
                  >
                    <span>{question}</span>
                    <FiArrowRight className="w-3 h-3 text-text-muted group-hover:text-accent-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Action Buttons for User Message (Visible on Hover) */}
        {isUser && !isEditing && (
          <div className="flex items-center gap-1 mt-1 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {searchExecuted && (
              <div
                className="p-1.5 rounded-lg text-accent-primary hover:bg-surface-secondary transition flex items-center justify-center cursor-help"
                title="This message used web search"
              >
                <FiGlobe className="w-3.5 h-3.5 text-accent-primary" />
              </div>
            )}
            <button
              onClick={() => handleCopy(content)}
              className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition flex items-center gap-1.5 cursor-pointer"
              title="Copy"
            >
              {isCopied ? (
                <>
                  <FiCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[10px] font-medium text-green-500">
                    Copied
                  </span>
                </>
              ) : (
                <FiCopy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition cursor-pointer"
              title="Edit"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Image Lightbox Modal */}
        {modalImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setModalImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
              <img
                src={modalImage}
                alt="Enlarged attachment preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl"
              />
              <button
                onClick={() => setModalImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition cursor-pointer"
                title="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
