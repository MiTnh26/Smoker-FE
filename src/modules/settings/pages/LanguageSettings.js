import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../../components/common/LanguageSwitcher";
import "../../../styles/modules/settings/settings.css";

export default function LanguageSettings() {
  const { i18n, t } = useTranslation();
  const browser = (navigator.language || "en").toUpperCase();

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>{t('common.language') || 'Language'}</h1>
        <p className="text-muted">Language and region</p>
      </header>

      <div className="settings-grid">
        <section className="settings-card">
          <h2>App Language</h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-title">Current</div>
              <div className="settings-item-desc">{i18n.language?.toUpperCase()}</div>
            </div>
            <LanguageSwitcher />
          </div>
        </section>

        <section className="settings-card">
          <h2>Browser</h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-title">Navigator language</div>
              <div className="settings-item-desc">{browser}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


