import React from "react";
import { cn } from "../../utils/cn";
import { useImageUpload } from "../../hooks/useImageUpload";
import { getAvatarUrl } from "../../utils/defaultAvatar";

/**
 * Image Upload Field Component
 * Supports both file upload and URL input
 * Keep exact same UI as Customer Profile currently has
 */
export const ImageUploadField = ({
  label,
  value,
  onChange,
  uploadMode = true,
  urlInput = true,
  uploadEndpoint = '/posts/upload',
  maxSize = 5 * 1024 * 1024, // 5MB
  uploading: externalUploading = false,
  onUploadStateChange,
  previewClassName = "",
  defaultImage = null, // Sẽ dùng getAvatarUrl
}) => {
  const { upload, uploading: hookUploading, error } = useImageUpload({
    endpoint: uploadEndpoint,
    maxSize,
    onSuccess: (url) => {
      onChange(url);
      if (onUploadStateChange) {
        onUploadStateChange(false);
      }
    },
  });

  const uploading = externalUploading || hookUploading;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh hợp lệ.');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      alert(`Kích thước file không được vượt quá ${maxSize / 1024 / 1024}MB.`);
      return;
    }

    if (onUploadStateChange) {
      onUploadStateChange(true);
    }

    try {
      await upload(file);
    } catch (err) {
      alert(err.message || 'Upload ảnh thất bại. Vui lòng thử lại.');
      if (onUploadStateChange) {
        onUploadStateChange(false);
      }
    }
  };

  return (
    <div className={cn("space-y-4")}>
      {uploadMode && (
        <div>
          <label className={cn("block text-sm font-medium mb-2 text-foreground")}>
            Upload ảnh từ máy tính:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg",
              "border-[0.5px] border-border/20",
              "bg-background text-foreground",
              "outline-none transition-all duration-200",
              "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          {uploading && (
            <p className={cn("text-sm text-primary mt-2")}>
              Đang upload ảnh...
            </p>
          )}
          {error && (
            <p className={cn("text-sm text-danger mt-2")}>
              {error.message}
            </p>
          )}
        </div>
      )}

      {uploadMode && urlInput && (
        <div className={cn("text-center text-muted-foreground text-sm")}>
          hoặc
        </div>
      )}

      {urlInput && (
        <div>
          <label className={cn("block text-sm font-medium mb-2 text-foreground")}>
            {uploadMode ? "Nhập link ảnh:" : label || "Link ảnh:"}
          </label>
          <input
            type="text"
            placeholder={uploadMode ? "Nhập link ảnh..." : `Nhập link ${label?.toLowerCase() || "ảnh"}...`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg",
              "border-[0.5px] border-border/20",
              "bg-background text-foreground",
              "outline-none transition-all duration-200",
              "placeholder:text-muted-foreground/60",
              "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
            )}
          />
        </div>
      )}

      {value && (
        <div className={cn("mt-2")}>
          <img
            src={getAvatarUrl(value || defaultImage, 100)}
              onError={(e) => {
                e.target.src = getAvatarUrl(null, 100);
              }}
            alt={label || "Preview"}
            className={cn(
              "rounded-lg object-cover border-2 border-border/20",
              previewClassName || "w-24 h-24"
            )}
          />
        </div>
      )}
    </div>
  );
};

