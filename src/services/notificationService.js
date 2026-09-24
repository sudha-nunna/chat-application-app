import api from "./api";

export const getNotifications = async ({ page = 1, limit = 20, unreadOnly = false } = {}) => {
  const res = await api.get("/api/v1/notifications", {
    params: { page, limit, unreadOnly },
  });
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await api.get("/api/v1/notifications/unread-count");
  return res.data;
};

export const markAsRead = async (idOrIds) => {
  const id = Array.isArray(idOrIds) ? idOrIds[0] : idOrIds;
  const res = await api.patch(`/api/v1/notifications/${id}/read`, { notificationIds: Array.isArray(idOrIds) ? idOrIds : [idOrIds] });
  return res.data;
};

export const markAllAsRead = async () => {
  const res = await api.patch("/api/v1/notifications/read-all");
  return res.data;
};

export const getPreferences = async () => {
  const res = await api.get("/api/v1/notifications/preferences");
  return res.data;
};

export const updatePreferences = async (preferencesData) => {
  const res = await api.put("/api/v1/notifications/preferences", preferencesData);
  return res.data;
};

export const getSchedules = async () => {
  const res = await api.get("/api/v1/notifications/schedules");
  return res.data;
};

export const createSchedule = async (scheduleData) => {
  const res = await api.post("/api/v1/notifications/schedules", scheduleData);
  return res.data;
};

export const updateSchedule = async (id, scheduleData) => {
  const res = await api.put(`/api/v1/notifications/schedules/${id}`, scheduleData);
  return res.data;
};

export const deleteSchedule = async (id) => {
  const res = await api.delete(`/api/v1/notifications/schedules/${id}`);
  return res.data;
};
