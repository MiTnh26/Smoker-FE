import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import CustomerLayout from "../layouts/CustomerLayout";
import SettingsPrivacyPage from "../modules/settings/pages/SettingsPrivacy";
import LanguageSettings from "../modules/settings/pages/LanguageSettings";

export default function SettingsRoutes() {
  return (
    <>
      <Route
        path="/settings"
        element={
          <ProtectedRoute roles={["customer", "bar", "dj", "dancer", "admin", "business"]}>
            <CustomerLayout><SettingsPrivacyPage /></CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/language"
        element={
          <ProtectedRoute roles={["customer", "bar", "dj", "dancer", "admin", "business"]}>
            <CustomerLayout><LanguageSettings /></CustomerLayout>
          </ProtectedRoute>
        }
      />
    </>
  );
}


