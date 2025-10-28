import { Fragment } from "react";
import { Route } from "react-router-dom";
import BarLayout from "../layouts/BarLayout";
import BarProfile from "../modules/bar/pages/BarProfile";
import ProtectedRoute from "./ProtectedRoute"; // import ProtectedRoute
import BarSettings from "../modules/bar/pages/BarSettings";
import ManagePost from "../modules/bar/pages/ManagePost";
import ManageStory from "../modules/bar/pages/ManageStory";
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
      <Route
        path="/bar/manage-post"
        element={
          // <ProtectedRoute roles={["bar"]}>
            <BarLayout><ManagePost /></BarLayout>
        //  </ProtectedRoute>
        }
      />
      <Route
        path="/bar/manage-story"
        element={
          // <ProtectedRoute roles={["bar"]}>
            <BarLayout><ManageStory /></BarLayout>
          // </ProtectedRoute>
        }
      />
    </Fragment>
  );
}
