import { useState } from "react";
import PropTypes from "prop-types";
import axiosClient from "../../../api/axiosClient";
import { uploadPostMedia } from "../../../api/postApi";
import "../../../styles/modules/feeds/PostComposerModal.css";

export default function MusicPostModal({ open, onClose, onCreated }) {
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
      console.log("[MUSIC] Upload response:", res);

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
      const errorMessage = err.response?.data?.message || err.message || "Upload nhạc thất bại";
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
      const errorMessage = err.response?.data?.message || err.message || "Upload ảnh nền thất bại";
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
          console.log("[MUSIC] Audio uploaded successfully:", result.secure_url);
        } else {
          console.error("[MUSIC] Upload failed - no secure_url:", result);
          alert(`Upload nhạc thất bại: ${result.error?.message || "Không có URL trả về"}`);
        }
      } catch (err) {
        console.error("[MUSIC] Upload error:", err);
        alert(`Upload nhạc thất bại: ${err.message || "Lỗi không xác định"}`);
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
          console.log("[MUSIC] Image uploaded successfully:", result.secure_url);
        } else {
          console.error("[MUSIC] Upload failed - no secure_url:", result);
          alert(`Upload ảnh nền thất bại: ${result.error?.message || "Không có URL trả về"}`);
        }
      } catch (err) {
        console.error("[MUSIC] Upload error:", err);
        alert(`Upload ảnh nền thất bại: ${err.message || "Lỗi không xác định"}`);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.musicTitle || !formData.artistName || !formData.description || !formData.audioUrl || !formData.musicBackgroundImage) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc (*)");
      return;
    }
    if (uploading) {
      alert("Đang upload, vui lòng đợi...");
      return;
    }

    try {
      setSubmitting(true);
      console.log("[MUSIC] Starting music post submission");

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
        uploaderName: activeEntity?.name || session?.account?.userName,
        uploaderAvatar: activeEntity?.avatar || session?.account?.avatar,
      });
      // axiosClient already returns response.data
      const createdMusic = musicRes?.data ? musicRes.data : (musicRes?.success ? musicRes.data : musicRes);
      console.log("[MUSIC] Music created:", createdMusic);

      //  Sau đó tạo Post liên kết
      const postRes = await axiosClient.post("/posts", {
        title: formData.musicTitle,
        content: formData.description,
        type: "post",
        accountId,
        musicId: (createdMusic && createdMusic._id) || (createdMusic && createdMusic.data && createdMusic.data._id) || createdMusic?.id,
        songId: null,
      });

      console.log("[MUSIC] Post created:", postRes);

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
      alert("Đăng nhạc không thành công. Vui lòng thử lại.");
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
        style={{ maxWidth: "600px" }}
      >
        <div className="modal-header">
          🎵 Đăng Nhạc (SoundCloud style)
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="music-title" className="block" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
              Tên Bài Nhạc *
            </label>
            <input
              id="music-title"
              type="text"
              name="musicTitle"
              value={formData.musicTitle}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="music-artist" className="block" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
              Tên Nghệ Sĩ *
            </label>
            <input
              id="music-artist"
              type="text"
              name="artistName"
              value={formData.artistName}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="music-description" className="block" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
              Chi Tiết/Mô Tả *
            </label>
            <textarea
              id="music-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              rows={3}
              placeholder="Mô tả về bài nhạc..."
              required
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="music-hashtag" className="block" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
              HashTag
            </label>
            <input
              id="music-hashtag"
              type="text"
              name="hashTag"
              value={formData.hashTag}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              placeholder="#hashtag1 #hashtag2"
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="music-purchase-link" className="block" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
              Link Mua Nhạc
            </label>
            <input
              id="music-purchase-link"
              type="url"
              name="musicPurchaseLink"
              value={formData.musicPurchaseLink}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              placeholder="https://..."
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="music-audio" className="block" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
              File Nhạc (MP3, WAV, etc.) *
            </label>
            <input
              id="music-audio"
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="mb-1"
              required
            />
            {formData.audioUrl && (
              <audio controls src={formData.audioUrl} className="w-full mt-2" style={{ width: "100%" }} />
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="music-image" className="block" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
              Ảnh Nền Bài Nhạc *
            </label>
            <input
              id="music-image"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="mb-1"
              required
            />
            {formData.musicBackgroundImage && (
              <img
                src={formData.musicBackgroundImage}
                alt="preview"
                style={{ maxHeight: "200px", borderRadius: "8px", marginTop: "0.5rem", width: "100%", objectFit: "cover" }}
              />
            )}
          </div>

          {uploading && (
            <div className="upload-progress">
              Đang upload... Vui lòng đợi hoàn tất.
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
              disabled={submitting || uploading}
              className="btn-submit"
            >
              {submitting ? "Đang đăng..." : (uploading ? "Đợi upload..." : "Đăng nhạc")}
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

