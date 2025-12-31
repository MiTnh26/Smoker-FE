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
  const manager = session?.manager || JSON.parse(localStorage.getItem("manager") || "null");
  const activeEntity = session?.activeEntity || user;
  
  // Nếu là Manager, sử dụng manager info
  const isManager = session?.type === "manager" || manager;

  // Check banned status - chỉ check một lần (chỉ cho user, không check cho manager)
  useEffect(() => {
    // Manager không cần check banned status
    if (isManager) {
      setIsChecking(false);
      return;
    }
    
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
  }, [isManager, user]);

  // Nếu chưa đăng nhập (không phải user và không phải manager)
  if (!user && !manager) {
    // Nếu đang truy cập admin route, redirect đến manager login
    if (window.location.pathname.startsWith("/admin")) {
      return <Navigate to="/manager/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // 🔹 Chuẩn hoá role & id
  let activeRole, activeId;
  let managerRole = null;
  
  if (isManager) {
    // Manager: role từ manager object (Admin hoặc Accountant)
    managerRole = (manager?.role || "").toLowerCase();
    activeRole = managerRole === "accountant" ? "accountant" : "admin";
    activeId = manager?.id;
  } else {
    // User: logic cũ
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
    // If rawRole is empty or doesn't match, check entity type as fallback
    activeRole = roleMap[rawRole];
    if (!activeRole) {
      // Fallback: check entity type if role is missing
      const entityType = (activeEntity?.type || user?.type || "").toLowerCase();
      if (entityType === "account" || !entityType) {
        activeRole = "customer"; // Default to customer for Account type or missing type
      } else {
        activeRole = roleMap[entityType] || rawRole; // Try entity type, then fallback to rawRole
      }
    }
    activeId = activeEntity?.id || user?.id;
  }

  // Debug log (rất quan trọng để kiểm tra)
  console.log("🛡 ProtectedRoute:", {
    requiredRoles: roles,
    activeRole,
    activeId,
    path: window.location.pathname,
  });

  // 🔹 Kiểm tra quyền truy cập
  // Admin (không phải Accountant) có thể truy cập admin routes
  // Accountant chỉ truy cập accountant routes
  const allowedRoles = roles || [];
  
  // Nếu là Accountant và route yêu cầu admin → không cho phép
  if (activeRole === "accountant" && allowedRoles.includes("admin") && !allowedRoles.includes("accountant")) {
    console.warn("🚫 Accountant không thể truy cập admin routes");
    return <Navigate to="/accountant/dashboard" replace />;
  }
  
  // Nếu là Admin (không phải Accountant) và route yêu cầu admin → cho phép
  const isAdminNotAccountant = activeRole === "admin" && isManager && managerRole !== "accountant";
  const hasAccess = allowedRoles.length === 0 || 
                    allowedRoles.includes(activeRole) || 
                    (isAdminNotAccountant && allowedRoles.includes("admin"));
  
  if (roles && !hasAccess) {
    console.warn("🚫 Không đủ quyền truy cập:", { required: roles, current: activeRole });

    // Điều hướng về trang tương ứng với vai trò hiện tại
    switch (activeRole) {
      case "accountant":
        return <Navigate to="/accountant/dashboard" replace />;
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
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
