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
                        <div className="w-full max-w-md bg-interactive-active/10 border border-border-primary/20 rounded-2xl p-8 shadow-2xl relative text-center">
                            <div className="w-16 h-16 bg-interactive-base/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-border-primary/20">
                                <span className="text-3xl">✨</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
                                Update Available
                            </h1>
                            <p className="text-text-muted/80 mb-8 leading-relaxed text-sm">
                                A new version of this feature has been deployed. Please reload to continue smoothly.
                            </p>
                            <button
                                onClick={() => window.location.reload(true)}
                                className="w-full px-6 py-4 bg-interactive-base hover:bg-interactive-base text-text-primary dark:text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-black/10/25 uppercase tracking-wider text-xs"
                            >
                                Reload Feature
                            </button>
                        </div>
                    </div>
                );
            }

            // You can render any custom fallback UI
                <div className="flex flex-col items-center justify-center min-h-screen bg-surface-secondary text-text-primary p-6 font-sans">
                    <div className="w-full max-w-lg bg-surface-primary border border-border-primary rounded-2xl p-8 shadow-2xl relative">
                        <h1 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                                ⚠️
                            </span>
                            Application Error
                        </h1>
                        <p className="text-sm text-text-muted mb-6">
                            Something went wrong. We've logged this issue and our team will look into it.
                        </p>
                        <div className="bg-black/5 dark:bg-black/50 border border-border-primary rounded-xl p-4 overflow-auto max-h-48 text-xs text-text-primary mb-6 font-mono">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <button
                            onClick={() => window.location.replace("/")}
                            className="w-full px-4 py-3 bg-accent-primary hover:bg-accent-primary/90 text-white font-bold rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer shadow-sm"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
