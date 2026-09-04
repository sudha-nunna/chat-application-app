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

  useEffect(() => {
    const handleNewChatAction = () => {
      setCurrentChatId(null);
      setSearchParams({}, { replace: true });
    };

    window.addEventListener("new-chat-action", handleNewChatAction);
    return () => {
      window.removeEventListener("new-chat-action", handleNewChatAction);
    };
  }, [setSearchParams]);

  const triggerSidebarRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSetCurrentChatId = (newId) => {
    if (newId) {
      setSearchParams({ chatId: newId });
    } else {
      setSearchParams({});
    }
    setCurrentChatId(newId || null);
  };

  return (
    <div
      className={`flex flex-1 h-full w-full overflow-hidden relative bg-transparent text-text-primary`}
    >
      <ChatArea
        currentChatId={currentChatId}
        setCurrentChatId={handleSetCurrentChatId}
        onChatUpdated={triggerSidebarRefresh}
      />
    </div>
  );
};

export default ChatPage;