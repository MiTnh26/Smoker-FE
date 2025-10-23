import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth"; // nếu hook này có thì giữ lại, nếu không dùng thì bỏ

export default function ProtectedRoute({ roles, children }) {
  // Lấy session từ localStorage
  const session = JSON.parse(localStorage.getItem("session"));
  const user = session?.account;
  const activeEntity = session?.activeEntity || user;

  // 1️⃣ Nếu chưa đăng nhập
  if (!user) return <Navigate to="/login" replace />;

  // 2️⃣ Kiểm tra quyền truy cập
  if (roles && !roles.includes(activeEntity?.role?.toLowerCase())) {
    // 3️⃣ Điều hướng về trang phù hợp theo role hiện tại
    switch (activeEntity?.role?.toLowerCase()) {
      case "customer":
        return <Navigate to="/customer/newsfeed" replace />;
      case "bar":
        return <Navigate to={`/bar/${activeEntity.id}`} replace />;
      case "dj":
        return <Navigate to={`/dj/${activeEntity.id}`} replace />;
      case "dancer":
        return <Navigate to={`/dancer/${activeEntity.id}`} replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // 4️⃣ Nếu hợp lệ, render nội dung được bảo vệ
  return children;
}
