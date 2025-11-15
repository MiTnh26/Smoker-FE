import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../components/common/Input";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../../../api/userApi";
import PublicHeader from "../../../components/layout/PublicHeader";
import { cn } from "../../../utils/cn";

export default function VerifyOtp() {
  const location = useLocation();
  const email = location.state?.email || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await authApi.verifyOtp({ email, otp });
      setSuccess(t('auth.otpSent'));
      setTimeout(() => navigate("/reset-password", { state: { email } }), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || t('auth.registerFailed'));
    }
  };

  return (
    <div className="bg-background text-foreground">
      <PublicHeader />
      <div className="container mx-auto min-h-[calc(100vh-73px)] px-4 pt-[73px] pb-12 flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border-[0.5px] border-border/20 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h2 className="mb-2 text-2xl font-semibold">{t('auth.verifyOtpTitle')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('auth.verifyOtpSubtitle', 'Nhập mã OTP đã gửi đến email của bạn.')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Email: <b className="text-foreground">{email}</b>
            </div>
            <Input
              type="text"
              placeholder={t('auth.enterOtp')}
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
            />
            {error ? <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}
            {success ? <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</div> : null}
            <button
              type="submit"
              className={cn(
                "w-full bg-primary text-primary-foreground border-none",
                "rounded-lg py-2.5 font-semibold transition-all duration-200",
                "hover:bg-primary/90 active:scale-95"
              )}
            >
              {t('auth.verifyOtp')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
