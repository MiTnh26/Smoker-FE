import React from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  return (
    <div style={{ padding: 24 }}>
      <h3>Forgot Password</h3>
      <p>Chức năng chưa hỗ trợ.</p>
      <Link to="/login">Back to login</Link>
    </div>
  );
}

