import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
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
        const res = await api.post("/auth/google/callback", {
          code,
          redirectUri,
          state,
        });

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Google callback error", err);
        navigate("/", { replace: true });
      }
    };

    run();
  }, [navigate, searchParams]);

  return (
    <div className={`flex h-screen items-center justify-center ${
      isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      <div className="text-center">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Finishing Google sign-in…</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
