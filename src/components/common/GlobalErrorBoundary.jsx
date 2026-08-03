import React from "react";
import { logErrorToBackend } from "../../utils/errorLogger";

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to our backend service
        logErrorToBackend(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const errStr = String(this.state.error?.message || '') + String(this.state.error?.stack || '') + String(this.state.error || '');
            const isSwError = errStr.includes('serviceWorker') ||
                errStr.includes('addEventListener') ||
                errStr.includes('unsupported-browser');

            if (isSwError) {
                console.warn("[GlobalErrorBoundary] Service Worker environment error suppressed:", this.state.error);
                return this.props.children;
            }

            const isChunkError = this.state.error?.name === 'ChunkLoadError' ||
                this.state.error?.message?.includes('Failed to fetch dynamically imported module');

            if (isChunkError) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen bg-black/95 text-white p-6 font-sans">
                        <div className="w-full max-w-md bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-8 shadow-2xl relative text-center">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                                <span className="text-3xl">✨</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
                                Update Available
                            </h1>
                            <p className="text-indigo-200/80 mb-8 leading-relaxed text-sm">
                                A new version of this feature has been deployed. Please reload to continue smoothly.
                            </p>
                            <button
                                onClick={() => window.location.reload(true)}
                                className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 uppercase tracking-wider text-xs"
                            >
                                Reload Feature
                            </button>
                        </div>
                    </div>
                );
            }

            // You can render any custom fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-black/95 text-white p-6 font-mono">
                    <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl relative">
                        <h1 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                ⚠️
                            </span>
                            Application Error
                        </h1>
                        <p className="text-sm text-gray-400 mb-6">
                            Something went wrong. We've logged this issue and our team will look into it.
                        </p>
                        <div className="bg-black/50 border border-[var(--border)] rounded-xl p-4 overflow-auto max-h-48 text-xs text-red-400/80 mb-6 font-mono">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <button
                            onClick={() => window.location.replace("/")}
                            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all uppercase tracking-wider text-xs"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
