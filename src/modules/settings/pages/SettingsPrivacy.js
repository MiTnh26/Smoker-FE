import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // i18n: translate UI strings
import LanguageSwitcher from "../../../components/common/LanguageSwitcher"; // i18n: language buttons
import "../../../styles/modules/settings/settings.css";

export default function SettingsPrivacyPage() {
  const { t } = useTranslation();
  const [emailVisibility, setEmailVisibility] = useState("friends");
  const [phoneVisibility, setPhoneVisibility] = useState("onlyme");
  const [twoFA, setTwoFA] = useState(false);

  return (
    <div className="settings-container">
        <header className="settings-header">
          <h1>{t('settings.title')}</h1>
          <p className="text-muted">{t('settings.subtitle')}</p>
          {/* i18n: simple language switcher */}
          <LanguageSwitcher />
        </header>

        <div className="settings-grid">
          <section className="settings-card">
            <h2>{t('settings.account')}</h2>
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-title">{t('settings.displayName')}</div>
                <div className="settings-item-desc">{t('settings.updateNameDesc')}</div>
              </div>
              <button className="btn-primary">{t('settings.edit')}</button>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-title">{t('settings.changePassword')}</div>
                <div className="settings-item-desc">{t('settings.passwordDesc')}</div>
              </div>
              <button className="btn-outline">{t('settings.configure')}</button>
            </div>
          </section>

          <section className="settings-card">
            <h2>{t('settings.security')}</h2>
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-title">{t('settings.twofa')}</div>
                <div className="settings-item-desc">{t('settings.twofaDesc')}</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={twoFA} onChange={(e) => setTwoFA(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
          </section>

          <section className="settings-card">
            <h2>{t('settings.privacy')}</h2>
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-title">{t('settings.emailVisibility')}</div>
                <div className="settings-item-desc">{t('settings.whoSeeEmail')}</div>
              </div>
              <select className="select" value={emailVisibility} onChange={(e) => setEmailVisibility(e.target.value)}>
                <option value="public">{t('settings.everyone')}</option>
                <option value="friends">{t('settings.friends')}</option>
                <option value="onlyme">{t('settings.onlyme')}</option>
              </select>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-title">{t('settings.phoneVisibility')}</div>
                <div className="settings-item-desc">{t('settings.whoSeePhone')}</div>
              </div>
              <select className="select" value={phoneVisibility} onChange={(e) => setPhoneVisibility(e.target.value)}>
                <option value="public">{t('settings.everyone')}</option>
                <option value="friends">{t('settings.friends')}</option>
                <option value="onlyme">{t('settings.onlyme')}</option>
              </select>
            </div>
          </section>
        </div>
      </div>
  );
}


