import React from "react";
import { Button } from "../../common/Button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";

export default function AuthHeader() {
 const navigate = useNavigate();
 const { t } = useTranslation();

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 border-b border-border/20",
      "bg-background backdrop-blur-sm"
    )}>
      <div className={cn(
        "container mx-auto px-4 py-4",
        "flex items-center justify-between"
      )}>
        <span className={cn(
          "text-2xl font-bold text-primary"
        )}>
          Smoker
        </span>
        <div className={cn("flex items-center gap-3")}>
          <Button
            size="default"
            className={cn(
              "rounded-lg bg-primary text-primary-foreground",
              "border-none hover:bg-primary/90",
              "transition-all duration-200"
            )}
            onClick={() => navigate("/login")}
          >
            {t('auth.login')}
          </Button>
          <Button
            size="default"
            className={cn(
              "rounded-lg bg-secondary text-secondary-foreground",
              "border-none hover:bg-secondary/90",
              "transition-all duration-200"
            )}
            onClick={() => navigate("/register")}
          >
            {t('auth.signUp')}
          </Button>
        </div>
      </div>
    </header>
  );
}
