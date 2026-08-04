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
            ? isDark
              ? "bg-slate-800/80 text-slate-300 border-slate-700/80 animate-pulse"
              : "bg-slate-100 text-slate-600 border-slate-200 animate-pulse"
            : hasNodes && healthyCount > 0
            ? isDark
              ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/50"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : isDark
            ? "bg-rose-950/40 text-rose-400 border-rose-800/60 hover:bg-rose-900/50"
            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
        }`}
        title="View AI Cluster Node Diagnostics"
      >
        {showLoading ? (
          <>
            <FiRefreshCw className="text-xs animate-spin text-blue-400" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  healthyCount > 0 ? "bg-emerald-400" : "bg-rose-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  healthyCount > 0 ? "bg-emerald-500" : "bg-rose-500"
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
            isDark ? "bg-slate-900/95 border-slate-800 text-slate-200" : "bg-white/95 border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <FiCpu className="text-emerald-500 text-sm" />
              <h4 className="font-bold text-xs tracking-tight">AI Cluster Status ({clusterNodes.length} Nodes)</h4>
            </div>
            <button
              onClick={() => setShowStatusModal(false)}
              className={`p-1 rounded-md transition ${
                isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
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
                    isDark ? "bg-slate-950/70 border-slate-800/80" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-xs capitalize ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {node.name || `Node ${idx + 1}`}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isHealthy
                          ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                          : isRateLimited
                          ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                          : "text-rose-400 bg-rose-500/10 border-rose-500/20"
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

                  <div className={`text-[11px] space-y-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    <p>
                      • Model:{" "}
                      <span className={`font-mono text-[10px] font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {node.defaultModel || "llama3.2:3b"}
                      </span>
                    </p>
                    <p>
                      • Active Requests:{" "}
                      <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                        {node.activeRequests || 0} load
                      </span>
                    </p>
                    {latencyMs > 0 && (
                      <p>
                        • Response Time:{" "}
                        <span className="font-mono text-[10px] text-emerald-400">{latencyMs} ms</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`mt-3 pt-2 border-t text-[10px] flex items-center gap-1.5 ${
              isDark ? "border-slate-800/80 text-slate-400" : "border-slate-200 text-slate-500"
            }`}
          >
            <FiActivity className="text-blue-500 shrink-0" />
            <span>Smart Load Balancer automatically routes requests to active nodes.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusterStatusWidget;
