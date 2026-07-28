import { useState, useEffect } from "react";
import { fetchAllPlans } from "../services/planService";

export const usePlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllPlans();
      if (data?.success && data?.plans) {
        setPlans(data.plans);
      } else {
        setError("Failed to load plans");
      }
    } catch (err) {
      console.error("Error in usePlans hook:", err);
      setError(err.response?.data?.message || "Failed to connect to plans API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    refreshPlans: loadPlans,
  };
};
