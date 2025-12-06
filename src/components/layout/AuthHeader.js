import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "../../utils/cn";

export default function AuthHeader() {
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
      "bg-background border-none",
      "shadow-none"
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
            "hover:opacity-90",
            "bg-transparent border-none"
          )}
        >
          <img src="/logo3.png" alt={t('layout.brand')} className="h-8 w-auto" />
        </button>
      </div>
    </header>
  );
}

