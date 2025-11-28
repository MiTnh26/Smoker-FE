import { Fragment } from "react";
import { Route } from "react-router-dom";
import { DJDashboard } from "../modules/dj";
import DJProfile from "../modules/dj/pages/DJProfile";
import ProtectedRoute from "./ProtectedRoute";
import DJLayout from "../layouts/DJLayout";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed";
import MessagesPage from "../modules/messages/pages/MessagesPage";
import MessagesLayout from "../layouts/MessagesLayout";

export default function DJRoutes() {
  return (
    <Fragment>
      <Route
        path="/dj/newsfeed"
        element={
          <DJLayout><Newsfeed /></DJLayout>
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
            <DJLayout><DJProfile /></DJLayout>
          </ProtectedRoute>
        }
      />
    </Fragment>
  );
}
