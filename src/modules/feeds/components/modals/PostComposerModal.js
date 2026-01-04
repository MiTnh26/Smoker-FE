import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Camera, Video, X, Globe, Lock, ChevronDown, Pencil } from "lucide-react";
import axiosClient from "../../../../api/axiosClient";
import { uploadPostMedia } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";
import "../../../../styles/modules/feeds/components/modals/postForms.css";

// Caption Modal Component
const CaptionModal = ({ open, onClose, caption, onChange, onSave, t, imageUrl }) => {
  const [localCaption, setLocalCaption] = useState(caption || "");
  
  useEffect(() => {
    if (open) {
      setLocalCaption(caption || "");
    }
  }, [open, caption]);
  
  if (!open) return null;
  
  const handleSave = () => {
    onChange(localCaption);
    onSave();
  };
  
  return (
    <div
      className={cn(
        "post-form-overlay",
        "fixed inset-0 z-[1100]",
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
          "w-full max-w-md",
          "flex flex-col overflow-hidden"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="post-form-header">
          <div className="post-form-header-content" style={{ flex: 1, justifyContent: 'center' }}>
            <span className="text-lg font-semibold">{t('modal.editCaption') || "Chỉnh sửa caption"}</span>
          </div>
          <button
            type="button"
            className="post-form-header-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full h-48 object-cover"
              />
            </div>
          )}
          <textarea
            value={localCaption}
            onChange={(e) => setLocalCaption(e.target.value)}
            placeholder={t('modal.captionPlaceholder')?.replace(/\{\{index\}\}/g, '') || "Nhập caption cho ảnh..."}
            rows={4}
            className="post-form-textarea post-form-textarea-modern w-full"
            autoFocus
          />
        </div>
        
        {/* Footer */}
        <div className="post-form-footer post-form-footer-modern">
          <button 
            type="button" 
            onClick={onClose} 
            className="post-form-button post-form-button-cancel post-form-button-cancel-modern"
          >
            {t('modal.cancel')}
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            className="post-form-button post-form-button-submit post-form-button-submit-modern"
          >
            {t('modal.save') || "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Media Item Component với state riêng
const MediaItem = ({ file, index, onRemove, onCaptionChange, t }) => {
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const isImage = file.type?.startsWith('image') || file.resource_type === 'image';
  const isVideo = file.type?.startsWith('video') || file.resource_type === 'video';
  
  const handleOpenCaptionModal = (e) => {
    e.stopPropagation();
    setShowCaptionModal(true);
  };
  
  const handleSaveCaption = (newCaption) => {
    onCaptionChange(index, newCaption);
    setShowCaptionModal(false);
  };
  
  return (
    <>
      <div 
        className="post-form-media-chip post-form-media-chip-modern"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
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
        
        {/* Action buttons group - chỉ hiện khi hover */}
        <div className={cn(
          "post-form-media-chip-actions",
          showActions && "post-form-media-chip-actions-visible"
        )}>
          {/* Edit caption button - chỉ hiện với ảnh */}
          {isImage && (
            <button 
              type="button"
              className="post-form-media-chip-action-btn post-form-media-chip-edit-modern"
              onClick={handleOpenCaptionModal}
              aria-label="Edit caption"
            >
              <Pencil size={14} strokeWidth={2} />
            </button>
          )}
          {/* Remove button */}
          <button 
            type="button"
            className="post-form-media-chip-action-btn post-form-media-chip-remove-modern"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            aria-label="Remove media"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        
        {/* Caption preview - hiện nếu có caption */}
        {isImage && file.caption && (
          <div className="post-form-media-chip-caption-preview">
            <span>{file.caption}</span>
          </div>
        )}
      </div>
      
      {/* Caption Modal */}
      <CaptionModal
        open={showCaptionModal}
        onClose={() => setShowCaptionModal(false)}
        caption={file.caption || ""}
        onChange={(newCaption) => onCaptionChange(index, newCaption)}
        onSave={() => setShowCaptionModal(false)}
        t={t}
        imageUrl={file.url || file.path}
      />
    </>
  );
};

export default function PostComposerModal({ open, onClose, onCreated, postType = "media" }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("public"); // "public" hoặc "private"
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [userAvatar, setUserAvatar] = useState("");
  const [userName, setUserName] = useState("");
  const { t } = useTranslation();

  // Load user info from session
  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      if (session) {
        const activeEntity = session?.activeEntity || session?.account;
        const avatar = activeEntity?.avatar || session?.account?.avatar || "https://media.techz.vn/resize_x700x/media2019/source/01TRAMY/2024MY1/mckanhnong.png";
        const name = activeEntity?.name || activeEntity?.userName || session?.account?.userName || session?.account?.name || "Người dùng";
        setUserAvatar(avatar);
        setUserName(name);
      }
    } catch (err) {
      console.error("[COMPOSER] Error loading user info:", err);
    }
  }, [open]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Reset status khi mở modal
      setStatus("public");
      setShowPrivacyDropdown(false);
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

  const updateMediaCaption = (index, caption) => {
    const updatedFiles = [...mediaFiles];
    updatedFiles[index] = { ...updatedFiles[index], caption };
    setMediaFiles(updatedFiles);
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
        authorAvatar: activeEntity?.avatar || session?.account?.avatar || null,
        status: status // Thêm status vào postData
      };
      
      
      const res = await axiosClient.post("/posts", postData);
      
      const created = res?.data || res;
      onCreated?.(created?.data || created);
      setContent("");
      setMediaFiles([]);
      setStatus("public"); // Reset về public
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
          "flex flex-col"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="post-form-header">
          <div className="post-form-header-content" style={{ flex: 1, justifyContent: 'center' }}>
            <span className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{t('modal.composerTitle')}</span>
          </div>
          <button
            type="button"
            className="post-form-header-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        
        {/* Two-Panel Layout: Main Content + Preview/Info Aside */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {/* User Info & Privacy Selector */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-border/20"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{userName}</span>
                </div>
              </div>
              
              {/* Privacy Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "text-sm font-medium",
                    "bg-muted/40 border-border hover:bg-muted/60",
                    "text-foreground"
                  )}
                >
                  {status === "public" ? (
                    <>
                      <Globe size={16} />
                      {t('modal.postPrivacyPublic')}
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      {t('modal.postPrivacyPrivate')}
                    </>
                  )}
                  <ChevronDown size={14} className={cn("transition-transform", showPrivacyDropdown && "rotate-180")} />
                </button>
                
                {/* Dropdown Menu */}
                {showPrivacyDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPrivacyDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setStatus("public");
                          setShowPrivacyDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          "text-sm font-medium",
                          status === "public"
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Globe size={18} />
                        <div className="flex flex-col">
                          <span>{t('modal.postPrivacyPublic')}</span>
                          <span className="text-xs text-muted-foreground">{t('modal.postPrivacyPublicDesc')}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatus("private");
                          setShowPrivacyDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          "text-sm font-medium",
                          status === "private"
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Lock size={18} />
                        <div className="flex flex-col">
                          <span>{t('modal.postPrivacyPrivate')}</span>
                          <span className="text-xs text-muted-foreground">{t('modal.postPrivacyPrivateDesc')}</span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col gap-6">
              {/* Form Fields */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="post-form-field-wrapper">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('modal.composerPlaceholder') || "Bạn đang nghĩ gì?..."}
                    rows={6}
                    className="post-form-textarea post-form-textarea-modern"
                  />
                </div>
                
                {/* Media Selector Pills - Moved to bottom of textarea */}
                <div className="flex gap-2 flex-wrap justify-end">
                  <label className="post-form-pill-button post-form-pill-button-modern">
                    <Camera className="post-form-pill-icon" strokeWidth={1.5} />
                    <span>{t('modal.photo')}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={(e) => handleFileUpload(e.target.files, 'images')}
                    />
                  </label>
                  
                  <label className="post-form-pill-button post-form-pill-button-modern">
                    <Video className="post-form-pill-icon" strokeWidth={1.5} />
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
              
              {/* Media Preview/Info */}
              {mediaFiles.length > 0 && (
                <aside className="w-full">
                  <div className="post-form-media-grid post-form-media-grid-modern">
                    {mediaFiles.map((file, index) => {
                      const mediaKey = file.url || file.path || `media-${index}`;
                      return (
                        <MediaItem
                          key={mediaKey}
                          file={file}
                          index={index}
                          onRemove={removeMedia}
                          onCaptionChange={updateMediaCaption}
                          t={t}
                              />
                      );
                    })}
                  </div>
                </aside>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="post-form-footer post-form-footer-modern">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={submitting} 
              className="post-form-button post-form-button-cancel post-form-button-cancel-modern"
            >
              {t('modal.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={submitting || uploading || (!content.trim() && !mediaFiles.length)} 
              className="post-form-button post-form-button-submit post-form-button-submit-modern"
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


