import { Fragment } from "react";
import { Route } from "react-router-dom";
import { DJDashboard } from "../modules/dj";
import ProtectedRoute from "./ProtectedRoute";
import DJLayout from "../layouts/DJLayout";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed";

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
        path="/dj/dashboard"
        element={
          <ProtectedRoute role="dj">
            <DJDashboard />
          </ProtectedRoute>
        }
      />
    </Fragment>
  );
}
