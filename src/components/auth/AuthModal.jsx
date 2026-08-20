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
      "bg-interactive-active/40 dark:bg-interactive-base/80"
    }`}>
      <div className={`p-8 rounded-2xl w-96 shadow-2xl border ${
        "bg-white dark:bg-[#111827] border-border-primary text-text-primary dark:text-white"
      }`}>
        <h1 className={`text-3xl mb-2 font-semibold tracking-tight ${"text-text-primary dark:text-white"}`}>
          Welcome
        </h1>
        <p className={`text-sm mb-6 ${"text-text-primary"}`}>
          Continue with Google to access your workspace.
        </p>

        {error && (
          <div className="bg-interactive-base/10 border border-border-primary/20 text-text-primary text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google sign-in failed. Please try again.")}
          theme="outline"
          size="large"
          text="signin_with"
          width="100%"
        />
      </div>
    </div>
  );
};

export default AuthModal;