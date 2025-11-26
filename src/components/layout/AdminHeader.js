import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Bell, UserCog, Home, LogOut, Settings, User as UserIcon, Palette, Languages } from "lucide-react";
import { cn } from "../../utils/cn";
import GlobalSearch from "./common/GlobalSearch";
import DropdownPanel from "../common/DropdownPanel";
import { getNextTheme, getThemeLabel } from "../../config/menuConfigs";
import { clearSession } from "../../utils/sessionManager";

export default function AdminHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("session"));
    } catch {
      return null;
    }
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const s = JSON.parse(localStorage.getItem("session"));
        setSession(s);
      } catch {}
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = () => {
    try { clearSession(); } finally { navigate("/login"); }
  };

  const handleToggleTheme = () => {
    const next = getNextTheme(theme);
    setTheme(next);
  };

  const activeEntity = session?.activeEntity || session?.account;
  const displayName = activeEntity?.name || activeEntity?.userName || "Admin";
  const avatar = activeEntity?.avatar;

  return (
    <header className={cn(
      "h-16 flex items-center px-4 md:px-8 sticky top-0 z-10",
      "bg-card border-b border-[0.5px] border-border/20",
      "backdrop-blur-sm"
    )}>
      <div className={cn(
        "flex items-center w-full justify-between mx-auto",
        "max-w-[1400px]"
      )}>
        <Link to="/admin/dashboard" className={cn(
          "text-2xl font-bold no-underline",
          "text-primary hover:opacity-80"
        )}>
          {t("layout.admin", { defaultValue: "Admin" })}
        </Link>

        <div className={cn("flex items-center flex-1 max-w-lg mx-4")}> 
          <GlobalSearch />
        </div>

        <div className={cn("relative flex items-center gap-2")}> 
          <Link to="/admin/dashboard" className={cn(
            "rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}>
            <Home size={20} />
          </Link>
          <button className={cn(
            "rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}>
            <Bell size={20} />
          </button>
          <button
            className={cn(
            "rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
            onClick={() => setIsUserMenuOpen((v) => !v)}
            aria-label="admin-user-menu"
          >
            <UserCog size={20} />
          </button>

          <DropdownPanel
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            title={t("menu.account", { defaultValue: "Tài khoản" })}
          >
            {/* Profile header */}
            <div className="p-4 border-b border-border/20 flex items-center gap-3 bg-card/60">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{t("layout.admin", { defaultValue: "Admin" })}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1.5 flex flex-col">
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/60 text-sm transition-colors no-underline"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <span className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserIcon size={16} />
                </span>
                <span className="flex-1">{t("admin.manageUsers", { defaultValue: "Quản lý người dùng" })}</span>
              </Link>

              <Link
                to="/admin/music"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/60 text-sm transition-colors no-underline"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <span className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-secondary/10 text-secondary">
                  <Settings size={16} />
                </span>
                <span className="flex-1">{t("admin.manageMusic", { defaultValue: "Quản lý nhạc" })}</span>
              </Link>

              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/60 text-left text-sm transition-colors"
                onClick={handleToggleTheme}
              >
                <span className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                  <Palette size={16} />
                </span>
                <span className="flex-1">{t("menu.theme", { defaultValue: "Chế độ giao diện" })}</span>
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground">
                  {getThemeLabel(theme, t)}
                </span>
              </button>

              <Link
                to="/admin/settings/language"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/60 text-sm transition-colors no-underline"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <span className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                  <Languages size={16} />
                </span>
                <span className="flex-1">{t("menu.language", { defaultValue: "Ngôn ngữ" })}</span>
              </Link>

              <div className="my-1 border-t border-border/20" />

              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-destructive/10 text-left text-sm text-destructive transition-colors"
                onClick={handleLogout}
              >
                <span className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <LogOut size={16} />
                </span>
                <span className="flex-1">{t("menu.logout", { defaultValue: "Đăng xuất" })}</span>
              </button>
            </div>
          </DropdownPanel>
        </div>
      </div>
    </header>
  );
}

