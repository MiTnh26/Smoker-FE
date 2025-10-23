import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/userApi';
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
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
      setSuccess('Mã OTP đã được gửi về email. Đang chuyển sang bước xác thực OTP...');
      setTimeout(() => {
        navigate('/verify-otp', { state: { email } });
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Quên mật khẩu</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Nhập email của bạn"
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
          {loading ? 'Đang xử lý...' : 'Gửi yêu cầu'}
        </Button>

        <div className="text-center mt-4">
          <Link to="/auth/login" className="text-blue-600 hover:text-blue-800">
            Quay lại đăng nhập
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;