import { createContext, useContext, useState, useEffect } from "react";
import { NobackEndCall, NobackEndCallObj } from "../services/authService";

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

  const fetchSubscription = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await NobackEndCall("/subscription/me");
      if (res?.success && res?.subscription) {
        const subData = res.subscription;
        setSubscription(subData);
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
      const res = await NobackEndCallObj("/subscription/upgrade", {
        plan: targetPlan,
        billingCycle,
      }, "post");
      if (res?.success) {
        await fetchSubscription();
        return { success: true, data: res };
      }
      return { success: false, message: res?.message || "Upgrade failed" };
    } catch (err) {
      return {
        success: false,
        message: err?.error || err?.message || "Upgrade failed",
      };
    }
  };

  const downgradePlan = async (targetPlan) => {
    try {
      const res = await NobackEndCallObj("/subscription/downgrade", {
        plan: targetPlan,
      }, "post");
      if (res?.success) {
        await fetchSubscription();
        return { success: true, data: res };
      }
      return { success: false, message: res?.message || "Downgrade failed" };
    } catch (err) {
      return {
        success: false,
        message: err?.error || err?.message || "Downgrade failed",
      };
    }
  };

  const cancelSubscription = async () => {
    try {
      const res = await NobackEndCallObj("/subscription/cancel", {}, "post");
      if (res?.success) {
        await fetchSubscription();
        return { success: true, data: res };
      }
      return { success: false, message: res?.message || "Cancellation failed" };
    } catch (err) {
      return {
        success: false,
        message: err?.error || err?.message || "Cancellation failed",
      };
    }
  };

  const currentPlan = subscription?.plan || "free";
  const subscriptionStatus = subscription?.status || "active";
  const billingCycle = subscription?.billingCycle || "none";
  const priorityScore = subscription?.priorityScore || 10;

  const handleSetIsUpgradeModalOpen = (val) => {
    const isOpen = typeof val === "function" ? val(isUpgradeModalOpen) : val;
    if (isOpen) setIsCreditsModalOpen(false);
    setIsUpgradeModalOpen(isOpen);
  };

  const handleSetIsCreditsModalOpen = (val) => {
    const isOpen = typeof val === "function" ? val(isCreditsModalOpen) : val;
    if (isOpen) setIsUpgradeModalOpen(false);
    setIsCreditsModalOpen(isOpen);
  };

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
        setIsUpgradeModalOpen: handleSetIsUpgradeModalOpen,
        isCreditsModalOpen,
        setIsCreditsModalOpen: handleSetIsCreditsModalOpen,
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
