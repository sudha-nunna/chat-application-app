import { useState, useRef, useEffect } from "react";
import { FiServer, FiCpu, FiX, FiCheckCircle, FiXCircle, FiActivity, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

const ClusterStatusWidget = ({ clusterNodes = [], isDark = false, isLoading = false }) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowStatusModal(false);
      }
    };
    if (showStatusModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusModal]);

  const healthyCount = clusterNodes.filter(
    (n) => n.status && (n.status === "ACTIVE" || n.status.startsWith("HEALTHY"))
  ).length;
  const hasNodes = clusterNodes.length > 0;
  const showLoading = isLoading || (!hasNodes && clusterNodes.length === 0);

  return (
    <div className="relative inline-block" ref={modalRef}>
      {/* Cluster Health Pill Badge */}
      <button
        onClick={() => setShowStatusModal(!showStatusModal)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition shadow-xs cursor-pointer active:scale-95 ${
          showLoading
            ? "bg-surface-secondary text-text-primary border-border-primary animate-pulse dark:bg-interactive-active/80 dark:text-text-muted dark:border-border-primary/80 dark:animate-pulse"
            : hasNodes && healthyCount > 0
            ? "bg-interactive-base text-text-primary border-border-primary hover:bg-surface-secondary dark:bg-interactive-base/40 dark:text-text-primary dark:border-border-primary/60 dark:hover:bg-interactive-active/50"
            : "bg-interactive-base text-text-primary border-border-primary hover:bg-surface-secondary dark:bg-interactive-base/40 dark:text-text-primary dark:border-border-primary/60 dark:hover:bg-interactive-active/50"
        }`}
        title="View AI Cluster Node Diagnostics"
      >
        {showLoading ? (
          <>
            <FiRefreshCw className="text-xs animate-spin text-text-primary" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  healthyCount > 0 ? "bg-interactive-base" : "bg-interactive-base"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  healthyCount > 0 ? "bg-interactive-base" : "bg-interactive-base"
                }`}
              ></span>
            </span>
            <FiServer className="text-xs" />
            <span>{hasNodes ? `${healthyCount}/${clusterNodes.length} Online` : "Offline"}</span>
          </>
        )}
      </button>

      {/* Detailed Node Cluster Popover Modal */}
      {showStatusModal && (
        <div
          className={`absolute right-0 top-11 z-50 w-76 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150 ${
            "bg-white/95 dark:bg-interactive-active/95 border-border-primary text-text-primary dark:text-text-muted"
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border-primary dark:border-border-primary">
            <div className="flex items-center gap-1.5">
              <FiCpu className="text-text-primary text-sm" />
              <h4 className="font-bold text-xs tracking-tight">AI Cluster Status ({clusterNodes.length} Nodes)</h4>
            </div>
            <button
              onClick={() => setShowStatusModal(false)}
              className={`p-1 rounded-md transition ${
                "text-text-primary hover:text-text-primary hover:bg-surface-secondary dark:text-text-primary dark:hover:text-text-muted dark:hover:bg-interactive-active"
              }`}
              title="Close popup"
            >
              <FiX className="text-sm" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
            {clusterNodes.map((node, idx) => {
              const isHealthy = node.status && (node.status === "ACTIVE" || node.status.startsWith("HEALTHY"));
              const isRateLimited = node.status === "RATE_LIMITED";
              const latencyMs = node.lastLatencyMs || node.latency || 0;

              return (
                <div
                  key={node.id || node._id || idx}
                  className={`border rounded-lg p-2.5 ${
                    "bg-interactive-base dark:bg-interactive-base/70 border-border-primary dark:border-border-primary/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-xs capitalize ${"text-text-primary dark:text-text-muted"}`}>
                      {node.name || `Node ${idx + 1}`}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isHealthy
                          ? "text-text-primary bg-interactive-base/10 border-border-primary/20"
                          : isRateLimited
                          ? "text-amber-800 bg-amber-900/10 border-amber-800/20"
                          : "text-text-primary bg-interactive-base/10 border-border-primary/20"
                      }`}
                    >
                      {isHealthy ? (
                        <FiCheckCircle className="text-[10px]" />
                      ) : isRateLimited ? (
                        <FiAlertTriangle className="text-[10px]" />
                      ) : (
                        <FiXCircle className="text-[10px]" />
                      )}
                      {isHealthy
                        ? "ACTIVE / ONLINE"
                        : isRateLimited
                        ? "RATE LIMITED"
                        : "INACTIVE / OFFLINE"}
                    </span>
                  </div>

                  <div className={`text-[11px] space-y-0.5 ${"text-text-primary"}`}>
                    <p>
                      • Model:{" "}
                      <span className={`font-mono text-[10px] font-semibold ${"text-text-primary dark:text-text-muted"}`}>
                        {node.defaultModel || "llama3.2:3b"}
                      </span>
                    </p>
                    <p>
                      • Active Requests:{" "}
                      <span className={`font-semibold ${"text-text-primary dark:text-text-muted"}`}>
                        {node.activeRequests || 0} load
                      </span>
                    </p>
                    {latencyMs > 0 && (
                      <p>
                        • Response Time:{" "}
                        <span className="font-mono text-[10px] text-text-primary">{latencyMs} ms</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`mt-3 pt-2 border-t text-[10px] flex items-center gap-1.5 ${
              "border-border-primary dark:border-border-primary/80 text-text-primary"
            }`}
          >
            <FiActivity className="text-text-primary shrink-0" />
            <span>Smart Load Balancer automatically routes requests to active nodes.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusterStatusWidget;
