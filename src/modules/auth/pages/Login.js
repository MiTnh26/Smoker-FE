import React, { useState } from "react"; // ✅ import useState
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Link } from "react-router-dom"; 
import "../../../styles/modules/auth.css";

import { useNavigate } from "react-router-dom";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: gọi API đăng nhập
    console.log("Email:", email, "Password:", password);
     console.log("Login success!", { email, password });
     localStorage.setItem("role", "customer");
    navigate("/customer/newsfeed");
  };

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

              <Button type="submit" className="login-btn">
                Log in
              </Button>

              <div className="forgot-link">
                <Link to="/forgot-password">Forgotten account?</Link>
              </div>

              <div className="divider">
                <div className="divider-line"></div>
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
