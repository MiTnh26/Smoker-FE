import { Fragment } from "react";
import { Route } from "react-router-dom";
import BarLayout from "../layouts/BarLayout";
import BarProfile from "../modules/bar/pages/BarProfile";
import ProtectedRoute from "./ProtectedRoute"; // import ProtectedRoute

export default function BarRoutes() {
  return (
    <Fragment>
    <>
    <Route 
      path="/bar/:barPageId" 
                    element={
                        <ProtectedRoute roles={["customer", "bar"]}>
                            <BarLayout><BarProfile /></BarLayout>
                        </ProtectedRoute>
                    } 
                />
    </>
    </Fragment>
  );
}
