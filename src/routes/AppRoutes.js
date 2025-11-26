import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "../modules/landing";
import Songs from "../pages/Songs";
import UploadSong from "../pages/UploadSong";
import { SongContextState } from "../contexts/SongContext";
import AuthRoutes from "./AuthRoutes";
import CustomerRoutes from "./CustomerRoutes";
import DJRoutes from "./DJRoutes";
import DancerRoutes from "./DancerRoutes";
import BarRoutes from "./BarRoutes";
import AdminRoutes from "./AdminRoutes";
import BusinessRouters from "./BusinessRouters";
import SettingsRoutes from "./SettingsRoutes";
import SearchResults from "../modules/search/pages/SearchResults";
import CustomerLayout from "../layouts/CustomerLayout";
import DynamicLayout from "../layouts/DynamicLayout";
import ProfilePage from "../modules/profile/pages/ProfilePage";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Route groups */}
        <Route path="/songs" element={
          <SongContextState>
            <Songs />
          </SongContextState>
        } />
        <Route path="/upload-song" element={
          <SongContextState>
            <UploadSong />
          </SongContextState>
        } />
        {AuthRoutes()}
        {CustomerRoutes()}
        {DJRoutes()}
        {DancerRoutes()}
        {BarRoutes()}
        {AdminRoutes()}
        {BusinessRouters()}
        {SettingsRoutes()}
        <Route path="/search" element={<SearchResults />} />
        <Route path="/profile/:entityId" element={<DynamicLayout><ProfilePage /></DynamicLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
