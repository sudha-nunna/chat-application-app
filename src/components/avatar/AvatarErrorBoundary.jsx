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
        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-6 bg-interactive-base text-text-muted rounded-2xl border border-border-primary text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-interactive-base/20 text-text-primary flex items-center justify-center text-xl">
            <FiAlertTriangle />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-muted">Avatar Rendering Unavailable</h4>
            <p className="text-[11px] text-text-primary max-w-xs mt-1">
              3D WebGL context or asset loading issue. Falling back safely.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-interactive-active hover:bg-interactive-base text-text-muted text-xs transition"
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
