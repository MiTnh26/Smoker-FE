/**
 * menuConfigs.js
 * Configuration objects for different menu types
 */

export const menuConfigs = {
  customer: {
    showBackToAccount: false, // Customer is already on their account page
    showEntities: true, // Show list of entities (bars, businesses, etc.)
    entityLabel: null, // Will use i18n translation
    entityTypes: ["BarPage", "Business"], // Allow all entity types
    menuItems: [
      {
        id: "settings",
        label: null, // Will use i18n translation
        href: "/settings",
        icon: null,
        onClick: null,
      },
      {
        id: "theme",
        label: null, // Will use i18n translation
        href: null,
        icon: null,
        onClick: "toggleTheme", // Special handler
      },
      {
        id: "language",
        label: null, // Will use i18n translation
        href: "/settings/language",
        icon: null,
        onClick: null,
      },
      {
        id: "logout",
        label: null, // Will use i18n translation
        href: "/login",
        icon: null,
        onClick: "handleLogout", // Special handler
        isLogout: true,
      },
    ],
  },

  bar: {
    showBackToAccount: true, // Show button to go back to customer account
    showEntities: true, // Show list of other bars/entities
    entityLabel: null, // Will use i18n translation
    entityTypes: ["BarPage", "Business"], // Allow all entity types
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "/settings",
        icon: null,
        onClick: null,
      },
      {
        id: "theme",
        label: "Chế độ giao diện",
        href: null,
        icon: null,
        onClick: "toggleTheme",
      },
      {
        id: "language",
        label: "Ngôn ngữ",
        href: "/settings/language",
        icon: null,
        onClick: null,
      },
      {
        id: "logout",
        label: "Đăng xuất",
        href: "/login",
        icon: null,
        onClick: "handleLogout",
        isLogout: true,
      },
    ],
  },

  business: {
    showBackToAccount: true, // Show button to go back to customer account
    showEntities: true, // Show list of other businesses
    entityLabel: null, // Will use i18n translation
    entityTypes: ["Business"], // Only business entities
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "/settings",
        icon: null,
        onClick: null,
      },
      {
        id: "theme",
        label: "Chế độ giao diện",
        href: null,
        icon: null,
        onClick: "toggleTheme",
      },
      {
        id: "language",
        label: "Ngôn ngữ",
        href: "/settings/language",
        icon: null,
        onClick: null,
      },
      {
        id: "logout",
        label: "Đăng xuất",
        href: "/login",
        icon: null,
        onClick: "handleLogout",
        isLogout: true,
      },
    ],
  },

  dj: {
    showBackToAccount: true,
    showEntities: true,
    entityLabel: null, // Will use i18n translation
    entityTypes: ["BarPage", "Business"],
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "/settings",
        icon: null,
        onClick: null,
      },
      {
        id: "theme",
        label: "Chế độ giao diện",
        href: null,
        icon: null,
        onClick: "toggleTheme",
      },
      {
        id: "language",
        label: "Ngôn ngữ",
        href: "/settings/language",
        icon: null,
        onClick: null,
      },
      {
        id: "logout",
        label: "Đăng xuất",
        href: "/login",
        icon: null,
        onClick: "handleLogout",
        isLogout: true,
      },
    ],
  },

  dancer: {
    showBackToAccount: true,
    showEntities: true,
    entityLabel: null, // Will use i18n translation
    entityTypes: ["BarPage", "Business"],
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "/settings",
        icon: null,
        onClick: null,
      },
      {
        id: "theme",
        label: "Chế độ giao diện",
        href: null,
        icon: null,
        onClick: "toggleTheme",
      },
      {
        id: "language",
        label: "Ngôn ngữ",
        href: "/settings/language",
        icon: null,
        onClick: null,
      },
      {
        id: "logout",
        label: "Đăng xuất",
        href: "/login",
        icon: null,
        onClick: "handleLogout",
        isLogout: true,
      },
    ],
  },
};

/**
 * Get navigation route for an entity based on its role/type
 * @param {Object} entity - Entity object
 * @returns {string} Navigation route
 */
export function getEntityRoute(entity) {
  const { role, type, id, EntityAccountId, entityAccountId } = entity;
  
  // For BarPage, BusinessAccount, and Account, use EntityAccountId to navigate to /profile/:entityAccountId
  // This ensures consistency and avoids the need to resolve BarPageId
  const entityAccountIdToUse = EntityAccountId || entityAccountId;
  
  if (!id && !entityAccountIdToUse) return "/own/profile";

  // Use role first, then fallback to type
  const entityType = role || type || "";

  switch (entityType.toLowerCase()) {
    case "bar":
    case "barpage":
      // Use EntityAccountId if available, otherwise fallback to id (BarPageId)
      if (entityAccountIdToUse) {
        return `/profile/${entityAccountIdToUse}`;
      }
      return `/bar/${id}`;
    case "dj":
    case "dancer":
      // For DJ/Dancer, use EntityAccountId to navigate to /profile/:entityAccountId
      if (entityAccountIdToUse) {
        return `/profile/${entityAccountIdToUse}`;
      }
      // Fallback to old routes if EntityAccountId not available
      return entityType.toLowerCase() === "dj" ? `/dj/profile` : `/dancer/profile`;
    case "customer":
    case "account":
      return `/own/profile`;
    default:
      // For other types, use EntityAccountId if available
      if (entityAccountIdToUse) {
        return `/profile/${entityAccountIdToUse}`;
      }
      return `/user/${id}`;
  }
}

/**
 * Get theme labels
 * @param {string} theme - Theme value
 * @param {Function} t - i18n translation function
 * @returns {string} Theme label
 */
export function getThemeLabel(theme, t) {
  if (!t) {
    // Fallback if t is not provided (text only, icon được xử lý bởi component)
    const fallback = {
      light: "Chế độ sáng",
      dark: "Chế độ tối",
      bw: "Đen trắng",
    };
    return fallback[theme] || fallback.light;
  }
  
  const labels = {
    light: t('menu.themeLight'),
    dark: t('menu.themeDark'),
    bw: t('menu.themeBW'),
  };
  return labels[theme] || labels.light;
}

/**
 * Get next theme in cycle
 * @param {string} currentTheme - Current theme
 * @returns {string} Next theme
 */
export function getNextTheme(currentTheme) {
  const themes = ["light", "dark", "bw"];
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  return themes[nextIndex];
}

