import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If this component is rendered, it means the user is authenticated 
    // because AppLayout blocks unauthenticated access with AuthModal.
    // Check if there is a redirect URL requested (e.g. /share/:chatId)
    const searchParams = new URLSearchParams(window.location.search || location.search);
    const redirectUrl = searchParams.get("redirect") || "/chat";
    navigate(redirectUrl, { replace: true });
  }, [navigate, location]);

  return null;
}

