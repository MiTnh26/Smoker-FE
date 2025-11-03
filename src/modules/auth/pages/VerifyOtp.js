import React, { useState } from "react";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await authApi.verifyOtp({ email, otp });
      setSuccess("Xác thực OTP thành công. Đang chuyển sang đổi mật khẩu...");
      setTimeout(() => navigate("/reset-password", { state: { email } }), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || "Xác thực OTP thất bại");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Xác thực OTP</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-gray-700 text-sm">Email: <b>{email}</b></div>
        <Input
          type="text"
          placeholder="Nhập mã OTP"
          value={otp}
          onChange={e => setOtp(e.target.value)}
          required
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <Button type="submit" className="w-full">Xác thực OTP</Button>
      </form>
    </div>
  );
}
