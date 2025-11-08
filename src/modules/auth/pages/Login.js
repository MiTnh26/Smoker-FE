import React, { useState } from "react"; // ✅ import useState
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Link } from "react-router-dom";
import "../../../styles/modules/auth.css";

import { useNavigate } from "react-router-dom";
import { authApi, userApi } from "../../../api/userApi";
import { useAuth } from "../../../hooks/useAuth";
import FacebookLoginButton from '../pages/FacebookLoginButton';
import { fetchAllEntities } from "../../../utils/sessionHelper";

export function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Google login uses button only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await authApi.login(email, password);
      if (res && res.token) {
        await login({ token: res.token, user: res.user });
        
        // Fetch all entities (bars, businesses)
        const entities = await fetchAllEntities(res.user.id, res.user);
        
        // Fetch EntityAccountId for Account entity
        let accountEntityAccountId = null;
        try {
          console.log("[Login] Fetching EntityAccountId for AccountId:", res.user.id);
          const entityAccountRes = await userApi.getEntityAccountId(res.user.id);
          accountEntityAccountId = entityAccountRes?.data?.data?.EntityAccountId || entityAccountRes?.data?.EntityAccountId || null;
          console.log("[Login] Fetched EntityAccountId:", accountEntityAccountId);
          
          if (!accountEntityAccountId) {
            console.warn("[Login] EntityAccountId is null, response:", entityAccountRes);
          }
        } catch (err) {
          console.error("[Login] Failed to fetch EntityAccountId for Account:", err);
          console.error("[Login] Error details:", err?.response?.data || err?.message);
        }
        
        // Find Account entity in entities array and update it with EntityAccountId
        const accountEntity = entities.find(e => e.type === "Account");
        if (accountEntity && accountEntityAccountId) {
          accountEntity.EntityAccountId = accountEntityAccountId;
        }
        
        // ✅ Initialize session using sessionManager
        const { initializeSession } = await import("../../../utils/sessionManager");
        initializeSession({
          token: res.token,
          user: res.user,
          entities: entities,
          entityAccountId: accountEntityAccountId
        });
        if (!res.needProfile) {
          navigate("/customer/newsfeed", { replace: true });
        } else {
          navigate("/profile-setup", { replace: true });
        }
      } else {
        setError(res?.message || t('auth.loginFailed'));
      }
    } catch (err) {
      setError(err?.response?.data?.message || t('auth.loginFailed'));
    }
  };

  // const handleGoogleLogin = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   try {
  //     const res = await authApi.googleLogin();
  //     if (res && res.token) {
  //       await login({ token: res.token, user: res.user });
  //       if (!res.needProfile) {
  //         navigate("/customer/newsfeed", { replace: true });
  //       } else {
  //         navigate("/profile-setup", { replace: true });
  //       }
  //     } else {
  //       setError(res?.message || "Đăng nhập thất bại");
  //     }
  //   } catch (err) {
  //     setError(err?.response?.data?.message || "Đăng nhập thất bại");
  //   }
  // };

  return (
    <div className="login-page">


      <div className="login-form-container">
        <div className="login-wrapper">
          {/* Logo Section */}
          <div className="login-logo">
            <Link to="/">Smoker</Link>
          </div>

          {/* Login Form */}
          <div className="login-form-box">
            <form className="login-form space-y-4" onSubmit={handleSubmit}>
              <Input
                type="text"
                placeholder={t('auth.emailOrPhone')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div style={{ position: "relative" }}>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: "38px" }}
                />
                <span
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    color: "#666",
                    fontSize: 18,
                    userSelect: "none",
                  }}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" || e.key === " ") setShowPassword((v) => !v);
                  }}
                >
                  {showPassword ? (
                    // 👁️ Eye Open
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    // 👁️ Eye Closed
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-7 0-11-7-11-7a21.75 21.75 0 0 1 5.06-5.94" />
                      <path d="m1 1 22 22" />
                    </svg>
                  )}
                </span>

              </div>

              {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}

              <Button type="submit" className="login-btn">
                {t('auth.login')}
              </Button>

              <div className="forgot-link">
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800">
                  {t('auth.forgot')}
                </Link>
              </div>

              <div className="divider">
                <div className="divider-line"></div>
              </div>

              {/* Google Login simple flow */}
              <div style={{ fontSize: 12, color: "#555" }}>
                {t('auth.googleHow')}
              </div>
              <Button type="button" className="login-btn" onClick={() => navigate("/login/google")}>
                {t('auth.loginWithGoogle')}
              </Button>

              <div className="mt-2">
                <FacebookLoginButton />
              </div>

              <Button type="button" className="create-account-btn">
                <Link to="/signup">{t('auth.createAccount')}</Link>
              </Button>
            </form>

            <div className="login-footer">
              <Link to="/create-page">{t('auth.createPage')}</Link> {t('auth.createPageFor')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
