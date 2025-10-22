import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Chuyển đến dashboard/landing mặc định của role
    switch (user.role) {
      case "customer":
        return <Navigate to="/customer/newsfeed" replace />;
      case "bar":
        return <Navigate to={`/bar/${user.businessId}`} replace />;
      case "dj":
        return <Navigate to={`/dj/${user.businessId}`} replace />;
      case "dancer":
        return <Navigate to={`/dancer/${user.businessId}`} replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
}

