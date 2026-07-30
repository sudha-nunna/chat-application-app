import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiUser, FiCpu } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

const MessageBubble = ({ role, content }) => {
  const isUser = role === "user";
  const { isDark } = useTheme();

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse ml-auto max-w-[75%]" : "mr-auto max-w-[85%] md:max-w-[80%]"} my-2.5 min-w-0`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
          isUser
            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
            : isDark
            ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
            : "bg-indigo-100 text-indigo-700 border border-indigo-200"
        }`}
      >
        {isUser ? <FiUser /> : <FiCpu />}
      </div>

      {/* Bubble Container */}
      <div
        className={`min-w-0 max-w-full rounded-2xl p-3.5 px-4 shadow-md leading-relaxed text-xs overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] ${
          isUser
            ? "bg-blue-600 text-white font-medium rounded-tr-none shadow-blue-600/20"
            : isDark
            ? "bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none"
            : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ node, ...props }) => (
              <div className={`w-full max-w-full overflow-x-auto my-2.5 rounded-lg border custom-scrollbar ${
                isDark ? "border-slate-800" : "border-slate-300"
              }`}>
                <table className="w-full border-collapse text-left text-xs min-w-full" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead className={`uppercase text-[10px] tracking-wider border-b ${
                isDark ? "bg-slate-900 text-slate-200 border-slate-800" : "bg-slate-200 text-slate-700 border-slate-300"
              }`} {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="px-3 py-2 font-semibold select-none whitespace-nowrap" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className={`px-3 py-2 border-b ${
                isDark ? "text-slate-300 border-slate-800/50" : "text-slate-700 border-slate-200"
              }`} {...props} />
            ),
            tr: ({ node, ...props }) => (
              <tr className={`transition-colors last:border-none ${
                isDark ? "hover:bg-slate-800/30 even:bg-slate-900/40" : "hover:bg-slate-200/50 even:bg-slate-50"
              }`} {...props} />
            ),
            h1: ({ node, ...props }) => <h1 className={`text-base font-bold mt-3 mb-1 border-b pb-1 break-words ${isDark ? "text-slate-100 border-slate-800" : "text-slate-900 border-slate-200"}`} {...props} />,
            h2: ({ node, ...props }) => <h2 className={`text-sm font-semibold mt-2.5 mb-1 break-words ${isDark ? "text-slate-200" : "text-slate-800"}`} {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xs font-semibold text-blue-500 mt-2 mb-1 break-words" {...props} />,
            img: ({ node, ...props }) => (
              <div className={`my-3 rounded-lg overflow-hidden border p-1 max-w-full ${
                isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"
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
                    isUser
                      ? "bg-blue-700/80 text-blue-100"
                      : isDark
                      ? "bg-slate-800/80 text-blue-300"
                      : "bg-slate-200 text-blue-700"
                  }`} {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <div className={`my-2.5 w-full max-w-full overflow-x-auto rounded-xl border p-3.5 custom-scrollbar ${
                  isDark ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-700"
                }`}>
                  <pre className="font-mono text-[11px] text-emerald-400 whitespace-pre overflow-x-auto m-0 p-0">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            },
            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 break-words [overflow-wrap:anywhere] [word-break:break-word]" {...props} />,
            strong: ({ node, ...props }) => <strong className={`font-bold ${isUser ? "text-white" : isDark ? "text-blue-400" : "text-blue-600"}`} {...props} />,
            a: ({ node, ...props }) => <a className="text-blue-500 hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />,
            ul: ({ node, ...props }) => <ul className={`list-disc pl-4 my-1.5 space-y-0.5 break-words ${isDark ? "text-slate-200" : "text-slate-700"}`} {...props} />,
            ol: ({ node, ...props }) => <ol className={`list-decimal pl-4 my-1.5 space-y-0.5 break-words ${isDark ? "text-slate-200" : "text-slate-700"}`} {...props} />,
            li: ({ node, ...props }) => <li className={`break-words ${isDark ? "text-slate-200" : "text-slate-700"}`} {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MessageBubble;