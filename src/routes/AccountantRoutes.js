import { Fragment } from "react";
import { Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AccountantDashboard from "../modules/accountant/pages/AccountantDashboard";
import ManageWithdrawRequests from "../modules/accountant/pages/ManageWithdrawRequests";
import ManageRefundRequests from "../modules/accountant/pages/ManageRefundRequests";
import ProtectedRoute from "./ProtectedRoute";

export default function AccountantRoutes() {
  // Chỉ Accountant mới có thể truy cập
  return (
    <Fragment>
      <Route 
        path="/accountant/dashboard" 
        element={
          <ProtectedRoute roles={["accountant"]}>
            <AdminLayout>
              <AccountantDashboard />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/accountant/withdraw-requests" 
        element={
          <ProtectedRoute roles={["accountant"]}>
            <AdminLayout>
              <ManageWithdrawRequests />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/accountant/refund-requests" 
        element={
          <ProtectedRoute roles={["accountant"]}>
            <AdminLayout>
              <ManageRefundRequests />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
    </Fragment>
  );
}

