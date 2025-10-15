import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "../modules/landing";
import AuthRoutes from "./AuthRoutes";
import CustomerRoutes from "./CustomerRoutes";
import DJRoutes from "./DJRoutes";
import DancerRoutes from "./DancerRoutes";
import BarRoutes from "./BarRoutes";
import AdminRoutes from "./AdminRoutes";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Route groups */}
        {AuthRoutes()}
        {CustomerRoutes()}
        {DJRoutes()}
        {DancerRoutes()}
        {BarRoutes()}
        {AdminRoutes()}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
