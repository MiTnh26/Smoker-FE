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
  const { role, type, id } = entity;
  
  if (!id) return "/customer/profile";

  // Use role first, then fallback to type
  const entityType = role || type || "";

  switch (entityType.toLowerCase()) {
    case "bar":
    case "barpage":
      return `/bar/${id}`;
    case "dj":
      return `/dj/${id}`;
    case "dancer":
      return `/dancer/${id}`;
    case "customer":
    case "account":
      return `/customer/profile`;
    default:
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
    // Fallback if t is not provided
    const fallback = {
      light: "🌞 Sáng",
      dark: "🌙 Tối",
      bw: "⚫⚪ Đen trắng",
      liquidglass: "🪟 LiquidGlass",
    };
    return fallback[theme] || fallback.light;
  }
  
  const labels = {
    light: `🌞 ${t('menu.themeLight')}`,
    dark: `🌙 ${t('menu.themeDark')}`,
    bw: `⚫⚪ ${t('menu.themeBW')}`,
    liquidglass: `🪟 ${t('menu.themeLiquidGlass')}`,
  };
  return labels[theme] || labels.light;
}

/**
 * Get next theme in cycle
 * @param {string} currentTheme - Current theme
 * @returns {string} Next theme
 */
export function getNextTheme(currentTheme) {
  const themes = ["light", "dark", "bw", "liquidglass"];
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  return themes[nextIndex];
}

