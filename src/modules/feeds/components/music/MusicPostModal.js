import { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import axiosClient from "../../../../api/axiosClient";
import { uploadPostMedia } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";

export default function MusicPostModal({ open, onClose, onCreated }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    musicTitle: "",
    artistName: "",
    description: "",
    hashTag: "",
    musicPurchaseLink: "",
    musicBackgroundImage: "",
    audioFile: null,
    audioUrl: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  // Upload audio file via backend API (safer, uses backend Cloudinary config)
  const uploadAudioToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("audio", file); // Backend expects "audio" fieldname

    try {
      const res = await uploadPostMedia(formData);

      // Backend returns: { success: true, data: [...], message: "..." }
      const responseData = res.data || res;
      const files = responseData.data || responseData;

      if (files && files.length > 0) {
        const uploadedFile = files[0]; // Get first uploaded file
        return {
          secure_url: uploadedFile.url || uploadedFile.path,
          public_id: uploadedFile.public_id,
          format: uploadedFile.format,
          ...uploadedFile
        };
      }
      throw new Error("No file data returned from server");
    } catch (err) {
      console.error("[MUSIC] Upload audio error:", err);
      const errorMessage = err.response?.data?.message || err.message || t('modal.uploadFailed');
      throw new Error(errorMessage);
    }
  };

  // Upload image via backend API (safer, uses backend Cloudinary config)
  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("images", file); // Backend expects "images" fieldname

    try {
      const res = await uploadPostMedia(formData);
      console.log("[MUSIC] Upload image response:", res);

      // Backend returns: { success: true, data: [...], message: "..." }
      const responseData = res.data || res;
      const files = responseData.data || responseData;

      if (files && files.length > 0) {
        const uploadedFile = files[0]; // Get first uploaded file
        return {
          secure_url: uploadedFile.url || uploadedFile.path,
          public_id: uploadedFile.public_id,
          format: uploadedFile.format,
          ...uploadedFile
        };
      }
      throw new Error("No file data returned from server");
    } catch (err) {
      console.error("[MUSIC] Upload image error:", err);
      const errorMessage = err.response?.data?.message || err.message || t('modal.uploadFailed');
      throw new Error(errorMessage);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAudioFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      try {
        const result = await uploadAudioToCloudinary(file);
        if (result.secure_url) {
          setFormData((prev) => ({
            ...prev,
            audioUrl: result.secure_url,
            audioFile: file
          }));
        } else {
          console.error("[MUSIC] Upload failed - no secure_url:", result);
          alert(t('modal.uploadFailed'));
        }
      } catch (err) {
        console.error("[MUSIC] Upload error:", err);
        alert(t('modal.uploadFailed'));
      } finally {
        setUploading(false);
      }
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      try {
        const result = await uploadImageToCloudinary(file);
        if (result.secure_url) {
          setFormData((prev) => ({
            ...prev,
            musicBackgroundImage: result.secure_url
          }));
        } else {
          console.error("[MUSIC] Upload failed - no secure_url:", result);
          alert(t('modal.uploadFailed'));
        }
      } catch (err) {
        console.error("[MUSIC] Upload error:", err);
        alert(t('modal.uploadFailed'));
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.musicTitle || !formData.artistName || !formData.description || !formData.audioUrl || !formData.musicBackgroundImage) {
      alert(t('modal.postFailed'));
      return;
    }
    if (uploading) {
      alert(t('modal.waitUpload'));
      return;
    }

    try {
      setSubmitting(true);

      // Lấy session
      let session, accountId;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (err) {
        session = null;
      }
      const activeEntity = session?.activeEntity || session?.account;
      accountId = session?.account?.id;
      
      // Lấy entityAccountId, entityId, entityType từ activeEntity
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityId = activeEntity?.id || activeEntity?.entityId || accountId;
      const rawRole = (activeEntity?.role || activeEntity?.type || session?.account?.role || "").toLowerCase();
      let normalizedEntityType;
      if (rawRole === "business" || rawRole === "businessaccount") {
        normalizedEntityType = "BusinessAccount";
      } else if (rawRole === "bar" || rawRole === "barpage") {
        normalizedEntityType = "BarPage";
      } else {
        normalizedEntityType = "Account";
      }

      //  Tạo Music trước
      const musicRes = await axiosClient.post("/music", {
        title: formData.musicTitle,
        artist: formData.artistName,
        details: formData.description,
        hashTag: formData.hashTag,
        purchaseLink: formData.musicPurchaseLink,
        coverUrl: formData.musicBackgroundImage,
        audioUrl: formData.audioUrl,
        uploaderId: accountId,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: normalizedEntityType,
        uploaderName: activeEntity?.name || session?.account?.userName,
        uploaderAvatar: activeEntity?.avatar || session?.account?.avatar,
      });
      // axiosClient already returns response.data
      const createdMusic = musicRes?.data ? musicRes.data : (musicRes?.success ? musicRes.data : musicRes);

      //  Sau đó tạo Post liên kết
      const postRes = await axiosClient.post("/posts", {
        title: formData.musicTitle,
        content: formData.description,
        type: "post",
        accountId,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: normalizedEntityType,
        authorEntityId: entityId,
        authorEntityType: normalizedEntityType,
        authorEntityName: activeEntity?.name || session?.account?.userName,
        authorEntityAvatar: activeEntity?.avatar || session?.account?.avatar,
        musicId: (createdMusic && createdMusic._id) || (createdMusic && createdMusic.data && createdMusic.data._id) || createdMusic?.id,
        songId: null,
      });


      // axiosClient returns response.data -> may be {success, data}
      const createdPost = postRes?.data ? postRes.data : (postRes?.success ? postRes.data : postRes);
      onCreated?.(createdPost);
      setFormData({
        musicTitle: "",
        artistName: "",
        description: "",
        hashTag: "",
        musicPurchaseLink: "",
        musicBackgroundImage: "",
        audioFile: null,
        audioUrl: ""
      });
      onClose?.();

    } catch (err) {
      console.error("[MUSIC] Create music post failed:", err);
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
          "w-full max-w-[600px] bg-card text-card-foreground",
          "rounded-lg border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden relative"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "p-5 border-b border-border/30 font-semibold text-lg",
          "bg-card/80 backdrop-blur-sm relative z-10"
        )}>
          🎵 {t('music.postMusic')} (SoundCloud style)
        </div>

        <form onSubmit={handleSubmit} className={cn(
          "p-5 flex flex-col gap-4 relative z-10"
        )}>
          <div>
            <label htmlFor="music-title" className={cn("block mb-2 font-medium text-foreground")}>
              Title *
            </label>
            <input
              id="music-title"
              type="text"
              name="musicTitle"
              value={formData.musicTitle}
              onChange={handleInputChange}
              className={cn(
                "w-full px-4 py-3 border-[0.5px] border-border/20 rounded-lg",
                "bg-background text-foreground text-sm outline-none",
                "transition-all duration-200",
                "focus:border-primary focus:ring-2 focus:ring-primary/10",
                "placeholder:text-muted-foreground/60"
              )}
              required
            />
          </div>

          <div>
            <label htmlFor="music-artist" className={cn("block mb-2 font-medium text-foreground")}>
              Artist *
            </label>
            <input
              id="music-artist"
              type="text"
              name="artistName"
              value={formData.artistName}
              onChange={handleInputChange}
              className={cn(
                "w-full px-4 py-3 border-[0.5px] border-border/20 rounded-lg",
                "bg-background text-foreground text-sm outline-none",
                "transition-all duration-200",
                "focus:border-primary focus:ring-2 focus:ring-primary/10",
                "placeholder:text-muted-foreground/60"
              )}
              required
            />
          </div>

          <div>
            <label htmlFor="music-description" className={cn("block mb-2 font-medium text-foreground")}>
              Description *
            </label>
            <textarea
              id="music-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={cn(
                "w-full px-4 py-3 border-[0.5px] border-border/20 rounded-lg",
                "bg-background text-foreground text-sm outline-none resize-y",
                "transition-all duration-200",
                "focus:border-primary focus:ring-2 focus:ring-primary/10",
                "placeholder:text-muted-foreground/60"
              )}
              rows={3}
              placeholder={t('input.caption')}
              required
            />
          </div>

          <div>
            <label htmlFor="music-hashtag" className={cn("block mb-2 font-medium text-foreground")}>
              #Hashtag
            </label>
            <input
              id="music-hashtag"
              type="text"
              name="hashTag"
              value={formData.hashTag}
              onChange={handleInputChange}
              className={cn(
                "w-full px-4 py-3 border-[0.5px] border-border/20 rounded-lg",
                "bg-background text-foreground text-sm outline-none",
                "transition-all duration-200",
                "focus:border-primary focus:ring-2 focus:ring-primary/10",
                "placeholder:text-muted-foreground/60"
              )}
              placeholder={t('input.hashtags')}
            />
          </div>

          <div>
            <label htmlFor="music-purchase-link" className={cn("block mb-2 font-medium text-foreground")}>
              Purchase link
            </label>
            <input
              id="music-purchase-link"
              type="url"
              name="musicPurchaseLink"
              value={formData.musicPurchaseLink}
              onChange={handleInputChange}
              className={cn(
                "w-full px-4 py-3 border-[0.5px] border-border/20 rounded-lg",
                "bg-background text-foreground text-sm outline-none",
                "transition-all duration-200",
                "focus:border-primary focus:ring-2 focus:ring-primary/10",
                "placeholder:text-muted-foreground/60"
              )}
              placeholder={t('input.url')}
            />
          </div>

          <div>
            <label htmlFor="music-audio" className={cn("block mb-2 font-medium text-foreground")}>
              Audio file (MP3, WAV, etc.) *
            </label>
            <input
              id="music-audio"
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className={cn("mb-2")}
              required
            />
            {formData.audioUrl && (
              <audio controls src={formData.audioUrl} className={cn("w-full mt-2 rounded-xl")} />
            )}
          </div>

          <div>
            <label htmlFor="music-image" className={cn("block mb-2 font-medium text-foreground")}>
              Cover image *
            </label>
            <input
              id="music-image"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className={cn("mb-2")}
              required
            />
            {formData.musicBackgroundImage && (
              <img
                src={formData.musicBackgroundImage}
                alt="preview"
                className={cn(
                  "w-full max-h-[200px] rounded-xl mt-2 object-cover"
                )}
              />
            )}
          </div>

          {uploading && (
            <div className={cn(
              "p-3 bg-primary/10 text-primary rounded-lg text-sm font-medium text-center"
            )}>
              {t('upload.uploading')}
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
              {t('action.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200 border-none",
                "bg-primary text-primary-foreground",
                "shadow-[0_4px_16px_rgba(var(--primary),0.4)]",
                "hover:shadow-[0_6px_24px_rgba(var(--primary),0.5)]",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {submitting ? t('action.posting') : (uploading ? t('modal.waitUpload') : t('music.postMusic'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

MusicPostModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
};

