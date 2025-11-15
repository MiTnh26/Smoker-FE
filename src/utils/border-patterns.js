/**
 * Border patterns cho Feeds module - Instagram style
 * Centralized border utilities để dễ maintain và consistent
 */

// Border width patterns
export const borderWidths = {
  none: "border-0",
  thin: "border-[0.5px]",      // Viền mỏng nhất - dùng cho cards, modals
  base: "border",              // Viền mặc định - 1px
  medium: "border-2",          // Viền dày hơn - dùng cho avatars, badges
  thick: "border-4",            // Viền rất dày - ít dùng
};

// Border color opacity patterns (theo phong cách Instagram - tinh tế)
export const borderColors = {
  subtle: "border-border/10",      // Rất nhạt - dùng cho separators
  light: "border-border/20",       // Nhạt - dùng cho cards, inputs (Instagram style)
  base: "border-border/30",        // Mặc định - dùng cho dividers
  medium: "border-border/40",      // Rõ hơn - dùng cho headers
  strong: "border-border/50",       // Rõ - dùng cho active states
  primary: "border-primary/40",     // Primary color với opacity
  primaryStrong: "border-primary",  // Primary color đầy đủ
  danger: "border-danger/30",      // Danger color với opacity
  success: "border-success/30",        // Success color với opacity
};

// Border radius patterns (theo phong cách Instagram - vừa phải)
export const borderRadius = {
  none: "rounded-none",
  sm: "rounded-sm",           // 2px - rất nhỏ
  base: "rounded",            // 4px - mặc định
  md: "rounded-md",           // 6px
  lg: "rounded-lg",           // 8px - vừa phải, không quá tròn (Instagram style)
  xl: "rounded-xl",           // 12px - tròn hơn một chút
  "2xl": "rounded-2xl",       // 16px - tròn (dùng cho avatars, badges)
  full: "rounded-full",       // 100% - tròn hoàn toàn (avatars)
};

// Pre-composed border patterns (kết hợp width + color)
export const borders = {
  // Cards & Modals - Instagram style
  card: `${borderWidths.thin} ${borderColors.light}`,           // border-[0.5px] border-border/20
  cardHover: `${borderWidths.thin} ${borderColors.base}`,       // border-[0.5px] border-border/30
  
  // Inputs & Forms
  input: `${borderWidths.thin} ${borderColors.light}`,         // border-[0.5px] border-border/20
  inputFocus: `${borderWidths.thin} ${borderColors.primary}`,   // border-[0.5px] border-primary/40
  
  // Dividers & Separators
  divider: `${borderWidths.base} ${borderColors.base}`,         // border border-border/30
  dividerLight: `${borderWidths.base} ${borderColors.light}`,   // border border-border/20
  dividerSubtle: `${borderWidths.base} ${borderColors.subtle}`, // border border-border/10
  
  // Headers & Sections
  header: `${borderWidths.base} ${borderColors.medium}`,        // border border-border/40
  
  // Avatars & Badges
  avatar: `${borderWidths.medium} ${borderColors.primary}`,     // border-2 border-primary/20
  badge: `${borderWidths.base} ${borderColors.primary}`,     // border border-primary/40
  
  // Active & Selected states
  active: `${borderWidths.base} ${borderColors.primaryStrong}`, // border border-primary
  selected: `${borderWidths.base} ${borderColors.primary}`,     // border border-primary/40
};

// Complete border styles (kết hợp width + color + radius)
export const borderStyles = {
  // Cards & Modals
  card: `${borders.card} ${borderRadius.lg}`,                   // Instagram style card
  cardHover: `${borders.cardHover} ${borderRadius.lg}`,
  
  // Inputs
  input: `${borders.input} ${borderRadius.lg}`,                // Instagram style input
  inputFocus: `${borders.inputFocus} ${borderRadius.lg}`,
  
  // Buttons (no border - theo yêu cầu user)
  button: "border-none",                                        // Không viền cho buttons
  
  // Dividers
  dividerTop: `border-t ${borderColors.base}`,                  // border-t border-border/30
  dividerBottom: `border-b ${borderColors.base}`,               // border-b border-border/30
  dividerLeft: `border-l-2 ${borderColors.base}`,               // border-l-2 border-border/30 (cho replies)
  
  // Avatars
  avatar: `${borders.avatar} ${borderRadius["2xl"]}`,          // border-2 border-primary/20 rounded-2xl
  avatarFull: `${borders.avatar} ${borderRadius.full}`,         // border-2 border-primary/20 rounded-full
};

/**
 * Helper function để tạo border style tùy chỉnh
 * @param {string} width - Border width (thin, base, medium, thick)
 * @param {string} color - Border color opacity (subtle, light, base, medium, strong, primary, etc.)
 * @param {string} radius - Border radius (none, sm, base, md, lg, xl, 2xl, full)
 * @returns {string} Combined border classes
 */
export function createBorder(width = "thin", color = "light", radius = "lg") {
  const widthClass = borderWidths[width] || borderWidths.thin;
  const colorClass = borderColors[color] || borderColors.light;
  const radiusClass = borderRadius[radius] || borderRadius.lg;
  
  return `${widthClass} ${colorClass} ${radiusClass}`;
}

/**
 * Helper function để tạo border chỉ với width và color (không có radius)
 */
export function createBorderOnly(width = "thin", color = "light") {
  const widthClass = borderWidths[width] || borderWidths.thin;
  const colorClass = borderColors[color] || borderColors.light;
  
  return `${widthClass} ${colorClass}`;
}

