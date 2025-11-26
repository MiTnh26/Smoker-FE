import React, { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { userApi } from "../api/userApi";
import BannedAccountOverlay from "../components/common/BannedAccountOverlay";
// import { useAuth } from "../hooks/useAuth"; // Nếu không dùng thì có thể bỏ dòng này

export default function ProtectedRoute({ roles, children }) {
  const [isBanned, setIsBanned] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedRef = useRef(false);

  // 🔹 Lấy session từ localStorage
  const session = JSON.parse(localStorage.getItem("session"));
  const user = session?.account;
  const activeEntity = session?.activeEntity || user;

  // Check banned status - chỉ check một lần
  useEffect(() => {
    if (!user || hasCheckedRef.current) {
      if (!user) setIsChecking(false);
      return;
    }
    
    hasCheckedRef.current = true;
    
    const checkBannedStatus = async () => {
      try {
        setIsChecking(true);
        const accountRes = await userApi.me();
        const accountStatus = accountRes?.data?.Status || accountRes?.data?.status;
        if (accountStatus === 'banned') {
          setIsBanned(true);
        } else {
          setIsBanned(false);
        }
      } catch (err) {
        console.error("[ProtectedRoute] Error checking banned status:", err);
        setIsBanned(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkBannedStatus();
  }, []);

  // Nếu chưa đăng nhập
  if (!user) return <Navigate to="/login" replace />;

  // 🔹 Chuẩn hoá role & id
  const rawRole = (activeEntity?.role || user?.role || "").toLowerCase();
  // Map các biến thể role về key thống nhất
  const roleMap = {
    account: "customer",
    customer: "customer",
    admin: "admin",
    bar: "bar",
    barpage: "bar",
    business: "business",
    businessaccount: "business",
    dj: "dj",
    dancer: "dancer",
  };
  const activeRole = roleMap[rawRole] || rawRole;
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
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // 🔹 Nếu đang check banned status, hiển thị loading
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Đang kiểm tra...</div>
      </div>
    );
  }

  // 🔹 Nếu bị banned, chỉ hiển thị overlay, KHÔNG render children để tránh API calls
  if (isBanned) {
    const userRole = activeRole === "customer" ? "Customer" : activeRole.charAt(0).toUpperCase() + activeRole.slice(1);
    const entityType = activeRole === "customer" 
      ? "Account" 
      : activeRole === "bar" 
        ? "BarPage" 
        : "BusinessAccount";
    
    return (
      <>
        <div className="min-h-screen bg-background" />
        <BannedAccountOverlay 
          userRole={userRole}
          entityType={entityType}
        />
      </>
    );
  }

  // 🔹 Nếu hợp lệ, render nội dung được bảo vệ
  return children;
}
