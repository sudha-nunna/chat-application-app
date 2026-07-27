import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiMessageSquare,
  FiPlus,
  FiCpu,
  FiSun,
  FiMoon,
  FiLogOut,
  FiUser,
  FiChevronRight,
  FiSearch
} from "react-icons/fi";
import api from "../../services/api";
import CreateBotModal from "../bots/CreateBotModal";
import AuthModal from "../auth/AuthModal";

const AppLayout = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bots, setBots] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);

    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }

    if (token) {
      fetchBots();
    }
  }, [location.pathname]);

  const fetchBots = async () => {
    try {
      const res = await api.get("/bots");
      setBots(res.data || []);
    } catch (err) {
      console.error("Failed to load bots:", err);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const handleBotCreated = (newBot) => {
    fetchBots();
    navigate(`/bots/${newBot._id}`);
  };

  const filteredBots = bots.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isDark = theme === "dark";

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      {!isAuthenticated && (
        <AuthModal onAuthSuccess={() => setIsAuthenticated(true)} />
      )}

      {/* STRICT FIXED-WIDTH SAAS SIDEBAR (320px - NEVER SHRINKS OR GROWS) */}
      <aside className={`w-80 shrink-0 min-w-[320px] max-w-[320px] flex flex-col justify-between border-r ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"} h-full z-20 select-none`}>
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-800/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              <FiCpu className="text-xl" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">Allvion Platform</h1>
              <p className="text-[11px] text-slate-400 font-medium">Multi-Tenant AI Agents</p>
            </div>
          </div>

          {/* Nav Items */}
          <div className="p-3 space-y-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                location.pathname === "/dashboard" || location.pathname === "/"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : isDark ? "text-slate-400 hover:bg-slate-900 hover:text-slate-200" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <FiGrid className="text-base" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/chat"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                location.pathname === "/chat"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : isDark ? "text-slate-400 hover:bg-slate-900 hover:text-slate-200" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <FiMessageSquare className="text-base" />
              <span>General Chat</span>
            </Link>
          </div>

          {/* "+ Create Bot" Button */}
          <div className="px-3 py-1.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 px-3 rounded-lg shadow-lg shadow-blue-500/20 transition active:scale-[0.98]"
            >
              <FiPlus className="text-sm" />
              <span>Create Bot</span>
            </button>
          </div>

          {/* Bot Search Filter */}
          <div className="px-3 py-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 text-slate-500 text-xs" />
              <input
                type="text"
                placeholder="Search AI agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* MY BOTS LIST */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 custom-scrollbar">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex justify-between items-center">
              <span>My AI Agents ({filteredBots.length})</span>
            </div>

            {filteredBots.length === 0 ? (
              <div className={`p-3 rounded-lg text-[11px] text-center border border-dashed ${isDark ? "border-slate-800 text-slate-400" : "border-slate-300 text-slate-500"}`}>
                {searchQuery ? "No matching bots found." : "No bots created yet."}
              </div>
            ) : (
              filteredBots.map((bot) => {
                const isActive = location.pathname === `/bots/${bot._id}`;
                return (
                  <Link
                    key={bot._id}
                    to={`/bots/${bot._id}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition font-medium group ${
                      isActive
                        ? "bg-slate-800 text-white font-semibold border-l-4 border-blue-500 shadow"
                        : isDark
                        ? "text-slate-300 hover:bg-slate-900"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-2 h-2 rounded-full ${isActive ? "bg-blue-400" : "bg-emerald-400"}`} />
                      <span className="truncate">{bot.name}</span>
                    </div>
                    <FiChevronRight className={`text-xs opacity-0 group-hover:opacity-100 transition ${isActive ? "opacity-100 text-blue-400" : "text-slate-400"}`} />
                  </Link>
                );
              })
            )}
          </div>

        </div>

        {/* User Footer */}
        <div className={`p-3 border-t ${isDark ? "border-slate-800/80 bg-slate-950" : "border-slate-200 bg-slate-100"} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser />}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold truncate">{user?.name || "Member"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || "user@allvion.io"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg text-sm transition ${isDark ? "text-slate-400 hover:bg-slate-800 hover:text-amber-300" : "text-slate-600 hover:bg-slate-200 hover:text-amber-600"}`}
              title="Toggle Dark / Light Theme"
            >
              {isDark ? <FiSun /> : <FiMoon />}
            </button>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg text-sm transition ${isDark ? "text-slate-400 hover:bg-rose-950/60 hover:text-rose-400" : "text-slate-600 hover:bg-rose-100 hover:text-rose-600"}`}
              title="Logout"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative">
        {children}
      </main>

      {/* CREATE BOT MODAL WIZARD */}
      {isCreateModalOpen && (
        <CreateBotModal
          onClose={() => setIsCreateModalOpen(false)}
          onBotCreated={handleBotCreated}
        />
      )}
    </div>
  );
};

export default AppLayout;
