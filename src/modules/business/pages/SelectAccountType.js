import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../../styles/modules/selectAccountType.css";

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
      <div className="select-account-type-container">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">{t('register.allAccountTypesRegistered')}</h2>
          <p className="text-gray-600 mb-4">{t('register.allAccountTypesDesc')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="select-account-type-container">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('register.checking')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="select-account-type-container">
      <h2 className="text-2xl font-bold mb-4 text-center">{t('register.selectAccountType')}</h2>

      <div className="account-type-grid">
        {!hasBar && (
          <button onClick={() => handleSelect("bar")} className="account-type-card">
            <h3>{t('register.registerBar')}</h3>
            <p>{t('register.registerBarDesc')}</p>
          </button>
        )}

        {!hasDJ && (
          <button onClick={() => handleSelect("dj")} className="account-type-card">
            <h3>{t('register.registerDJ')}</h3>
            <p>{t('register.registerDJDesc')}</p>
          </button>
        )}

        {!hasDancer && (
          <button onClick={() => handleSelect("dancer")} className="account-type-card">
            <h3>{t('register.registerDancer')}</h3>
            <p>{t('register.registerDancerDesc')}</p>
          </button>
        )}
      </div>

      {/* Show message if all cards are hidden */}
      {(hasBar || hasDJ || hasDancer) && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-blue-700">
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
