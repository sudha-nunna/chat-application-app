import React from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

/**
 * AvatarErrorBoundary.jsx
 * Catches WebGL or 3D loader failures gracefully and provides a fallback UI.
 */
export class AvatarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AvatarErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-300 rounded-2xl border border-slate-800 text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl">
            <FiAlertTriangle />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">Avatar Rendering Unavailable</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mt-1">
              3D WebGL context or asset loading issue. Falling back safely.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
          >
            <FiRefreshCw className="text-xs" />
            <span>Retry Render</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AvatarErrorBoundary;
