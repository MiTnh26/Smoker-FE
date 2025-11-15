import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";

export default function SelectAccountType() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hasBar, setHasBar] = useState(false);
  const [hasDJ, setHasDJ] = useState(false);
  const [hasDancer, setHasDancer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check which entities user already has
  useEffect(() => {
    const checkExistingEntities = () => {
      try {
        const session = JSON.parse(localStorage.getItem("session"));
        if (!session || !session.entities) {
          setLoading(false);
          return;
        }

        const entities = session.entities || [];
        
        // Check for Bar
        const hasBarEntity = entities.some(
          (e) => e.type === "BarPage" || (e.type === "Business" && e.role?.toLowerCase() === "bar")
        );
        setHasBar(hasBarEntity);

        // Check for DJ
        const hasDJEntity = entities.some(
          (e) => e.role?.toLowerCase() === "dj" || (e.type === "Business" && e.role?.toLowerCase() === "dj")
        );
        setHasDJ(hasDJEntity);

        // Check for Dancer
        const hasDancerEntity = entities.some(
          (e) => e.role?.toLowerCase() === "dancer" || (e.type === "Business" && e.role?.toLowerCase() === "dancer")
        );
        setHasDancer(hasDancerEntity);

        // If user has all three, redirect to newsfeed
        if (hasBarEntity && hasDJEntity && hasDancerEntity) {
          setTimeout(() => {
            navigate("/customer/newsfeed", { replace: true });
          }, 1000);
        }
      } catch (error) {
        console.error("[SelectAccountType] Error checking entities:", error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingEntities();

    // Listen for profile updates (when registration completes)
    const handleProfileUpdate = () => {
      checkExistingEntities();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("profileUpdated", handleProfileUpdate);
      window.addEventListener("storage", handleProfileUpdate);

      return () => {
        window.removeEventListener("profileUpdated", handleProfileUpdate);
        window.removeEventListener("storage", handleProfileUpdate);
      };
    }
  }, [navigate]);

  const handleSelect = (type) => {
    if (type === "bar") navigate("/register/bar");
    else if (type === "dj") navigate("/register/dj");
    else if (type === "dancer") navigate("/register/dancer");
  };

  // If user has all three types, show message
  if (hasBar && hasDJ && hasDancer) {
    return (
      <div className={cn(
        "container mx-auto px-4 py-8 max-w-4xl"
      )}>
        <div className={cn("text-center py-8")}>
          <h2 className={cn(
            "text-2xl font-bold mb-4 text-foreground"
          )}>
            {t('register.allAccountTypesRegistered')}
          </h2>
          <p className={cn(
            "text-muted-foreground mb-4"
          )}>
            {t('register.allAccountTypesDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn(
        "container mx-auto px-4 py-8 max-w-4xl"
      )}>
        <div className={cn("text-center py-8")}>
          <div className={cn(
            "animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"
          )}></div>
          <p className={cn("mt-4 text-muted-foreground")}>
            {t('register.checking')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "container mx-auto px-4 py-8 max-w-4xl"
    )}>
      <h2 className={cn(
        "text-2xl font-bold mb-6 text-center text-foreground"
      )}>
        {t('register.selectAccountType')}
      </h2>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
      )}>
        {!hasBar && (
          <button 
            onClick={() => handleSelect("bar")} 
            className={cn(
              "p-6 rounded-lg bg-card border-[0.5px] border-border/20",
              "text-left transition-all duration-200",
              "hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
              "active:scale-[0.98]"
            )}
          >
            <h3 className={cn(
              "text-lg font-semibold mb-2 text-foreground"
            )}>
              {t('register.registerBar')}
            </h3>
            <p className={cn(
              "text-sm text-muted-foreground"
            )}>
              {t('register.registerBarDesc')}
            </p>
          </button>
        )}

        {!hasDJ && (
          <button 
            onClick={() => handleSelect("dj")} 
            className={cn(
              "p-6 rounded-lg bg-card border-[0.5px] border-border/20",
              "text-left transition-all duration-200",
              "hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
              "active:scale-[0.98]"
            )}
          >
            <h3 className={cn(
              "text-lg font-semibold mb-2 text-foreground"
            )}>
              {t('register.registerDJ')}
            </h3>
            <p className={cn(
              "text-sm text-muted-foreground"
            )}>
              {t('register.registerDJDesc')}
            </p>
          </button>
        )}

        {!hasDancer && (
          <button 
            onClick={() => handleSelect("dancer")} 
            className={cn(
              "p-6 rounded-lg bg-card border-[0.5px] border-border/20",
              "text-left transition-all duration-200",
              "hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
              "active:scale-[0.98]"
            )}
          >
            <h3 className={cn(
              "text-lg font-semibold mb-2 text-foreground"
            )}>
              {t('register.registerDancer')}
            </h3>
            <p className={cn(
              "text-sm text-muted-foreground"
            )}>
              {t('register.registerDancerDesc')}
            </p>
          </button>
        )}
      </div>

      {/* Show message if all cards are hidden */}
      {(hasBar || hasDJ || hasDancer) && (
        <div className={cn(
          "mt-6 p-4 rounded-lg text-center",
          "bg-primary/10 border-[0.5px] border-primary/20"
        )}>
          <p className={cn("text-sm text-primary")}>
            {hasBar && hasDJ && hasDancer
              ? t('register.allRegisteredRedirecting')
              : t('register.alreadyRegistered', { 
                  types: [
                    hasBar && "Bar",
                    hasDJ && "DJ",
                    hasDancer && "Dancer"
                  ].filter(Boolean).join(", ")
                })}
          </p>
        </div>
      )}
    </div>
  );
}
