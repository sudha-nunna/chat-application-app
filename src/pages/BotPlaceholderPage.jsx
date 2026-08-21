import { FiCpu, FiMessageSquare, FiTrendingUp, FiBook, FiBriefcase } from "react-icons/fi";
import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

const BotPlaceholderPage = () => {
  const { isDark } = useTheme()
  const openCreateModal = () => {
    window.dispatchEvent(new Event("open-create-bot-modal"));
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center bg-white dark:bg-interactive-active/40 text-text-primary dark:text-text-muted">
      <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 flex flex-col space-y-3">
        <div className="h-full flex flex-col items-center justify-center pt-10 pb-8 px-4 w-full max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-interactive-base/80 flex items-center justify-center mb-6 shadow-sm border border-border-primary/50">
            {/* <FiCpu className="text-3xl text-text-primary dark:text-text-muted" /> */}
            <img src="/mini-logo2.png" alt="logo" className={`w-9 h-9 ${isDark? "invert" : ""}`}/>
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight text-text-primary dark:text-text-muted">
            My AI Agents
          </h2>
          <p className="text-sm mb-5 lg:mb-10 text-center text-text-muted dark:text-text-primary">
            Start by creating a new AI Agent to automate your workflows.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {[
              { title: "Customer Support Bot", icon: FiMessageSquare, desc: "An agent that handles user queries based on your knowledge base." },
              { title: "Sales & Outreach Agent", icon: FiTrendingUp, desc: "Automate outbound messaging and lead qualification flows." },
              { title: "Knowledge Base Assistant", icon: FiBook, desc: "Instantly answer team questions from internal documentation." },
              { title: "Internal Operations Bot", icon: FiBriefcase, desc: "Streamline repetitive tasks and integrate with your APIs." }
            ].map((item, i) => (
              <button
                key={i}
                onClick={openCreateModal}
                className="flex flex-col text-left p-4 rounded-xl border transition-all duration-200 group bg-surface-secondary hover:bg-white border-border-primary shadow-sm hover:shadow-md dark:bg-[#131212] dark:hover:bg-[#0e0d0d] dark:border-border-primary/40 dark:hover:border-border-primary cursor-pointer"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg border bg-white border-border-primary/60 dark:bg-[#222222] dark:border-border-primary/40 shadow-sm flex items-center justify-center shrink-0">
                    <item.icon className="text-[15px] text-text-primary dark:text-text-muted" />
                  </div>
                  <span className="font-semibold text-sm text-text-primary dark:text-text-muted">{item.title}</span>
                </div>
                <span className="text-xs leading-relaxed tracking-wide line-clamp-2 text-text-muted dark:text-text-primary/60">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotPlaceholderPage;