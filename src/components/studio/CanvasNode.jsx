import { useState } from "react";
import {
  FiMessageSquare,
  FiPlus,
  FiTrash2,
  FiPhoneCall,
  FiSend,
  FiCode,
  FiEdit2,
  FiCheck
} from "react-icons/fi";
import {
  TbRobot,
  TbMathSymbols,
  TbGitFork,
  TbBraces,
  TbPercentage,
  TbDialpad,
  TbArrowsRightLeft,
  TbPlugConnected,
  TbFileDescription
} from "react-icons/tb";

export default function CanvasNode({
  node,
  isSelected,
  isActiveRunning,
  onSelect,
  onUpdateData,
  onDelete,
  onStartDrag,
  onAddTransition,
  onUpdateTransition,
  onDeleteTransition,
  onStartConnect,
  onEndConnect
}) {
  const [editingTransId, setEditingTransId] = useState(null);
  const [editingLabelText, setEditingLabelText] = useState("");
  // Styling maps based on node type / color
  const colorStyles = {
    pink: {
      border: "border-pink-300/80 dark:border-pink-500/40",
      selectedRing: "ring-2 ring-pink-500 shadow-lg shadow-pink-500/10",
      activeGlow: "ring-4 ring-pink-500/60 shadow-xl shadow-pink-500/30 animate-pulse",
      headerText: "text-pink-700 dark:text-pink-300",
      cardBg: "bg-[#fffafa] dark:bg-[#201518]",
      headerBg: "bg-pink-50 dark:bg-pink-900/30",
      accent: "text-pink-500"
    },
    yellow: {
      border: "border-amber-300/80 dark:border-amber-500/40",
      selectedRing: "ring-2 ring-amber-500 shadow-lg shadow-amber-500/10",
      activeGlow: "ring-4 ring-amber-500/60 shadow-xl shadow-amber-500/30 animate-pulse",
      headerText: "text-amber-800 dark:text-amber-300",
      cardBg: "bg-[#fffdfa] dark:bg-[#211d14]",
      headerBg: "bg-amber-50 dark:bg-amber-900/30",
      accent: "text-amber-500"
    },
    blue: {
      border: "border-blue-300/80 dark:border-blue-500/40",
      selectedRing: "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10",
      activeGlow: "ring-4 ring-blue-500/60 shadow-xl shadow-blue-500/30 animate-pulse",
      headerText: "text-blue-700 dark:text-blue-300",
      cardBg: "bg-[#f8faff] dark:bg-[#141b26]",
      headerBg: "bg-blue-50 dark:bg-blue-900/30",
      accent: "text-blue-500"
    },
    green: {
      border: "border-emerald-300/80 dark:border-emerald-500/40",
      selectedRing: "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10",
      activeGlow: "ring-4 ring-emerald-500/60 shadow-xl shadow-emerald-500/30 animate-pulse",
      headerText: "text-emerald-700 dark:text-emerald-300",
      cardBg: "bg-[#f8fcf9] dark:bg-[#132018]",
      headerBg: "bg-emerald-50 dark:bg-emerald-900/30",
      accent: "text-emerald-500"
    },
    mint: {
      border: "border-teal-300/80 dark:border-teal-500/40",
      selectedRing: "ring-2 ring-teal-500 shadow-lg shadow-teal-500/10",
      activeGlow: "ring-4 ring-teal-500/60 shadow-xl shadow-teal-500/30 animate-pulse",
      headerText: "text-teal-700 dark:text-teal-300",
      cardBg: "bg-[#f5fdfa] dark:bg-[#12201d]",
      headerBg: "bg-teal-50 dark:bg-teal-900/30",
      accent: "text-teal-500"
    },
    purple: {
      border: "border-purple-300/80 dark:border-purple-500/40",
      selectedRing: "ring-2 ring-purple-500 shadow-lg shadow-purple-500/10",
      activeGlow: "ring-4 ring-purple-500/60 shadow-xl shadow-purple-500/30 animate-pulse",
      headerText: "text-purple-700 dark:text-purple-300",
      cardBg: "bg-[#faf8ff] dark:bg-[#1d1627]",
      headerBg: "bg-purple-50 dark:bg-purple-900/30",
      accent: "text-purple-500"
    },
    slate: {
      border: "border-slate-300/80 dark:border-slate-500/40",
      selectedRing: "ring-2 ring-slate-500 shadow-lg shadow-slate-500/10",
      activeGlow: "ring-4 ring-slate-500/60 shadow-xl shadow-slate-500/30 animate-pulse",
      headerText: "text-slate-700 dark:text-slate-300",
      cardBg: "bg-[#f8fafc] dark:bg-[#181a1f]",
      headerBg: "bg-slate-100 dark:bg-slate-800/40",
      accent: "text-slate-500"
    }
  };

  const style = colorStyles[node.color || "pink"] || colorStyles.pink;

  // Render Icon based on Node Type
  const renderNodeIcon = () => {
    switch (node.type) {
      case "conversation":
        return <FiMessageSquare className={`text-xs ${style.accent}`} />;
      case "subagent":
        return <TbRobot className={`text-xs ${style.accent}`} />;
      case "function":
        return <TbMathSymbols className={`text-xs ${style.accent}`} />;
      case "call_transfer":
        return <FiPhoneCall className={`text-xs ${style.accent}`} />;
      case "press_digit":
        return <TbDialpad className={`text-xs ${style.accent}`} />;
      case "logic_split":
        return <TbGitFork className={`text-xs ${style.accent}`} />;
      case "agent_transfer":
        return <TbArrowsRightLeft className={`text-xs ${style.accent}`} />;
      case "in_call_sms":
        return <FiSend className={`text-xs ${style.accent}`} />;
      case "extract_variable":
        return <TbBraces className={`text-xs ${style.accent}`} />;
      case "code":
        return <FiCode className={`text-xs ${style.accent}`} />;
      case "mcp":
        return <TbPlugConnected className={`text-xs ${style.accent}`} />;
      case "note":
        return <TbFileDescription className={`text-xs ${style.accent}`} />;
      default:
        return <FiMessageSquare className={`text-xs ${style.accent}`} />;
    }
  };

  // 1. Begin / Start Pill Node
  if (node.type === "begin" || node.type === "start") {
    return (
      <div
        style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onMouseDown={(e) => onStartDrag(e, node.id)}
        className={`absolute select-none cursor-grab active:cursor-grabbing z-10 transition-all ${
          isActiveRunning
            ? "ring-4 ring-emerald-500/70 shadow-lg shadow-emerald-500/30 animate-pulse"
            : isSelected
            ? "ring-2 ring-emerald-500 shadow-md"
            : ""
        }`}
      >
        <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{node.title || "Start Node"}</span>
          {/* Outgoing port */}
          <div
            id={`port-${node.id}-out`}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (onStartConnect) onStartConnect(e, node.id, "out", 0);
            }}
            className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900 -mr-2 ml-1 shadow-2xs cursor-crosshair hover:scale-150 transition-transform"
            title="Drag line to connect to next node"
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
        className={`absolute select-none cursor-grab active:cursor-grabbing z-10 transition-all ${
          isActiveRunning
            ? "ring-4 ring-teal-500/70 shadow-lg shadow-teal-500/30 animate-pulse"
            : isSelected
            ? "ring-2 ring-teal-500 shadow-md"
            : ""
        }`}
      >
        {/* Incoming port */}
        <div
          id={`port-${node.id}-in`}
          onMouseUp={(e) => {
            e.stopPropagation();
            if (onEndConnect) onEndConnect(node.id);
          }}
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 border-white dark:border-neutral-900 z-10 cursor-pointer hover:scale-150 transition-transform"
          title="Drop wire here to connect ending node"
        />
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/40 text-teal-700 dark:text-teal-300 text-xs font-semibold shadow-xs">
          <TbPercentage className="text-sm" />
          <span>{node.title || "Ending"}</span>
        </div>
      </div>
    );
  }

  // 3. Note Node (Canvas Sticky Note)
  if (node.type === "note") {
    return (
      <div
        style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        className={`absolute w-[200px] p-3 rounded-2xl border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/40 shadow-sm backdrop-blur-md select-none transition-shadow z-10 group ${
          isSelected ? "ring-2 ring-amber-500" : ""
        }`}
      >
        <div
          onMouseDown={(e) => onStartDrag(e, node.id)}
          className="flex items-center justify-between pb-1 mb-1 border-b border-amber-200/50 dark:border-amber-800/40 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
            <TbFileDescription />
            <span>Note</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-amber-700 dark:text-amber-400 hover:text-red-500 transition cursor-pointer"
          >
            <FiTrash2 className="text-xs" />
          </button>
        </div>
        <textarea
          rows={3}
          value={node.data?.text || ""}
          onChange={(e) => onUpdateData(node.id, { text: e.target.value })}
          placeholder="Add canvas note / documentation..."
          className="w-full text-[11px] bg-transparent text-amber-900 dark:text-amber-200 resize-none focus:outline-hidden placeholder:text-amber-800/40"
        />
      </div>
    );
  }

  // 4. Full Flow Cards
  const transitions = node.data?.transitions || [];
  const hasValidationError = Boolean(node.validationError);

  return (
    <div
      style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      className={`absolute w-[240px] sm:w-[260px] rounded-2xl border ${style.border} ${style.cardBg} shadow-sm backdrop-blur-md select-none transition-all z-10 group ${
        isActiveRunning
          ? style.activeGlow
          : hasValidationError
          ? "ring-2 ring-red-500 shadow-md shadow-red-500/20"
          : isSelected
          ? style.selectedRing
          : "hover:shadow-md"
      }`}
    >
      {/* Incoming Connection Port (Left Center) */}
      <div
        id={`port-${node.id}-in`}
        onMouseUp={(e) => {
          e.stopPropagation();
          if (onEndConnect) onEndConnect(node.id);
        }}
        className="absolute -left-1.5 top-8 w-3 h-3 rounded-full bg-accent-primary border-2 border-surface-primary shadow-xs z-20 hover:scale-150 transition-transform cursor-pointer"
        title="Drop wire here to connect target node"
      />

      {/* Global Badge if present */}
      {node.badge && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-wide flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          <span>{node.badge}</span>
        </div>
      )}

      {/* Validation Warning Alert Badge */}
      {hasValidationError && (
        <div className="absolute -top-2.5 right-4 px-2 py-0.2 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-xs" title={node.validationError}>
          <span>⚠️ {node.validationError}</span>
        </div>
      )}

      {/* Draggable Card Header */}
      <div
        onMouseDown={(e) => onStartDrag(e, node.id)}
        className={`px-3.5 py-2.5 rounded-t-2xl flex items-center justify-between border-b ${style.border} ${style.headerBg} cursor-grab active:cursor-grabbing`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {renderNodeIcon()}
          <span className={`text-xs font-bold ${style.headerText} truncate`}>
            {node.title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {node.id !== "welcome-node" && node.type !== "start" && (
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
        {node.type === "conversation" || node.type === "subagent" ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted">
              <span className="px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary border border-border-primary/40 font-mono">
                Prompt
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-secondary/70 text-text-muted border border-border-primary/40 font-mono">
                Static / Variable
              </span>
            </div>
            <textarea
              rows={3}
              value={node.data?.text || ""}
              onChange={(e) => {
                onUpdateData(node.id, { text: e.target.value });
              }}
              placeholder="Type prompt or instructions. Use {{variable}} for dynamic context..."
              className="w-full text-[11px] leading-relaxed p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-text-primary resize-none focus:outline-hidden focus:border-accent-primary focus:bg-surface-primary placeholder:text-text-muted/60"
            />
          </div>
        ) : node.type === "call_transfer" ? (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-text-muted">Transfer Destination</div>
            <input
              type="text"
              value={node.data?.phone || "+1 (800) 555-0199"}
              onChange={(e) => onUpdateData(node.id, { phone: e.target.value })}
              placeholder="+1 (800) 555-0199 or sip:endpoint"
              className="w-full text-[11px] px-2 py-1 rounded-lg bg-surface-primary/70 border border-border-primary/40 text-text-primary focus:outline-hidden focus:border-accent-primary"
            />
          </div>
        ) : node.type === "function" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            ⚡ {node.data?.functionName || "Execute API / Tool Call"}
          </div>
        ) : node.type === "press_digit" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            🔢 Collect DTMF Digits
          </div>
        ) : node.type === "logic_split" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            🔀 {node.data?.condition || "Evaluate Conditional Branching"}
          </div>
        ) : node.type === "in_call_sms" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            📲 Send In-Call SMS
          </div>
        ) : node.type === "extract_variable" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            {node.data?.variableName || "{ } Extract Custom Slot Entities"}
          </div>
        ) : node.type === "code" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
            &lt;/&gt; Inline JS Execution
          </div>
        ) : node.type === "mcp" ? (
          <div className="p-2 rounded-xl bg-surface-primary/70 border border-border-primary/40 text-[11px] text-text-secondary font-medium truncate">
            🔌 Model Context Protocol Server
          </div>
        ) : (
          <div className="p-2 text-[11px] text-text-muted">
            Configure node parameters in right panel
          </div>
        )}

        {/* Dynamic Transition Section Across All Nodes */}
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
            {transitions.map((t, index) => {
              const transKey = t.id || index;
              const isEditingThis = editingTransId === transKey;

              return (
                <div
                  key={transKey}
                  className="group/branch flex items-center justify-between p-1.5 rounded-lg bg-surface-primary/60 border border-border-primary/40 text-[10px] text-text-secondary hover:border-border-primary transition relative"
                >
                  {isEditingThis ? (
                    <div className="flex items-center gap-1 flex-1 pr-1">
                      <input
                        type="text"
                        value={editingLabelText}
                        onChange={(e) => setEditingLabelText(e.target.value)}
                        onBlur={() => {
                          if (onUpdateTransition && editingLabelText.trim()) {
                            onUpdateTransition(node.id, transKey, editingLabelText.trim());
                          }
                          setEditingTransId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (onUpdateTransition && editingLabelText.trim()) {
                              onUpdateTransition(node.id, transKey, editingLabelText.trim());
                            }
                            setEditingTransId(null);
                          } else if (e.key === "Escape") {
                            setEditingTransId(null);
                          }
                        }}
                        autoFocus
                        className="w-full text-[10px] px-1.5 py-0.5 rounded bg-surface-primary border border-accent-primary text-text-primary focus:outline-hidden font-medium"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (onUpdateTransition && editingLabelText.trim()) {
                            onUpdateTransition(node.id, transKey, editingLabelText.trim());
                          }
                          setEditingTransId(null);
                        }}
                        className="p-1 text-emerald-500 hover:text-emerald-600 transition cursor-pointer"
                        title="Save option label"
                      >
                        <FiCheck className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTransId(transKey);
                        setEditingLabelText(t.label || `= Option ${index + 1}`);
                      }}
                      className="truncate pr-1 cursor-pointer hover:text-accent-primary transition font-medium"
                      title="Click to edit transition label"
                    >
                      {t.label || `= Option ${index + 1}`}
                    </span>
                  )}

                  <div className="flex items-center gap-0.5 shrink-0">
                    {!isEditingThis && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTransId(transKey);
                          setEditingLabelText(t.label || `= Option ${index + 1}`);
                        }}
                        className="opacity-0 group-hover/branch:opacity-100 p-0.5 text-text-muted hover:text-accent-primary transition cursor-pointer"
                        title="Edit option label"
                      >
                        <FiEdit2 className="text-[10px]" />
                      </button>
                    )}

                    {onDeleteTransition && !isEditingThis && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTransition(node.id, transKey);
                        }}
                        className="opacity-0 group-hover/branch:opacity-100 p-0.5 text-text-muted hover:text-red-500 transition cursor-pointer mr-0.5"
                        title="Remove transition option"
                      >
                        <FiTrash2 className="text-[10px]" />
                      </button>
                    )}

                    {/* Right Connector Handle */}
                    <div
                      id={`port-${node.id}-t-${transKey}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (onStartConnect) onStartConnect(e, node.id, transKey, index);
                      }}
                      className="w-3 h-3 rounded-full bg-accent-primary border border-white dark:border-neutral-900 shrink-0 shadow-2xs hover:scale-150 transition-transform cursor-crosshair z-20 ml-0.5"
                      title="Drag line to connect to next node"
                    />
                  </div>
                </div>
              );
            })}
            {transitions.length === 0 && (
              <div className="text-[10px] text-text-muted italic px-1">
                No transitions configured. Click + to add option.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

