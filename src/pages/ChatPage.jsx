import { useState, useEffect } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import ChatArea from "../components/global/ChatArea";
import { useTheme } from "../context/ThemeContext";

const ChatPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isExplicitNewChat = Boolean(
    location.state?.newChat || location.state?.resetChat
  );
  const rawUrlChatId = searchParams.get("chatId");
  const urlChatId = isExplicitNewChat ? null : rawUrlChatId;

  const [currentChatId, setCurrentChatId] = useState(urlChatId || null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isDark } = useTheme();

  useEffect(() => {
    if (isExplicitNewChat) {
      setCurrentChatId(null);
      // Clean up the transient location.state so it does not perpetually override chatId assignment
      navigate("/chat", { replace: true, state: {} });
    } else {
      setCurrentChatId(rawUrlChatId || null);
    }
  }, [rawUrlChatId, isExplicitNewChat, location.key, navigate]);

  useEffect(() => {
    const handleNewChatAction = () => {
      setCurrentChatId(null);
      navigate("/chat", { replace: true, state: {} });
    };

    window.addEventListener("new-chat-action", handleNewChatAction);
    return () => {
      window.removeEventListener("new-chat-action", handleNewChatAction);
    };
  }, [navigate]);

  const triggerSidebarRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSetCurrentChatId = (newId) => {
    if (newId) {
      navigate(`/chat?chatId=${newId}`, { replace: true, state: {} });
    } else {
      navigate("/chat", { replace: true, state: {} });
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