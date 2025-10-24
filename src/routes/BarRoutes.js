import { Fragment } from "react";
import { Route } from "react-router-dom";
import BarLayout from "../layouts/BarLayout";
import BarProfile from "../modules/bar/pages/BarProfile";
import ProtectedRoute from "./ProtectedRoute";
import BarSettings from "../modules/bar/pages/BarSettings";
import TableClassificationManager from "../modules/bar/pages/TableClassificationManager";

import ComboManager from "../modules/bar/pages/ComboManager";
import VoucherManager from "../modules/bar/pages/VoucherManager";
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
    </Fragment>
  );
}
