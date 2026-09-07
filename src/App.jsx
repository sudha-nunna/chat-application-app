import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AgentHomePage from "./pages/AgentHomePage";
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

import AgentFeaturePlaceholder from "./components/common/AgentFeaturePlaceholder";

function App() {
  return (
    <ThemeProvider>
      <SubscriptionProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<AgentHomePage />} />
            <Route path="/home" element={<AgentHomePage />} />
            <Route path="/agents" element={<DashboardPage />} />
            <Route path="/agents/new" element={<AgentStudioPage />} />
            <Route path="/agents/:botId" element={<AgentStudioPage />} />
            <Route path="/bots" element={<DashboardPage />} />
            <Route path="/bots/new" element={<AgentStudioPage />} />
            <Route path="/bots/:botId" element={<AgentStudioPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/share/:chatId" element={<SharedChatPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            {/* Agent Studio Sub-pages */}
            <Route path="/knowledge-base" element={<AgentFeaturePlaceholder />} />
            <Route path="/phone-numbers" element={<AgentFeaturePlaceholder />} />
            <Route path="/batch-call" element={<AgentFeaturePlaceholder />} />
            <Route path="/call-history" element={<AgentFeaturePlaceholder />} />
            <Route path="/contacts" element={<AgentFeaturePlaceholder />} />
            <Route path="/analytics" element={<AgentFeaturePlaceholder />} />
            <Route path="/live-monitoring" element={<AgentFeaturePlaceholder />} />
            <Route path="/ai-qa" element={<AgentFeaturePlaceholder />} />
            <Route path="/alerting" element={<AgentFeaturePlaceholder />} />
            <Route path="/integrations" element={<AgentFeaturePlaceholder />} />
            <Route path="/settings" element={<AgentFeaturePlaceholder />} />
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
