const fs = require('fs');
let code = fs.readFileSync('src/components/layouts/AppLayout.jsx', 'utf8');

// 1. Add state
code = code.replace(
  /const \[isCreateModalOpen, setIsCreateModalOpen\] = useState\(false\);/,
  'const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);\n  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);'
);

// 2. Primary sidebar hide
code = code.replace(
  /<div className="hidden md:block w-\[72px\] shrink-0 h-full relative z-30">/,
  '<div className={`hidden md:block shrink-0 h-full relative z-30 transition-all duration-300 ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[72px]"}`}>'
);

// 3. renderSecondarySidebar wrapper
code = code.replace(
  /<div className="flex flex-col h-full overflow-hidden w-\[280px\] bg-surface-primary border-r border-border-primary shrink-0 z-20 select-none relative">/,
  '<div className={`flex flex-col h-full overflow-hidden transition-all duration-300 bg-surface-primary border-r border-border-primary shrink-0 z-20 select-none relative ${isSidebarCollapsed ? "w-[72px]" : "w-[280px]"}`}>'
);

// 4. Secondary sidebar header
const oldHeader = `<div className="p-4 border-b border-border-primary/40 flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold">{activeSidebarTab === "chat" ? "Chats" : "AI Agents"}</span>
          <div className="flex gap-1">
             <button className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-primary transition" title="Toggle Sidebar">
               <FiSidebar className="text-sm" />
             </button>
          </div>
        </div>`;
const newHeader = `<div className={\`p-4 border-b border-border-primary/40 flex items-center shrink-0 \${isSidebarCollapsed ? "justify-center" : "justify-between"}\`}>
          {!isSidebarCollapsed && <span className="text-sm font-semibold truncate">{activeSidebarTab === "chat" ? "Chats" : "AI Agents"}</span>}
          <div className="flex gap-1">
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-primary transition" title="Toggle Sidebar">
               <FiSidebar className="text-sm" />
             </button>
          </div>
        </div>`;
code = code.replace(oldHeader, newHeader);

// 5. New Chat button
const oldNewChat = `<div className="px-3 pt-3 pb-2">
            <button 
               onClick={() => activeSidebarTab === "chat" ? handleSelectItem(null, "chat") : setIsCreateModalOpen(true)}
               className="w-full bg-surface-secondary dark:bg-interactive-active/40 hover:bg-surface-secondary/80 dark:hover:bg-interactive-active/70 text-text-primary py-2.5 px-3 rounded-2xl flex items-center gap-2 text-sm transition font-medium border border-transparent shadow-sm"
            >
               <FiPlus className="text-base shrink-0" /> New chat
            </button>
          </div>`;
const newNewChat = `<div className={\`pt-3 pb-2 flex \${isSidebarCollapsed ? "px-1 justify-center" : "px-3"}\`}>
            <button 
               onClick={() => activeSidebarTab === "chat" ? handleSelectItem(null, "chat") : setIsCreateModalOpen(true)}
               title="New chat"
               className={\`w-full bg-surface-secondary dark:bg-interactive-active/40 hover:bg-surface-secondary/80 dark:hover:bg-interactive-active/70 text-text-primary \${isSidebarCollapsed ? "py-2.5 px-0 justify-center w-10 h-10" : "py-2.5 px-3"} rounded-2xl flex items-center gap-2 text-sm transition font-medium border border-transparent shadow-sm\`}
            >
               <FiPlus className="text-base shrink-0" /> {!isSidebarCollapsed && <span>New chat</span>}
            </button>
          </div>`;
code = code.replace(oldNewChat, newNewChat);

// 6. space-y-6 padding
code = code.replace(
  /<div className="px-3 pt-4 pb-32 space-y-6 custom-scrollbar">/,
  '<div className={`pt-4 pb-32 space-y-6 custom-scrollbar ${isSidebarCollapsed ? "px-1" : "px-3"}`}>'
);

// 7. Hide Headers in list
code = code.replaceAll(
  /<div \n                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"\n                onClick=\{\(\) => (setIsPinnedOpen|setIsRecentsOpen|setIsAgentsOpen)\(\!(isPinnedOpen|isRecentsOpen|isAgentsOpen)\)\}\n              >/g,
  `{!isSidebarCollapsed && <div 
                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                onClick={() => $1(!$2)}
              >`
);
code = code.replaceAll(
  /<span>(Pinned|Recents|My AI Agents)<\/span>\n                \{(isPinnedOpen|isRecentsOpen|isAgentsOpen) \? <FiChevronDown className="text-\[10px\]" \/> : <FiChevronRight className="text-\[10px\]" \/>\}\n              <\/div>/g,
  `<span>$1</span>
                {$2 ? <FiChevronDown className="text-[10px]" /> : <FiChevronRight className="text-[10px]" />}
              </div>}`
);

// 8. renderSidebarItem modifications
const oldItemDiv = `className={\`group relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition select-none border-none outline-none \${`;
const newItemDiv = `title={title}
        className={\`group relative flex items-center justify-between py-2 rounded-lg cursor-pointer text-sm transition select-none border-none outline-none \${isSidebarCollapsed ? "px-0 justify-center" : "px-3"} \${`;
code = code.replace(oldItemDiv, newItemDiv);

const oldItemInner = `<div className="flex items-center gap-1 w-full pr-12 relative">`;
const newItemInner = `<div className={\`flex items-center gap-1 w-full relative \${isSidebarCollapsed ? 'justify-center pr-0' : 'pr-12'}\`}>`;
code = code.replace(oldItemInner, newItemInner);

// Form and title hiding
const oldFormAndTitle = `{isEditing ? (
            <form onSubmit={(e) => handleRenameSubmit(e, item._id, type)} className="w-full flex items-center gap-2">
              <input 
                type="text" 
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className={\`w-full bg-transparent outline-none border-b border-text-muted/30 text-sm\`} 
              />
              <button type="submit" onClick={(e) => e.stopPropagation()} className="p-1 hover:text-white transition">
                <FiCheck className="text-xs" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setEditingItemId(null); }} className="p-1 hover:text-white transition">
                <FiX className="text-xs" />
              </button>
            </form>
          ) : (
            <>
              <span className="truncate flex-1">{title}</span>
              <div className={\`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l to-transparent pointer-events-none \${
                isActive 
                  ? "from-interactive-base dark:from-interactive-active" 
                  : "from-white dark:from-surface-secondary group-hover:from-surface-secondary dark:group-hover:from-interactive-active/80"
              }\`}></div>
            </>
          )}`;
const newFormAndTitle = `{isEditing && !isSidebarCollapsed ? (
            <form onSubmit={(e) => handleRenameSubmit(e, item._id, type)} className="w-full flex items-center gap-2">
              <input 
                type="text" 
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className={\`w-full bg-transparent outline-none border-b border-text-muted/30 text-sm\`} 
              />
              <button type="submit" onClick={(e) => e.stopPropagation()} className="p-1 hover:text-white transition">
                <FiCheck className="text-xs" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setEditingItemId(null); }} className="p-1 hover:text-white transition">
                <FiX className="text-xs" />
              </button>
            </form>
          ) : !isSidebarCollapsed ? (
            <>
              <span className="truncate flex-1">{title}</span>
              <div className={\`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l to-transparent pointer-events-none \${
                isActive 
                  ? "from-interactive-base dark:from-interactive-active" 
                  : "from-white dark:from-surface-secondary group-hover:from-surface-secondary dark:group-hover:from-interactive-active/80"
              }\`}></div>
            </>
          ) : null}`;
code = code.replace(oldFormAndTitle, newFormAndTitle);

// Hide options
code = code.replace(
  /\{!isEditing && \(/,
  '{!isEditing && !isSidebarCollapsed && ('
);

fs.writeFileSync('src/components/layouts/AppLayout.jsx', code);
console.log('Successfully added sidebar collapse behavior.');
