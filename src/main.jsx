import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router } from 'react-router-dom'
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary.jsx'
import './index.css'
import App from './App.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '460905392018-201u8giam535u640vc0stp0upoij2d07.apps.googleusercontent.com'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute — data is fresh, don't refetch unless asked
      gcTime: 5 * 60 * 1000,       // 5 minutes — keep in memory
      refetchOnWindowFocus: false, // CRITICAL: prevents /auth/me firing on dialog close
      refetchOnReconnect: false,   // prevent reconnect storms
      retry: 1,                    // one retry on failure is enough
    },
  },
});

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </Router>
    </GoogleOAuthProvider>
  </QueryClientProvider>
)
