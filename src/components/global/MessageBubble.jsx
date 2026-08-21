import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiUser, FiRotateCw, FiAlertTriangle } from "react-icons/fi";
import { TbRobotFace } from "react-icons/tb";
import { useTheme } from "../../context/ThemeContext";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const formatMarkdownBreaks = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/([^\n])\n([^\n])/g, "$1  \n$2");
};

const MessageBubble = ({ role, content, onRetry }) => {
  const isUser = role === "user";
  const { isDark } = useTheme();

  const hasPauseNotice = content && typeof content === "string" && (
    content.includes("Stream paused due to higher-priority request") ||
    content.includes("Click Resume")
  );

  const rawDisplayContent = hasPauseNotice
    ? content.replace(/\n\n⚠️ Stream paused due to higher-priority request\.( Click Resume\.)?/, "").trim() || "*(Response paused)*"
    : content;

  const displayContent = formatMarkdownBreaks(rawDisplayContent);

  return (
    <div className={`flex items-start gap-1.5 lg:gap-3 ${isUser ? "flex-row-reverse ml-auto max-w-[85%]" : "mr-auto w-full"} my-2.5 min-w-0`}>
      {/* Avatar */}
      <div
        className={`w-6 lg:w-8 h-6 lg:h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
          isUser ? "bg-interactive-base text-text-primary dark:text-white shadow-md shadow-black/10" : "bg-surface-secondary dark:bg-interactive-base/20 text-text-primary border border-border-primary dark:border-border-primary/30"
        }`}
      >
        {isUser ? <FiUser /> : <TbRobotFace className=" text-sm lg:text-base" />}
      </div>

      {/* Bubble Container */}
      <div
        className={`min-w-0 max-w-full rounded-2xl p-3 lg:p-5 shadow-md leading-relaxed text-[14px] overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] ${
          isUser ? "bg-interactive-base text-text-primary dark:text-white font-medium rounded-tr-none shadow-black/10" : "bg-surface-secondary dark:bg-interactive-base border border-border-primary text-text-primary dark:text-text-muted rounded-tl-none"
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ node, ...props }) => (
              <div className={`w-full max-w-full overflow-x-auto my-2.5 rounded-lg border custom-scrollbar ${
                "border-border-primary"
              }`}>
                <table className="w-full border-collapse text-left text-xs min-w-full table-auto border-spacing-0" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead className={`uppercase text-[10px] tracking-wider border-b ${
                "bg-surface-secondary dark:bg-interactive-active text-text-primary dark:text-text-muted border-border-primary"
              }`} {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="px-3.5 py-2.5 font-semibold select-none whitespace-normal break-words align-top min-w-[120px]" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className={`px-3.5 py-2.5 border-b align-top break-words [overflow-wrap:anywhere] min-w-[120px] ${
                "text-text-primary dark:text-text-muted border-border-primary dark:border-border-primary/50"
              }`} {...props} />
            ),
            tr: ({ node, ...props }) => (
              <tr className={`transition-colors last:border-none ${
                "hover:bg-surface-secondary/50 even:bg-interactive-base dark:hover:bg-interactive-active/30 dark:even:bg-interactive-active/40"
              }`} {...props} />
            ),
            h1: ({ node, ...props }) => <h1 className={`text-base font-bold mt-3 mb-1 border-b pb-1 break-words ${"text-text-primary dark:text-text-muted border-border-primary"}`} {...props} />,
            h2: ({ node, ...props }) => <h2 className={`text-sm font-semibold mt-2.5 mb-1 break-words ${"text-text-primary dark:text-text-muted"}`} {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xs font-semibold text-text-primary mt-2 mb-1 break-words" {...props} />,
            img: ({ node, ...props }) => (
              <div className={`my-3 rounded-lg overflow-hidden border p-1 max-w-full ${
                "border-border-primary bg-interactive-base dark:bg-interactive-active"
              }`}>
                <img className="max-w-full h-auto object-contain mx-auto" loading="lazy" {...props} alt={props.alt || "Diagram"} />
              </div>
            ),
            code: ({ node, inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              const isMultiLine = String(children).includes("\n");
              if (inline || (!match && !isMultiLine)) {
                return (
                  <code className={`px-1.5 py-0.5 rounded font-mono text-[11px] break-words [overflow-wrap:anywhere] ${
                    isUser ? "bg-interactive-base/80 text-text-muted" : "bg-surface-secondary dark:bg-interactive-active/80 text-text-primary dark:text-text-muted"
                  }`} {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <div className={`my-3 w-full max-w-full overflow-hidden rounded-xl border ${"border-border-primary"}`}>
                  <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-[#2d2d2d] text-gray-400 text-xs font-sans select-none">
                    <span className="lowercase">{match ? match[1] : "code"}</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(String(children))} 
                      className="hover:text-white transition cursor-pointer"
                    >
                      Copy code
                    </button>
                  </div>
                  <div className="custom-scrollbar overflow-x-auto w-full">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match ? match[1] : 'javascript'}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        padding: "1rem",
                        background: "#1e1e1e",
                        fontSize: "12px",
                        lineHeight: "1.5",
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            },
            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] text-sm" {...props} />,
            strong: ({ node, ...props }) => (
              <strong
                className={`font-semibold px-1.5 py-0.5 rounded-md text-xs inline-block my-0.5 shadow-sm ${
                  isUser
                    ? "text-white bg-interactive-base/80 border border-border-primary/30"
                    : "text-black bg-black/5 border border-black/10 dark:text-white dark:bg-white/10 dark:border dark:border-white/20"
                }`}
                {...props}
              />
            ),
            a: ({ node, ...props }) => <a className="text-text-primary hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />,
            ul: ({ node, ...props }) => <ul className={`list-disc pl-4 my-1.5 space-y-0.5 break-words ${"text-text-primary dark:text-text-muted"}`} {...props} />,
            ol: ({ node, ...props }) => <ol className={`list-decimal pl-4 my-1.5 space-y-0.5 break-words ${"text-text-primary dark:text-text-muted"}`} {...props} />,
            li: ({ node, ...props }) => <li className={`break-words ${"text-text-primary dark:text-text-muted"}`} {...props} />,
          }}
        >
          {displayContent}
        </ReactMarkdown>

        {/* ChatGPT-Style Pause / Retry Interactive Warning Banner */}
        {hasPauseNotice && (
          <div className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/10 dark:border-amber-800/30 dark:text-amber-600"
          }`}>
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
      </div>
    </div>
  );
};

export default MessageBubble;