import React from "react";
import { Navigate } from "react-router-dom";
// import { useAuth } from "../hooks/useAuth"; // Nếu không dùng thì có thể bỏ dòng này

export default function ProtectedRoute({ roles, children }) {
  // 🔹 Lấy session từ localStorage
  const session = JSON.parse(localStorage.getItem("session"));
  const user = session?.account;
  const activeEntity = session?.activeEntity || user;

  // Nếu chưa đăng nhập
  if (!user) return <Navigate to="/login" replace />;

  // 🔹 Chuẩn hoá role & id
  const activeRole = (activeEntity?.role || user?.role || "").toLowerCase();
  const activeId = activeEntity?.id || user?.id;

  // Debug log (rất quan trọng để kiểm tra)
  console.log("🛡 ProtectedRoute:", {
    requiredRoles: roles,
    activeRole,
    activeId,
    path: window.location.pathname,
  });

  // 🔹 Kiểm tra quyền truy cập
  if (roles && !roles.includes(activeRole)) {
    console.warn("🚫 Không đủ quyền truy cập:", { required: roles, current: activeRole });

    // Điều hướng về trang tương ứng với vai trò hiện tại
    switch (activeRole) {
      case "customer":
        return <Navigate to="/customer/newsfeed" replace />;
      case "bar":
        return <Navigate to={`/bar/${activeId}`} replace />;
      case "dj":
        return <Navigate to={`/dj/${activeId}`} replace />;
      case "dancer":
        return <Navigate to={`/dancer/${activeId}`} replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // 🔹 Nếu hợp lệ, render nội dung được bảo vệ
  return children;
}
