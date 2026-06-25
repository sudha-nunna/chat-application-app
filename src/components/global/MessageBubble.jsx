import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MessageBubble = ({ role, content }) => {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-4 shadow-md transition-all duration-200 leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white font-normal rounded-br-none"
            : "bg-slate-800 text-slate-100 font-normal rounded-bl-none"
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // 1. Tables (Handles wide data architecture sheets)
            table: ({ node, ...props }) => (
              <div className="w-full overflow-x-auto my-3 rounded-lg border border-slate-700 custom-scrollbar">
                <table className="w-full border-collapse text-left text-sm" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead className="bg-slate-900 text-slate-200 uppercase text-xs tracking-wider border-b border-slate-700" {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="px-4 py-3 font-semibold select-none" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="px-4 py-3 text-slate-300 border-b border-slate-700/50" {...props} />
            ),
            tr: ({ node, ...props }) => (
              <tr className="hover:bg-slate-700/20 transition-colors last:border-none even:bg-slate-800/40" {...props} />
            ),

            // 2. Headings (Side Headings like ### Component Architecture)
            h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2 border-b border-slate-700 pb-1" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-semibold text-slate-200 mt-3 mb-1.5" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-blue-400 mt-2 mb-1" {...props} />,

            // 3. Images (Renders Markdown images securely)
            img: ({ node, ...props }) => (
              <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 p-1">
                <img className="max-w-full h-auto object-contain mx-auto" loading="lazy" {...props} alt={props.alt || "Architecture diagram"} />
              </div>
            ),

            // 4. Code Blocks
            code: ({ node, inline, ...props }) => (
              inline 
                ? <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400 font-mono text-xs break-words" {...props} />
                : <pre className="bg-slate-950 p-3 rounded-lg my-3 border border-slate-700 overflow-x-auto text-xs font-mono text-emerald-400 custom-scrollbar"><code {...props} /></pre>
            ),

            // 5. Text & Lists (Bullet points and numbers)
            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-bold text-blue-400" {...props} />,
            a: ({ node, ...props }) => <a className="text-blue-400 hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-200" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-200" {...props} />,
            li: ({ node, ...props }) => <li className="text-slate-200" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MessageBubble;