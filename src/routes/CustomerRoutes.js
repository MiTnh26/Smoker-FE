import { Fragment } from "react";
import { Route } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import {  Profile, AddBankInfo } from "../modules/customer";
import PublicProfile from "../modules/customer/pages/PublicProfile";
import ProtectedRoute from "./ProtectedRoute";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed"
import { StoryEditor } from "../modules/feeds/components/story";
import CustomerMessages from "../modules/messages/pages/CustomerMessages";
import MessagesLayout from "../layouts/MessagesLayout";
export default function CustomerRoutes() {
  return (
    <Fragment>
    <>
      <Route
        path="/customer/newsfeed"
        element={
          <ProtectedRoute roles={["customer"]}>
            <CustomerLayout><Newsfeed /></CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/messages"
        element={
          <ProtectedRoute roles={["customer"]}>
            <MessagesLayout><CustomerMessages /></MessagesLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/story-editor"
        element={
          <ProtectedRoute roles={["customer"]}>
            <CustomerLayout><StoryEditor /></CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/profile"
        element={
          <ProtectedRoute roles={["customer"]}>
            <CustomerLayout><Profile /></CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:entityId"
        element={
          <CustomerLayout><PublicProfile /></CustomerLayout>
        }
      />
      <Route
        path="/customer/bank-info"
        element={
          <ProtectedRoute roles={["customer"]}>
            <CustomerLayout><AddBankInfo /></CustomerLayout>
          </ProtectedRoute>
        }
      />
    </>
    </Fragment>
  );
}
