const fs = require('fs');
let code = fs.readFileSync('src/components/layouts/AppLayout.jsx', 'utf8');

// 1. Add FiBriefcase and TbLayoutSidebar to imports if not there
if (!code.includes('FiBriefcase')) {
  code = code.replace('FiMessageSquare,', 'FiMessageSquare,\n  FiBriefcase,');
}
if (!code.includes('TbLayoutSidebar')) {
  code = code.replace('TbRobotFace', 'TbRobotFace, TbLayoutSidebar');
}

// 2. Add the Work Agents primary sidebar button
const workAgentsBtn = `
          <button onClick={() => { setActiveSidebarTab("work_agents"); navigate("/bots"); }} className={\`w-full flex items-center gap-3 p-2 rounded-xl transition-all \${activeSidebarTab === "work_agents" ? "bg-interactive-active text-text-muted" : "text-text-primary hover:bg-surface-secondary dark:hover:bg-interactive-active/50"}\`}>
            <div className="w-6 h-6 flex items-center justify-center shrink-0"><FiBriefcase className="text-lg" /></div>
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Work Agents</span>
          </button>`;
          
// Insert after Chat button
code = code.replace(
  /<button onClick={\(\) => { setActiveSidebarTab\("chat"\);[^>]+>[\s\S]*?<\/button>/,
  match => match + '\n' + workAgentsBtn
);

// 3. Add renderWorkAgentsSidebar function
const workAgentsSidebar = `
  const renderWorkAgentsSidebar = () => {
    return (
      <div className="flex flex-col h-full overflow-hidden w-[280px] bg-surface-primary border-r border-border-primary shrink-0 z-20 select-none relative">
        <div className="p-4 flex items-center justify-between shrink-0 mb-2">
          <span className="text-[17px] font-bold tracking-tight">Work Agents</span>
          <button className="p-1.5 rounded-md text-text-primary hover:bg-surface-secondary transition">
             <TbLayoutSidebar className="text-[14px]" />
          </button>
        </div>

        <div className="px-3 mb-3">
          <button 
             onClick={() => navigate("/chat")}
             className="w-full bg-surface-secondary dark:bg-interactive-active/40 hover:bg-surface-secondary/80 dark:hover:bg-interactive-active/70 text-text-primary py-2 px-3 rounded-2xl flex items-center gap-2 text-sm transition font-medium border border-transparent shadow-sm"
          >
             <FiPlus className="text-base shrink-0" /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar pb-12">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] hover:bg-surface-secondary dark:hover:bg-interactive-active text-text-primary transition">
             <FiLink className="text-lg opacity-70 shrink-0" />
             <span className="truncate">Connectors</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] hover:bg-surface-secondary dark:hover:bg-interactive-active text-text-primary transition">
             <FiLayers className="text-lg opacity-70 shrink-0" />
             <span className="truncate">Skills</span>
          </button>

          <div>
            <div 
              className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group hover:bg-surface-secondary dark:hover:bg-interactive-active transition"
              onClick={() => setIsAgentsOpen(!isAgentsOpen)}
            >
               <div className="flex items-center gap-3 text-[13px] text-text-primary">
                 <TbRobotFace className="text-lg opacity-70 shrink-0" />
                 <span className="truncate">Agents</span>
               </div>
               {isAgentsOpen ? <FiChevronDown className="text-sm opacity-50" /> : <FiChevronRight className="text-sm opacity-50" />}
            </div>
            
            {isAgentsOpen && (
              <div className="mt-1 space-y-0.5 ml-8 pl-2 border-l border-border-primary/40">
                {pinnedBots.map(b => renderSidebarItem(b, "bot"))}
                {otherBots.map(b => renderSidebarItem(b, "bot"))}
              </div>
            )}
          </div>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] hover:bg-surface-secondary dark:hover:bg-interactive-active text-text-primary transition">
             <FiClock className="text-lg opacity-70 shrink-0" />
             <span className="truncate">Scheduled tasks</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] hover:bg-surface-secondary dark:hover:bg-interactive-active text-text-primary transition">
             <FiBook className="text-lg opacity-70 shrink-0" />
             <span className="truncate">Knowledge base</span>
          </button>

          <div className="mt-6 mb-2">
            <div 
              className="flex items-center justify-between px-3 py-1 cursor-pointer group"
              onClick={() => setIsRecentsOpen(!isRecentsOpen)}
            >
               <span className="text-xs text-text-primary/70 font-medium">Recent chats</span>
               <FiSearch className="text-sm text-text-primary/50 opacity-0 group-hover:opacity-100 transition" />
            </div>
            
            {isRecentsOpen && (
              <div className="mt-1 space-y-0.5">
                 {recentChats.length === 0 ? (
                    <div className="text-xs text-text-primary/50 px-3 py-2">No recent chats</div>
                  ) : (
                    recentChats.map(c => renderSidebarItem(c, "chat"))
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
`;

// 4. Update renderSecondarySidebar to use work_agents
const originalSecondarySidebar = `  const renderSecondarySidebar = () => {
    if (activeSidebarTab !== "chat" && activeSidebarTab !== "agents") return null;`;

const newSecondarySidebar = workAgentsSidebar + `
  const renderSecondarySidebar = () => {
    if (activeSidebarTab !== "chat" && activeSidebarTab !== "agents" && activeSidebarTab !== "work_agents") return null;

    if (activeSidebarTab === "work_agents") {
      return renderWorkAgentsSidebar();
    }
`;

code = code.replace(originalSecondarySidebar, newSecondarySidebar);

fs.writeFileSync('src/components/layouts/AppLayout.jsx', code);
console.log('AppLayout updated successfully!');
