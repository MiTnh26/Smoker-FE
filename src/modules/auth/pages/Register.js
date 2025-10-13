import React, { useState } from "react";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";

import { Link } from "react-router-dom"; // dùng React Router
import "../../../styles/modules/register.css";
import { Checkbox } from "../../../components/common/Checkbox"; // nếu bạn có component Checkbox
import { authApi } from "../../../api/userApi";
import { useNavigate } from "react-router-dom";

export function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Google register uses button only (no extra inputs)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!agreed) return;
    try {
      const res = await authApi.register(email, password, confirmPassword);
      if (res && res.message) {
        setSuccess("Đăng ký thành công. Đang chuyển hướng...");
        setTimeout(() => navigate("/"), 1000);
      } else {
        setError(res?.message || "Đăng ký thất bại");
      }
    } catch (err) {
      const msg = err?.response?.status === 409 ? "Email đã tồn tại" : (err?.response?.data?.message || "Đăng ký thất bại");
      setError(msg);
    }
  };

  const handleGoogleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email) {
      setError("Vui lòng nhập Gmail để đăng ký bằng Google");
      return;
    }
    try {
      const response = await authApi.googleRegister({ email }); // không destruct data
      console.log("Response from backend:", response);
  
      if (response.status === "NEW_USER") {
        setSuccess(response.message);
      } else if (response.status === "EXISTING_USER") {
        setError(response.message);
      } else {
        setError("Đăng ký thất bại");
      }
    } catch (err) {
      const msg = err?.response?.status === 409
        ? "Email đã tồn tại"
        : err?.response?.data?.message || "Đăng ký thất bại";
      console.error("Google register failed:", err);
      setError(msg);
    }
  };
  
  
  
  


  return (
    <div className="signup-page">


      <div className="signup-form-container">
        <div className="signup-wrapper">
          {/* Logo */}
          <div className="signup-logo">
            <Link to="/">Smoker</Link>
          </div>

          {/* Signup Form */}
          <div className="signup-form-box">
            <form className="signup-form space-y-5" onSubmit={handleSubmit}>
              <Input
                type="email"
                placeholder="Gmail (example@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
              {success && <div style={{ color: "green", fontSize: 12 }}>{success}</div>}

              <div className="terms">
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label>I have read and agree with the terms and conditions</label>
              </div>

              {/* Google Register simple flow */}
              <div className="divider">
                <div className="divider-line"></div>
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Cách 2 – Đăng ký bằng Google: Xác thực Gmail của bạn, hệ thống sẽ
                tạo mật khẩu ngẫu nhiên và <b>gửi về hộp thư Gmail</b>. Vui lòng
                mở Gmail để lấy mật khẩu này và dùng để <b>đăng nhập thủ công</b> lần đầu.
              </div>
              <Button type="button" className="signup-btn" onClick={handleGoogleRegister}>
                Đăng ký bằng Google
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary">
                  Login
                </Link>
              </div>

              <Button
                type="submit"
                className="signup-btn"
                disabled={!agreed}
              >
                Sign up
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
