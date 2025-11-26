import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import songApi from "../../../../api/songApi";
import AudioTrimmer from "../audio/AudioTrimmer";
import "../../../../styles/modules/feeds/components/music/UploadSong.css";

/**
 * Component để upload nhạc vào library
 */
export default function UploadSong({ onSongUploaded }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState(null);
  const [trimmedData, setTrimmedData] = useState(null); // { startOffset, duration }
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Helper function để set error với auto-hide
  const setErrorWithAutoHide = (message) => {
    // Clear timeout cũ nếu có
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setError(message);
    // Set timeout mới
    errorTimeoutRef.current = setTimeout(() => {
      setError("");
      errorTimeoutRef.current = null;
    }, 3000);
  };

  // Helper function để set success với auto-hide
  const setSuccessWithAutoHide = (message) => {
    // Clear timeout cũ nếu có
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccess(message);
    // Set timeout mới
    successTimeoutRef.current = setTimeout(() => {
      setSuccess("");
      successTimeoutRef.current = null;
    }, 3000);
  };

  // Cleanup timeouts khi component unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Kiểm tra định dạng file
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setErrorWithAutoHide("Chỉ chấp nhận file audio (mp3, wav, ogg, m4a, aac)");
        return;
      }
      // Kiểm tra kích thước file (tối đa 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setErrorWithAutoHide("File quá lớn. Kích thước tối đa: 50MB");
        return;
      }
      setFile(selectedFile);
      setTrimmedData(null);
      setShowTrimmer(true);
      setError("");
    }
  };

  const handleTrimmed = (data) => {
    setTrimmedData(data);
    setShowTrimmer(false);
  };

  const handleCancelTrimmer = () => {
    setShowTrimmer(false);
    setFile(null);
    setTrimmedData(null);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ngăn chặn submit nhiều lần
    if (loading) {
      return;
    }
    
    setError("");
    setSuccess("");

    if (!title || !artist) {
      setErrorWithAutoHide("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (!file) {
      setErrorWithAutoHide("Vui lòng chọn file nhạc");
      return;
    }

    // Phải cắt nhạc trước khi upload (tối đa 30 giây)
    if (!trimmedData) {
      setErrorWithAutoHide("Vui lòng cắt nhạc trước khi upload (tối đa 30 giây)");
      setShowTrimmer(true);
      return;
    }

    setLoading(true);

    try {
      // Lấy entityAccountId từ activeEntity trong session
      let session, entityAccountId, authorEntityId, authorEntityType;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }
      const activeEntity = session?.activeEntity || session?.account;
      entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      authorEntityId = activeEntity?.id || session?.account?.id || null;
      const rawRole = (activeEntity?.role || session?.account?.role || "").toLowerCase();
      if (rawRole === "bar" || rawRole === "barpage") {
        authorEntityType = "BarPage";
      } else if (rawRole === "dj" || rawRole === "dancer" || rawRole === "business") {
        authorEntityType = "BusinessAccount";
      } else {
        authorEntityType = "Account";
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("artist", artist);
      if (entityAccountId) formData.append("entityAccountId", entityAccountId);
      if (authorEntityId) formData.append("authorEntityId", authorEntityId);
      if (authorEntityType) formData.append("authorEntityType", authorEntityType);
      // Thêm thông tin trimming nếu có
      if (trimmedData) {
        formData.append("audioStartOffset", trimmedData.startOffset.toString());
        formData.append("audioDuration", trimmedData.duration.toString());
      }

      const response = await songApi.uploadSong(formData);
      
      // axiosClient interceptor đã unwrap response.data, nên response chính là response.data
      // Backend trả về: { message: "...", status: "success", data: {...} }
      // Sau interceptor: response = { message: "...", status: "success", data: {...} }
      
      // Kiểm tra success
      if (response && response.status === "success") {
        // Reset form
        setTitle("");
        setArtist("");
        setFile(null);
        setTrimmedData(null);
        setShowTrimmer(false);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
        
        // Hiển thị thông báo thành công và tự động ẩn sau 3 giây
        setSuccessWithAutoHide("Đã thêm nhạc vào library thành công!");
        
        // Callback để refresh danh sách
        if (onSongUploaded) {
          onSongUploaded();
        }
      } else {
        // Lấy error message từ nhiều nguồn có thể
        const errorMsg = 
          response?.error || 
          response?.message || 
          "Không thể upload nhạc";
        console.error('[UploadSong] Upload failed:', errorMsg, response);
        setErrorWithAutoHide(errorMsg);
      }
    } catch (err) {
      console.error("Error uploading song:", err);
      setErrorWithAutoHide(err.response?.data?.error || err.message || "Có lỗi xảy ra khi upload nhạc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-song-container">
      <h2 className="upload-song-title">
        {t('song.uploadTitle') || 'Thêm nhạc vào library'}
      </h2>
      
      <form onSubmit={handleSubmit} className="upload-song-form">
        <div className="upload-song-field">
          <label className="upload-song-label">
            {t('song.title') || 'Tên bài hát'} <span className="upload-song-label-required">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('song.titlePlaceholder') || 'Nhập tên bài hát...'}
            className="upload-song-input"
            required
          />
        </div>

        <div className="upload-song-field">
          <label className="upload-song-label">
            {t('song.artist') || 'Nghệ sĩ'} <span className="upload-song-label-required">*</span>
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder={t('song.artistPlaceholder') || 'Nhập tên nghệ sĩ...'}
            className="upload-song-input"
            required
          />
        </div>

        <div className="upload-song-field">
          <label className="upload-song-label">
            {t('song.file') || 'File nhạc'} <span className="upload-song-label-required">*</span>
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="upload-song-file-input"
            required
          />
          {file && !showTrimmer && (
            <div className="upload-song-file-info">
              <span>{t('song.selectedFile') || 'File đã chọn'}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              {trimmedData && (
                <span className="upload-song-file-info-trimmed">
                  • Đã cắt: {Math.floor(trimmedData.startOffset)}s - {Math.floor(trimmedData.startOffset + trimmedData.duration)}s ({Math.floor(trimmedData.duration)}s)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Audio Trimmer */}
        {file && showTrimmer && (
          <div className="upload-song-trimmer-wrapper">
            <AudioTrimmer
              audioFile={file}
              onTrimmed={handleTrimmed}
              onCancel={handleCancelTrimmer}
            />
          </div>
        )}

        {error && (
          <div className="upload-song-error">
            {error}
          </div>
        )}

        {success && (
          <div className="upload-song-success">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="upload-song-submit-btn"
          onClick={(e) => {
            // Ngăn chặn double click
            if (loading) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {loading ? (t('song.uploading') || 'Đang upload...') : (t('song.upload') || 'Upload nhạc')}
        </button>
      </form>
    </div>
  );
}

