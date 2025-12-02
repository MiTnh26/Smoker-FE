import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import DynamicLayout from "../layouts/DynamicLayout";
import SettingsPrivacyPage from "../modules/settings/pages/SettingsPrivacy";
import LanguageSettings from "../modules/settings/pages/LanguageSettings";
import SongLibraryPage from "../modules/settings/pages/SongLibrary";

export default function SettingsRoutes() {
  return (
    <>
      <Route
        path="/settings"
        element={
          <ProtectedRoute roles={["customer", "bar", "dj", "dancer", "admin", "business"]}>
            <DynamicLayout><SettingsPrivacyPage /></DynamicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/language"
        element={
          <ProtectedRoute roles={["customer", "bar", "dj", "dancer", "admin", "business"]}>
            <DynamicLayout><LanguageSettings /></DynamicLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/songs"
        element={
          <ProtectedRoute roles={["customer", "bar", "dj", "dancer", "admin", "business"]}>
            <DynamicLayout><SongLibraryPage /></DynamicLayout>
          </ProtectedRoute>
        }
      />
    </>
  );
}


