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
        className={`px-1.5 py-0.5 rounded font-mono text-[12px] break-words [overflow-wrap:anywhere] ${
          isUser
            ? "bg-black/10 text-black"
            : "bg-[#16171d] text-[#e5e5e5] border border-white/5"
        }`}
        {...props}
      >
        {children}
      </code>
    );
  }
  return (
    <div
      className={`my-3 w-full max-w-full overflow-hidden rounded-xl border ${isDark ? "border-white/5 bg-[#16171d]" : "border-border-primary bg-surface-secondary"}`}
    >
      {match && (
        <div className={`flex items-center justify-between px-4 py-2 ${isDark ? "border-b border-white/5 text-gray-400" : "border-b border-border-primary text-text-muted"} text-xs font-sans select-none`}>
          <span className="flex items-center gap-1.5 lowercase">
            <FiCode className="w-3.5 h-3.5" />
            {match[1]}
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
            fontSize: "13px"
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
      className={`flex items-start ${isUser ? "flex-row-reverse ml-auto max-w-[85%] md:max-w-[72%] gap-2" : "mr-auto w-full max-w-full gap-2 md:gap-2"} my-2.5 min-w-0`}
    >
      {/* Avatar (Only for AI) */}
      {!isUser && (
        <div className="w-14 shrink-0 text-left pt-1 hidden md:block">
          <span className="font-serif text-[12px] text-text-muted opacity-75">
            Codegene
          </span>
        </div>
      )}

      {/* Bubble Container & Actions */}
      <div
        className={`flex flex-col group ${isUser ? "items-end" : "items-start"} flex-1 min-w-0`}
      >
        <div
          className={`min-w-0 max-w-full leading-relaxed overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] ${
            isUser
              ? "rounded-2xl px-4 py-2 bg-accent-primary text-white font-medium text-[14px] shadow-sm border-none"
              : "rounded-lg pt-0.5 pb-1 text-[#e5e5e5] bg-transparent border-transparent"
          }`}
        >
          {isEditing && isUser ? (
            <div className="flex flex-col w-full min-w-[200px] sm:min-w-[300px]">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={(e) => {
                  const val = e.target.value;
                  e.target.value = "";
                  e.target.value = val;
                }}
                className="w-full bg-transparent text-text-primary dark:text-white outline-none resize-none custom-scrollbar"
                rows={Math.max(2, editValue.split("\n").length)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(content);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-secondary/50 hover:bg-surface-secondary text-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  disabled={
                    editValue.trim() === content.trim() || !editValue.trim()
                  }
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
                    className={`text-[19px] font-serif font-medium mt-4 mb-2 break-words ${"text-text-primary dark:text-[#F4F4F5]"}`}
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className={`text-[17px] font-serif font-medium mt-3 mb-2 break-words ${"text-text-primary dark:text-[#F4F4F5]"}`}
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className={`text-[15px] font-serif font-medium mt-2.5 mb-1.5 break-words ${"text-text-primary dark:text-[#F4F4F5]"}`}
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
                  <CodeBlock {...props} isUser={isUser} isDark={isDark} />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className={`mb-2.5 last:mb-0 font-normal whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] text-[14px] leading-relaxed ${isDark ? "text-text-primary" : "text-text-primary"}`}
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong
                    className="font-semibold text-text-primary dark:text-[#F4F4F5]"
                    {...props}
                  />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-[#7c83f6] hover:underline font-medium break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className={`list-disc pl-5 my-3 space-y-1.5 break-words text-[14px] leading-relaxed marker:text-[#7c83f6] ${isDark ? "text-[#d1d1d6]" : "text-text-primary"}`}
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className={`list-decimal pl-5 my-3 space-y-1.5 break-words text-[14px] leading-relaxed marker:text-[#7c83f6] ${isDark ? "text-[#d1d1d6]" : "text-text-primary"}`}
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    className={`break-words pl-1 ${isDark ? "text-[#d1d1d6]" : "text-text-primary"}`}
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
              <button
                className="p-1.5 rounded-lg hover:bg-surface-secondary hover:text-text-primary transition"
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
        </div>

        {/* Action Buttons for User Message */}
        {isUser && !isEditing && (
          <div className="flex items-center gap-1 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleCopy(content)}
              className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition flex items-center gap-1.5"
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
              className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition"
              title="Edit"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
