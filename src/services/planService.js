import api from "./api";

/**
 * Service to fetch subscription plan definitions from the backend database.
 */
export const fetchAllPlans = async () => {
  const response = await api.get("/plans");
  return response.data;
};

export const fetchPlanByKey = async (planKey) => {
  const response = await api.get(`/plans/${planKey}`);
  return response.data;
};
