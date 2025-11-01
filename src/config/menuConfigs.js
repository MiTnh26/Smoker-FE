/**
 * menuConfigs.js
 * Configuration objects for different menu types
 */

export const menuConfigs = {
  customer: {
    showBackToAccount: false, // Customer is already on their account page
    showEntities: true, // Show list of entities (bars, businesses, etc.)
    entityLabel: "Trang / Doanh nghiệp của bạn",
    entityTypes: ["BarPage", "Business"], // Allow all entity types
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "#",
        icon: null,
        onClick: null,
      },
      {
        id: "theme",
        label: "Chế độ giao diện",
        href: null,
        icon: null,
        onClick: "toggleTheme", // Special handler
      },
      {
        id: "language",
        label: "Ngôn ngữ",
        href: "#",
        icon: null,
        onClick: null,
      },
      {
        id: "logout",
        label: "Đăng xuất",
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
    entityLabel: "Doanh nghiệp / Page của bạn",
    entityTypes: ["BarPage", "Business"], // Allow all entity types
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "#",
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
        href: "#",
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
    entityLabel: "Doanh nghiệp của bạn",
    entityTypes: ["Business"], // Only business entities
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "#",
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
        href: "#",
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
    entityLabel: "Trang / Doanh nghiệp của bạn",
    entityTypes: ["BarPage", "Business"],
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "#",
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
        href: "#",
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
    entityLabel: "Trang / Doanh nghiệp của bạn",
    entityTypes: ["BarPage", "Business"],
    menuItems: [
      {
        id: "settings",
        label: "Cài đặt & quyền riêng tư",
        href: "#",
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
        href: "#",
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
 * @returns {string} Theme label
 */
export function getThemeLabel(theme) {
  const labels = {
    light: "🌞 Sáng",
    dark: "🌙 Tối",
    bw: "⚫⚪ Đen trắng",
    liquidglass: "🪟 LiquidGlass",
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

