import { Fragment } from "react";
import { Route } from "react-router-dom";
import { DJDashboard } from "../modules/dj";
import ProtectedRoute from "./ProtectedRoute";

export default function DJRoutes() {
  return (
    <Fragment>
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
