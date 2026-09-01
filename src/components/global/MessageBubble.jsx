import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiUser, FiRotateCw, FiAlertTriangle, FiCopy, FiEdit2, FiCheck, FiThumbsUp, FiThumbsDown, FiCode } from "react-icons/fi";
import { TbRobotFace } from "react-icons/tb";
import { useTheme } from "../../context/ThemeContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const formatMarkdownBreaks = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/([^\n])\n([^\n])/g, "$1  \n$2");
};

const CodeBlock = ({ node, inline, className, children, isUser, isDark, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  const isMultiLine = String(children).includes("\n");
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (inline || (!match && !isMultiLine)) {
    return (
      <code
        className={`px-1.5 py-0.5 rounded font-mono text-[11px] break-words [overflow-wrap:anywhere] ${
          isUser
            ? "bg-interactive-base/80 text-text-muted"
            : "bg-surface-secondary dark:bg-interactive-active/80 text-text-primary dark:text-text-muted"
        }`}
        {...props}
      >
        {children}
      </code>
    );
  }
  return (
    <div
      className={`my-3 w-full max-w-full overflow-hidden rounded-xl border ${"border-border-primary"}`}
    >
      <div className={`flex items-center justify-between px-4 py-2 ${isDark ? "bg-[#1e1e1e] border-[#2d2d2d] text-gray-400" : "bg-surface-secondary border-border-primary text-text-muted"} border-b text-xs font-sans select-none`}>
        <span className="flex items-center gap-1.5 lowercase">
          <FiCode className="w-3.5 h-3.5" />
          {match ? match[1] : "code"}
        </span>
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
      <div className="custom-scrollbar overflow-x-auto w-full">
        <SyntaxHighlighter
          style={isDark ? vscDarkPlus : oneLight}
          language={match ? match[1] : "javascript"}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: isDark ? "#1e1e1e" : "var(--color-surface-secondary)",
          }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const MessageBubble = ({ role, content, onRetry }) => {
  const isUser = role === "user";
  const { isDark } = useTheme();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [isCopied, setIsCopied] = useState(false);

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

  return (
    <div
      className={`flex items-start gap-1.5 lg:gap-4 ${isUser ? "flex-row-reverse ml-auto max-w-[85%] md:max-w-[70%]" : "mr-auto w-full max-w-full"} my-2.5 min-w-0`}
    >
      {/* Avatar (Only for AI) */}
      {!isUser && (
        <div
          className={`w-6 lg:w-8 h-6 lg:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-transparent border border-border-primary/50 text-text-primary mt-1`}
        >
          <img
            src="/mini-logo2.png"
            alt="logo"
            className={`w-5 h-5 ${isDark ? "invert opacity-90" : "opacity-80"}`}
          />
        </div>
      )}

      {/* Bubble Container & Actions */}
      <div className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'} max-w-full min-w-0`}>
        <div
          className={`min-w-0 max-w-full leading-relaxed text-[15px] overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] ${
            isUser ? "rounded-3xl px-5 py-3 bg-[#f4f4f4] dark:bg-surface-secondary text-text-primary dark:text-white border-none" : "rounded-2xl py-2 text-text-primary dark:text-white/90 bg-transparent border-transparent"
          }`}
        >
          {isEditing && isUser ? (
            <div className="flex flex-col w-full min-w-[200px] sm:min-w-[300px]">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={(e) => {
                  const val = e.target.value;
                  e.target.value = '';
                  e.target.value = val;
                }}
                className="w-full bg-transparent text-text-primary dark:text-white outline-none resize-none custom-scrollbar"
                rows={Math.max(2, editValue.split('\n').length)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button 
                  onClick={() => { setIsEditing(false); setEditValue(content); }} 
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-secondary/50 hover:bg-surface-secondary text-text-primary transition"
                >
                  Cancel
                </button>
                <button 
                  disabled={editValue.trim() === content.trim() || !editValue.trim()}
                  onClick={() => {
                    setIsEditing(false);
                    if (onRetry) onRetry(editValue);
                  }} 
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-text-primary text-text-inverse dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
                >
                  Update
                </button>
              </div>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
              <div
                className={`w-full max-w-full overflow-x-auto my-4 rounded-xl border custom-scrollbar shadow-sm ${isDark ? "border-white/10 bg-white/5" : "border-border-primary bg-white"}`}
              >
                <table
                  className="w-full border-collapse text-left text-[13px] min-w-full table-auto"
                  {...props}
                />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead
                className={`uppercase text-[11px] font-bold tracking-wider border-b ${isDark ? "bg-[#252525] text-gray-300 border-white/10" : "bg-gray-50 text-gray-600 border-border-primary"}`}
                {...props}
              />
            ),
            th: ({ node, ...props }) => (
              <th
                className="px-4 py-3 font-semibold select-none whitespace-normal break-words align-middle"
                {...props}
              />
            ),
            td: ({ node, ...props }) => (
              <td
                className={`px-4 py-3 border-b align-middle break-words [overflow-wrap:anywhere] ${isDark ? "text-gray-300 border-white/10" : "text-gray-700 border-border-primary/50"}`}
                {...props}
              />
            ),
            tr: ({ node, ...props }) => (
              <tr
                className={`transition-colors last:border-none ${isDark ? "hover:bg-white/5 even:bg-white/[0.02]" : "hover:bg-gray-50 even:bg-gray-50/50"}`}
                {...props}
              />
            ),
            h1: ({ node, ...props }) => (
              <h1
                className={`text-2xl font-bold mt-6 mb-4 break-words ${"text-text-primary dark:text-white"}`}
                {...props}
              />
            ),
            h2: ({ node, ...props }) => (
              <h2
                className={`text-xl font-bold mt-5 mb-3 break-words ${"text-text-primary dark:text-white"}`}
                {...props}
              />
            ),
            h3: ({ node, ...props }) => (
              <h3
                className={`text-lg font-bold mt-4 mb-2 break-words ${"text-text-primary dark:text-white"}`}
                {...props}
              />
            ),
            img: ({ node, ...props }) => (
              <div
                className={`my-4 rounded-xl overflow-hidden border p-1 max-w-full ${"border-border-primary bg-interactive-base dark:bg-interactive-active"}`}
              >
                <img
                  className="max-w-full h-auto object-contain mx-auto"
                  loading="lazy"
                  {...props}
                  alt={props.alt || "Diagram"}
                />
              </div>
            ),
            code: (props) => <CodeBlock {...props} isUser={isUser} isDark={isDark} />,
            p: ({ node, ...props }) => (
              <p
                className={`mb-3 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] text-[15px] leading-relaxed ${isDark ? "text-gray-200" : "text-text-primary"}`}
                {...props}
              />
            ),
            strong: ({ node, ...props }) => (
              <strong
                className="font-bold text-text-primary dark:text-white"
                {...props}
              />
            ),
            a: ({ node, ...props }) => (
              <a
                className="text-text-primary hover:underline font-medium break-all"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
            ul: ({ node, ...props }) => (
              <ul
                className={`list-disc pl-6 my-4 space-y-1.5 break-words text-[15px] leading-relaxed marker:text-text-muted ${isDark ? "text-gray-200" : "text-text-primary"}`}
                {...props}
              />
            ),
            ol: ({ node, ...props }) => (
              <ol
                className={`list-decimal pl-6 my-4 space-y-1.5 break-words text-[15px] leading-relaxed marker:text-text-muted ${isDark ? "text-gray-200" : "text-text-primary"}`}
                {...props}
              />
            ),
            li: ({ node, ...props }) => (
              <li
                className={`break-words mb-1 ${isDark ? "text-gray-200" : "text-text-primary"}`}
                {...props}
              />
            ),
          }}
        >
          {displayContent}
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
        {/* Action Buttons for AI Message */}
        {!isUser && !hasPauseNotice && (
          <div className="flex items-center gap-1.5 mt-2 opacity-100 transition-opacity text-text-muted">
            <button onClick={() => handleCopy(rawDisplayContent)} className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition flex items-center gap-1.5" title="Copy">
              {isCopied ? (
                <>
                  <FiCheck className="w-4 h-4 text-green-500" />
                  <span className="text-[11px] font-medium text-green-500">Copied</span>
                </>
              ) : (
                <>
                  <FiCopy className="w-4 h-4" />
                  <span className="text-[11px] font-medium">Copy</span>
                </>
              )}
            </button>
            <button className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition" title="Good response">
              <FiThumbsUp className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition" title="Bad response">
              <FiThumbsDown className="w-4 h-4" />
            </button>
            {onRetry && (
              <button onClick={() => onRetry()} className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition" title="Regenerate">
                <FiRotateCw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        </div>

        {/* Action Buttons for User Message */}
        {isUser && !isEditing && (
          <div className="flex items-center gap-1 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button onClick={() => handleCopy(content)} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition flex items-center gap-1.5" title="Copy">
              {isCopied ? (
                <>
                  <FiCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[10px] font-medium text-green-500">Copied</span>
                </>
              ) : (
                <FiCopy className="w-3.5 h-3.5" />
              )}
            </button>
            <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition" title="Edit">
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
