import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/userApi';
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { currentPassword, newPassword, confirmPassword } = formData;
      await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess('Đổi mật khẩu thành công');
      
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Chuyển về trang login sau 2 giây
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Đổi mật khẩu</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          placeholder="Mật khẩu hiện tại"
          required
        />

        <Input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Mật khẩu mới"
          required
        />

        <Input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Xác nhận mật khẩu mới"
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
          {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
        </Button>
      </form>
    </div>
  );
};

export default ChangePassword;