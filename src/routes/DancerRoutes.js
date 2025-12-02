import { Fragment } from "react";
import { Route, Navigate } from "react-router-dom";
import DynamicLayout from "../layouts/DynamicLayout";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed";
import MessagesPage from "../modules/messages/pages/MessagesPage";
import MessagesLayout from "../layouts/MessagesLayout";
import ProtectedRoute from "./ProtectedRoute";

export default function DancerRoutes() {
  return (
    <Fragment>
      <Route
        path="/dancer/newsfeed"
        element={
          <DynamicLayout><Newsfeed /></DynamicLayout>
        }
      />
      <Route
        path="/dancer/messages"
        element={
          <ProtectedRoute role="dancer">
            <MessagesLayout><MessagesPage /></MessagesLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dancer/profile"
        element={
          <ProtectedRoute role="dancer">
            <Navigate to="/own/profile" replace />
          </ProtectedRoute>
        }
      />
    </Fragment>
  );
}
