import { useState, useMemo } from "react";
import {
  FiFolder,
  FiFolderMinus,
  FiFileText,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiChevronRight,
  FiChevronDown,
  FiCode,
  FiFile,
} from "react-icons/fi";

const FileTreeItem = ({
  item,
  activeFilePath,
  onSelectFile,
  onRenameFile,
  onDeleteFile,
  editedFiles,
  isDark,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newPathName, setNewPathName] = useState(item.name);

  const isSelected = item.type === "file" && activeFilePath === item.path;
  const isEdited = item.type === "file" && editedFiles && editedFiles[item.path] !== undefined;

  const handleStartRename = (e) => {
    e.stopPropagation();
    setNewPathName(item.name);
    setIsEditing(true);
  };

  const handleSaveRename = (e) => {
    e?.stopPropagation();
    if (!newPathName.trim() || newPathName === item.name) {
      setIsEditing(false);
      return;
    }
    const parentPath = item.path.includes("/") ? item.path.substring(0, item.path.lastIndexOf("/")) : "";
    const targetPath = parentPath ? `${parentPath}/${newPathName.trim()}` : newPathName.trim();
    onRenameFile(item.path, targetPath);
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      onDeleteFile(item.path);
    }
  };

  const getFileIcon = (lang) => {
    if (lang === "tsx" || lang === "jsx") return <FiCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (lang === "ts" || lang === "js") return <FiCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (lang === "css" || lang === "scss") return <FiFileText className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
    if (lang === "json") return <FiFile className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    return <FiFileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
  };

  if (item.type === "folder") {
    return (
      <div className="select-none">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between px-2 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
            isDark ? "hover:bg-white/5 text-zinc-300" : "hover:bg-black/5 text-slate-700"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isOpen ? (
              <FiChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
            ) : (
              <FiChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
            )}
            <FiFolder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate font-semibold">{item.name}</span>
          </div>
        </div>

        {isOpen && item.children && item.children.length > 0 && (
          <div className="pl-3 border-l border-border-primary/20 dark:border-white/5 ml-2.5 my-0.5 space-y-0.5">
            {item.children.map((child) => (
              <FileTreeItem
                key={child.path}
                item={child}
                activeFilePath={activeFilePath}
                onSelectFile={onSelectFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                editedFiles={editedFiles}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelectFile(item.path)}
      className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-mono transition cursor-pointer ${
        isSelected
          ? "bg-accent-primary text-white font-medium shadow-xs"
          : isDark
          ? "hover:bg-white/5 text-zinc-300"
          : "hover:bg-black/5 text-slate-700"
      }`}
    >
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={newPathName}
            onChange={(e) => setNewPathName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename(e);
              if (e.key === "Escape") setIsEditing(false);
            }}
            autoFocus
            className={`w-full px-1.5 py-0.5 text-xs rounded border outline-none font-mono ${
              isDark ? "bg-zinc-800 text-white border-zinc-700" : "bg-white text-slate-900 border-slate-300"
            }`}
          />
          <button onClick={handleSaveRename} className="p-0.5 text-emerald-500 hover:text-emerald-400">
            <FiCheck className="w-3 h-3" />
          </button>
          <button onClick={() => setIsEditing(false)} className="p-0.5 text-red-400">
            <FiX className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {getFileIcon(item.language)}
            <span className="truncate">{item.name}</span>
            {isEdited && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />
            )}
          </div>

          {/* Action icons on hover */}
          <div className={`hidden group-hover:flex items-center gap-1 shrink-0 ${isSelected ? "text-white" : "text-zinc-400"}`}>
            <button
              onClick={handleStartRename}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
              title="Rename file"
            >
              <FiEdit2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleDelete}
              className="p-0.5 rounded hover:bg-red-500/20 text-red-400"
              title="Delete file"
            >
              <FiTrash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const FileExplorerSidebar = ({
  vfs,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  editedFiles,
  isDark,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");

  const directoryTree = useMemo(() => {
    if (!vfs) return [];
    return vfs.getDirectoryTree();
  }, [vfs, vfs?.files?.size]);

  const handleCreateSubmit = (e) => {
    e?.preventDefault();
    if (!newFilePath.trim()) {
      setIsAdding(false);
      return;
    }
    onCreateFile(newFilePath.trim());
    setNewFilePath("");
    setIsAdding(false);
  };

  return (
    <div
      className={`w-52 h-full flex flex-col border-r shrink-0 select-none ${
        isDark ? "bg-[#0d0e13] border-white/10 text-zinc-300" : "bg-surface-secondary/60 border-border-primary/60 text-slate-800"
      }`}
    >
      {/* Sidebar Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between shrink-0 dark:border-white/10 border-border-primary/60">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <FiFolder className="w-3.5 h-3.5 text-accent-primary" /> Explorer
        </span>
        <button
          onClick={() => setIsAdding(true)}
          className={`p-1 rounded-md transition cursor-pointer ${
            isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-slate-600 hover:text-slate-900"
          }`}
          title="Create New File"
        >
          <FiPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Create File Input */}
      {isAdding && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b dark:border-white/10 border-border-primary/50">
          <input
            type="text"
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            placeholder="e.g. src/components/Button.tsx"
            autoFocus
            className={`w-full px-2 py-1 text-xs rounded border outline-none font-mono ${
              isDark ? "bg-zinc-900 text-white border-zinc-700" : "bg-white text-slate-900 border-slate-300"
            }`}
          />
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-0.5 rounded text-[11px] text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-accent-primary text-white shadow-xs"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-2 space-y-0.5 custom-scrollbar font-mono text-xs">
        {directoryTree.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted italic">No files</div>
        ) : (
          directoryTree.map((item) => (
            <FileTreeItem
              key={item.path}
              item={item}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
              editedFiles={editedFiles}
              isDark={isDark}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FileExplorerSidebar;
