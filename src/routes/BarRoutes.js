import { Fragment } from "react";
import { Route } from "react-router-dom";
import BarLayout from "../layouts/BarLayout";
import BarProfile from "../modules/bar/pages/BarProfile";
import ProtectedRoute from "./ProtectedRoute"; // import ProtectedRoute
import BarSettings from "../modules/bar/pages/BarSettings";

export default function BarRoutes() {
  return (
    <Fragment>
      <>
        <Route
          path="/bar/:barPageId"
          element={
            <ProtectedRoute roles={["bar"]}>
              <BarLayout><BarProfile /></BarLayout>
            </ProtectedRoute>
          }
        />
      </>
      <Route
        path="/bar/settings/:barPageId"
        element={
          <ProtectedRoute roles={["bar"]}>
          
            <BarLayout>  <BarSettings /></BarLayout>
          </ProtectedRoute>
        }
      />
    </Fragment>
  );
}
