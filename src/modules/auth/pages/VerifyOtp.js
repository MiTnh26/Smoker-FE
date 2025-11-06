import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../../../api/userApi";

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
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">{t('auth.verifyOtpTitle')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-gray-700 text-sm">Email: <b>{email}</b></div>
        <Input
          type="text"
          placeholder={t('auth.enterOtp')}
          value={otp}
          onChange={e => setOtp(e.target.value)}
          required
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <Button type="submit" className="w-full">{t('auth.verifyOtp')}</Button>
      </form>
    </div>
  );
}
