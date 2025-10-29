import { Fragment } from "react";
import { Route } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import {  Profile } from "../modules/customer";
import ProtectedRoute from "./ProtectedRoute";
import Newsfeed from "../modules/feeds/pages/Newsfeed"
import StoryEditor from "../modules/feeds/components/StoryEditor";
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
    </>
    </Fragment>
  );
}
