import { Fragment } from "react";
import { Route } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import { Newsfeed, Profile } from "../modules/customer";
import ProtectedRoute from "./ProtectedRoute";

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
