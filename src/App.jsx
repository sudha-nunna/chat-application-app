import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import BotDetailPage from "./pages/BotDetailPage";
import ChatPage from "./pages/ChatPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
import AdminServerPage from "./pages/AdminServerPage";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <SubscriptionProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bots/:botId" element={<BotDetailPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </AppLayout>
      </SubscriptionProvider>
    </ThemeProvider>
  );
}

export default App;
