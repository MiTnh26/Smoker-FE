import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import UploadSong from "../../feeds/components/music/UploadSong";
import SongList from "../../feeds/components/music/SongList";
import "../../../styles/modules/settings/settings.css";

/**
 * Trang quản lý song library trong Settings
 */
export default function SongLibraryPage() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("upload"); // "upload" or "list"

  const handleSongUploaded = () => {
    // Refresh song list sau khi upload thành công
    setRefreshKey(prev => prev + 1);
    // Chuyển sang tab list để xem bài hát vừa upload
    setActiveTab("list");
  };

  const handleSongDeleted = () => {
    // Refresh song list sau khi xóa
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>{t('settings.songLibrary') || 'Quản lý nhạc'}</h1>
        <p className="text-muted">{t('settings.songLibraryDesc') || 'Upload và quản lý nhạc trong library của bạn'}</p>
      </header>

      {/* Tabs */}
      <div className="song-library-tabs" style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: `1px solid rgb(var(--border))`,
        maxWidth: '900px',
        margin: '0 auto 24px'
      }}>
        <button
          onClick={() => setActiveTab("upload")}
          style={{
            padding: '12px 24px',
            background: activeTab === "upload" ? 'rgb(var(--primary))' : 'transparent',
            color: activeTab === "upload" ? 'rgb(var(--primary-foreground))' : 'rgb(var(--foreground))',
            border: 'none',
            borderBottom: activeTab === "upload" ? `2px solid rgb(var(--primary))` : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === "upload" ? 600 : 400,
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease'
          }}
        >
          {t('song.upload') || 'Upload nhạc'}
        </button>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            padding: '12px 24px',
            background: activeTab === "list" ? 'rgb(var(--primary))' : 'transparent',
            color: activeTab === "list" ? 'rgb(var(--primary-foreground))' : 'rgb(var(--foreground))',
            border: 'none',
            borderBottom: activeTab === "list" ? `2px solid rgb(var(--primary))` : '2px solid transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === "list" ? 600 : 400,
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease'
          }}
        >
          {t('song.myLibrary') || 'Thư viện của tôi'}
        </button>
      </div>

      <div className="settings-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '900px', margin: '0 auto' }}>
        {activeTab === "upload" && (
          <section className="settings-card" style={{ padding: 0, overflow: 'visible' }}>
            <UploadSong key={refreshKey} onSongUploaded={handleSongUploaded} />
          </section>
        )}
        
        {activeTab === "list" && (
          <section className="settings-card" style={{ padding: 0, overflow: 'visible' }}>
            <SongList key={refreshKey} refreshKey={refreshKey} onSongDeleted={handleSongDeleted} />
          </section>
        )}
      </div>
    </div>
  );
}

