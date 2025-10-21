import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FacebookLogin from 'react-facebook-login';
import { authApi } from '../../../api/userApi';

const FacebookLoginButton = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleFacebookResponse = async (response) => {
    if (response.accessToken) {
      try {
        // Thử đăng nhập
        const loginResult = await authApi.facebookLogin(response.accessToken);
        // Lưu token
        localStorage.setItem('token', loginResult.data.token);
        // Redirect tùy theo role hoặc needProfile
        if (loginResult.data.needProfile) {
          navigate('/profile/setup');
        } else {
          // Redirect dựa vào role
          const role = loginResult.data.user.role;
          switch (role) {
            case 'admin':
              navigate('/admin/dashboard');
              break;
            case 'customer':
              navigate('/customer/dashboard');
              break;
            default:
              navigate('/');
          }
        }
      } catch (error) {
        if (error.response?.status === 404) {
          try {
            // Nếu tài khoản chưa tồn tại, thực hiện đăng ký
            const registerResult = await authApi.facebookRegister(response.email);
            setError(registerResult.data.message || 'Vui lòng kiểm tra email để lấy mật khẩu');
          } catch (registerError) {
            setError(registerError.response?.data?.message || 'Đăng ký thất bại');
          }
        } else {
          setError(error.response?.data?.message || 'Đăng nhập thất bại');
        }
      }
    }
  };

  return (
    <div className="w-full">
      <FacebookLogin
        appId={process.env.REACT_APP_FACEBOOK_APP_ID}
        autoLoad={false}
        fields="name,email,picture"
        callback={handleFacebookResponse}
        cssClass="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        icon="fa-facebook"
        textButton="Đăng nhập bằng Facebook"
      />
      
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
};

export default FacebookLoginButton;