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
    <div className={`absolute inset-0 z-50 flex items-center justify-center p-4 md:p-8 ${
      "bg-black/90 backdrop-blur-md"
    }`}>
      <div className="flex flex-col md:flex-row w-full max-w-4xl min-h-[550px] bg-[#0A0A0A] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl relative">
        
        {/* Left Side */}
        <div className="hidden md:flex w-full md:w-1/2 p-10 flex-col justify-between relative bg-gradient-to-b from-[#111111] to-[#050505] border-r border-white/5">
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-80 pointer-events-none">
            <img src="/auth.webp" alt="Auth Background" className="w-full h-full object-cover" />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <img src="/mini-logo2.png" alt="Nexora Logo" className="w-7 h-7 object-contain invert" />
            <span className="text-white font-medium text-sm tracking-wide">NEXORA</span>
          </div>

          <div className="relative z-10 mt-auto">
            <h2 className="text-2xl md:text-4xl font-display font-medium text-white mb-4 leading-[1.1] tracking-tigh uppercae">
              Build. Automate.<br />Scale.
            </h2>
            <p className="text-white/50 text-[15px] max-w-xs leading-relaxed">
              A unified platform for AI agents, knowledge, and automation.
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-[#050505] relative z-10">
          <div className="max-w-[340px] mx-auto w-full">
            
            {/* Mobile Logo */}
            <div className="md:hidden flex items-center gap-2 mb-10">
              <img src="/mini-logo2.png" alt="Nexora Logo" className="w-7 h-7 object-contain invert" />
              <span className="text-white font-medium text-sm tracking-wide">NEXORA</span>
            </div>

            <h1 className="text-3xl font-display font-medium text-white mb-2 tracking-tight">
              Welcome
            </h1>
            <p className="text-white/50 text-[15px] mb-8">
              Sign in to continue to your workspace
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-6 text-center">
                {error}
              </div>
            )}

            <div className="mb-8 rounded-xl overflow-hidden shadow-sm">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed. Please try again.")}
                theme="outline"
                size="large"
                text="signin_with"
                width="100%"
                shape="rectangular"
              />
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">OR</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>

            <div className="space-y-4 mb-12">
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

            <p className="text-[11px] text-white/40 leading-relaxed max-w-[280px]">
              By continuing, you agree to our <a href="#" className="text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-2">Terms</a> and <a href="#" className="text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-2">Privacy Policy</a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;