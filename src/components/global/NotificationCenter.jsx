import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  FiBell,
  FiX,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiRefreshCw,
  FiZap,
  FiSliders,
  FiAlertCircle,
  FiGlobe,
  FiSearch,
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiRepeat,
} from "react-icons/fi";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../../services/notificationService";

const TIMEZONES_LIST = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (GMT+05:30)", keywords: "india ist kolkata calcutta" },
  { value: "Asia/Calcutta", label: "Asia/Calcutta (GMT+05:30)", keywords: "india ist calcutta kolkata" },
  { value: "UTC", label: "UTC (GMT+00:00)", keywords: "utc gmt universal london" },
  { value: "America/New_York", label: "America/New_York (GMT-05:00)", keywords: "est edt new york america" },
  { value: "America/Chicago", label: "America/Chicago (GMT-06:00)", keywords: "cst cdt chicago america" },
  { value: "America/Denver", label: "America/Denver (GMT-07:00)", keywords: "mst mdt denver america" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (GMT-08:00)", keywords: "pst pdt los angeles america san francisco" },
  { value: "Europe/London", label: "Europe/London (GMT+00:00)", keywords: "gmt bst london europe uk" },
  { value: "Europe/Paris", label: "Europe/Paris (GMT+01:00)", keywords: "cet cest paris berlin europe" },
  { value: "Europe/Moscow", label: "Europe/Moscow (GMT+03:00)", keywords: "msk moscow russia" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GMT+04:00)", keywords: "gst dubai uae" },
  { value: "Asia/Singapore", label: "Asia/Singapore (GMT+08:00)", keywords: "sgt singapore asia" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+09:00)", keywords: "jst tokyo japan" },
  { value: "Australia/Sydney", label: "Australia/Sydney (GMT+11:00)", keywords: "aest aedt sydney australia" },
];

const TOPIC_SUGGESTIONS = [
  { label: "📈 Gold Rate Updates", query: "Gold Rate Updates" },
  { label: "⚡ Bitcoin Price & Market", query: "Bitcoin Price & Market" },
  { label: "🤖 OpenAI Product Releases", query: "OpenAI Product Releases" },
  { label: "📰 Latest AI Industry News", query: "Latest AI Industry News" },
  { label: "💼 NIFTY 50 Market Analysis", query: "NIFTY 50 Market Analysis" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CUSTOM_UNITS = ["Minutes", "Hours", "Days", "Weeks", "Months"];

// Format "08:30" 24h into "08:30 AM"
const formatTimeString = (time24) => {
  if (!time24) return "08:30 AM";
  const parts = time24.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return "08:30 AM";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
};

// Format ISO date "2026-09-25" into "25 Sep 2026"
const formatDateFormatted = (dateISO) => {
  if (!dateISO) return "";
  try {
    const d = new Date(dateISO + "T00:00:00");
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateISO;
  }
};

const NotificationCenter = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("notifications"); // 'notifications' | 'schedules' | 'preferences'
  
  // Data states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);
  const [preferences, setPreferences] = useState({
    inAppEnabled: true,
    emailEnabled: false,
    webpushEnabled: false,
    digestFrequency: "realtime",
  });

  // Loading states
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  // System detected timezone & Today ISO
  const systemTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  }, []);

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Modal & Form States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    userQuery: "",
    scheduleType: "one_time", // 'one_time' | 'recurring'
    startDate: todayISO,
    deliveryTime: "08:30",
    timezone: systemTimezone,
    
    // Recurring options
    recurringMode: "daily", // 'daily' | 'weekly' | 'monthly' | 'custom'
    weeklyDays: ["Mon", "Wed", "Fri"],
    monthlyRunOn: "1st", // '1st' | '15th' | 'last_day'
    customInterval: 2,
    customUnit: "Days",
    
    enabled: true,
  });

  // Dropdown & Popover states for Modal
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [showTzDropdown, setShowTzDropdown] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [deletingScheduleTarget, setDeletingScheduleTarget] = useState(null);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);

  // Time Picker custom state (Pill button grid selector)
  const [tempHour, setTempHour] = useState("08");
  const [tempMinute, setTempMinute] = useState("30");
  const [tempAmpm, setTempAmpm] = useState("AM");

  const tzDropdownRef = useRef(null);
  const topicDropdownRef = useRef(null);

  // Dropdown Mutual Exclusion Helpers
  const openTopicDropdown = () => {
    setShowTzDropdown(false);
    setShowTopicDropdown(true);
  };

  const openTzDropdown = () => {
    setShowTopicDropdown(false);
    setShowTzDropdown(true);
  };

  // Stacked ESC Key Handler: Dismisses top-most layer first
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        e.stopPropagation();

        if (showTzDropdown) {
          setShowTzDropdown(false);
        } else if (showTopicDropdown) {
          setShowTopicDropdown(false);
        } else if (showTimePickerModal) {
          setShowTimePickerModal(false);
        } else if (deletingScheduleTarget) {
          setDeletingScheduleTarget(null);
        } else if (showScheduleModal) {
          setShowScheduleModal(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, showTzDropdown, showTopicDropdown, showTimePickerModal, showScheduleModal, onClose]);

  // Dropdown Outside Click Listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target)) {
        setShowTzDropdown(false);
      }
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(e.target)) {
        setShowTopicDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Timezones list
  const filteredTimezones = useMemo(() => {
    let list = TIMEZONES_LIST;
    const exists = list.some((t) => t.value === systemTimezone);
    if (!exists) {
      list = [{ value: systemTimezone, label: `${systemTimezone} (Detected)`, keywords: systemTimezone.toLowerCase() }, ...list];
    }
    if (!tzSearch.trim()) return list;
    const q = tzSearch.trim().toLowerCase();
    return list.filter((t) => t.label.toLowerCase().includes(q) || (t.keywords && t.keywords.includes(q)));
  }, [systemTimezone, tzSearch]);

  // Live Human-Readable Schedule Summary Preview Calculation
  const scheduleSummaryText = useMemo(() => {
    const timeFormatted = formatTimeString(scheduleForm.deliveryTime);
    const dateFormatted = formatDateFormatted(scheduleForm.startDate);
    const tzShort = scheduleForm.timezone;

    if (scheduleForm.scheduleType === "one_time") {
      return `Runs once on ${dateFormatted} at ${timeFormatted} (${tzShort})`;
    }

    if (scheduleForm.scheduleType === "recurring") {
      if (scheduleForm.recurringMode === "daily") {
        return `Runs every day at ${timeFormatted} (${tzShort})`;
      }
      if (scheduleForm.recurringMode === "weekly") {
        const days = scheduleForm.weeklyDays.length > 0 ? scheduleForm.weeklyDays.join(", ") : "selected days";
        return `Runs every ${days} at ${timeFormatted} (${tzShort})`;
      }
      if (scheduleForm.recurringMode === "monthly") {
        const runOnText = scheduleForm.monthlyRunOn === "last_day" ? "Last Day" : scheduleForm.monthlyRunOn;
        return `Runs on the ${runOnText} of every month at ${timeFormatted} (${tzShort})`;
      }
      if (scheduleForm.recurringMode === "custom") {
        return `Runs every ${scheduleForm.customInterval} ${scheduleForm.customUnit} at ${timeFormatted} starting ${dateFormatted} (${tzShort})`;
      }
    }

    return `Scheduled report delivery at ${timeFormatted}`;
  }, [scheduleForm]);

  // Future-Only Validation Error Calculation
  const validationError = useMemo(() => {
    if (!scheduleForm.userQuery || !scheduleForm.userQuery.trim()) {
      return "Topic name is required.";
    }

    const now = new Date();

    if (scheduleForm.scheduleType === "one_time") {
      if (scheduleForm.startDate < todayISO) {
        return "Past dates are not allowed. Please select today or a future date.";
      }

      if (scheduleForm.startDate === todayISO) {
        const parts = (scheduleForm.deliveryTime || "08:30").split(":");
        const targetH = parseInt(parts[0], 10);
        const targetM = parseInt(parts[1], 10);
        const curH = now.getHours();
        const curM = now.getMinutes();

        if (targetH < curH || (targetH === curH && targetM <= curM)) {
          return "Selected delivery time has already passed today. Please pick a future time.";
        }
      }
    }

    if (scheduleForm.scheduleType === "recurring" && scheduleForm.recurringMode === "weekly") {
      if (!scheduleForm.weeklyDays || scheduleForm.weeklyDays.length === 0) {
        return "Please select at least one day of the week for weekly recurrence.";
      }
    }

    if (scheduleForm.scheduleType === "recurring" && scheduleForm.recurringMode === "custom") {
      if (!scheduleForm.customInterval || scheduleForm.customInterval <= 0) {
        return "Custom interval must be a number greater than 0.";
      }
    }

    return null;
  }, [scheduleForm, todayISO]);

  // Fetch unread count for badge
  const fetchUnread = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      const count = typeof res?.unreadCount === "number" ? res.unreadCount : (typeof res?.data?.unreadCount === "number" ? res.data.unreadCount : 0);
      setUnreadCount(count);
      window.dispatchEvent(new CustomEvent("notification-count-changed", { detail: { count } }));
    } catch (e) {
      console.warn("Failed to fetch unread count", e);
    }
  }, []);

  // Fetch notifications
  const fetchNotificationsList = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await getNotifications({ page: 1, limit: 30 });
      const list = res?.notifications || res?.data?.notifications || (Array.isArray(res) ? res : []);
      const count = typeof res?.unreadCount === "number" ? res.unreadCount : 0;
      setNotifications(list);
      setUnreadCount(count);
      window.dispatchEvent(new CustomEvent("notification-count-changed", { detail: { count } }));
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Fetch schedules
  const fetchSchedulesList = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const res = await getSchedules();
      const list = res?.schedules || res?.data?.schedules || (Array.isArray(res) ? res : []);
      setSchedules(list);
    } catch (e) {
      console.error("Failed to load schedules", e);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  // Fetch preferences
  const fetchPrefs = useCallback(async () => {
    try {
      const res = await getPreferences();
      const prefs = res?.preferences || res?.data?.preferences;
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (e) {
      console.warn("Failed to load notification preferences", e);
    }
  }, []);

  // Lightweight Polling for Unread Counter
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Load active tab data when opened
  useEffect(() => {
    if (isOpen) {
      if (activeTab === "notifications") fetchNotificationsList();
      if (activeTab === "schedules") fetchSchedulesList();
      if (activeTab === "preferences") fetchPrefs();
    }
  }, [isOpen, activeTab, fetchNotificationsList, fetchSchedulesList, fetchPrefs]);

  // Handle single notification click -> Mark as read immediately & toggle expanded detail
  const handleNotificationClick = async (item) => {
    setExpandedNotificationId((prev) => (prev === item._id ? null : item._id));

    if (!item.read) {
      // Optimistic UI Update
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        window.dispatchEvent(new CustomEvent("notification-count-changed", { detail: { count: next } }));
        return next;
      });

      try {
        await markAsRead(item._id);
      } catch (e) {
        console.error("Failed to mark single notification read", e);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent("notification-count-changed", { detail: { count: 0 } }));
    } catch (e) {
      console.error("Mark all read failed", e);
    }
  };

  // Duplicate Check on form input
  const handleQueryChange = (val) => {
    setScheduleForm((prev) => ({ ...prev, userQuery: val }));
    if (!val.trim()) {
      setDuplicateWarning("");
      return;
    }
    const normalizedInput = val.trim().toLowerCase();
    const match = schedules.find((s) => (s.userQuery || s.title || s.rawPrompt || "").toLowerCase() === normalizedInput);
    if (match && match._id !== editingScheduleId) {
      setDuplicateWarning(`Schedule already active for "${match.userQuery || match.title}". Existing settings will be updated.`);
    } else {
      setDuplicateWarning("");
    }
  };

  // Toggle Weekly Day
  const handleToggleWeeklyDay = (day) => {
    setScheduleForm((prev) => {
      const exists = prev.weeklyDays.includes(day);
      const nextDays = exists ? prev.weeklyDays.filter((d) => d !== day) : [...prev.weeklyDays, day];
      return { ...prev, weeklyDays: nextDays };
    });
  };

  // Open Custom Time Picker Helper
  const openTimePicker = () => {
    setShowTopicDropdown(false);
    setShowTzDropdown(false);
    const current = scheduleForm.deliveryTime || "08:30";
    const parts = current.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isNaN(h)) h = 8;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;

    setTempHour(h.toString().padStart(2, "0"));
    setTempMinute(m);
    setTempAmpm(ampm);
    setShowTimePickerModal(true);
  };

  // Confirm Custom Time Picker Selection
  const handleSetTime = () => {
    let h = parseInt(tempHour, 10);
    if (isNaN(h)) h = 8;
    if (tempAmpm === "PM" && h < 12) h += 12;
    if (tempAmpm === "AM" && h === 12) h = 0;
    const final24 = `${h.toString().padStart(2, "0")}:${tempMinute}`;
    setScheduleForm((prev) => ({ ...prev, deliveryTime: final24 }));
    setShowTimePickerModal(false);
  };

  // Edit Existing Schedule Handler
  const handleEditSchedule = (schedule) => {
    setEditingScheduleId(schedule._id);
    const cfg = schedule.sourceConfig || {};

    setScheduleForm({
      userQuery: schedule.userQuery || schedule.title || schedule.rawPrompt || "",
      scheduleType: cfg.scheduleType || ((schedule.rate || "").toLowerCase() === "one_time" ? "one_time" : "recurring"),
      startDate: cfg.startDate || todayISO,
      deliveryTime: schedule.scheduledTime || schedule.deliveryTime || "08:30",
      timezone: schedule.timezone || systemTimezone,
      recurringMode: cfg.recurringMode || ((schedule.rate || "").toLowerCase() !== "one_time" ? schedule.rate : "daily") || "daily",
      weeklyDays: cfg.weeklyDays || ["Mon", "Wed", "Fri"],
      monthlyRunOn: cfg.monthlyRunOn || "1st",
      customInterval: cfg.customInterval || 2,
      customUnit: cfg.customUnit || "Days",
      enabled: schedule.enabled ?? true,
    });

    setDuplicateWarning("");
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (validationError) return;

    setSubmittingSchedule(true);
    
    // Map rate string for backend compatibility
    let backendRate = "daily";
    if (scheduleForm.scheduleType === "one_time") {
      backendRate = "one_time";
    } else {
      backendRate = scheduleForm.recurringMode;
    }

    const payload = {
      prompt: scheduleForm.userQuery.trim(),
      userQuery: scheduleForm.userQuery.trim(),
      scheduledTime: scheduleForm.deliveryTime,
      deliveryTime: scheduleForm.deliveryTime,
      timezone: scheduleForm.timezone,
      rate: backendRate,
      enabled: scheduleForm.enabled,
      title: scheduleForm.userQuery.trim(),
      sourceConfig: {
        scheduleType: scheduleForm.scheduleType,
        startDate: scheduleForm.startDate,
        recurringMode: scheduleForm.recurringMode,
        weeklyDays: scheduleForm.weeklyDays,
        monthlyRunOn: scheduleForm.monthlyRunOn,
        customInterval: scheduleForm.customInterval,
        customUnit: scheduleForm.customUnit,
        summaryPreview: scheduleSummaryText,
      }
    };

    try {
      if (editingScheduleId) {
        await updateSchedule(editingScheduleId, payload);
      } else {
        await createSchedule(payload);
      }
      setShowScheduleModal(false);
      setEditingScheduleId(null);
      setScheduleForm({
        userQuery: "",
        scheduleType: "one_time",
        startDate: todayISO,
        deliveryTime: "08:30",
        timezone: systemTimezone,
        recurringMode: "daily",
        weeklyDays: ["Mon", "Wed", "Fri"],
        monthlyRunOn: "1st",
        customInterval: 2,
        customUnit: "Days",
        enabled: true,
      });
      setDuplicateWarning("");
      fetchSchedulesList();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Failed to save schedule");
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleToggleSchedule = async (schedule) => {
    try {
      await updateSchedule(schedule._id, { enabled: !schedule.enabled });
      setSchedules((prev) =>
        prev.map((s) => (s._id === schedule._id ? { ...s, enabled: !s.enabled } : s))
      );
    } catch (e) {
      console.error("Failed to toggle schedule", e);
    }
  };

  const handleOpenDeleteModal = (schedule) => {
    setDeletingScheduleTarget({
      id: schedule._id,
      title: schedule.userQuery || schedule.title || schedule.rawPrompt || "this schedule",
    });
  };

  const handleConfirmDeleteSchedule = async () => {
    if (!deletingScheduleTarget) return;
    setIsDeletingSchedule(true);
    try {
      await deleteSchedule(deletingScheduleTarget.id);
      setSchedules((prev) => prev.filter((s) => s._id !== deletingScheduleTarget.id));
      setDeletingScheduleTarget(null);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Failed to delete schedule");
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const handleSavePreferences = async (newPrefs) => {
    setPreferences(newPrefs);
    try {
      await updatePreferences(newPrefs);
    } catch (e) {
      console.error("Failed to save preferences", e);
    }
  };

  if (!isOpen) return null;

  const currentTzLabel = TIMEZONES_LIST.find((t) => t.value === scheduleForm.timezone)?.label || `${scheduleForm.timezone} (GMT)`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/25 dark:bg-black/60 backdrop-blur-xs flex justify-end transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (showTzDropdown) setShowTzDropdown(false);
          else if (showTopicDropdown) setShowTopicDropdown(false);
          else if (showTimePickerModal) setShowTimePickerModal(false);
          else if (deletingScheduleTarget) setDeletingScheduleTarget(null);
          else if (showScheduleModal) setShowScheduleModal(false);
          else onClose();
        }
      }}
    >
      <div
        className="w-full max-w-full sm:max-w-md bg-white dark:bg-[#121214] text-gray-900 dark:text-gray-100 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800 animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#161618]">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <FiBell className="text-lg" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                Scheduled Intelligence <FiActivity className="text-amber-500 text-xs" />
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Live Briefings & Topic Schedules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 gap-4 bg-gray-50/30 dark:bg-[#141416] text-xs font-medium">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "notifications"
                ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            }`}
          >
            <FiBell /> Inbox
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("schedules")}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "schedules"
                ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            }`}
          >
            <FiZap /> Schedules
            {schedules.length > 0 && (
              <span className="px-1.5 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded-full">
                {schedules.length}
              </span>
            )}
          </button>
          {/* Settings Tab (Commented Out per User Request)
          <button
            onClick={() => setActiveTab("preferences")}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "preferences"
                ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            }`}
          >
            <FiSliders /> Settings
          </button>
          */}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* TAB 1: NOTIFICATIONS INBOX */}
          {activeTab === "notifications" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Intelligence Inbox
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FiCheckCircle className="text-xs" /> Mark all read
                  </button>
                )}
              </div>

              {loadingNotifications ? (
                <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <FiRefreshCw className="animate-spin" /> Loading intelligence updates...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <FiBell className="mx-auto text-2xl text-gray-400 mb-2 opacity-50" />
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">No notifications yet</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Create a topic schedule to receive automated AI intelligence reports.
                  </p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isExpanded = expandedNotificationId === item._id;
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 rounded-xl border text-xs transition-all relative cursor-pointer ${
                        item.read
                          ? "bg-white dark:bg-[#161619] border-gray-200 dark:border-gray-800/60 opacity-85 hover:border-gray-300 dark:hover:border-gray-700"
                          : "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            {item.sourceType || item.category || "Intelligence"}
                          </span>
                          {!item.read ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-rose-500 text-white flex items-center gap-1">
                              • New
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                              <FiCheck className="text-xs" /> Read
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <FiClock /> {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">
                          {item.title}
                        </h4>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </div>

                      <p className={`text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mt-1.5 ${isExpanded ? "" : "line-clamp-3"}`}>
                        {item.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: SCHEDULES MANAGEMENT */}
          {activeTab === "schedules" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Active Topic Schedules
                </span>
                <button
                  onClick={() => {
                    setEditingScheduleId(null);
                    setScheduleForm({
                      userQuery: "",
                      scheduleType: "one_time",
                      startDate: todayISO,
                      deliveryTime: "08:30",
                      timezone: systemTimezone,
                      recurringMode: "daily",
                      weeklyDays: ["Mon", "Wed", "Fri"],
                      monthlyRunOn: "1st",
                      customInterval: 2,
                      customUnit: "Days",
                      enabled: true,
                    });
                    setDuplicateWarning("");
                    setShowScheduleModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <FiPlus className="text-sm" /> New Schedule
                </button>
              </div>

              {loadingSchedules ? (
                <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <FiRefreshCw className="animate-spin" /> Loading topic schedules...
                </div>
              ) : schedules.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/40 dark:bg-gray-900/20">
                  <FiZap className="mx-auto text-3xl text-indigo-500 mb-2 opacity-70" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">No active schedules</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
                    Create automated topic intelligence schedules for Gold Rates, Bitcoin, OpenAI, or Industry Market updates.
                  </p>
                  <button
                    onClick={() => {
                      setEditingScheduleId(null);
                      setScheduleForm({
                        userQuery: "",
                        scheduleType: "one_time",
                        startDate: todayISO,
                        deliveryTime: "08:30",
                        timezone: systemTimezone,
                        recurringMode: "daily",
                        weeklyDays: ["Mon", "Wed", "Fri"],
                        monthlyRunOn: "1st",
                        customInterval: 2,
                        customUnit: "Days",
                        enabled: true,
                      });
                      setShowScheduleModal(true);
                    }}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FiPlus /> Schedule First Topic
                  </button>
                </div>
              ) : (
                schedules.map((schedule) => (
                  <div
                    key={schedule._id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161619] text-xs space-y-2.5 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-all min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug break-words">
                            {schedule.userQuery || schedule.title || schedule.rawPrompt}
                          </h4>
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold uppercase rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                            {schedule.sourceType || schedule.sourceResolved || "news_summary"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                          <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">{schedule.rate || "one_time"}</span> at {formatTimeString(schedule.scheduledTime || schedule.deliveryTime)} ({schedule.timezone})
                        </p>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleSchedule(schedule)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${
                          schedule.enabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                        }`}
                        title={schedule.enabled ? "Disable schedule" : "Enable schedule"}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            schedule.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Observability & Health stats */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                      <div>
                        Next Delivery:{" "}
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {((schedule.rate || "").toLowerCase() === "one_time" || (schedule.sourceConfig?.scheduleType || "").toLowerCase() === "one_time") &&
                          (schedule.generationStatus === "completed" || !schedule.nextRunAt)
                            ? "Completed"
                            : !schedule.enabled
                            ? "Disabled"
                            : schedule.nextRunAt
                            ? new Date(schedule.nextRunAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : "Pending"}
                        </span>
                      </div>
                      <div>
                        Status:{" "}
                        <span className={`font-medium ${
                          schedule.failureCount > 0
                            ? "text-rose-500"
                            : ((schedule.rate || "").toLowerCase() === "one_time" || (schedule.sourceConfig?.scheduleType || "").toLowerCase() === "one_time") && schedule.generationStatus === "completed"
                            ? "text-emerald-500"
                            : "text-emerald-500"
                        }`}>
                          {((schedule.rate || "").toLowerCase() === "one_time" || (schedule.sourceConfig?.scheduleType || "").toLowerCase() === "one_time") && schedule.generationStatus === "completed"
                            ? "completed"
                            : schedule.lastExecutionStatus || "active"} {schedule.failureCount > 0 && `(${schedule.failureCount} fails)`}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60 mt-1">
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold border border-indigo-200/80 dark:border-indigo-800/50"
                        title="Edit Schedule Settings"
                      >
                        <FiEdit2 className="text-xs" /> Edit Schedule
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(schedule)}
                        className="px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-medium"
                        title="Delete Schedule"
                      >
                        <FiTrash2 className="text-xs" /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PREFERENCES / SETTINGS (COMMENTED OUT PER USER REQUEST)
          {activeTab === "preferences" && (
            <div className="space-y-4 text-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Notification Delivery Channels
              </span>

              <div className="space-y-3 bg-white dark:bg-[#161619] p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">In-App Notifications</h5>
                    <p className="text-[11px] text-gray-400">Show notification drawer alerts and badge count.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.inAppEnabled ?? true}
                    onChange={(e) => handleSavePreferences({ ...preferences, inAppEnabled: e.target.checked })}
                    className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">Email Digest</h5>
                    <p className="text-[11px] text-gray-400">Send summary notifications to registered email.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled ?? false}
                    onChange={(e) => handleSavePreferences({ ...preferences, emailEnabled: e.target.checked })}
                    className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
          */}

        </div>

        {/* MAIN SCHEDULE MODAL BACKDROP (RESPONSIVE SCREEN FIT & THEME-AWARE OVERLAY) */}
        {showScheduleModal && (
          <div
            className="fixed inset-0 z-60 bg-slate-900/30 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (showTzDropdown) setShowTzDropdown(false);
                else if (showTopicDropdown) setShowTopicDropdown(false);
                else if (showTimePickerModal) setShowTimePickerModal(false);
                else setShowScheduleModal(false);
              }
            }}
          >
            <div
              className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Modal Header */}
              <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#141416]">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 leading-snug">
                    {editingScheduleId ? "Edit Intelligence Schedule" : "Create Intelligence Schedule"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Automated real-time AI report delivery on your custom schedule
                  </p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <FiX className="text-base" />
                </button>
              </div>

              {/* Form Scrollable Content Body */}
              <form id="schedule-form" onSubmit={handleSaveSchedule} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                
                {/* VALIDATION ERROR BANNER (DISPLAYED AT TOP FOR MOBILE KEYBOARD ACCESSIBILITY) */}
                {validationError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 shadow-xs animate-fadeIn">
                    <FiAlertCircle className="mt-0.5 shrink-0 text-rose-500 text-sm" />
                    <span className="font-medium leading-relaxed">{validationError}</span>
                  </div>
                )}

                {/* 1. TOPIC SELECTION */}
                <div className="space-y-1.5 relative" ref={topicDropdownRef}>
                  <label className="block font-semibold text-gray-900 dark:text-gray-100 text-xs">
                    Topic
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Enter topic e.g. Gold Rate, Bitcoin, OpenAI News"
                      value={scheduleForm.userQuery}
                      onFocus={openTopicDropdown}
                      onChange={(e) => {
                        handleQueryChange(e.target.value);
                        openTopicDropdown();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#101012] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium text-xs"
                    />
                  </div>

                  {/* Dropdown topic suggestions while typing */}
                  {showTopicDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-[#1c1c20] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden py-1">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#141416]">
                        Popular Topic Suggestions
                      </div>
                      {TOPIC_SUGGESTIONS.map((sug) => (
                        <button
                          type="button"
                          key={sug.query}
                          onClick={() => {
                            handleQueryChange(sug.query);
                            setShowTopicDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-300 text-xs flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>{sug.label}</span>
                          <span className="text-[10px] text-gray-400">Select</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {duplicateWarning && (
                    <p className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <FiAlertCircle className="mt-0.5 shrink-0 text-amber-500 text-xs" /> {duplicateWarning}
                    </p>
                  )}
                </div>

                {/* 2. SCHEDULE TYPE (ONE TIME vs RECURRING) */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-gray-900 dark:text-gray-100 text-xs">
                    Schedule Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-[#101012] p-1 rounded-xl border border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setScheduleForm({ ...scheduleForm, scheduleType: "one_time" })}
                      className={`py-2 text-center text-xs transition-all cursor-pointer font-semibold flex items-center justify-center gap-1.5 rounded-lg ${
                        scheduleForm.scheduleType === "one_time"
                          ? "bg-white dark:bg-[#202025] text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      <FiCalendar className="text-xs" /> One Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleForm({ ...scheduleForm, scheduleType: "recurring" })}
                      className={`py-2 text-center text-xs transition-all cursor-pointer font-semibold flex items-center justify-center gap-1.5 rounded-lg ${
                        scheduleForm.scheduleType === "recurring"
                          ? "bg-white dark:bg-[#202025] text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      <FiRepeat className="text-xs" /> Recurring
                    </button>
                  </div>
                </div>

                {/* 3. DATE & TIME SELECTION FOR ONE TIME */}
                {scheduleForm.scheduleType === "one_time" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Start Date Picker (Native HTML5 Date Picker supported on Mobile & Desktop) */}
                    <div className="space-y-1">
                      <label className="block font-semibold text-gray-900 dark:text-gray-100 text-xs">
                        Target Date
                      </label>
                      <input
                        type="date"
                        min={todayISO}
                        required
                        value={scheduleForm.startDate}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#101012] text-gray-900 dark:text-gray-100 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Delivery Time Card */}
                    <div className="space-y-1">
                      <label className="block font-semibold text-gray-900 dark:text-gray-100 text-xs">
                        Delivery Time
                      </label>
                      <button
                        type="button"
                        onClick={openTimePicker}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#101012] text-gray-900 dark:text-gray-100 text-xs font-semibold flex items-center justify-between hover:border-indigo-500 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <FiClock className="text-indigo-500" />
                          {formatTimeString(scheduleForm.deliveryTime)}
                        </span>
                        <span className="text-[10px] text-indigo-500 font-bold hover:underline">Change</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. RECURRING RULES SELECTION */}
                {scheduleForm.scheduleType === "recurring" && (
                  <div className="space-y-3.5 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#101012]">
                    <div className="space-y-1">
                      <label className="block font-semibold text-gray-900 dark:text-gray-100 text-xs">
                        Repeat Mode
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-200/60 dark:bg-[#18181c] p-1 rounded-xl">
                        {[
                          { id: "daily", label: "Daily" },
                          { id: "weekly", label: "Weekly" },
                          { id: "monthly", label: "Monthly" },
                          { id: "custom", label: "Custom" },
                        ].map((m) => (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => setScheduleForm({ ...scheduleForm, recurringMode: m.id })}
                            className={`py-1.5 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              scheduleForm.recurringMode === m.id
                                ? "bg-white dark:bg-[#25252b] text-indigo-600 dark:text-indigo-400 shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* WEEKLY MULTI-DAY SELECTION */}
                    {scheduleForm.recurringMode === "weekly" && (
                      <div className="space-y-1.5">
                        <label className="block text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                          Select Days of Week
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {WEEKDAYS.map((day) => {
                            const selected = scheduleForm.weeklyDays.includes(day);
                            return (
                              <button
                                type="button"
                                key={day}
                                onClick={() => handleToggleWeeklyDay(day)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                  selected
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161619] text-gray-600 dark:text-gray-400 hover:border-gray-400"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* MONTHLY RUN ON SELECTION */}
                    {scheduleForm.recurringMode === "monthly" && (
                      <div className="space-y-1.5">
                        <label className="block text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                          Run On Day of Month
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "1st", label: "1st of Month" },
                            { id: "15th", label: "15th of Month" },
                            { id: "last_day", label: "Last Day" },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setScheduleForm({ ...scheduleForm, monthlyRunOn: opt.id })}
                              className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                                scheduleForm.monthlyRunOn === opt.id
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161619] text-gray-600 dark:text-gray-400 hover:border-gray-400"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CUSTOM REPEAT INTERVAL & UNIT */}
                    {scheduleForm.recurringMode === "custom" && (
                      <div className="space-y-1.5">
                        <label className="block text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                          Repeat Every
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={scheduleForm.customInterval}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, customInterval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161619] text-gray-900 dark:text-gray-100 font-bold text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <select
                            value={scheduleForm.customUnit}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, customUnit: e.target.value })}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161619] text-gray-900 dark:text-gray-100 text-xs font-medium focus:outline-none cursor-pointer"
                          >
                            {CUSTOM_UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* RECURRING TIME PICKER */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Execution Time:</span>
                      <button
                        type="button"
                        onClick={openTimePicker}
                        className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161619] text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 cursor-pointer"
                      >
                        {formatTimeString(scheduleForm.deliveryTime)} (Change)
                      </button>
                    </div>

                  </div>
                )}

                {/* 5. TIMEZONE SELECTION - INLINE SEARCHABLE COMBOBOX */}
                <div className="space-y-2" ref={tzDropdownRef}>
                  <label className="block font-semibold text-gray-900 dark:text-gray-100 text-xs">
                    Timezone
                  </label>
                  
                  {!showTzDropdown ? (
                    <button
                      type="button"
                      onClick={openTzDropdown}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#101012] text-gray-900 dark:text-gray-100 font-medium text-xs text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FiGlobe className="text-indigo-500 shrink-0" />
                        <span className="truncate">{currentTzLabel}</span>
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs flex items-center gap-1 shrink-0 ml-2">
                        <FiSearch className="text-xs" /> Change
                      </span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-indigo-500 bg-white dark:bg-[#101012] space-y-2 shadow-md animate-scale-up">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type city or region (e.g. Kolkata, London, New York)..."
                          value={tzSearch}
                          onChange={(e) => setTzSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18181c] text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTzDropdown(false)}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                        >
                          <FiX className="text-xs" />
                        </button>
                      </div>

                      <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/40 text-xs">
                        {filteredTimezones.map((tz) => (
                          <button
                            type="button"
                            key={tz.value}
                            onClick={() => {
                              setScheduleForm((prev) => ({ ...prev, timezone: tz.value }));
                              setShowTzDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 text-xs flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer ${
                              scheduleForm.timezone === tz.value
                                ? "text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-950/20"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <span className="truncate">{tz.label}</span>
                            {scheduleForm.timezone === tz.value && <FiCheck className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. LIVE SCHEDULE SUMMARY PREVIEW CARD */}
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <FiActivity /> Live Schedule Summary Preview
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                    "{scheduleSummaryText}"
                  </p>
                </div>

              </form>

              {/* STICKY FOOTER */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-[#141416]">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="schedule-form"
                  disabled={submittingSchedule || !!validationError}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingSchedule ? <FiRefreshCw className="animate-spin text-sm" /> : <FiCheck className="text-sm" />} {editingScheduleId ? "Update Schedule" : "Save Schedule"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CUSTOM TIME PICKER DIALOG POPOVER (Z-70) */}
        {showTimePickerModal && (
          <div
            className="fixed inset-0 z-70 bg-slate-900/35 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTimePickerModal(false);
              }
            }}
          >
            <div
              className="bg-white dark:bg-[#1c1c20] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-2.5">
                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FiClock className="text-indigo-500" /> Select Delivery Time
                </h4>
                <button
                  onClick={() => setShowTimePickerModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <FiX />
                </button>
              </div>

              {/* Custom Time Picker Button Grids (Replaces native browser <select> popups) */}
              <div className="space-y-3.5 py-1">
                
                {/* 1. Hour Selection Grid (01-12) */}
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5 text-center">
                    Hour
                  </span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0")).map((h) => (
                      <button
                        type="button"
                        key={h}
                        onClick={() => setTempHour(h)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          tempHour === h
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#101012] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Minute Selection Grid */}
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5 text-center">
                    Minute
                  </span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setTempMinute(m)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          tempMinute === m
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#101012] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. AM/PM Selection Segment */}
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5 text-center">
                    Period
                  </span>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-[#101012] p-1 rounded-xl border border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setTempAmpm("AM")}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        tempAmpm === "AM" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-600 dark:text-gray-400 font-medium"
                      }`}
                    >
                      AM (Morning)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempAmpm("PM")}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        tempAmpm === "PM" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-600 dark:text-gray-400 font-medium"
                      }`}
                    >
                      PM (Afternoon/Night)
                    </button>
                  </div>
                </div>

              </div>

              {/* Selected Preview Box */}
              <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-center">
                <span className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider block">Selected Delivery Time</span>
                <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">{tempHour}:{tempMinute} {tempAmpm}</span>
              </div>

              {/* Time Picker Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowTimePickerModal(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetTime}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Set Time
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CUSTOM DELETE CONFIRMATION MODAL POPUP (Z-80) */}
        {deletingScheduleTarget && (
          <div
            className="fixed inset-0 z-80 bg-slate-900/35 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeletingSchedule) {
                setDeletingScheduleTarget(null);
              }
            }}
          >
            <div
              className="bg-white dark:bg-[#1c1c20] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                  <FiTrash2 className="text-xl" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    Delete Topic Schedule?
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-gray-800 dark:text-gray-200">"{deletingScheduleTarget.title}"</span>? Future automated intelligence reports will be stopped.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  disabled={isDeletingSchedule}
                  onClick={() => setDeletingScheduleTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingSchedule}
                  onClick={handleConfirmDeleteSchedule}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingSchedule ? <FiRefreshCw className="animate-spin text-xs" /> : <FiTrash2 className="text-xs" />} Delete Schedule
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationCenter;
