import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

const GoogleCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
        <p className="text-sm text-slate-400">Finishing Google sign-in…</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
