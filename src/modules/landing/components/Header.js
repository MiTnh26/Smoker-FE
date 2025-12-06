import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";

export function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const goHome = () => {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "null");
      if (session && (session.account || session.activeEntity)) {
        navigate("/customer/newsfeed");
      } else {
        navigate("/");
      }
    } catch {
      navigate("/");
    }
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50",
      "h-[73px]",
      "border-b border-[0.5px] border-border/30",
      "bg-background/95 backdrop-blur-sm",
      "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    )}>
      <div className={cn(
        "container mx-auto h-full px-4",
        "flex items-center justify-between"
      )}>
        <button
          type="button"
          onClick={goHome}
          className={cn(
            "cursor-pointer",
            "transition-opacity duration-200",
            "hover:opacity-80",
            "bg-transparent border-none"
          )}
        >
          
          <img 
              src="/13.png" 
              alt="Smoker Page" 
              className="h-12 w-auto sm:h-6 md:h-12"
            />
        </button>
        <div className={cn("flex items-center gap-3")}>
          <button
            className={cn(
              "bg-transparent border-none cursor-pointer",
              "text-foreground font-semibold",
              "px-4 py-2 rounded-lg",
              "transition-all duration-200",
              "hover:text-primary hover:bg-primary/10",
              "active:scale-95"
            )}
            onClick={() => navigate("/login")}
          >
            {t('auth.login')}
          </button>
          <button
            className={cn(
              "bg-primary text-primary-foreground border-none",
              "px-4 py-2 rounded-lg font-semibold",
              "transition-all duration-200",
              "hover:bg-primary/90",
              "active:scale-95"
            )}
            onClick={() => navigate("/register")}
          >
            {t('auth.signUp')}
          </button>
        </div>
      </div>
    </header>
  );
}
