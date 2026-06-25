import { useState, useEffect } from "react";
import Sidebar from "../components/layouts/Sidebar";
import ChatArea from "../components/global/ChatArea";
import AuthModal from "../components/auth/AuthModal";

const ChatPage = () => {
  const [currentChatId, setCurrentChatId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [refreshTrigger]);

  const triggerSidebarRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-[#0f172a] w-screen overflow-hidden relative">
      {/* If unauthorized, obscure layout elements with AuthModal container */}
      {!isAuthenticated && (
        <AuthModal onAuthSuccess={triggerSidebarRefresh} />
      )}

      <Sidebar
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        refreshTrigger={refreshTrigger}
        onChatUpdated={triggerSidebarRefresh}
      />
      <ChatArea 
        currentChatId={currentChatId} 
        setCurrentChatId={setCurrentChatId}
        onChatUpdated={triggerSidebarRefresh}
      />
    </div>
  );
};

export default ChatPage;