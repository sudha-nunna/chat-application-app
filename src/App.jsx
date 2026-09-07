import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AgentStudioPage from "./pages/AgentStudioPage";
import ChatPage from "./pages/ChatPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import UsagePage from "./pages/UsagePage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
// import AdminServerPage from "./pages/AdminServerPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SharedChatPage from "./pages/SharedChatPage";
import NotFoundPage from "./pages/NotFoundPage";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <SubscriptionProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bots" element={<DashboardPage />} />
            <Route path="/bots/new" element={<AgentStudioPage />} />
            <Route path="/bots/:botId" element={<AgentStudioPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/share/:chatId" element={<SharedChatPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            {/* <Route path="/admin/servers" element={<AdminServerPage />} /> */}
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppLayout>
      </SubscriptionProvider>
    </ThemeProvider>
  );
}

export default App;
