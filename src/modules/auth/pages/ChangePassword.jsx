import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/userApi';
import { Input } from "../../../components/common/Input";
import PublicHeader from "../../../components/layout/PublicHeader";
import { cn } from "../../../utils/cn";

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
    <div className="bg-background text-foreground">
      <PublicHeader />
      <div className="container mx-auto min-h-[calc(100vh-73px)] px-4 pt-[73px] pb-12 flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border-[0.5px] border-border/20 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h2 className="mb-2 text-2xl font-semibold text-center">Đổi mật khẩu</h2>
          <p className="mb-4 text-center text-sm text-muted-foreground">Cập nhật mật khẩu để đảm bảo an toàn tài khoản.</p>
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
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;