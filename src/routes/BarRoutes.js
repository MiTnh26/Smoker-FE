import { Fragment, useEffect, useState } from "react";
import { Route } from "react-router-dom";
import DynamicLayout from "../layouts/DynamicLayout";
import BarProfile from "../modules/bar/pages/BarProfile";
import ProtectedRoute from "./ProtectedRoute";
import BarSettings from "../modules/bar/pages/BarSettings";
import BarTableListPage from "../modules/bar/pages/BarTableListPage";
import TableClassificationManager from "../modules/bar/pages/TableClassificationManager";
import ComboManager from "../modules/bar/pages/ComboManager";
import VoucherManager from "../modules/bar/pages/VoucherManager";
import ManagePost from "../modules/bar/pages/ManagePost";
import ManageStory from "../modules/bar/pages/ManageStory";
import EventsPage from "../modules/bar/pages/EventsPage";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed";
import MessagesPage from "../modules/messages/pages/MessagesPage";
import MessagesLayout from "../layouts/MessagesLayout";
import BarDashboardPage from "../modules/bar/pages/BarDashboardPage";

const BarProfileRoute = () => {
  // DynamicLayout will automatically detect role and use appropriate header
  return <DynamicLayout><BarProfile /></DynamicLayout>;
};
export default function BarRoutes() {
  return (
    <Fragment>
      <>
        <Route
          path="/bar/messages"
          element={
            <ProtectedRoute roles={["bar"]}>
              <MessagesLayout><MessagesPage /></MessagesLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bar/newsfeed"
          element={
            <DynamicLayout><Newsfeed /></DynamicLayout>
          }
        />
        <Route
          path="/bar/events"
          element={
            <DynamicLayout><EventsPage /></DynamicLayout>
          }
        />
        <Route
          path="/bar/dashboard"
          element={
            <ProtectedRoute roles={["bar"]}>
              <DynamicLayout><BarDashboardPage /></DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bar/:barPageId"
          element={<BarProfileRoute />}
        />
      </>
      <Route
        path="/bar/settings/:barPageId"
        element={
          <ProtectedRoute roles={["bar"]}>
            <DynamicLayout> <BarSettings /></DynamicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bar/settings/:barPageId/tables"
        element={
          <ProtectedRoute roles={["bar"]}>
            <DynamicLayout> <BarTableListPage /></DynamicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bar/settings/:barPageId/table-types"
        element={
          <ProtectedRoute roles={["bar"]}>
            <DynamicLayout> <TableClassificationManager /></DynamicLayout>
          </ProtectedRoute>
        }
      />
       <Route
        path="/bar/settings/:barPageId/vouchers"
        element={
          <ProtectedRoute roles={["bar"]}>
            <DynamicLayout> <VoucherManager /></DynamicLayout>
          </ProtectedRoute>
        }
      />
       <Route
        path="/bar/settings/:barPageId/combos"
        element={
          <ProtectedRoute roles={["bar"]}>
            <DynamicLayout> <ComboManager /></DynamicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bar/manage-post"
        element={
          // <ProtectedRoute roles={["bar"]}>
            <DynamicLayout><ManagePost /></DynamicLayout>
        //  </ProtectedRoute>
        }
      />
      <Route
        path="/bar/manage-story"
        element={
          // <ProtectedRoute roles={["bar"]}>
            <DynamicLayout><ManageStory /></DynamicLayout>
          // </ProtectedRoute>
        }
      />
    </Fragment>
  );
}
