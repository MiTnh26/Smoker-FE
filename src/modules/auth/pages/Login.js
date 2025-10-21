import React, { useState } from "react"; // ✅ import useState
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Link } from "react-router-dom";
import "../../../styles/modules/auth.css";

import { useNavigate } from "react-router-dom";
import { authApi } from "../../../api/userApi";
import { useAuth } from "../../../hooks/useAuth";
import FacebookLoginButton from '../pages/FacebookLoginButton';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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
              <div style={{ position: "relative" }}>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: "38px" }}
                />
                <span
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    color: "#666",
                    fontSize: 18,
                    userSelect: "none",
                  }}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" || e.key === " ") setShowPassword((v) => !v);
                  }}
                >
                  {showPassword ? (
                    // 👁️ Eye Open
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    // 👁️ Eye Closed
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-7 0-11-7-11-7a21.75 21.75 0 0 1 5.06-5.94" />
                      <path d="m1 1 22 22" />
                    </svg>
                  )}
                </span>

              </div>

              {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}

              <Button type="submit" className="login-btn">
                Log in
              </Button>

              <div className="forgot-link">
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800">
                  Quên mật khẩu?
                </Link>
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
              <Button type="button" className="login-btn" onClick={() => navigate("/login/google")}>
                Đăng nhập bằng Google
              </Button>

              <div className="mt-2">
                <FacebookLoginButton />
              </div>

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
