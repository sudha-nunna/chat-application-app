import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ChatArea from "../components/global/ChatArea";
import { useTheme } from "../context/ThemeContext";

const ChatPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChatId = searchParams.get("chatId");

  const [currentChatId, setCurrentChatId] = useState(urlChatId || null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isDark } = useTheme();

  useEffect(() => {
    setCurrentChatId(urlChatId || null);
  }, [urlChatId]);

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