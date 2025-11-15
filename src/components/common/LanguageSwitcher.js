import React from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../i18n";

// Small, self-contained language switcher (does not affect existing logic)
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language || "en";

  const handleChange = (lang) => {
    setLanguage(lang);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        onClick={() => handleChange("en")}
        className={`btn-outline ${current.startsWith("en") ? "active" : ""}`}
        aria-label="Switch to English"
      >
        🇬🇧 English
      </button>
      <button
        type="button"
        onClick={() => handleChange("vi")}
        className={`btn-outline ${current.startsWith("vi") ? "active" : ""}`}
        aria-label="Chuyển sang Tiếng Việt"
      >
        🇻🇳 Tiếng Việt
      </button>
    </div>
  );
}


