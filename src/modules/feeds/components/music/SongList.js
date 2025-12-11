import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import songApi from "../../../../api/songApi";
import SongItem from "./SongItem";
import "../../../../styles/modules/feeds/components/music/SongList.css";

/**
 * Component để hiển thị danh sách songs trong library
 */
export default function SongList({ refreshKey, onSongDeleted, title, scope = 'mine' }) {
  const { t } = useTranslation();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Lấy entityAccountId của user hiện tại
  const getCurrentEntityAccountId = () => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      const activeEntity = session?.activeEntity || session?.account;
      return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
    } catch (e) {
      return null;
    }
  };

  // Fetch songs
  const fetchSongs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await songApi.getSongs();
      const currentEntityAccountId = getCurrentEntityAccountId();
      
      // axiosClient interceptor đã unwrap response.data
      // Backend trả về: { songs: [...] }
      // Sau interceptor: response = { songs: [...] }
      let allSongs = [];
      if (response?.songs && Array.isArray(response.songs)) {
        allSongs = response.songs;
      } else if (Array.isArray(response)) {
        allSongs = response;
      } else if (response?.data && Array.isArray(response.data)) {
        allSongs = response.data;
      }
      
      // Filter theo scope
      const userSongs = scope === 'all' ? allSongs : allSongs.filter(song => {
        if (!currentEntityAccountId) return false;
        const songEntityAccountId = song.entityAccountId;
        if (!songEntityAccountId) return false;
        return String(songEntityAccountId).trim().toLowerCase() === String(currentEntityAccountId).trim().toLowerCase();
      });
      
      // Sort by createdAt descending (mới nhất trước)
      userSongs.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA;
      });
      
      setSongs(userSongs);
    } catch (err) {
      console.error("Error fetching songs:", err);
      setError(err.response?.data?.error || err.message || "Không thể tải danh sách nhạc");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Handle delete song
  const handleDelete = async (songId, songFilename) => {
    if (!window.confirm(t('song.confirmDelete') || 'Bạn có chắc muốn xóa bài hát này?')) {
      return;
    }

    setDeletingId(songId);
    try {
      await songApi.deleteSong(songId);
      // Refresh danh sách
      await fetchSongs();
      if (onSongDeleted) {
        onSongDeleted();
      }
    } catch (err) {
      console.error("Error deleting song:", err);
      alert(t('song.deleteFailed') || 'Không thể xóa bài hát');
    } finally {
      setDeletingId(null);
    }
  };


  if (loading) {
    return (
      <div className="song-list-container">
        <div className="song-list-loading">
          {t('song.loading') || 'Đang tải danh sách nhạc...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="song-list-container">
        <div className="song-list-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="song-list-container">
      <div className="song-list-header">
        <h3 className="song-list-title">
          {(title || t('song.library') || 'Thư viện nhạc')} ({songs.length})
        </h3>
      </div>

      {songs.length === 0 ? (
        <div className="song-list-empty">
          <p>{t('song.noSongs') || 'Chưa có bài hát nào trong library'}</p>
          <p className="song-list-empty-hint">
            {t('song.uploadHint') || 'Hãy upload bài hát đầu tiên của bạn!'}
          </p>
        </div>
      ) : (
        <div className="song-list-grid song-list-grid--single">
          {songs.map((song) => (
            <SongItem
              key={song._id || song.id}
              song={song}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

