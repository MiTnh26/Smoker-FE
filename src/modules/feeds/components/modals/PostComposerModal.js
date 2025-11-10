import { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import axiosClient from "../../../../api/axiosClient";
import { uploadPostMedia } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";

export default function PostComposerModal({ open, onClose, onCreated, postType = "media" }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();
  
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
        authorEntityName: activeEntity?.name || session?.account?.userName || null,
        authorEntityAvatar: activeEntity?.avatar || session?.account?.avatar || null
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
        "fixed inset-0 bg-black/75 backdrop-blur-xl z-[1000]",
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
          "w-full max-w-[520px] bg-card text-card-foreground",
          "rounded-lg border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden relative"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "p-5 border-b border-border/30 font-semibold text-lg",
          "bg-card/80 backdrop-blur-sm relative z-10"
        )}>
          📷 {t('modal.composerTitle')}
        </div>
        
        <form onSubmit={handleSubmit} className={cn(
          "p-5 flex flex-col gap-3 relative z-10"
        )}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('modal.composerPlaceholder')}
            rows={5}
            className={cn(
              "w-full resize-y bg-background text-foreground",
              "border-[0.5px] border-border/20 rounded-lg p-4",
              "font-inherit text-base leading-6 outline-none",
              "transition-all duration-200",
              "focus:border-primary focus:ring-2 focus:ring-primary/10",
              "placeholder:text-muted-foreground/60"
            )}
          />
          
          <div className={cn("flex gap-2 flex-wrap")}>
            <label className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 bg-muted/30",
              "text-muted-foreground cursor-pointer text-sm font-medium",
              "transition-all duration-200",
              "hover:bg-muted/50 hover:text-foreground",
              "active:scale-95"
            )}>
              📷 {t('modal.photo')}
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, 'images')}
              />
            </label>
            
            <label className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 bg-muted/30",
              "text-muted-foreground cursor-pointer text-sm font-medium",
              "transition-all duration-200",
              "hover:bg-muted/50 hover:text-foreground",
              "active:scale-95"
            )}>
              🎬 {t('modal.video')}
              <input 
                type="file" 
                accept="video/*" 
                multiple 
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, 'videos')}
              />
            </label>
          </div>
          
          {uploading && (
            <div className={cn(
              "p-3 bg-primary/10 text-primary rounded-lg text-sm font-medium text-center"
            )}>
              {t('modal.uploading')}
            </div>
          )}
          
          {mediaFiles.length > 0 && (
            <div className={cn("flex gap-2 flex-wrap mt-2")}>
              {mediaFiles.map((file, index) => (
                <div key={index} className={cn(
                  "relative w-[120px] h-[120px] rounded-lg overflow-hidden",
                  "bg-muted/20 border-[0.5px] border-border/20"
                )}>
                  <div className={cn("relative w-full h-full")}>
                    {file.type?.startsWith('image') || file.resource_type === 'image' ? (
                      <img 
                        src={file.url || file.path} 
                        alt={`Media ${index}`}
                        className="w-full h-full object-cover"
                      />
                    ) : file.type?.startsWith('video') || file.resource_type === 'video' ? (
                      <video 
                        src={file.url || file.path} 
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={cn(
                        "w-full h-full flex items-center justify-center",
                        "bg-muted text-2xl"
                      )}>
                        📄
                      </div>
                    )}
                    <button 
                      type="button"
                      className={cn(
                        "absolute top-1 right-1 w-7 h-7 rounded-full",
                        "bg-danger text-primary-foreground border-none cursor-pointer",
                        "flex items-center justify-center text-lg font-bold",
                        "transition-all duration-200 shadow-lg",
                        "hover:scale-110 hover:shadow-xl",
                        "active:scale-95"
                      )}
                      onClick={() => removeMedia(index)}
                    >
                      ×
                    </button>
                  </div>
                  {/* Caption input for each image */}
                  {(file.type?.startsWith('image') || file.resource_type === 'image') && (
                    <input
                      type="text"
                      placeholder={t('modal.captionPlaceholder', { index: index + 1 })}
                      value={file.caption || ""}
                      onChange={(e) => {
                        const updatedFiles = [...mediaFiles];
                        updatedFiles[index] = { ...updatedFiles[index], caption: e.target.value };
                        setMediaFiles(updatedFiles);
                      }}
                      className={cn(
                        "w-full mt-2 px-2 py-1.5 text-xs",
                        "border-[0.5px] border-border/30 rounded-lg",
                        "bg-background text-foreground outline-none",
                        "transition-all duration-200",
                        "focus:border-primary focus:ring-1 focus:ring-primary/10"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className={cn(
            "flex gap-2 justify-end pt-4 border-t border-border/30 mt-2"
          )}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={submitting} 
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200",
                "bg-muted/30 text-foreground",
                "hover:bg-muted/50",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {t('modal.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={submitting || uploading || (!content.trim() && !mediaFiles.length)} 
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200 border-none",
                "bg-primary text-primary-foreground",
                "hover:opacity-90",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {submitting ? t('modal.posting') : (uploading ? t('modal.waitUpload') : t('modal.post'))}
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


