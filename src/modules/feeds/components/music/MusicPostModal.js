import { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Music, X } from "lucide-react";
import axiosClient from "../../../../api/axiosClient";
import { uploadPostMedia } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";
import "../../../../styles/modules/feeds/components/modals/postForms.css";

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
      console.log("[MUSIC] Upload audio response:", res);

      // Backend returns: { success: true, data: [...], message: "..." }
      const responseData = res.data || res;
      const files = responseData.data || responseData;

      if (files && Array.isArray(files) && files.length > 0) {
        const uploadedFile = files[0]; // Get first uploaded file
        const url = uploadedFile.url || uploadedFile.path || uploadedFile.secure_url;
        
        if (!url) {
          console.error("[MUSIC] Upload response missing URL:", uploadedFile);
          throw new Error("Uploaded file missing URL");
        }

        return {
          secure_url: url,
          url: url,
          path: url,
          public_id: uploadedFile.public_id || uploadedFile.filename,
          format: uploadedFile.format,
          type: uploadedFile.type || file.type,
          ...uploadedFile
        };
      }
      throw new Error("No file data returned from server");
    } catch (err) {
      console.error("[MUSIC] Upload audio error:", err);
      console.error("[MUSIC] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
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

      if (files && Array.isArray(files) && files.length > 0) {
        const uploadedFile = files[0]; // Get first uploaded file
        const url = uploadedFile.url || uploadedFile.path || uploadedFile.secure_url;
        
        if (!url) {
          console.error("[MUSIC] Upload response missing URL:", uploadedFile);
          throw new Error("Uploaded file missing URL");
        }

        return {
          secure_url: url,
          url: url,
          path: url,
          public_id: uploadedFile.public_id || uploadedFile.filename,
          format: uploadedFile.format,
          type: uploadedFile.type || file.type,
          ...uploadedFile
        };
      }
      throw new Error("No file data returned from server");
    } catch (err) {
      console.error("[MUSIC] Upload image error:", err);
      console.error("[MUSIC] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
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
        const audioUrl = result.secure_url || result.url || result.path;
        if (audioUrl) {
          setFormData((prev) => ({
            ...prev,
            audioUrl: audioUrl,
            audioFile: file
          }));
        } else {
          console.error("[MUSIC] Upload failed - no URL:", result);
          alert(`${t('modal.uploadFailed')}: No URL returned`);
        }
      } catch (err) {
        console.error("[MUSIC] Upload error:", err);
        alert(`${t('modal.uploadFailed')}: ${err.message || ''}`);
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
        const imageUrl = result.secure_url || result.url || result.path;
        if (imageUrl) {
          setFormData((prev) => ({
            ...prev,
            musicBackgroundImage: imageUrl
          }));
        } else {
          console.error("[MUSIC] Upload failed - no URL:", result);
          alert(`${t('modal.uploadFailed')}: No URL returned`);
        }
      } catch (err) {
        console.error("[MUSIC] Upload error:", err);
        alert(`${t('modal.uploadFailed')}: ${err.message || ''}`);
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
      console.log("[MUSIC] Creating music with data:", {
        title: formData.musicTitle,
        artist: formData.artistName,
        audioUrl: formData.audioUrl,
        coverUrl: formData.musicBackgroundImage
      });

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
      
      console.log("[MUSIC] Music creation response:", musicRes);
      
      // axiosClient already returns response.data
      const createdMusic = musicRes?.data ? musicRes.data : (musicRes?.success ? musicRes.data : musicRes);
      
      // Extract music ID from various possible response formats
      const musicId = createdMusic?._id || 
                     createdMusic?.data?._id || 
                     createdMusic?.id ||
                     (createdMusic?.data && createdMusic.data.id) ||
                     null;

      if (!musicId) {
        console.error("[MUSIC] Failed to get music ID from response:", createdMusic);
        throw new Error("Failed to create music or get music ID");
      }

      console.log("[MUSIC] Created music ID:", musicId);

      //  Sau đó tạo Post liên kết
      const postData = {
        title: formData.musicTitle,
        content: formData.description,
        type: "post",
        accountId,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: normalizedEntityType,
        authorEntityId: entityId,
        authorEntityType: normalizedEntityType,
        authorName: activeEntity?.name || session?.account?.userName,
        authorAvatar: activeEntity?.avatar || session?.account?.avatar,
        musicId: musicId,
        songId: null,
      };

      console.log("[MUSIC] Creating post with data:", postData);

      const postRes = await axiosClient.post("/posts", postData);
      
      console.log("[MUSIC] Post creation response:", postRes);


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
            <Music className="post-form-header-icon" />
            <span>{t('music.postMusic')}</span>
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Responsive Grid Layout */}
            <div className="post-form-grid">
              {/* Title - Full Width */}
              <div className="post-form-field-wrapper post-form-grid-full">
                <label htmlFor="music-title" className="post-form-field-label">
                  Title *
                </label>
                <input
                  id="music-title"
                  type="text"
                  name="musicTitle"
                  value={formData.musicTitle}
                  onChange={handleInputChange}
                  className="post-form-input"
                  required
                />
              </div>

              {/* Artist - Left Column */}
              <div className="post-form-field-wrapper">
                <label htmlFor="music-artist" className="post-form-field-label">
                  Artist *
                </label>
                <input
                  id="music-artist"
                  type="text"
                  name="artistName"
                  value={formData.artistName}
                  onChange={handleInputChange}
                  className="post-form-input"
                  required
                />
              </div>

              {/* Hashtag - Right Column */}
              <div className="post-form-field-wrapper">
                <label htmlFor="music-hashtag" className="post-form-field-label">
                  #Hashtag
                </label>
                <input
                  id="music-hashtag"
                  type="text"
                  name="hashTag"
                  value={formData.hashTag}
                  onChange={handleInputChange}
                  className="post-form-input"
                  placeholder={t('input.hashtags')}
                />
              </div>

              {/* Description - Full Width */}
              <div className="post-form-field-wrapper post-form-grid-full">
                <label htmlFor="music-description" className="post-form-field-label">
                  Description *
                </label>
                <textarea
                  id="music-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="post-form-textarea"
                  rows={3}
                  placeholder={t('input.caption')}
                  required
                />
              </div>

              {/* Purchase Link - Full Width */}
              <div className="post-form-field-wrapper post-form-grid-full">
                <label htmlFor="music-purchase-link" className="post-form-field-label">
                  Purchase link
                </label>
                <input
                  id="music-purchase-link"
                  type="url"
                  name="musicPurchaseLink"
                  value={formData.musicPurchaseLink}
                  onChange={handleInputChange}
                  className="post-form-input"
                  placeholder={t('input.url')}
                />
              </div>

              {/* Audio File Picker - Full Width */}
              <div className="post-form-field-wrapper post-form-grid-full">
                <label htmlFor="music-audio" className="post-form-field-label">
                  Audio file (MP3, WAV, etc.) *
                </label>
                <div className="post-form-file-picker">
                  <input
                    id="music-audio"
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                    required
                  />
                  {formData.audioUrl && (
                    <div className="post-form-file-picker-preview">
                      <audio controls src={formData.audioUrl} />
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Image Picker - Full Width */}
              <div className="post-form-field-wrapper post-form-grid-full">
                <label htmlFor="music-image" className="post-form-field-label">
                  Cover image *
                </label>
                <div className="post-form-file-picker">
                  <input
                    id="music-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    required
                  />
                  {formData.musicBackgroundImage && (
                    <div className="post-form-file-picker-preview">
                      <img
                        src={formData.musicBackgroundImage}
                        alt="Cover preview"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Status */}
            {uploading && (
              <div className="post-form-upload-status mt-4">
                {t('upload.uploading')}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="post-form-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="post-form-button post-form-button-cancel"
            >
              {t('action.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="post-form-button post-form-button-submit"
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

