import { Fragment } from "react";
import { Route } from "react-router-dom";
import DJLayout from "../layouts/DJLayout";
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
          <DJLayout><Newsfeed /></DJLayout>
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
    </Fragment>
  );
}
