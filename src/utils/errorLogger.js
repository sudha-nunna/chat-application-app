/**
 * Utility for logging frontend errors to backend monitoring services.
 */
export const logErrorToBackend = (error, errorInfo = {}) => {
  console.error('[GlobalErrorBoundary] Caught exception:', error, errorInfo);
  
  // Future backend error logging endpoint can be called here if configured
  // e.g., axios.post('/api/logs/error', { error: String(error), stack: errorInfo.componentStack });
};
