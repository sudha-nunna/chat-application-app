import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const fetchSubscription = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get("/subscription/me");
      if (res.data?.success && res.data?.subscription) {
        const subData = res.data.subscription;
        setSubscription(subData);

        // First login experience: Show modal once per session if plan is free
        if (subData.plan === "free") {
          const hasShownModal = sessionStorage.getItem("sub_modal_shown_session");
          if (!hasShownModal) {
            setIsUpgradeModalOpen(true);
            sessionStorage.setItem("sub_modal_shown_session", "true");
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch subscription data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const upgradePlan = async (targetPlan, billingCycle = "monthly") => {
    try {
      const res = await api.post("/subscription/upgrade", {
        plan: targetPlan,
        billingCycle,
      });
      if (res.data?.success) {
        await fetchSubscription();
        return { success: true, data: res.data };
      }
      return { success: false, message: res.data?.message || "Upgrade failed" };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Upgrade failed",
      };
    }
  };

  const downgradePlan = async (targetPlan) => {
    try {
      const res = await api.post("/subscription/downgrade", {
        plan: targetPlan,
      });
      if (res.data?.success) {
        await fetchSubscription();
        return { success: true, data: res.data };
      }
      return { success: false, message: res.data?.message || "Downgrade failed" };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Downgrade failed",
      };
    }
  };

  const cancelSubscription = async () => {
    try {
      const res = await api.post("/subscription/cancel");
      if (res.data?.success) {
        await fetchSubscription();
        return { success: true, data: res.data };
      }
      return { success: false, message: res.data?.message || "Cancellation failed" };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Cancellation failed",
      };
    }
  };

  const currentPlan = subscription?.plan || "free";
  const subscriptionStatus = subscription?.status || "active";
  const billingCycle = subscription?.billingCycle || "none";
  const priorityScore = subscription?.priorityScore || 10;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        currentPlan,
        subscriptionStatus,
        billingCycle,
        priorityScore,
        loading,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        refreshSubscription: fetchSubscription,
        upgradePlan,
        downgradePlan,
        cancelSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
