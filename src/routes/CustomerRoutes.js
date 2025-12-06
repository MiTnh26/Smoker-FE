import { Route } from "react-router-dom";
import DynamicLayout from "../layouts/DynamicLayout";
import {  Profile, AddBankInfo } from "../modules/customer";
import ProtectedRoute from "./ProtectedRoute";
import Newsfeed from "../modules/feeds/pages/Newsfeed/Newsfeed"
import { StoryEditor } from "../modules/feeds/components/story";
import MessagesPage from "../modules/messages/pages/MessagesPage";
import MessagesLayout from "../layouts/MessagesLayout";
import BarTablesPage from "../modules/customer/pages/BarTablesPage";
import MyBookings from "../modules/customer/pages/MyBookings";
import NotificationsPage from "../modules/customer/pages/NotificationsPage";
import EventsFeedPage from "../modules/customer/pages/EventsFeedPage";
export default function CustomerRoutes() {
  return (
    <>
      <Route
        path="/customer/newsfeed"
        element={
          <ProtectedRoute roles={["customer"]}>
            <DynamicLayout><Newsfeed /></DynamicLayout>
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
            <DynamicLayout><StoryEditor /></DynamicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/own/profile"
        element={
          <ProtectedRoute roles={["customer", "dj", "dancer", "bar"]}>
            <DynamicLayout><Profile /></DynamicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/bank-info"
        element={
          <ProtectedRoute roles={["customer"]}>
            <DynamicLayout><AddBankInfo /></DynamicLayout>
          </ProtectedRoute>
        }
      />
       {/* ✅ Route mới: danh sách bàn theo bar */}
        <Route
          path="/customer/bars/:barId/tables"
          element={
            <ProtectedRoute roles={["customer"]}>
              <DynamicLayout>
                <BarTablesPage />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        {/* ✅ Route: My Bookings */}
        <Route
          path="/customer/my-bookings"
          element={
            <ProtectedRoute roles={["customer"]}>
              <DynamicLayout>
                <MyBookings />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        {/* ✅ Route: Notifications Page */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute roles={["customer"]}>
              <DynamicLayout>
                <NotificationsPage />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        {/* ✅ Route: Events Feed Page */}
        <Route
          path="/customer/events"
          element={
            <ProtectedRoute roles={["customer"]}>
              <DynamicLayout>
                <EventsFeedPage />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
    </>
  );
}









