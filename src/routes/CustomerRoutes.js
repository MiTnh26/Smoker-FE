import { Fragment } from "react";
import { Route } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import {  Profile, AddBankInfo } from "../modules/customer";
import ProfilePage from "../modules/profile/pages/ProfilePage";
import DynamicLayout from "../layouts/DynamicLayout";
import ProtectedRoute from "./ProtectedRoute";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed"
import { StoryEditor } from "../modules/feeds/components/story";
import MessagesPage from "../modules/messages/pages/MessagesPage";
import MessagesLayout from "../layouts/MessagesLayout";
import BarTablesPage from "../modules/customer/pages/BarTablesPage";
import MyBookings from "../modules/customer/pages/MyBookings";
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
            <MessagesLayout><MessagesPage /></MessagesLayout>
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
          <DynamicLayout><ProfilePage /></DynamicLayout>
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
       {/* ✅ Route mới: danh sách bàn theo bar */}
        <Route
          path="/customer/bars/:barId/tables"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerLayout>
                <BarTablesPage />
              </CustomerLayout>
            </ProtectedRoute>
          }
        />
        {/* ✅ Route: My Bookings */}
        <Route
          path="/customer/my-bookings"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerLayout>
                <MyBookings />
              </CustomerLayout>
            </ProtectedRoute>
          }
        />
    </>
      
      
    </Fragment>
  );
}
