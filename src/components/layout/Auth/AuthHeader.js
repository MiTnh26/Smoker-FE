import React from "react";
import { Button } from "../../common/Button";
import { useNavigate } from "react-router-dom";


import "../../../styles/layouts/header.css";

export default function AuthHeader() {
 const navigate = useNavigate(); // hook để điều hướng

  return (
    <header className="header">
      <div className="header-container">
        <span className="header-title">Smoker</span>
        <div className="header-buttons">
          <Button
            size="default"
            className="btn-login rounded-xl"
            onClick={() => navigate("/login")} // điều hướng đến trang login
          >
            Đăng nhập
          </Button>
          <Button
            size="default"
            className="btn-register rounded-xl"
            onClick={() => navigate("/register")} // điều hướng đến trang register
          >
            Đăng ký
          </Button>
        </div>
      </div>
    </header>
  );
}
