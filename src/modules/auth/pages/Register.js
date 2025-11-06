import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Link, useNavigate } from "react-router-dom";
import "../../../styles/modules/register.css";
import { Checkbox } from "../../../components/common/Checkbox";
import { authApi } from "../../../api/userApi";

export function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!agreed) return;
    try {
      const res = await authApi.register(email, password, confirmPassword);
      if (res && res.message) {
        setSuccess(t('auth.registerSuccess'));
        setTimeout(() => navigate("/"), 1000);
      } else {
        setError(res?.message || t('auth.registerFailed'));
      }
    } catch (err) {
      const msg =
        err?.response?.status === 409
          ? t('auth.emailExists')
          : err?.response?.data?.message || t('auth.registerFailed');
      setError(msg);
    }
  };

  const handleGoogleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email) {
      setError(t('auth.pleaseEnterEmail'));
      return;
    }
    try {
      const response = await authApi.googleRegister({ email });
      if (response.status === "NEW_USER") {
        setSuccess(response.message);
      } else if (response.status === "EXISTING_USER") {
        setError(response.message);
      } else {
        setError(t('auth.registerFailed'));
      }
    } catch (err) {
      const msg =
        err?.response?.status === 409
          ? t('auth.emailExists')
          : err?.response?.data?.message || t('auth.registerFailed');
      console.error("Google register failed:", err);
      setError(msg);
    }
  };

  const handleFacebookRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email) {
      setError(t('auth.pleaseEnterEmail'));
      return;
    }
    try {
      const response = await authApi.facebookRegister(email);
      if (response.status === "NEW_USER") {
        setSuccess(response.message);
      } else if (response.status === "EXISTING_USER") {
        setError(response.message);
      } else {
        setError(t('auth.registerFailed'));
      }
    } catch (err) {
      const msg =
        err?.response?.status === 409
          ? t('auth.emailExists')
          : err?.response?.data?.message || t('auth.registerFailed');
      console.error("Facebook register failed:", err);
      setError(msg);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-form-container">
        <div className="signup-wrapper">
          {/* Logo */}
          <div className="signup-logo">
            <Link to="/">Smoker</Link>
          </div>

          {/* Signup Form */}
          <div className="signup-form-box">
            <form className="signup-form space-y-5" onSubmit={handleSubmit}>
              <Input
                type="email"
                placeholder={t('auth.email') + ' (example@gmail.com)'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* Password field with eye icon */}
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
                  }}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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

              {/* Confirm password field with eye icon */}
              <div style={{ position: "relative" }}>
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder={t('auth.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: "38px" }}
                />
                <span
                  onClick={() => setShowConfirm((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    color: "#666",
                  }}
                  aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showConfirm ? (
                    // Eye open
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
                    // Eye closed
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
              {success && (
                <div style={{ color: "green", fontSize: 12 }}>{success}</div>
              )}

              <div className="terms">
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label>
                  {t('auth.termsAgree')}
                </label>
              </div>

              <div className="divider">
                <div className="divider-line"></div>
              </div>

              <div style={{ fontSize: 12, color: "#555" }}>
                {t('auth.googleRegisterHow')}
              </div>

              <Button
                type="button"
                className="signup-btn"
                onClick={handleGoogleRegister}
              >
                {t('auth.registerWithGoogle')}
              </Button>

              <div style={{ fontSize: 12, color: "#555", marginTop: "10px" }}>
                {t('auth.facebookRegisterHow')}
              </div>

              <Button
                type="button"
                className="signup-btn"
                onClick={handleFacebookRegister}
                style={{ backgroundColor: "#1877f2" }}
              >
                {t('auth.registerWithFacebook')}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {t('auth.alreadyHave')} {" "}
                <Link to="/login" className="text-primary">
                  {t('auth.loginLink')}
                </Link>
              </div>

              <Button type="submit" className="signup-btn" disabled={!agreed}>
                {t('auth.signUp')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
