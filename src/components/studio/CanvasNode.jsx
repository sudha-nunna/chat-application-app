import {
  FiMessageSquare,
  FiPlus,
  FiTrash2
} from "react-icons/fi";
import {
  TbRobot,
  TbMathSymbols,
  TbGitFork,
  TbBraces,
  TbPercentage
} from "react-icons/tb";

export default function CanvasNode({
  node,
  isSelected,
  onSelect,
  onUpdateData,
  onDelete,
  onStartDrag,
  onAddTransition
}) {
  // Styling maps based on node type / color
  const colorStyles = {
    pink: {
      border: "border-pink-300/80 dark:border-pink-500/40",
      selectedRing: "ring-2 ring-pink-500 shadow-lg shadow-pink-500/10",
      headerText: "text-pink-700 dark:text-pink-300",
      cardBg: "bg-[#fffafa] dark:bg-[#201518]",
      headerBg: "bg-pink-50 dark:bg-pink-900/30",
      accent: "text-pink-500"
    },
    yellow: {
      border: "border-amber-300/80 dark:border-amber-500/40",
      selectedRing: "ring-2 ring-amber-500 shadow-lg shadow-amber-500/10",
      headerText: "text-amber-800 dark:text-amber-300",
      cardBg: "bg-[#fffdfa] dark:bg-[#211d14]",
      headerBg: "bg-amber-50 dark:bg-amber-900/30",
      accent: "text-amber-500"
    },
    blue: {
      border: "border-blue-300/80 dark:border-blue-500/40",
      selectedRing: "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10",
      headerText: "text-blue-700 dark:text-blue-300",
      cardBg: "bg-[#f8faff] dark:bg-[#141b26]",
      headerBg: "bg-blue-50 dark:bg-blue-900/30",
      accent: "text-blue-500"
    },
    green: {
      border: "border-emerald-300/80 dark:border-emerald-500/40",
      selectedRing: "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10",
      headerText: "text-emerald-700 dark:text-emerald-300",
      cardBg: "bg-[#f8fcf9] dark:bg-[#132018]",
      headerBg: "bg-emerald-50 dark:bg-emerald-900/30",
      accent: "text-emerald-500"
    },
    mint: {
      border: "border-teal-300/80 dark:border-teal-500/40",
      selectedRing: "ring-2 ring-teal-500 shadow-lg shadow-teal-500/10",
      headerText: "text-teal-700 dark:text-teal-300",
      cardBg: "bg-[#f5fdfa] dark:bg-[#12201d]",
      headerBg: "bg-teal-50 dark:bg-teal-900/30",
      accent: "text-teal-500"
    },
    purple: {
      border: "border-purple-300/80 dark:border-purple-500/40",
      selectedRing: "ring-2 ring-purple-500 shadow-lg shadow-purple-500/10",
      headerText: "text-purple-700 dark:text-purple-300",
      cardBg: "bg-[#faf8ff] dark:bg-[#1d1627]",
      headerBg: "bg-purple-50 dark:bg-purple-900/30",
      accent: "text-purple-500"
    },
    slate: {
      border: "border-slate-300/80 dark:border-slate-500/40",
      selectedRing: "ring-2 ring-slate-500 shadow-lg shadow-slate-500/10",
      headerText: "text-slate-700 dark:text-slate-300",
      cardBg: "bg-[#f8fafc] dark:bg-[#181a1f]",
      headerBg: "bg-slate-100 dark:bg-slate-800/40",
      accent: "text-slate-500"
    }
  };

  const style = colorStyles[node.color || "pink"] || colorStyles.pink;

  // 1. Begin Pill Node
  if (node.type === "begin") {
    return (
      <div
        style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onMouseDown={(e) => onStartDrag(e, node.id)}
        className={`absolute select-none cursor-grab active:cursor-grabbing z-10 transition-shadow ${
          isSelected ? "ring-2 ring-purple-500 shadow-md" : ""
        }`}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/40 text-purple-600 dark:text-purple-300 text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Begin</span>
          {/* Outgoing port */}
          <div
            id={`port-${node.id}-out`}
            className="w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-white dark:border-neutral-900 -mr-2 ml-1 shadow-2xs"
          />
        </div>
      </div>
    );
  }

  // 2. Ending Pill Node
  if (node.type === "ending") {
    return (
      <div
        style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onMouseDown={(e) => onStartDrag(e, node.id)}
        className={`absolute select-none cursor-grab active:cursor-grabbing z-10 transition-shadow ${
          isSelected ? "ring-2 ring-teal-500 shadow-md" : ""
        }`}
      >
        {/* Incoming port */}
        <div
          id={`port-${node.id}-in`}
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 border-white dark:border-neutral-900 z-10"
        />
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/40 text-teal-700 dark:text-teal-300 text-xs font-semibold shadow-xs">
          <TbPercentage className="text-sm" />
          <span>{node.title || "Ending"}</span>
        </div>
      </div>
    );
  }

  // 3. Full Flow Cards
  const transitions = node.data?.transitions || [];

  return (
    <div
      style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      className={`absolute w-[240px] sm:w-[260px] rounded-2xl border ${style.border} ${style.cardBg} shadow-sm backdrop-blur-md select-none transition-shadow z-10 group ${
        isSelected ? style.selectedRing : "hover:shadow-md"
      }`}
    >
      {/* Incoming Connection Port (Left Center) */}
      <div
        id={`port-${node.id}-in`}
        className="absolute -left-1.5 top-8 w-2.5 h-2.5 rounded-full bg-border-primary border-2 border-surface-primary shadow-xs z-20 group-hover:scale-125 transition"
      />

      {/* Global Badge if present */}
      {node.badge && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-wide flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          <span>{node.badge}</span>
        </div>
      )}

      {/* Draggable Card Header */}
      <div
        onMouseDown={(e) => onStartDrag(e, node.id)}
        className={`px-3.5 py-2.5 rounded-t-2xl flex items-center justify-between border-b ${style.border} ${style.headerBg} cursor-grab active:cursor-grabbing`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {node.type === "conversation" && <FiMessageSquare className={`text-xs ${style.accent}`} />}
          {node.type === "function" && <TbMathSymbols className={`text-xs ${style.accent}`} />}
          {node.type === "logic_split" && <TbGitFork className={`text-xs ${style.accent}`} />}
          {node.type === "extract_variable" && <TbBraces className={`text-xs ${style.accent}`} />}
          {node.type === "subagent" && <TbRobot className={`text-xs ${style.accent}`} />}

          <span className={`text-xs font-bold ${style.headerText} truncate`}>
            {node.title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {node.id !== "welcome-node" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-500 transition cursor-pointer"
              title="Delete node"
            >
              <FiTrash2 className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Card Body / Prompt */}
      <div className="p-3 space-y-2.5">
        {node.data?.text !== undefined ? (
          <textarea
            rows={3}
            value={node.data.text}
            onChange={(e) => {
              onUpdateData(node.id, { text: e.target.value });
            }}
            placeholder="Type message or instruction. Type @ to add dynamic variables..."
            className="w-full text-[11px] leading-relaxed p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-text-primary resize-none focus:outline-hidden focus:border-accent-primary focus:bg-surface-primary placeholder:text-text-muted/60"
          />
        ) : node.type === "function" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            {node.data?.functionName || "⚡ Execute API / Backend Tool"}
          </div>
        ) : node.type === "logic_split" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            {node.data?.condition || "🔀 Evaluate Conditional Routing"}
          </div>
        ) : node.type === "extract_variable" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            {node.data?.variableName || "{ } Extract Slots & Entities"}
          </div>
        ) : (
          <div className="p-2 text-[11px] text-text-muted">
            Configure node parameters in right panel
          </div>
        )}

        {/* Transition Section */}
        <div className="pt-1 border-t border-border-primary/30 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Transition
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddTransition(node.id);
              }}
              className="p-0.5 text-text-muted hover:text-accent-primary transition cursor-pointer"
              title="Add transition branch"
            >
              <FiPlus className="text-xs" />
            </button>
          </div>

          {/* Transition Branches */}
          <div className="space-y-1">
            {transitions.map((t, index) => (
              <div
                key={t.id || index}
                className="group/branch flex items-center justify-between p-1.5 rounded-lg bg-surface-primary/60 border border-border-primary/40 text-[10px] text-text-secondary hover:border-border-primary transition relative"
              >
                <span className="truncate pr-3">{t.label}</span>

                {/* Right Connector Handle */}
                <div
                  id={`port-${node.id}-t-${t.id || index}`}
                  className="w-2 h-2 rounded-full bg-accent-primary border border-white dark:border-neutral-900 shrink-0 shadow-2xs group-hover/branch:scale-125 transition"
                  title="Connect to next node"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
