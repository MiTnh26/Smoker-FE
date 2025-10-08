import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import modules
import { Login, Register } from "../modules/auth";
import { Newsfeed } from "../modules/customer";
import { DJDashboard } from "../modules/dj";
import { DancerDashboard } from "../modules/dancer";
import { BarDashboard } from "../modules/bar";
import { AdminDashboard } from "../modules/admin";
import { Home } from "../modules/landing";
//layout
import AuthLayout from "../layouts/AuthLayout";
import CustomerLayout from "../layouts/CustomerLayout";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  const isAuth = !!localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Auth */}
        <Route path="/login" element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        } />
        <Route path="/register" element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        } />

        {/* <Route
          path="/customer/newsfeed"
          element={isAuth ? <Newsfeed /> : <Navigate to="/login" />}
        /> */}


        {/* Customer */}
        <Route
          path="/customer/newsfeed"
          element={
            <ProtectedRoute role="customer">
              <CustomerLayout>
                <Newsfeed />
              </CustomerLayout>
            </ProtectedRoute>
          }
        />


        {/* DJ */}
        <Route
          path="/dj/dashboard"
          element={
            <ProtectedRoute role="dj">
              <DJDashboard />
            </ProtectedRoute>
          }
        />

        {/* Dancer */}
        <Route
          path="/dancer/dashboard"
          element={
            <ProtectedRoute role="dancer">
              <DancerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Bar/Club */}
        <Route
          path="/bar/dashboard"
          element={
            <ProtectedRoute role="bar">
              <BarDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
