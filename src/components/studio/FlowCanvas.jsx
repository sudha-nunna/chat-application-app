import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiMousePointer,
  FiMove,
  FiMaximize,
  FiMap,
  FiMinus,
  FiPlus
} from "react-icons/fi";
import CanvasNode from "./CanvasNode";

export default function FlowCanvas({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onUpdateNodeData,
  onDeleteNode,
  onAddTransition,
  onNodesChange
}) {
  const containerRef = useRef(null);

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 60, y: 80 });
  const [zoom, setZoom] = useState(0.85);
  const [activeTool, setActiveTool] = useState("select"); // "select" | "hand"
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Minimap visibility
  const [showMinimap, setShowMinimap] = useState(true);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.3, Number((prev - 0.1).toFixed(2))));
  const handleFitView = () => {
    setPan({ x: 80, y: 100 });
    setZoom(0.85);
  };

  // Wheel zoom & pan
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.001;
      setZoom((prev) => Math.max(0.3, Math.min(1.5, Number((prev + zoomFactor).toFixed(2)))));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Background mouse down (Pan)
  const handleBackgroundMouseDown = (e) => {
    if (e.button !== 0) return;
    onSelectNode(null);

    setIsPanning(true);
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  // Start dragging a node
  const handleStartDragNode = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: (e.clientX / zoom) - node.x,
      y: (e.clientY / zoom) - node.y
    });
  };

  // Global mouse move
  const handleMouseMove = useCallback(
    (e) => {
      if (draggingNodeId) {
        const newX = Math.round((e.clientX / zoom) - dragOffset.x);
        const newY = Math.round((e.clientY / zoom) - dragOffset.y);

        onNodesChange((prev) =>
          prev.map((node) =>
            node.id === draggingNodeId ? { ...node, x: newX, y: newY } : node
          )
        );
      } else if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
      }
    },
    [draggingNodeId, dragOffset, zoom, isPanning, panStart, onNodesChange]
  );

  // Global mouse up
  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Compute SVG Bezier Curves for connections between nodes
  const renderConnections = () => {
    return connections.map((conn) => {
      const sourceNode = nodes.find((n) => n.id === conn.fromNode);
      const targetNode = nodes.find((n) => n.id === conn.toNode);

      if (!sourceNode || !targetNode) return null;

      // Calculate source handle coordinates
      let startX = sourceNode.x + (sourceNode.type === "begin" ? 80 : 255);
      let startY = sourceNode.y + (sourceNode.type === "begin" ? 14 : 95 + (conn.transitionIndex || 0) * 32);

      // Target node port is usually top-left handle
      let endX = targetNode.x;
      let endY = targetNode.y + (targetNode.type === "ending" ? 14 : 32);

      const dx = Math.max(50, Math.abs(endX - startX) * 0.45);
      const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

      return (
        <g key={conn.id || `${conn.fromNode}-${conn.toNode}`}>
          {/* Outer glow line */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-border-primary/40"
          />
          {/* Core connection curve */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="text-zinc-400 dark:text-zinc-600 hover:text-accent-primary transition-colors"
          />
          {/* Target port circle */}
          <circle
            cx={endX}
            cy={endY}
            r="3"
            fill="currentColor"
            className="text-accent-primary"
          />
        </g>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleBackgroundMouseDown}
      className={`relative flex-1 h-full w-full overflow-hidden bg-[#fafbfc] dark:bg-[#0c0d0e] select-none ${
        activeTool === "hand" || isPanning ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
      style={{
        backgroundImage: `radial-gradient(circle, rgba(160, 160, 160, 0.22) 1.2px, transparent 1.2px)`,
        backgroundSize: "22px 22px",
        backgroundPosition: `${pan.x}px ${pan.y}px`
      }}
    >
      {/* 1. Zoomable & Pannable Canvas Layer */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "0 0",
          width: "3500px",
          height: "3500px",
          position: "absolute",
          top: 0,
          left: 0
        }}
      >
        {/* SVG Bezier Connection Layer */}
        <svg
          className="absolute inset-0 pointer-events-none z-0"
          width="3500"
          height="3500"
        >
          {renderConnections()}
        </svg>

        {/* Render Flow Nodes */}
        {nodes.map((node) => (
          <CanvasNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onSelect={onSelectNode}
            onUpdateData={onUpdateNodeData}
            onDelete={onDeleteNode}
            onStartDrag={handleStartDragNode}
            onAddTransition={onAddTransition}
          />
        ))}
      </div>

      {/* 2. Floating MiniMap Preview (Bottom Right / Center) */}
      {showMinimap && (
        <div className="absolute bottom-18 sm:bottom-16 right-4 sm:right-6 w-44 h-28 rounded-2xl bg-surface-primary/85 dark:bg-surface-secondary/85 backdrop-blur-md border border-border-primary/60 shadow-lg p-2 z-20 pointer-events-none overflow-hidden">
          <div className="relative w-full h-full">
            {nodes.map((n) => (
              <div
                key={n.id}
                style={{
                  left: `${(n.x / 1400) * 100}%`,
                  top: `${(n.y / 800) * 100}%`,
                  width: n.type === "begin" || n.type === "ending" ? "14px" : "24px",
                  height: n.type === "begin" || n.type === "ending" ? "8px" : "14px"
                }}
                className={`absolute rounded-sm ${
                  n.color === "pink"
                    ? "bg-pink-400/80"
                    : n.color === "yellow"
                    ? "bg-amber-400/80"
                    : n.color === "blue"
                    ? "bg-blue-400/80"
                    : n.color === "green"
                    ? "bg-emerald-400/80"
                    : n.color === "mint"
                    ? "bg-teal-400/80"
                    : "bg-purple-400/80"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Floating Bottom Canvas Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-surface-primary/90 dark:bg-surface-secondary/90 backdrop-blur-md border border-border-primary/70 rounded-2xl p-1.5 shadow-lg select-none">
        <button
          type="button"
          onClick={() => setActiveTool("select")}
          className={`p-1.5 rounded-xl transition cursor-pointer text-xs ${
            activeTool === "select"
              ? "bg-surface-secondary text-text-primary shadow-2xs"
              : "text-text-muted hover:text-text-primary"
          }`}
          title="Select Tool"
        >
          <FiMousePointer className="text-sm" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("hand")}
          className={`p-1.5 rounded-xl transition cursor-pointer text-xs ${
            activeTool === "hand"
              ? "bg-surface-secondary text-text-primary shadow-2xs"
              : "text-text-muted hover:text-text-primary"
          }`}
          title="Pan / Hand Tool"
        >
          <FiMove className="text-sm" />
        </button>

        <div className="h-4 w-px bg-border-primary/50 mx-0.5" />

        <button
          type="button"
          onClick={handleFitView}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-primary transition cursor-pointer"
          title="Fit to View"
        >
          <FiMaximize className="text-sm" />
        </button>

        <button
          type="button"
          onClick={() => setShowMinimap(!showMinimap)}
          className={`p-1.5 rounded-xl transition cursor-pointer ${
            showMinimap ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
          }`}
          title="Toggle MiniMap"
        >
          <FiMap className="text-sm" />
        </button>

        <div className="h-4 w-px bg-border-primary/50 mx-0.5" />

        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-primary transition cursor-pointer"
          title="Zoom Out"
        >
          <FiMinus className="text-sm" />
        </button>

        <span className="text-xs font-mono font-bold px-1.5 text-text-secondary min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-primary transition cursor-pointer"
          title="Zoom In"
        >
          <FiPlus className="text-sm" />
        </button>
      </div>
    </div>
  );
}
