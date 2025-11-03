import { useState } from "react";
import PropTypes from "prop-types";
import axiosClient from "../../../api/axiosClient";
import { uploadPostMedia } from "../../../api/postApi";
import "../../../styles/modules/feeds/PostComposerModal.css";

export default function PostComposerModal({ open, onClose, onCreated, postType = "media" }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  if (!open) return null;

  // Upload files via backend API (safer, uses backend Cloudinary config)
  const uploadToCloudinary = async (file, type) => {
    const formData = new FormData();
    // Backend expects field names: "images" for images, "videos" for videos, "audio" for audio
    const fieldName = type === 'videos' ? 'videos' : 'images';
    formData.append(fieldName, file);
    
    try {
      const res = await uploadPostMedia(formData);
      console.log("[COMPOSER] Upload response:", res);
      
      // Backend returns: { success: true, data: [...], message: "..." }
      const responseData = res.data || res;
      const files = responseData.data || responseData;
      
      if (files && files.length > 0) {
        const uploadedFile = files[0]; // Get first uploaded file
        return {
          secure_url: uploadedFile.url || uploadedFile.path,
          public_id: uploadedFile.public_id,
          format: uploadedFile.format,
          type: uploadedFile.type || file.type,
          resource_type: type === 'videos' ? 'video' : 'image',
          ...uploadedFile
        };
      }
      throw new Error("No file data returned from server");
    } catch (err) {
      console.error("[COMPOSER] Upload error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Upload thất bại";
      throw new Error(errorMessage);
    }
  };

  const handleFileUpload = async (files, type) => {
    if (!files.length) return;
    
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of Array.from(files)) {
        const result = await uploadToCloudinary(file, type);
        if (result.secure_url) {
          uploadedFiles.push({
            url: result.secure_url,
            path: result.secure_url,
            type: result.type || file.type,
            resource_type: result.resource_type || (type === 'videos' ? 'video' : 'image'),
            caption: ""
          });
        } else {
          console.error("[COMPOSER] Upload failed - no secure_url:", result);
          throw new Error(result.error?.message || "Không có URL trả về");
        }
      }
      console.log("[COMPOSER] Files uploaded successfully");
      setMediaFiles(prev => [...prev, ...uploadedFiles]);
    } catch (err) {
      console.error("[COMPOSER] Upload failed:", err);
      alert(`Upload thất bại: ${err.message || "Vui lòng thử lại"}`);
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
      
      // Prepare images and videos objects for backend
      const images = {};
      const videos = {};
      mediaFiles.forEach((file, index) => {
        const key = (index + 1).toString();
        if (file.type?.startsWith('video') || file.resource_type === 'video') {
          videos[key] = {
            url: file.url || file.path,
            caption: file.caption || content,
            type: "video"
          };
        } else {
          images[key] = {
            url: file.url || file.path,
            caption: file.caption || content,
            uploadDate: new Date().toISOString()
          };
        }
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
      
      // Normalize role to match backend enum values (ignore type)
      const rawRole = (activeEntity?.role || session?.account?.role || "").toLowerCase();
      let normalizedEntityType;
      if (rawRole === "bar") {
        normalizedEntityType = "BarPage";
      } else if (rawRole === "dj" || rawRole === "dancer") {
        normalizedEntityType = "BusinessAccount";
      } else {
        normalizedEntityType = "Account";
      }
      authorRole = normalizedEntityType;

      const postData = { 
        title, 
        content: content,
        caption: content,
        images: Object.keys(images).length > 0 ? images : undefined,
        videos: Object.keys(videos).length > 0 ? videos : undefined,
        authorId,
        accountId,
        authorRole,
        // explicit entity identifiers (UUID-safe)
        authorEntityId: activeEntity?.id || null,
        authorEntityType: normalizedEntityType,
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
          📷 Đăng Ảnh/Video
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
                  <div className="media-preview-container">
                    {file.type?.startsWith('image') || file.resource_type === 'image' ? (
                      <img src={file.url || file.path} alt={`Media ${index}`} />
                    ) : file.type?.startsWith('video') || file.resource_type === 'video' ? (
                      <video src={file.url || file.path} controls />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgb(var(--muted))' }}>
                        📄
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
                  {/* Caption input for each image */}
                  {(file.type?.startsWith('image') || file.resource_type === 'image') && (
                    <input
                      type="text"
                      placeholder={`Nhập caption cho ảnh ${index + 1}...`}
                      value={file.caption || ""}
                      onChange={(e) => {
                        const updatedFiles = [...mediaFiles];
                        updatedFiles[index] = { ...updatedFiles[index], caption: e.target.value };
                        setMediaFiles(updatedFiles);
                      }}
                      className="media-caption-input"
                    />
                  )}
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
  postType: PropTypes.string,
};


