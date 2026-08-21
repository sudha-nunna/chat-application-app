import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { NobackEndCallObj, setJwt } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import { FiCpu, FiDatabase, FiMessageSquare } from "react-icons/fi";

const AuthModal = ({ onAuthSuccess }) => {
  const [error, setError] = useState("");
  const { isDark } = useTheme();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    try {
      const res = await NobackEndCallObj("/auth/google", { token: credentialResponse.credential }, "post");
      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (token) {
        setJwt(token);
      }
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-change"));
      }
      onAuthSuccess();
    } catch (err) {
      setError(err?.error || err?.message || "Google sign-in failed.");
    }
  };

  return (
    <div className={`absolute inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-8 ${
      "bg-[#111111] md:bg-black/90 md:backdrop-blur-md"
    }`}>
      <div className="flex flex-col md:flex-row w-full h-full md:h-auto max-w-4xl md:min-h-[500px] bg-transparent md:bg-[#0A0A0A] rounded-none md:rounded-[32px] md:border border-white/[0.01] overflow-hidden md:shadow-2xl relative">
        
        {/* Top Image (Mobile) / Left Side (Desktop) */}
        <div className="flex md:flex-col w-full md:w-1/2 h-[45%] md:h-auto p-8 md:p-10 justify-between relative bg-gradient-to-b from-[#111111] to-[#050505] border-none md:border-r border-white/5 overflow-hidden">
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-80 md:pointer-events-none">
            <img src="/auth.webp" alt="Auth Background" className="w-full h-full object-cover object-top brightness-80" />
          </div>

          <div className="hidden md:flex relative z-10 items-center gap-1">
            <img src="/mini-logo2.png" alt="Nexora Logo" className={`w-9 h-9 object-contain shrink-0 ${isDark? "invert": ""}`}/>
            <span className="text-white font-medium text-sm tracking-wide">NEXORA</span>
          </div>

          <div className="hidden md:block relative z-10 mt-auto">
            <h2 className="text-2xl md:text-4xl font-display font-medium text-white mb-4 leading-[1.1] tracking-tight">
              Build. Automate.<br />Scale.
            </h2>
            <p className="text-white/50 text-[15px] max-w-xs leading-relaxed">
              A unified platform for AI agents, knowledge, and automation.
            </p>
          </div>
        </div>

        {/* Bottom Card (Mobile) / Right Side (Desktop) */}
        <div className="w-full md:w-1/2 h-[75%] md:h-auto flex flex-col justify-start md:justify-center bg-[#121212] relative z-10 rounded-t-[32px] md:rounded-none -mt-8 md:mt-0 p-8 shadow-[0_-15px_40px_rgba(0,0,0,0.5)] md:shadow-none overflow-y-auto">
          <div className="max-w-[340px] mx-auto w-full pt-2 md:pt-0">
            
            {/* Mobile Logo */}
            <div className="md:hidden flex flex-col items-center justify-center gap-2 mb-3">
              <img src="/mini-logo2.png" alt="Nexora Logo" className="w-12 h-12 object-contain invert" />
            </div>

            <h1 className="text-2xl md:text-3xl font-display font-medium text-white mb-2 tracking-tight text-center md:text-left">
              Welcome
            </h1>
            <p className="text-white/50 text-[14px] md:text-[15px] mb-5 text-center md:text-left">
              Sign in to continue to your workspace
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-6 text-center">
                {error}
              </div>
            )}

            <div className="mb-5 rounded-xl overflow-hidden shadow-sm flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed. Please try again.")}
                theme="outline"
                size="large"
                text="signin_with"
                width="340"
                shape="rectangular"
                logo_alignment="center"
              />
            </div>

            <div className="flex items-center gap-4 mb-5">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">OR</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>

            <div className="space-y-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-5 flex justify-center"><FiCpu className="text-purple-400/80 text-sm" /></div>
                <span className="text-[13px] text-white/60">Deploy autonomous AI agents instantly</span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-5 flex justify-center"><FiDatabase className="text-purple-400/80 text-sm" /></div>
                <span className="text-[13px] text-white/60">Connect your custom knowledge base</span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-5 flex justify-center"><FiMessageSquare className="text-purple-400/80 text-sm" /></div>
                <span className="text-[13px] text-white/60">Automate multi-step workflows & chats</span>
              </div>
            </div>

            {/* Terms and conditions commented out on mobile, visible on desktop */}
            <div className="hidden md:block">
              <p className="text-[11px] text-white/40 leading-relaxed max-w-[280px] mt-10 text-center md:text-left mx-auto md:mx-0">
                By continuing, you agree to our <a href="#" className="text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-2">Terms</a> and <a href="#" className="text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-2">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;