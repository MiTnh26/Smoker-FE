import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Camera, Video, X } from "lucide-react";
import axiosClient from "../../../../api/axiosClient";
import { uploadPostMedia } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";
import "../../../../styles/modules/feeds/components/modals/postForms.css";

export default function PostComposerModal({ open, onClose, onCreated, postType = "media" }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  
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
      const errorMessage = err.response?.data?.message || err.message || t('modal.uploadFailed');
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
          throw new Error(result.error?.message || "No url returned");
        }
      }
      console.log("[COMPOSER] Files uploaded successfully");
      setMediaFiles(prev => [...prev, ...uploadedFiles]);
    } catch (err) {
      console.error("[COMPOSER] Upload failed:", err);
      alert(`${t('modal.uploadFailed')}: ${err.message || ''}`);
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
      const title = content.trim().slice(0, 80) || t('feed.shareTitle');
      
      // Prepare images and videos objects for backend
      const images = {};
      const videos = {};
      mediaFiles.forEach((file, index) => {
        const key = (index + 1).toString();
        const mediaCaption = file.caption ? file.caption : ""; // chỉ dùng caption user nhập, không fallback content

        if (file.type?.startsWith('video') || file.resource_type === 'video') {
          videos[key] = {
            url: file.url || file.path,
            caption: mediaCaption,
            type: "video"
          };
        } else {
          images[key] = {
            url: file.url || file.path,
            caption: mediaCaption,
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

      // Get entityAccountId from activeEntity (prioritize EntityAccountId, then entityAccountId, finally id)
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      
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
        entityAccountId: entityAccountId,
        authorEntityId: activeEntity?.id || null,
        authorEntityType: normalizedEntityType,
        authorName: activeEntity?.name || session?.account?.userName || null,
        authorAvatar: activeEntity?.avatar || session?.account?.avatar || null
      };
      
      
      const res = await axiosClient.post("/posts", postData);
      
      const created = res?.data || res;
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
      alert(t('modal.postFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "post-form-overlay",
        "fixed inset-0 z-[1000]",
        "flex items-center justify-center p-4"
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose?.();
      }}
      tabIndex={-1}
    >
      <div
        className={cn(
          "post-form-glass-card",
          "w-full max-w-3xl max-h-[92vh]",
          "flex flex-col overflow-hidden"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="post-form-header">
          <div className="post-form-header-content">
            <Camera className="post-form-header-icon" />
            <span>{t('modal.composerTitle')}</span>
          </div>
          <button
            type="button"
            className="post-form-header-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Two-Panel Layout: Main Content + Preview/Info Aside */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Panel: Form Fields */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="post-form-field-wrapper">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('modal.composerPlaceholder')}
                    rows={4}
                    className="post-form-textarea"
                  />
                </div>
                
                {/* Media Selector Pills */}
                <div className="flex gap-2 flex-wrap">
                  <label className="post-form-pill-button">
                    <Camera className="post-form-pill-icon" />
                    <span>{t('modal.photo')}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={(e) => handleFileUpload(e.target.files, 'images')}
                    />
                  </label>
                  
                  <label className="post-form-pill-button">
                    <Video className="post-form-pill-icon" />
                    <span>{t('modal.video')}</span>
                    <input 
                      type="file" 
                      accept="video/*" 
                      multiple 
                      onChange={(e) => handleFileUpload(e.target.files, 'videos')}
                    />
                  </label>
                </div>
                
                {/* Upload Status */}
                {uploading && (
                  <div className="post-form-upload-status">
                    {t('modal.uploading')}
                  </div>
                )}
              </div>
              
              {/* Right Panel: Media Preview/Info */}
              {mediaFiles.length > 0 && (
                <aside className="w-full lg:w-80 flex-shrink-0">
                  <div className="post-form-media-grid">
                    {mediaFiles.map((file, index) => {
                      const isImage = file.type?.startsWith('image') || file.resource_type === 'image';
                      const isVideo = file.type?.startsWith('video') || file.resource_type === 'video';
                      const mediaKey = file.url || file.path || `media-${index}`;
                      
                      return (
                        <div key={mediaKey} className="post-form-media-chip">
                          {isImage && (
                            <img 
                              src={file.url || file.path} 
                              alt={`Media ${index + 1}`}
                            />
                          )}
                          {isVideo && !isImage && (
                            <video 
                              src={file.url || file.path} 
                              controls
                              className="w-full h-full object-cover"
                            />
                          )}
                          {!isImage && !isVideo && (
                            <div className="post-form-media-placeholder">
                              📄
                            </div>
                          )}
                          <button 
                            type="button"
                            className="post-form-media-chip-remove"
                            onClick={() => removeMedia(index)}
                            aria-label="Remove media"
                          >
                            <X size={14} />
                          </button>
                          {/* Caption input for each image */}
                          {isImage && (
                            <div className="post-form-media-chip-caption">
                              <input
                                type="text"
                                placeholder={t('modal.captionPlaceholder', { index: index + 1 })}
                                value={file.caption || ""}
                                onChange={(e) => {
                                  const updatedFiles = [...mediaFiles];
                                  updatedFiles[index] = { ...updatedFiles[index], caption: e.target.value };
                                  setMediaFiles(updatedFiles);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </aside>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="post-form-footer">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={submitting} 
              className="post-form-button post-form-button-cancel"
            >
              {t('modal.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={submitting || uploading || (!content.trim() && !mediaFiles.length)} 
              className="post-form-button post-form-button-submit"
            >
              {(() => {
                if (submitting) return t('modal.posting');
                if (uploading) return t('modal.waitUpload');
                return t('modal.post');
              })()}
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


