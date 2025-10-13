import React, { useState } from "react"; // ✅ import useState
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Link } from "react-router-dom"; 
import "../../../styles/modules/auth.css";

import { useNavigate } from "react-router-dom";
import { authApi } from "../../../api/userApi";
import { useAuth } from "../../../hooks/useAuth";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  // Google login uses button only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await authApi.login(email, password);
      if (res && res.token) {
        await login({ token: res.token, user: res.user });
        if (!res.needProfile) {
          navigate("/customer/newsfeed", { replace: true });
        } else {
          navigate("/profile-setup", { replace: true });
        }
      } else {
        setError(res?.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  // const handleGoogleLogin = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   try {
  //     const res = await authApi.googleLogin();
  //     if (res && res.token) {
  //       await login({ token: res.token, user: res.user });
  //       if (!res.needProfile) {
  //         navigate("/customer/newsfeed", { replace: true });
  //       } else {
  //         navigate("/profile-setup", { replace: true });
  //       }
  //     } else {
  //       setError(res?.message || "Đăng nhập thất bại");
  //     }
  //   } catch (err) {
  //     setError(err?.response?.data?.message || "Đăng nhập thất bại");
  //   }
  // };

  return (
    <div className="login-page">
  

      <div className="login-form-container">
        <div className="login-wrapper">
          {/* Logo Section */}
          <div className="login-logo">
            <Link to="/">Smoker</Link>
          </div>

          {/* Login Form */}
          <div className="login-form-box">
            <form className="login-form space-y-4" onSubmit={handleSubmit}>
              <Input 
                type="text" 
                placeholder="Email or phone number" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}

              <Button type="submit" className="login-btn">
                Log in
              </Button>

              <div className="forgot-link">
                <Link to="/forgot-password">Forgotten account?</Link>
              </div>

              <div className="divider">
                <div className="divider-line"></div>
              </div>

              {/* Google Login simple flow */}
              <div style={{ fontSize: 12, color: "#555" }}>
                Cách 2 – Đăng nhập bằng Google: Chọn Gmail và nhập mật khẩu Gmail
                để xác thực. Nếu là lần đầu, hệ thống sẽ gửi một <b>mật khẩu ngẫu nhiên</b>
                về Gmail của bạn để sử dụng cho các lần <b>đăng nhập thủ công</b> sau này.
              </div>
              <Button type="button" className="login-btn" onClick={() => navigate("/login/google") }>
                Đăng nhập bằng Google
              </Button>

              <Button type="button" className="create-account-btn">
                <Link to="/signup">Create new account</Link>
              </Button>
            </form>

            <div className="login-footer">
              <Link to="/create-page">Create a Page</Link> for a celebrity, brand or business
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
