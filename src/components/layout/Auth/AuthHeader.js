import React from "react";
import { Button } from "../../common/Button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "../../../styles/layouts/header.css";

export default function AuthHeader() {
 const navigate = useNavigate();
 const { t } = useTranslation();

  return (
    <header className="header">
      <div className="header-container">
        <span className="header-title">Smoker</span>
        <div className="header-buttons">
          <Button
            size="default"
            className="btn-login rounded-xl"
            onClick={() => navigate("/login")}
          >
            {t('auth.login')}
          </Button>
          <Button
            size="default"
            className="btn-register rounded-xl"
            onClick={() => navigate("/register")}
          >
            {t('auth.signUp')}
          </Button>
        </div>
      </div>
    </header>
  );
}
