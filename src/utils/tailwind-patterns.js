/**
 * Reusable Tailwind patterns cho Feeds module
 * Sử dụng CSS variables từ variables.css
 * 
 * Usage:
 * import { cardBase, buttonPrimary } from '@/utils/tailwind-patterns';
 * <div className={cn(cardBase, "p-5")}>
 */

// ===== CARD PATTERNS =====
export const cardBase = "bg-card text-card-foreground rounded-xl shadow-sm border border-border/50";
export const cardHover = "hover:shadow-lg hover:border-primary/30 transition-all duration-300";
export const cardInteractive = `${cardBase} ${cardHover} hover:-translate-y-0.5 cursor-pointer`;

// ===== BUTTON PATTERNS =====
export const buttonBase = "px-4 py-2 rounded-lg transition-colors font-medium cursor-pointer";
export const buttonPrimary = `${buttonBase} bg-primary text-primary-foreground hover:bg-primary/90`;
export const buttonSecondary = `${buttonBase} bg-muted text-muted-foreground hover:bg-muted/80`;
export const buttonDanger = `${buttonBase} text-danger hover:bg-danger/10`;
export const buttonGhost = `${buttonBase} bg-transparent hover:bg-muted/50`;

// ===== INPUT PATTERNS =====
export const inputBase = "w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

// ===== AVATAR PATTERNS =====
export const avatarBase = "rounded-full object-cover border-2 border-primary/10 transition-all duration-300";
export const avatarSmall = `${avatarBase} w-8 h-8`;
export const avatarMedium = `${avatarBase} w-12 h-12`;
export const avatarLarge = `${avatarBase} w-16 h-16`;

// ===== LAYOUT PATTERNS =====
export const flexCenter = "flex items-center justify-center";
export const flexBetween = "flex items-center justify-between";
export const flexStart = "flex items-start";
export const flexCol = "flex flex-col";

// ===== TEXT PATTERNS =====
export const textMuted = "text-muted-foreground";
export const textSmall = "text-sm";
export const textXs = "text-xs";
export const textBase = "text-base";
export const textLg = "text-lg";
export const textBold = "font-semibold";
export const textTruncate = "truncate whitespace-nowrap overflow-hidden text-ellipsis";

// ===== SPACING PATTERNS =====
export const spacingXs = "gap-1";
export const spacingSm = "gap-2";
export const spacingMd = "gap-3";
export const spacingLg = "gap-4";
export const spacingXl = "gap-6";

// ===== POST CARD SPECIFIC =====
export const postCardBase = "bg-card text-card-foreground rounded-[1.25rem] shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 mb-6 border border-border/50 relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-primary/30";

// ===== DROPDOWN MENU =====
export const dropdownBase = "absolute bg-card text-foreground border border-[rgb(var(--border-darker))]/50 rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.15)] p-2 z-20 backdrop-saturate-180 backdrop-blur-xl";
export const dropdownItem = "w-full text-left bg-transparent border-none text-foreground py-2 px-3 rounded-lg cursor-pointer text-sm transition-[background,transform] duration-200 hover:bg-muted/50";

