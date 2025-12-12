import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import songApi from "../../../../api/songApi";

/**
 * Component để hiển thị một song item với audio player có trimming
 */
export default function SongItem({ song, onDelete, deletingId }) {
  const { t } = useTranslation();
  const audioRef = useRef(null);
  // File đã được cắt ở backend, chỉ cần duration
  const duration = song.audioDuration || null;

  // File đã được cắt ở backend, chỉ cần đảm bảo dừng ở duration nếu có
  useEffect(() => {
    if (!audioRef.current || !song.song || !duration) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      // Dừng phát khi đạt đến duration (file đã cắt rồi nên chỉ cần check duration)
      if (audio.currentTime >= duration) {
        audio.pause();
        audio.currentTime = 0; // Reset về đầu
      }
    };

    const handleEnded = () => {
      // Reset về đầu khi kết thúc
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [song.song, duration]);

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="song-list-item">
      <div className="song-list-item-info">
        <div className="song-list-item-title">{song.title || t('song.untitled') || 'Không có tiêu đề'}</div>
        <div className="song-list-item-artist">{song.artistName || song.artist || t('song.unknownArtist') || 'Nghệ sĩ không xác định'}</div>
        <div className="song-list-item-meta">
          {song.album && (
            <span className="song-list-item-album">{song.album}</span>
          )}
          {duration && (
            <span className="song-list-item-duration">
              {song.album && ' • '}
              {formatTime(duration)}
              <span className="song-list-item-trimmed-hint" title="File đã được cắt">
                {' '}(đã cắt)
              </span>
            </span>
          )}
          {/* Segment badge: start-end */}
          {(typeof song.audioStartOffset === 'number' && typeof duration === 'number') && (
            <span
              className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border"
              style={{
                borderColor: 'rgb(var(--border))',
                background: 'rgb(var(--muted))',
                color: 'rgb(var(--foreground))',
                fontSize: '12px'
              }}
              title={`Đoạn cắt: ${formatTime(song.audioStartOffset)} – ${formatTime(song.audioStartOffset + duration)}`}
            >
              {formatTime(song.audioStartOffset)} – {formatTime(song.audioStartOffset + duration)}
            </span>
          )}
        </div>
        {song.description && (
          <div className="song-list-item-description">{song.description}</div>
        )}
        <div className="song-list-item-date">
          {formatDate(song.createdAt || song.created_at)}
        </div>
      </div>
      <div className="song-list-item-actions">
        {song.song && (
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            className="song-list-item-audio"
            src={(song.file || song._id || song.id
              ? songApi.getSongStreamUrlById(song.file || song._id || song.id)
              : song.song
                ? songApi.getSongStreamUrl(song.song)
                : "") + `?_t=${Date.now()}` }
            onError={(e) => {
              // Fallback chain: filename -> raw url
              if (song.song) {
                e.currentTarget.src = songApi.getSongStreamUrl(song.song) + `?_t=${Date.now()}`;
                e.currentTarget.load();
              } else if (song.url) {
                e.currentTarget.src = song.url;
                e.currentTarget.load();
              }
            }}
          >
            Trình duyệt của bạn không hỗ trợ audio.
          </audio>
        )}
        <button
          className="song-list-item-delete-btn"
          onClick={() => onDelete(song._id || song.id, song.song)}
          disabled={deletingId === (song._id || song.id)}
          title={t('song.delete') || 'Xóa bài hát'}
        >
          {deletingId === (song._id || song.id) ? (
            t('song.deleting') || 'Đang xóa...'
          ) : (
            t('song.delete') || 'Xóa'
          )}
        </button>
      </div>
    </div>
  );
}

