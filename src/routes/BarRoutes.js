import { Fragment } from "react";
import { Route } from "react-router-dom";
import BarLayout from "../layouts/BarLayout";
import BarProfile from "../modules/bar/pages/BarProfile";
import ProtectedRoute from "./ProtectedRoute";
import BarSettings from "../modules/bar/pages/BarSettings";
import TableClassificationManager from "../modules/bar/pages/TableClassificationManager";
import ComboManager from "../modules/bar/pages/ComboManager";
import VoucherManager from "../modules/bar/pages/VoucherManager";
import ManagePost from "../modules/bar/pages/ManagePost";
import ManageStory from "../modules/bar/pages/ManageStory";
import Newsfeed from "../modules/feeds/pages/Newsfeed";
export default function BarRoutes() {
  return (
    <Fragment>
      <>
        <Route
          path="/bar/newsfeed"
          element={
            <BarLayout><Newsfeed /></BarLayout>
          }
        />
        <Route
          path="/bar/:barPageId"
          element={
            // <ProtectedRoute roles={["bar"]}>
              <BarLayout><BarProfile /></BarLayout>
            // </ProtectedRoute>
          }
        />
      </>
      <Route
        path="/bar/settings/:barPageId"
        element={
          <ProtectedRoute roles={["bar"]}>
            <BarLayout> <BarSettings /></BarLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bar/settings/:barPageId/table-types"
        element={
          <ProtectedRoute roles={["bar"]}>
            <BarLayout> <TableClassificationManager /></BarLayout>
          </ProtectedRoute>
        }
      />
       <Route
        path="/bar/settings/:barPageId/vouchers"
        element={
          <ProtectedRoute roles={["bar"]}>
            <BarLayout> <VoucherManager /></BarLayout>
          </ProtectedRoute>
        }
      />
       <Route
        path="/bar/settings/:barPageId/combos"
        element={
          <ProtectedRoute roles={["bar"]}>
            <BarLayout> <ComboManager /></BarLayout>
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
