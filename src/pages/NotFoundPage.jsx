import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center h-full w-full px-6 text-center bg-transparent">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-7xl font-light tracking-tighter text-text-primary">404</h1>
        <div className="w-8 h-1 bg-accent-primary mx-auto rounded-full opacity-80"></div>
        <h2 className="text-xl font-medium tracking-tight text-text-primary">Page not found</h2>
        <p className="text-[14px] leading-relaxed text-text-primary/60">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        
        <div className="pt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 bg-surface-secondary hover:bg-surface-dropdown text-text-primary border border-border-primary/50"
          >
            <FiArrowLeft className="text-base" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
