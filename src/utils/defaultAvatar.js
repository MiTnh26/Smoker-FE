/**
 * Default avatar utilities
 * Provides fallback avatars when user/entity doesn't have an avatar
 */

// Data URI for a simple gray circle placeholder (36x36)
const DEFAULT_AVATAR_36 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23e5e7eb'/%3E%3Cpath d='M18 12a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 16c-4 0-7.5-2-9-5h18c-1.5 3-5 5-9 5z' fill='%239ca3af'/%3E%3C/svg%3E";

// Data URI for a simple gray circle placeholder (40x40)
const DEFAULT_AVATAR_40 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e5e7eb'/%3E%3Cpath d='M20 13a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 18c-4.5 0-8.5-2.5-10-6h20c-1.5 3.5-5.5 6-10 6z' fill='%239ca3af'/%3E%3C/svg%3E";

// Data URI for a simple gray circle placeholder (32x32)
const DEFAULT_AVATAR_32 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' fill='%23e5e7eb'/%3E%3Cpath d='M16 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 14c-3.5 0-6.5-2-8-4.5h16c-1.5 2.5-4.5 4.5-8 4.5z' fill='%239ca3af'/%3E%3C/svg%3E";

// Data URI for a simple gray circle placeholder (150x150)
const DEFAULT_AVATAR_150 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Cpath d='M75 30a45 45 0 1 0 0 90 45 45 0 0 0 0-90zm0 75c-20 0-37.5-10-50-25h100c-12.5 15-30 25-50 25z' fill='%239ca3af'/%3E%3C/svg%3E";

/**
 * Get default avatar based on size
 * @param {number} size - Size of avatar (36, 40, 32, 150, etc.)
 * @returns {string} Data URI for default avatar
 */
export const getDefaultAvatar = (size = 36) => {
  switch (size) {
    case 32:
      return DEFAULT_AVATAR_32;
    case 40:
      return DEFAULT_AVATAR_40;
    case 150:
      return DEFAULT_AVATAR_150;
    case 36:
    default:
      return DEFAULT_AVATAR_36;
  }
};

/**
 * Get avatar URL with fallback to default
 * @param {string|null|undefined} avatar - Avatar URL
 * @param {number} size - Size of default avatar if needed
 * @returns {string} Avatar URL or default avatar
 */
export const getAvatarUrl = (avatar, size = 36) => {
  if (avatar && typeof avatar === 'string' && avatar.trim()) {
    return avatar;
  }
  return getDefaultAvatar(size);
};

export default {
  getDefaultAvatar,
  getAvatarUrl,
  DEFAULT_AVATAR_36,
  DEFAULT_AVATAR_40,
  DEFAULT_AVATAR_32,
  DEFAULT_AVATAR_150,
};

