const fs = require('fs');
let code = fs.readFileSync('src/components/layouts/AppLayout.jsx', 'utf8');

// 1. Hide Headers in list
code = code.replaceAll(
  /<div \n                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"\n                onClick=\{\(\) => set(IsPinnedOpen|IsRecentsOpen|IsAgentsOpen)\(\!(isPinnedOpen|isRecentsOpen|isAgentsOpen)\)\}\n              >/g,
  `{!isSidebarCollapsed && <div 
                className="text-xs font-semibold text-text-primary px-3 mb-1.5 flex items-center gap-1 cursor-pointer hover:text-text-muted transition select-none"
                onClick={() => set$1(!$2)}
              >`
);
code = code.replaceAll(
  /<span>(Pinned|Recents|My AI Agents)<\/span>\n                \{(isPinnedOpen|isRecentsOpen|isAgentsOpen) \? <FiChevronDown className="text-\[10px\]" \/> : <FiChevronRight className="text-\[10px\]" \/>\}\n              <\/div>/g,
  `<span>$1</span>
                {$2 ? <FiChevronDown className="text-[10px]" /> : <FiChevronRight className="text-[10px]" />}
              </div>}`
);

// 2. renderSidebarItem modifications
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
console.log('Successfully added sidebar collapse behavior part 2.');
