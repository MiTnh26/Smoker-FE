// src/pages/bar/BarSettings.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BarTables from "../components/BarTables";
import Sidebar from "../../../components/layout/Sidebar";
import barPageApi from "../../../api/barPageApi";
// import "../../../styles/pages/barSettings.css";

export default function BarSettings() {
  const { t } = useTranslation();
  const { barPageId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await barPageApi.getBarPageById(barPageId);
         console.log("🔍 barPageId nhận từ URL:", barPageId);
        if (res.status === "success") setProfile(res.data);
      } catch (err) {
        console.error("Lỗi tải bar profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [barPageId]);

  if (loading) return <div>{t('common.loading')}</div>;
  if (!profile) return <div>{t('bar.profileNotFound')}</div>;

  return (
    <div className="bar-settings-page">
   
      

      <div className="bar-settings-content">
        <h2>{t('sidebar.barSettings')}: {profile.BarName}</h2>
        <BarTables barPageId={barPageId} />
      </div>
    </div>
  );
}
