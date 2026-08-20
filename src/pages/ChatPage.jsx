import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ChatArea from "../components/global/ChatArea";
import AuthModal from "../components/auth/AuthModal";
import { useTheme } from "../context/ThemeContext";

const ChatPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChatId = searchParams.get("chatId");

  const [currentChatId, setCurrentChatId] = useState(urlChatId || null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    setCurrentChatId(urlChatId || null);
  }, [urlChatId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [refreshTrigger]);

  const triggerSidebarRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSetCurrentChatId = (newId) => {
    if (newId) {
      setSearchParams({ chatId: newId });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className={`flex flex-1 h-full w-full overflow-hidden relative ${
      "bg-transparent text-text-primary"
    }`}>
      {!isAuthenticated && (
        <AuthModal onAuthSuccess={triggerSidebarRefresh} />
      )}

      {/* Chat Content Area ONLY - Inner sidebar is now unified in AppLayout */}
      <ChatArea 
        currentChatId={currentChatId} 
        setCurrentChatId={handleSetCurrentChatId}
        onChatUpdated={triggerSidebarRefresh}
      />
    </div>
  );
};

export default ChatPage;