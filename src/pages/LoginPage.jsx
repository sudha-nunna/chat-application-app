import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // If this component is rendered, it means the user is authenticated 
    // because AppLayout blocks unauthenticated access.
    // So we redirect them to the chat page.
    navigate("/chat", { replace: true });
  }, [navigate]);

  return null;
}
