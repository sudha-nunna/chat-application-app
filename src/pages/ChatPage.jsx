import { useState, useEffect } from "react";
import Sidebar from "../components/layouts/Sidebar";
import ChatArea from "../components/global/ChatArea";
import AuthModal from "../components/auth/AuthModal";

const ChatPage = () => {
  const [currentChatId, setCurrentChatId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

      {/* Desktop Threads Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          refreshTrigger={refreshTrigger}
          onChatUpdated={triggerSidebarRefresh}
        />
      </div>

      {/* Mobile Threads Sidebar Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10">
            <Sidebar
              currentChatId={currentChatId}
              setCurrentChatId={setCurrentChatId}
              refreshTrigger={refreshTrigger}
              onChatUpdated={triggerSidebarRefresh}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Chat Content Area */}
      <ChatArea 
        currentChatId={currentChatId} 
        setCurrentChatId={setCurrentChatId}
        onChatUpdated={triggerSidebarRefresh}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />
    </div>
  );
};

export default ChatPage;