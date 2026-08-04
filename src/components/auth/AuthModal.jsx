import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { NobackEndCallObj, setJwt } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";

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
    <div className={`absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
      isDark ? "bg-slate-950/80" : "bg-slate-900/40"
    }`}>
      <div className={`p-8 rounded-2xl w-96 shadow-2xl border ${
        isDark ? "bg-[#111827] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <h1 className={`text-3xl mb-2 font-semibold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
          Welcome
        </h1>
        <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Continue with Google to access your workspace.
        </p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google sign-in failed. Please try again.")}
          theme={isDark ? "filled_black" : "outline"}
          size="large"
          text="signin_with"
          width="100%"
        />
      </div>
    </div>
  );
};

export default AuthModal;