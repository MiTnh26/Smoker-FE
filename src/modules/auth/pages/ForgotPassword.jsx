import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/userApi';
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";

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
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">{t('auth.forgotTitle')}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.enterEmail')}
          required
        />

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {success && (
          <div className="text-green-500 text-sm">{success}</div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? t('auth.sending') : t('auth.sendRequest')}
        </Button>

        <div className="text-center mt-4">
          <Link to="/auth/login" className="text-blue-600 hover:text-blue-800">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;