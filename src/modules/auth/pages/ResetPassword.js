import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../../api/userApi";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await authApi.resetPassword({ email, newPassword, confirmPassword });
      setSuccess(t('auth.resetSuccess'));
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || t('auth.resetFailed'));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">{t('auth.resetTitle')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          placeholder={t('auth.newPassword')}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder={t('auth.confirmNewPassword')}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <Button type="submit" className="w-full">{t('auth.resetTitle')}</Button>
      </form>
    </div>
  );
}
