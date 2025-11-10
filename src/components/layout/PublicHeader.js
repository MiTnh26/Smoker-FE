import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { cn } from "../../utils/cn";

export default function PublicHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onPrimaryClick = () => {
    if (pathname.startsWith("/register")) {
      navigate("/login");
    } else if (pathname.startsWith("/login")) {
      navigate("/register");
    } else {
      navigate("/register");
    }
  };

  const primaryLabel = pathname.startsWith("/register")
    ? "Đăng nhập"
    : pathname.startsWith("/login")
    ? "Đăng ký"
    : "Đăng ký";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "h-[73px]",
        "border-b border-[0.5px] border-border/30",
        "bg-background/95 backdrop-blur-sm",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
      )}
    >
      <div
        className={cn(
          "container mx-auto h-full px-4",
          "flex items-center justify-between"
        )}
      >
        <Link
          to="/"
          className={cn(
            "text-2xl font-bold text-primary cursor-pointer",
            "transition-all duration-200 hover:text-primary/90"
          )}
        >
          Smoker
        </Link>
        <div className="flex items-center gap-3">
          {!pathname.startsWith("/login") && (
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
              Đăng nhập
            </button>
          )}
          <button
            className={cn(
              "bg-primary text-primary-foreground border-none",
              "px-4 py-2 rounded-lg font-semibold",
              "transition-all duration-200",
              "hover:bg-primary/90",
              "active:scale-95"
            )}
            onClick={onPrimaryClick}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </header>
  );
}


