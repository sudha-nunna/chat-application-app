import { useState } from "react";
import api from "../../services/api";

const AuthModal = ({ onAuthSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLoginView) {
        const res = await api.post("/auth/login", { email: form.email, password: form.password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onAuthSuccess();
      } else {
        await api.post("/auth/register", form);
        setIsLoginView(true);
        setSuccess("Registration successful! Please sign in.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Authentication runtime execution challenge encountered.");
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] p-8 rounded-2xl w-96 shadow-2xl border border-slate-800">
        <h1 className="text-white text-3xl mb-2 font-semibold tracking-tight">
          {isLoginView ? "Welcome Back" : "Get Started"}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          {isLoginView ? "Sign in to activate chat sessions" : "Create an account to start sessions"}
        </p>

        {/* Error Alert Display Block (Red Theme) */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {/* Success Alert Display Block (Green Theme) */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg mb-4 text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginView && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="John Doe"
                className="w-full p-3 rounded bg-[#1f2937] text-white outline-none border border-slate-700 focus:border-blue-500 transition text-sm"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@domain.com"
              className="w-full p-3 rounded bg-[#1f2937] text-white outline-none border border-slate-700 focus:border-blue-500 transition text-sm"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full p-3 rounded bg-[#1f2937] text-white outline-none border border-slate-700 focus:border-blue-500 transition text-sm"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 transition p-3.5 rounded-xl text-white font-medium mt-4 shadow-lg">
            {isLoginView ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button 
            onClick={() => { setIsLoginView(!isLoginView); setError("");setSuccess(""); }}
            className="text-sm text-blue-400 hover:underline font-medium bg-transparent border-none outline-none cursor-pointer"
          >
            {isLoginView ? "Don't have an account? Create Account" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;