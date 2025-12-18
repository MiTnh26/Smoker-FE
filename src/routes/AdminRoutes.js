import { Fragment } from "react";
import { Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../modules/admin/pages/Dashboard";
import ManageUsers from "../modules/admin/pages/ManageUsers";
import Reports from "../modules/admin/pages/Reports";
import ManageMusic from "../modules/admin/pages/ManageMusic";
import LanguageSettings from "../modules/settings/pages/LanguageSettings";
import ManageApprovals from "../modules/admin/pages/ManageApprovals";
import ManageAdPackages from "../modules/admin/pages/ManageAdPackages";
import ManageEventAdApprovals from "../modules/admin/pages/ManageEventAdApprovals";
import ManagePauseRequests from "../modules/admin/pages/ManagePauseRequests";
import ManageResumeRequests from "../modules/admin/pages/ManageResumeRequests";
import ManageRefundRequests from "../modules/admin/pages/ManageRefundRequests";
import ManagePosts from "../modules/admin/pages/ManagePosts";
import ProtectedRoute from "./ProtectedRoute";

export default function AdminRoutes() {
  return (
    <Fragment>
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={["admin"]}><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManageUsers /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/approvals" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManageApprovals /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/music" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManageMusic /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute roles={["admin"]}><AdminLayout><Reports /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/ad-packages" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManageAdPackages /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/event-ad-approvals" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManageEventAdApprovals /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/pause-requests" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManagePauseRequests /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/resume-requests" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManageResumeRequests /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/refund-requests" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManageRefundRequests /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/posts" element={<ProtectedRoute roles={["admin"]}><AdminLayout><ManagePosts /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/settings/language" element={<ProtectedRoute roles={["admin"]}><AdminLayout><LanguageSettings /></AdminLayout></ProtectedRoute>} />
    </Fragment>
  );
}
