import React, { useState, useEffect } from "react";

const UserAvatar = ({
  user,
  className = "w-8 h-8 text-[13px]",
  borderClassName = "border border-border-primary/50",
}) => {
  const [imageError, setImageError] = useState(false);

  // Check all possible avatar fields provided by auth endpoints
  const avatarUrl =
    typeof (user?.image || user?.avatarUrl || user?.profilePic) === "string"
      ? (user?.image || user?.avatarUrl || user?.profilePic).trim()
      : null;

  // Extract the first letter of user name (fallback to "U" if not provided)
  const initial = user?.name?.trim()
    ? user.name.trim().charAt(0).toUpperCase()
    : "U";

  // Reset image error state whenever avatar URL changes
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={user?.name || "User Avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`${className} rounded-full object-cover shrink-0 ${borderClassName}`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-accent-primary text-white flex items-center justify-center font-bold shrink-0 ${borderClassName} select-none`}
    >
      {initial}
    </div>
  );
};

export default UserAvatar;
