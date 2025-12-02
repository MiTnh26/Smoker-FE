import { Fragment } from "react";
import { Route, Navigate } from "react-router-dom";
import { DJDashboard } from "../modules/dj";
import ProtectedRoute from "./ProtectedRoute";
import DynamicLayout from "../layouts/DynamicLayout";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed";
import MessagesPage from "../modules/messages/pages/MessagesPage";
import MessagesLayout from "../layouts/MessagesLayout";

export default function DJRoutes() {
  return (
    <Fragment>
      <Route
        path="/dj/newsfeed"
        element={
          <DynamicLayout><Newsfeed /></DynamicLayout>
        }
      />
      <Route
        path="/dj/messages"
        element={
          <ProtectedRoute role="dj">
            <MessagesLayout><MessagesPage /></MessagesLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dj/dashboard"
        element={
          <ProtectedRoute role="dj">
            <DJDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dj/profile"
        element={
          <ProtectedRoute role="dj">
            <Navigate to="/own/profile" replace />
          </ProtectedRoute>
        }
      />
    </Fragment>
  );
}
