import { Fragment } from "react";
import { Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../modules/admin/pages/Dashboard";
import ManageUsers from "../modules/admin/pages/ManageUsers";
import Reports from "../modules/admin/pages/Reports";
import ManageMusic from "../modules/admin/pages/ManageMusic";
import LanguageSettings from "../modules/settings/pages/LanguageSettings";
import ManageApprovals from "../modules/admin/pages/ManageApprovals";

export default function AdminRoutes() {
  return (
    <Fragment>
      <Route path="/admin/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><ManageUsers /></AdminLayout>} />
      <Route path="/admin/approvals" element={<AdminLayout><ManageApprovals /></AdminLayout>} />
      <Route path="/admin/music" element={<AdminLayout><ManageMusic /></AdminLayout>} />
      <Route path="/admin/reports" element={<AdminLayout><Reports /></AdminLayout>} />
      <Route path="/admin/settings/language" element={<AdminLayout><LanguageSettings /></AdminLayout>} />
    </Fragment>
  );
}
