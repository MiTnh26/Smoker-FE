import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { authApi, userApi } from "../../../api/userApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { fetchAllEntities } from "../../../utils/sessionHelper";

export default function GoogleLoginButton() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSuccess = async (credentialResponse) => {
    try {
      const idToken = credentialResponse.credential;
      const data = await authApi.googleLogin({ idToken });
  
      if (data?.token) {
        await login({ token: data.token, user: data.user });
      
        // Fetch all entities (bars, businesses)
        const entities = await fetchAllEntities(data.user.id, data.user);
      
        // Fetch EntityAccountId for Account entity
        let accountEntityAccountId = null;
        try {
          console.log("[GoogleLogin] Fetching EntityAccountId for AccountId:", data.user.id);
          const entityAccountRes = await userApi.getEntityAccountId(data.user.id);
          accountEntityAccountId = entityAccountRes?.data?.data?.EntityAccountId || entityAccountRes?.data?.EntityAccountId || null;
          console.log("[GoogleLogin] Fetched EntityAccountId:", accountEntityAccountId);
          
          if (!accountEntityAccountId) {
            console.warn("[GoogleLogin] EntityAccountId is null, response:", entityAccountRes);
          }
        } catch (err) {
          console.error("[GoogleLogin] Failed to fetch EntityAccountId for Account:", err);
          console.error("[GoogleLogin] Error details:", err?.response?.data || err?.message);
        }
        
        // Find Account entity in entities array and update it with EntityAccountId
        const accountEntity = entities.find(e => e.type === "Account");
        if (accountEntity && accountEntityAccountId) {
          accountEntity.EntityAccountId = accountEntityAccountId;
        }
      
        // ✅ Initialize session using sessionManager
        const { initializeSession } = await import("../../../utils/sessionManager");
        initializeSession({
          token: data.token,
          user: data.user,
          entities: entities,
          entityAccountId: accountEntityAccountId
        });
      
        setMessage(t('auth.googleLoginSuccess'));
        setError("");
        
        if (data.needProfile) {
          setTimeout(() => navigate("/profile-setup", { replace: true }), 800);
        } else {
          setTimeout(() => navigate("/customer/newsfeed", { replace: true }), 800);
        }
  
      } else if (data?.message) {
        setMessage(data.message);
        setError("");
      } else {
        setError(t('auth.googleAuthFailed'));
        setMessage("");
      }
    } catch (err) {
      setError(err?.response?.data?.message || t('auth.googleAuthFailed'));
      setMessage("");
    }
  };
  

  return (
    <div className="google-login-page">
      <style>{`
        .google-login-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f2f5fa;
          padding: 16px;
        }
        .google-login-card {
          background: #fff;
          max-width: 420px;
          width: 100%;
          padding: 2rem 1.5rem;
          margin: 0 auto;
          border-radius: 16px;
          box-shadow: 0 2px 16px rgba(60, 60, 130, 0.09), 0 1.5px 8px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 1.7rem;
        }
        .google-login-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 4px 0;
          text-align: center;
          color: #24292f;
          letter-spacing: -0.01em;
        }
        .google-login-subtitle {
          font-size: 1.05rem;
          color: #697179;
          text-align: center;
          font-weight: 400;
          margin-bottom: 8px;
        }
        .google-login-messages {
          min-height: 28px;
        }
        .google-login-error {
          background: #fdecea;
          color: #d92d20;
          border: 1px solid #faa7a2;
          border-radius: 7px;
          padding: 0.6em 0.9em;
          font-size: 1rem;
          text-align: center;
          margin-bottom: 0.4em;
        }
        .google-login-success {
          background: #e9fbe7;
          color: #148414;
          border: 1px solid #84e4a1;
          border-radius: 7px;
          padding: 0.6em 0.9em;
          font-size: 1rem;
          text-align: center;
          margin-bottom: 0.4em;
        }
        .google-btn-wrapper {
          display: flex;
          justify-content: center;
        }
        .google-btn-wrapper > div {
          box-shadow: 0 2px 8px rgba(60, 60, 130, 0.08);
          border-radius: 7px;
        }
        @media (max-width: 600px) {
          .google-login-card {
            padding: 1.25rem 0.6rem;
            border-radius: 10px;
          }
          .google-login-title {
            font-size: 1.3rem;
          }
        }
      `}</style>
      <div className="google-login-card">
        <div>
          <h2 className="google-login-title">{t('auth.loginWithGoogle')}</h2>
          <div className="google-login-subtitle">
            {t('auth.googleLoginSubtitle')}
          </div>
        </div>
        <div className="google-login-messages">
          {error && <div className="google-login-error">{error}</div>}
          {message && !error && <div className="google-login-success">{message}</div>}
        </div>
        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError(t('auth.googleLoginFailed'))}
            width="320"
            size="large"
            shape="pill"
            text="signin_with"
            theme="outline"
            useOneTap
          />
        </div>
      </div>
    </div>
  );
}
