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
    <div className="flex flex-1 h-full w-full overflow-hidden relative">
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