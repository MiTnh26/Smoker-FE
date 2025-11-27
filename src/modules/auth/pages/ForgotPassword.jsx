import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/userApi';
import { Input } from "../../../components/common/Input";
import AuthHeader from "../../../components/layout/AuthHeader";
import { cn } from "../../../utils/cn";

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authApi.forgotPassword(email);
      setSuccess(t('auth.otpSent'));
      setTimeout(() => {
        navigate('/verify-otp', { state: { email } });
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <AuthHeader />
      <div className="container mx-auto min-h-[calc(100vh-73px)] px-4 pt-[73px] pb-12 flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border-[0.5px] border-border/20 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h2 className="mb-2 text-2xl font-semibold">{t('auth.forgotTitle')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('auth.forgotSubtitle', 'Nhập email để nhận mã xác thực OTP.')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.enterEmail')}
              required
            />

            {error ? <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}
            {success ? <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full bg-primary text-primary-foreground border-none",
                "rounded-lg py-2.5 font-semibold",
                "transition-all duration-200",
                "hover:bg-primary/90 active:scale-95",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? t('auth.sending') : t('auth.sendRequest')}
            </button>

            <div className="mt-4 text-center">
              <Link to="/login" className="font-semibold text-primary hover:text-primary/90">
                {t('auth.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;