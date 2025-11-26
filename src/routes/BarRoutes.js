import { Fragment, useEffect, useState } from "react";
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
import EventsPage from "../modules/bar/pages/EventsPage";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed";
import MessagesPage from "../modules/messages/pages/MessagesPage";
import MessagesLayout from "../layouts/MessagesLayout";
import CustomerLayout from "../layouts/CustomerLayout";

const BarProfileRoute = () => {
  const [useBarLayout, setUseBarLayout] = useState(null);

  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) {
        setUseBarLayout(false);
        return;
      }
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      const accountRole = session?.account?.role || session?.role;
      const isBarRole =
        (accountRole && String(accountRole).toLowerCase() === "bar") ||
        String(active?.role || "").toLowerCase() === "bar" ||
        String(active?.type || "").toLowerCase() === "barpage";
      setUseBarLayout(isBarRole);
    } catch {
      setUseBarLayout(false);
    }
  }, []);

  if (useBarLayout === null) {
    return null;
  }

  const content = <BarProfile />;
  return useBarLayout ? <BarLayout>{content}</BarLayout> : <CustomerLayout>{content}</CustomerLayout>;
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
            <BarLayout><Newsfeed /></BarLayout>
          }
        />
        <Route
          path="/bar/events"
          element={
            <BarLayout><EventsPage /></BarLayout>
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
