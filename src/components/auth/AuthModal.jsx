import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { NobackEndCallObj, setJwt } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";
import { FiMessageSquare, FiZap, FiCode } from "react-icons/fi";
import { Link } from "react-router-dom";

const AuthModal = ({ onAuthSuccess }) => {
  const [error, setError] = useState("");
  const { isDark } = useTheme();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    try {
      const res = await NobackEndCallObj(
        "/auth/google",
        { token: credentialResponse.credential },
        "post",
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-8 bg-black/90 backdrop-blur-md">
      <div className="flex flex-col md:flex-row w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] md:h-auto max-w-4xl sm:rounded-2xl md:rounded-[32px] border-none sm:border border-white/10 bg-[#0c0c0e] overflow-hidden shadow-2xl relative">
        {/* Top Hero Section (Mobile) / Left Side (Desktop) */}
        <div className="relative flex flex-col w-full md:w-1/2 h-[22vh] min-h-[140px] md:h-auto p-6 md:p-10 justify-between bg-gradient-to-b from-[#141418] to-[#0c0c0e] border-none md:border-r border-white/10 overflow-hidden shrink-0">
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0 opacity-60 pointer-events-none">
            <img
              src="/auth.webp"
              alt="Auth Background"
              className="w-full h-full object-cover object-top brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-[#0c0c0e]" />
          </div>

          <Link to="/" className="hidden md:flex relative items-center gap-1">
            <img
              src="/codegene-halo-dark.png"
              alt="Codegene Logo"
              className={`w-14 h-14 object-contain shrink-0 rounded-lg ${isDark ? "mix-blend-plus-lighter" : ""}`}
            />
            <span className="text-white font-['Ethnocentric_Rg','Ethnocentric','Orbitron',sans-serif] font-semibold text-xl tracking-wider mt-1 flex items-center gap-1.5 uppercase">
              CODEGENE<span className="text-accent-primary">-AI</span>
            </span>
          </Link>

          <div className="hidden md:block relative z-10 mt-auto">
            <h2 className="text-base md:text-lg font-['Ethnocentric_Rg','Ethnocentric','Orbitron',sans-serif] font-normal text-white mb-2 leading-snug tracking-wider uppercase opacity-95">
              Analyze. Think. Generate.
            </h2>
            <p className="text-white/60 text-[13.5px] max-w-xs leading-relaxed">
              Your intelligent companion for coding, reasoning, and
              problem-solving.
            </p>
          </div>
        </div>

        {/* Bottom Sheet Card (Mobile) / Right Side (Desktop) */}
        <div className="w-full md:w-1/2 flex-1 flex flex-col justify-between bg-[#0e0e11] relative z-10 rounded-t-[24px] md:rounded-none -mt-4 md:mt-0 p-6 sm:p-8 md:p-10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] md:shadow-none overflow-y-auto custom-scrollbar">
          <div className="max-w-[340px] mx-auto w-full my-auto">
            {/* Logo */}
            <div className="flex md:hidden flex-col items-center justify-center gap-3 mb-4 md:mb-5">
              <img
                src="/codegene-halo-dark.png"
                alt="Codegene Logo"
                className={`w-14 h-14 object-contain rounded-xl shadow-lg ${isDark ? "mix-blend-plus-lighter" : ""}`}
              />
              <span className="text-white font-['Ethnocentric_Rg','Ethnocentric','Orbitron',sans-serif] font-bold text-base tracking-wider uppercase">
                CODEGENE<span className="text-accent-primary">-AI</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1.5 tracking-tight text-center md:text-start">
              Welcome
            </h1>
            <p className="text-white/50 text-[13px] sm:text-[14px] mb-6 md:mb-8 text-center md:text-start">
              Sign in to continue to your workspace
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm p-3 rounded-xl mb-5 text-center">
                {error}
              </div>
            )}

            <div className="mb-6 md:mb-8 rounded-xl overflow-hidden shadow-sm flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError("Google sign-in failed. Please try again.")
                }
                theme="outline"
                size="large"
                text="signin_with"
                width="340"
                shape="rectangular"
                logo_alignment="center"
              />
            </div>

            <div className="space-y-3.5 mb-6 md:mb-8 bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <FiZap className="text-indigo-400 text-xs" />
                </div>
                <span className="text-[12.5px] text-white/70 font-medium">
                  Advanced reasoning and problem-solving
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <FiCode className="text-indigo-400 text-xs" />
                </div>
                <span className="text-[12.5px] text-white/70 font-medium">
                  Generate and analyze code instantly
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <FiMessageSquare className="text-indigo-400 text-xs" />
                </div>
                <span className="text-[12.5px] text-white/70 font-medium">
                  Seamless conversational experience
                </span>
              </div>
            </div>

            <p className="text-[11px] text-white/40 leading-relaxed text-center">
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-2"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-2"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
