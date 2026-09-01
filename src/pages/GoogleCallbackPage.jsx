import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NobackEndCallObj, setJwt } from "../services/authService";
import { useTheme } from "../context/ThemeContext";

const GoogleCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const redirectUri = window.location.origin + "/auth/google/callback";

      if (!code) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const res = await NobackEndCallObj("/auth/google/callback", {
          code,
          redirectUri,
          state,
        }, "post");

        const token = res?.token || res?.data?.token;
        const user = res?.user || res?.data?.user;

        if (token) setJwt(token);
        if (user) localStorage.setItem("user", JSON.stringify(user));

        navigate("/chat", { replace: true });
      } catch (err) {
        console.error("Google callback error", err);
        navigate("/", { replace: true });
      }
    };

    run();
  }, [navigate, searchParams]);

  return (
    <div className={`flex h-screen items-center justify-center ${
      isDark ? "bg-interactive-base text-text-primary dark:text-white" : "bg-interactive-base text-text-primary"
    }`}>
      <div className="text-center">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-border-primary border-t-transparent mx-auto" />
        <p className={`text-sm ${isDark ? "text-text-primary" : "text-text-primary"}`}>Finishing Google sign-in…</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
