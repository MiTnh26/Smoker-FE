import React, { useState } from "react";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";

import { Link } from "react-router-dom"; // dùng React Router
import "../../../styles/modules/register.css";
import { Checkbox } from "../../../components/common/Checkbox"; // nếu bạn có component Checkbox

export function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) return;
    // TODO: gọi API signup
    console.log({ username, password, phone, gender });
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
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="gender-selection">
                <label>
                  <input
                    type="radio"
                    value="male"
                    checked={gender === "male"}
                    onChange={() => setGender("male")}
                  />{" "}
                  Nam
                </label>
                <label>
                  <input
                    type="radio"
                    value="female"
                    checked={gender === "female"}
                    onChange={() => setGender("female")}
                  />{" "}
                  Nữ
                </label>
              </div>

              <div className="terms">
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label>I have read and agree with the terms and conditions</label>
              </div>

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
