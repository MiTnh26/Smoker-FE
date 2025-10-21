import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FacebookLogin from 'react-facebook-login';
import { authApi } from '../../../api/userApi';
import { useAuth } from '../../../hooks/useAuth';

const FacebookLoginButton = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleFacebookResponse = async (response) => {
    if (response.accessToken) {
      // Log Facebook access token
      console.log('Facebook Access Token:', response.accessToken);
      console.log('Facebook Response:', response);
      
      try {
        // Thử đăng nhập
        const loginResult = await authApi.facebookLogin(response.accessToken);
        // Log backend response
        console.log('Backend Login Response:', loginResult);
        console.log('Backend Token:', loginResult.data.token);
        
        // Cập nhật context với thông tin user và token
        await login({
          token: loginResult.data.token,
          user: loginResult.data.user
        });

        // Lưu token
        localStorage.setItem('token', loginResult.data.token);
        // Redirect tùy theo role hoặc needProfile
        if (loginResult.data.needProfile) {
          navigate('/profile-setup', { replace: true });
        } else {
          // Redirect dựa vào role
          const role = loginResult.data.user.role;
          switch (role) {
            case 'admin':
              navigate('/admin/dashboard', { replace: true });
              break;
            case 'customer':
              navigate('/customer/newsfeed', { replace: true });
              break;
            default:
              navigate('/', { replace: true });
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
          console.error('Login Error:', error);
          console.error('Error Response:', error.response);
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
        // disableMobileRedirect={true}
        // isMobile={false}
        // redirectUri={window.location.href}
        // // Thêm các options cho development
        // legacyImplementation={process.env.NODE_ENV === 'development'}
        // cookie={process.env.NODE_ENV === 'development'}
        // xfbml={process.env.NODE_ENV === 'development'}
        // version={'v18.0'}
      />
      
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
};

export default FacebookLoginButton;