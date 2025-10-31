import { useState } from "react";
import PropTypes from "prop-types";
import axiosClient from "../../../api/axiosClient";
import "../../../styles/modules/feeds/PostComposerModal.css";

export default function PostComposerModal({ open, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  if (!open) return null;

  const handleFileUpload = async (files, type) => {
    if (!files.length) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append(type, file);
      });
      
      const res = await axiosClient.post("/posts/upload", formData);
      const uploadedFiles = res?.data || res;
      console.log("[COMPOSER] Files uploaded successfully");
      setMediaFiles(prev => [...prev, ...uploadedFiles]);
    } catch (err) {
      console.error("[COMPOSER] Upload failed:", err);
      alert("Upload thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFiles.length) return;
    if (uploading) {
      console.log("[COMPOSER] Upload in progress, postpone submit");
      return;
    }
    
    try {
      setSubmitting(true);
      console.log("[COMPOSER] Starting post submission");
      const title = content.trim().slice(0, 80) || "Bài viết";
      
      // Prepare images object for backend
      const images = {};
      mediaFiles.forEach((file, index) => {
        images[`image_${index}`] = {
          url: file.url || file.path,
          caption: file.caption || "",
          uploadDate: new Date().toISOString()
        };
      });
      
      // Determine author from session.activeEntity (fallback to account)
      let session, authorId, accountId, authorRole
      try {
        const raw = localStorage.getItem("session")
        session = raw ? JSON.parse(raw) : null
      } catch (err) {
        session = null
      }
      const activeEntity = session?.activeEntity || session?.account
      authorId = activeEntity?.id || session?.account?.id
      accountId = session?.account?.id
      authorRole = (activeEntity?.role || activeEntity?.type || session?.account?.role || "").toLowerCase()

      const postData = { 
        title, 
        content: content,
        caption: content,
        images,
        authorId,
        accountId,
        authorRole,
        // explicit entity identifiers (UUID-safe)
        authorEntityId: activeEntity?.id || null,
        authorEntityType: (activeEntity?.role || activeEntity?.type || "").toLowerCase() || null,
        authorEntityName: activeEntity?.name || session?.account?.userName || null,
        authorEntityAvatar: activeEntity?.avatar || session?.account?.avatar || null
      };
      
      console.log("[COMPOSER] Post data:", { title, content: content.substring(0, 50), mediaCount: mediaFiles.length });
      
      const res = await axiosClient.post("/posts", postData);
      
      const created = res?.data || res;
      console.log("[COMPOSER] Post created successfully");
      onCreated?.(created?.data || created);
      setContent("");
      setMediaFiles([]);
      onClose?.();
    } catch (err) {
      console.error("[COMPOSER] Create post failed:", err);
      console.error("[COMPOSER] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      alert("Đăng bài không thành công. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="post-composer-modal"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose?.();
      }}
      tabIndex={-1}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          Tạo bài viết
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bạn muốn chia sẻ điều gì?"
            rows={5}
            className="content-textarea"
          />
          
          <div className="media-upload-section">
            <label className="upload-btn">
              📷 Ảnh
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={(e) => handleFileUpload(e.target.files, 'images')}
              />
            </label>
            
            <label className="upload-btn">
              🎵 Nhạc
              <input 
                type="file" 
                accept="audio/*" 
                multiple 
                onChange={(e) => handleFileUpload(e.target.files, 'audio')}
              />
            </label>
            
            <label className="upload-btn">
              🎬 Video
              <input 
                type="file" 
                accept="video/*" 
                multiple 
                onChange={(e) => handleFileUpload(e.target.files, 'videos')}
              />
            </label>
          </div>
          
          {uploading && (
            <div className="upload-progress">
              Đang upload media... Vui lòng đợi hoàn tất trước khi đăng.
            </div>
          )}
          
          {mediaFiles.length > 0 && (
            <div className="media-preview">
              {mediaFiles.map((file, index) => (
                <div key={index} className="media-item">
                  {file.type?.startsWith('image') ? (
                    <img src={file.url || file.path} alt={`Media ${index}`} />
                  ) : file.type?.startsWith('video') ? (
                    <video src={file.url || file.path} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgb(var(--muted))' }}>
                      🎵
                    </div>
                  )}
                  <button 
                    type="button"
                    className="remove-btn"
                    onClick={() => removeMedia(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="modal-footer">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={submitting} 
              className="btn-cancel"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={submitting || uploading || (!content.trim() && !mediaFiles.length)} 
              className="btn-submit"
            >
              {submitting ? "Đang đăng..." : (uploading ? "Đợi upload..." : "Đăng")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

PostComposerModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
};


