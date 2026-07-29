import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import api from "../../services/api";

const AuthModal = ({ onAuthSuccess }) => {
  const [error, setError] = useState("");

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    try {
      const res = await api.post("/auth/google", { token: credentialResponse.credential });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onAuthSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed.");
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] p-8 rounded-2xl w-96 shadow-2xl border border-slate-800">
        <h1 className="text-white text-3xl mb-2 font-semibold tracking-tight">
          Welcome
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Continue with Google to access your workspace.
        </p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google sign-in failed. Please try again.")}
          theme="filled_white"
          size="large"
          text="signin_with"
          width="100%"
        />
      </div>
    </div>
  );
};

export default AuthModal;