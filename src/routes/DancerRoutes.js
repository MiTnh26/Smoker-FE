import { Fragment } from "react";
import { Route } from "react-router-dom";
import DJLayout from "../layouts/DJLayout";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed";

export default function DancerRoutes() {
  return (
    <Fragment>
      <Route
        path="/dancer/newsfeed"
        element={
          <DJLayout><Newsfeed /></DJLayout>
        }
      />
    </Fragment>
  );
}
