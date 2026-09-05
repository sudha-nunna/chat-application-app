import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layouts/AppLayout";
// import DashboardPage from "./pages/DashboardPage";
// import BotDetailPage from "./pages/BotDetailPage";
// import BotPlaceholderPage from "./pages/BotPlaceholderPage";
import ChatPage from "./pages/ChatPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import UsagePage from "./pages/UsagePage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
// import AdminServerPage from "./pages/AdminServerPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
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
            {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
            {/* <Route path="/bots" element={<BotPlaceholderPage />} /> */}
            {/* <Route path="/bots/:botId" element={<BotDetailPage />} /> */}
            <Route path="/chat" element={<ChatPage />} />
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
