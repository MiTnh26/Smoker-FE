import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { X, Image as ImageIcon, Trash2, Plus, Edit2 } from "lucide-react";
import { updatePost, uploadPostMedia } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";

export default function PostEditModal({ open, post, onClose, onUpdated }) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [currentImages, setCurrentImages] = useState([]); // Images hiện có từ post
  const [newImages, setNewImages] = useState([]); // Images mới upload
  const [uploadingImages, setUploadingImages] = useState([]); // Images đang upload
  const [editingCaption, setEditingCaption] = useState(null); // { id, isNew, value }
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const captionInputRef = useRef(null);
  
  const MAX_CONTENT_LENGTH = 5000;
  const MAX_IMAGES = 10;
  const MAX_CAPTION_LENGTH = 500;

  useEffect(() => {
    if (open && post) {
      setContent(post.content || post.caption || post.description || "");
      // Load current images with caption
      const images = Array.isArray(post?.medias?.images) ? post.medias.images : [];
      setCurrentImages(images.map(img => ({
        ...img,
        caption: img.caption || ""
      })));
      setNewImages([]);
      setUploadingImages([]);
      setEditingCaption(null);
    }
  }, [open, post]);

  // Focus caption input when editing starts
  useEffect(() => {
    if (editingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
    }
  }, [editingCaption]);

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

  // Handle ESC key
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !submitting) {
        if (editingCaption) {
          setEditingCaption(null);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, submitting, onClose, editingCaption]);

  if (!open) return null;

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalImages = currentImages.length + newImages.length + uploadingImages.length;
    const remainingSlots = MAX_IMAGES - totalImages;
    
    if (files.length > remainingSlots) {
      alert(`Bạn chỉ có thể thêm tối đa ${MAX_IMAGES} ảnh. Hiện tại bạn có ${totalImages} ảnh, chỉ có thể thêm ${remainingSlots} ảnh nữa.`);
      files.splice(remainingSlots);
    }

    // Validate image files
    const imageFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} không phải là ảnh.`);
        return false;
      }
      return true;
    });

    if (imageFiles.length === 0) return;

    // Create preview URLs
    const previewImages = imageFiles.map(file => ({
      id: `preview-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      isNew: true,
      uploading: true,
      caption: ""
    }));

    setUploadingImages(prev => [...prev, ...previewImages]);

    // Upload images
    try {
      const uploadPromises = imageFiles.map(async (file, index) => {
        const formData = new FormData();
        // Backend expects "images" field name, not "files"
        formData.append('images', file);

        const response = await uploadPostMedia(formData);
        const responseData = response?.data || response;
        const uploadedFiles = responseData?.data || responseData;
        
        // Get first uploaded file from response
        const uploadedFile = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;
        
        return {
          ...previewImages[index],
          id: uploadedFile?.id || uploadedFile?._id || previewImages[index].id,
          url: uploadedFile?.url || uploadedFile?.secure_url || uploadedFile?.path || previewImages[index].url,
          uploading: false,
          caption: ""
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      
      // Move from uploading to newImages
      setUploadingImages(prev => prev.filter(img => !previewImages.find(p => p.id === img.id)));
      setNewImages(prev => [...prev, ...uploadedImages]);
    } catch (err) {
      console.error("[EDIT] Upload images failed", err);
      alert(err.response?.data?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
      // Remove failed uploads
      setUploadingImages(prev => prev.filter(img => !previewImages.find(p => p.id === img.id)));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove image
  const handleRemoveImage = (imageId, isNew) => {
    if (isNew) {
      setNewImages(prev => prev.filter(img => {
        if (img.id === imageId) {
          // Revoke object URL if it's a preview
          if (img.url && img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
          }
          return false;
        }
        return true;
      }));
      setUploadingImages(prev => prev.filter(img => {
        if (img.id === imageId) {
          if (img.url && img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
          }
          return false;
        }
        return true;
      }));
    } else {
      setCurrentImages(prev => prev.filter(img => (img.id || img._id) !== imageId));
    }
    // Cancel editing if removing the image being edited
    if (editingCaption && editingCaption.id === imageId && !editingCaption.isNew) {
      setEditingCaption(null);
    }
  };

  // Start editing caption
  const handleStartEditCaption = (imageId, isNew, currentCaption) => {
    setEditingCaption({ id: imageId, isNew, value: currentCaption || "" });
  };

  // Save caption
  const handleSaveCaption = (imageId, isNew) => {
    if (!editingCaption || editingCaption.id !== imageId) return;
    
    const newCaption = editingCaption.value.trim();
    
    if (isNew) {
      setNewImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, caption: newCaption } : img
      ));
    } else {
      setCurrentImages(prev => prev.map(img => 
        (img.id || img._id) === imageId ? { ...img, caption: newCaption } : img
      ));
    }
    
    setEditingCaption(null);
  };

  // Cancel editing caption
  const handleCancelEditCaption = () => {
    setEditingCaption(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && currentImages.length === 0 && newImages.length === 0) {
      alert('Vui lòng nhập nội dung hoặc thêm ảnh.');
      return;
    }
    
    try {
      setSubmitting(true);
      const payload = {};
      
      if (content.trim()) {
        payload.content = content.trim();
      }
      
      // Prepare media data with captions
      const mediaData = [];
      
      // Add current images with updated captions
      currentImages.forEach(img => {
        mediaData.push({
          id: img.id || img._id,
          caption: img.caption || ""
        });
      });
      
      // Add new images with captions
      newImages.forEach(img => {
        mediaData.push({
          id: img.id || img._id,
          caption: img.caption || ""
        });
      });

      // If images changed, send media data
      if (mediaData.length > 0) {
        payload.medias = mediaData;
      } else if (currentImages.length === 0 && newImages.length === 0) {
        // If all images removed, send empty array
        payload.medias = [];
      }
      
      const res = await updatePost(post.id, payload);
      const updated = res?.data || res;
      onUpdated?.(updated?.data || updated);
      
      // Cleanup preview URLs
      [...newImages, ...uploadingImages].forEach(img => {
        if (img.url && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
      
      onClose?.();
    } catch (err) {
      console.error("[EDIT] Update post failed", err);
      alert(err.response?.data?.message || t('modal.postFailed') || 'Không thể cập nhật bài viết');
    } finally {
      setSubmitting(false);
    }
  };

  const contentLength = content.length;
  const totalImages = currentImages.length + newImages.length + uploadingImages.length;
  const canAddMore = totalImages < MAX_IMAGES;

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/75 backdrop-blur-xl z-[1000]",
        "flex items-center justify-center p-4 overflow-y-auto"
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      tabIndex={-1}
    >
      <div 
        className={cn(
          "w-full max-w-[680px] bg-card text-card-foreground",
          "rounded-lg border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden relative my-8",
          "max-h-[90vh] flex flex-col"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "p-5 border-b border-border/30",
          "flex items-center justify-between flex-shrink-0",
          "bg-card/80 backdrop-blur-sm"
        )}>
          <h2 className={cn(
            "text-xl font-semibold m-0 text-foreground",
            "flex items-center gap-2"
          )}>
            <span className="text-2xl">✏️</span>
            {t('feed.edit') || 'Chỉnh sửa bài viết'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              "w-9 h-9 border-none bg-transparent text-foreground",
              "cursor-pointer flex items-center justify-center",
              "rounded-full transition-all duration-200",
              "hover:bg-muted/50 hover:scale-110",
              "active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <form ref={formRef} onSubmit={handleSubmit} className={cn("p-5 flex flex-col gap-4")}>
            {/* Images Section */}
            <div>
              <div className={cn("flex items-center justify-between mb-3")}>
                <label className={cn(
                  "block text-sm font-medium text-foreground",
                  "flex items-center gap-2"
                )}>
                  <ImageIcon size={16} />
                  Ảnh ({totalImages}/{MAX_IMAGES})
                </label>
                {canAddMore && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5",
                      "text-sm font-medium rounded-lg",
                      "bg-primary/10 text-primary",
                      "hover:bg-primary/20",
                      "transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Plus size={16} />
                    Thêm ảnh
                  </button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={submitting || !canAddMore}
              />

              {(currentImages.length > 0 || newImages.length > 0 || uploadingImages.length > 0) && (
                <div className={cn("flex flex-col gap-4")}>
                  {/* Current Images */}
                  {currentImages.map((img, idx) => {
                    const imageId = img.id || img._id;
                    const isEditing = editingCaption && editingCaption.id === imageId && !editingCaption.isNew;
                    
                    return (
                      <div
                        key={imageId || idx}
                        className={cn(
                          "relative rounded-lg overflow-hidden",
                          "border border-border/20 shadow-sm",
                          "bg-muted/10"
                        )}
                      >
                        <div className={cn("flex gap-3 p-3")}>
                          <div className={cn(
                            "relative rounded-lg overflow-hidden",
                            "w-32 h-32 flex-shrink-0"
                          )}>
                            <img
                              src={img.url}
                              alt={img.caption || `Ảnh ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(imageId, false)}
                              disabled={submitting}
                              className={cn(
                                "absolute top-2 right-2",
                                "w-7 h-7 rounded-full bg-black/70 text-white",
                                "flex items-center justify-center",
                                "opacity-0 group-hover:opacity-100",
                                "transition-opacity duration-200",
                                "hover:bg-black/90",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                              aria-label="Xóa ảnh"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className={cn("flex-1 flex flex-col gap-2 min-w-0")}>
                            {isEditing ? (
                              <>
                                <textarea
                                  ref={captionInputRef}
                                  value={editingCaption.value}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= MAX_CAPTION_LENGTH) {
                                      setEditingCaption(prev => prev ? { ...prev, value: val } : null);
                                    }
                                  }}
                                  placeholder="Nhập mô tả cho ảnh..."
                                  maxLength={MAX_CAPTION_LENGTH}
                                  rows={3}
                                  className={cn(
                                    "w-full resize-none bg-background text-foreground",
                                    "border border-border/20 rounded-lg p-2 text-sm",
                                    "outline-none focus:border-primary focus:ring-1 focus:ring-primary/10"
                                  )}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      handleSaveCaption(imageId, false);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEditCaption();
                                    }
                                  }}
                                />
                                <div className={cn("flex items-center justify-between")}>
                                  <span className={cn("text-xs text-muted-foreground")}>
                                    {editingCaption.value.length}/{MAX_CAPTION_LENGTH}
                                  </span>
                                  <div className={cn("flex gap-2")}>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveCaption(imageId, false)}
                                      className={cn(
                                        "px-3 py-1 text-xs rounded",
                                        "bg-primary text-primary-foreground",
                                        "hover:opacity-90"
                                      )}
                                    >
                                      Lưu
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditCaption}
                                      className={cn(
                                        "px-3 py-1 text-xs rounded",
                                        "bg-muted/30 text-foreground",
                                        "hover:bg-muted/50"
                                      )}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={cn("flex items-start justify-between gap-2")}>
                                  <p className={cn(
                                    "text-sm text-foreground flex-1",
                                    !img.caption && "text-muted-foreground italic"
                                  )}>
                                    {img.caption || "Chưa có mô tả"}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditCaption(imageId, false, img.caption)}
                                    disabled={submitting}
                                    className={cn(
                                      "flex-shrink-0 p-1.5 rounded",
                                      "text-muted-foreground hover:text-foreground",
                                      "hover:bg-muted/50",
                                      "transition-colors",
                                      "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                    aria-label="Chỉnh sửa mô tả"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                  </div>
                </div>
                    );
                  })}

                  {/* New Images */}
                  {newImages.map((img, idx) => {
                    const isEditing = editingCaption && editingCaption.id === img.id && editingCaption.isNew;
                    
                    return (
                      <div
                        key={img.id || idx}
                        className={cn(
                          "relative rounded-lg overflow-hidden",
                          "border border-border/20 shadow-sm",
                          "bg-muted/10"
                        )}
                      >
                        <div className={cn("flex gap-3 p-3")}>
                          <div className={cn(
                            "relative rounded-lg overflow-hidden",
                            "w-32 h-32 flex-shrink-0"
                          )}>
                            <img
                              src={img.url}
                              alt={`Ảnh mới ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id, true)}
                              disabled={submitting}
                              className={cn(
                                "absolute top-2 right-2",
                                "w-7 h-7 rounded-full bg-black/70 text-white",
                                "flex items-center justify-center",
                                "opacity-0 group-hover:opacity-100",
                                "transition-opacity duration-200",
                                "hover:bg-black/90",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                              aria-label="Xóa ảnh"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className={cn("flex-1 flex flex-col gap-2 min-w-0")}>
                            {isEditing ? (
                              <>
                                <textarea
                                  ref={captionInputRef}
                                  value={editingCaption.value}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= MAX_CAPTION_LENGTH) {
                                      setEditingCaption(prev => prev ? { ...prev, value: val } : null);
                                    }
                                  }}
                                  placeholder="Nhập mô tả cho ảnh..."
                                  maxLength={MAX_CAPTION_LENGTH}
                                  rows={3}
                                  className={cn(
                                    "w-full resize-none bg-background text-foreground",
                                    "border border-border/20 rounded-lg p-2 text-sm",
                                    "outline-none focus:border-primary focus:ring-1 focus:ring-primary/10"
                                  )}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      handleSaveCaption(img.id, true);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEditCaption();
                                    }
                                  }}
                                />
                                <div className={cn("flex items-center justify-between")}>
                                  <span className={cn("text-xs text-muted-foreground")}>
                                    {editingCaption.value.length}/{MAX_CAPTION_LENGTH}
                                  </span>
                                  <div className={cn("flex gap-2")}>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveCaption(img.id, true)}
                                      className={cn(
                                        "px-3 py-1 text-xs rounded",
                                        "bg-primary text-primary-foreground",
                                        "hover:opacity-90"
                                      )}
                                    >
                                      Lưu
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditCaption}
                                      className={cn(
                                        "px-3 py-1 text-xs rounded",
                                        "bg-muted/30 text-foreground",
                                        "hover:bg-muted/50"
                                      )}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={cn("flex items-start justify-between gap-2")}>
                                  <p className={cn(
                                    "text-sm text-foreground flex-1",
                                    !img.caption && "text-muted-foreground italic"
                                  )}>
                                    {img.caption || "Chưa có mô tả"}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditCaption(img.id, true, img.caption)}
                                    disabled={submitting}
                                    className={cn(
                                      "flex-shrink-0 p-1.5 rounded",
                                      "text-muted-foreground hover:text-foreground",
                                      "hover:bg-muted/50",
                                      "transition-colors",
                                      "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                    aria-label="Chỉnh sửa mô tả"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Uploading Images */}
                  {uploadingImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className={cn(
                        "relative rounded-lg overflow-hidden",
                        "border border-border/20 shadow-sm",
                        "w-32 h-32 opacity-60"
                      )}
                    >
                      <img
                        src={img.url}
                        alt={`Đang tải ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        "bg-black/50 text-white text-xs"
                      )}>
                        Đang tải...
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalImages === 0 && (
                <div className={cn(
                  "border-2 border-dashed border-border/30 rounded-lg p-8",
                  "text-center cursor-pointer",
                  "hover:border-primary/50 hover:bg-muted/20",
                  "transition-all duration-200"
                )}
                onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={32} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nhấn để thêm ảnh
                  </p>
                </div>
              )}
            </div>

            {/* Content Textarea */}
            <div>
              <label className={cn(
                "block text-sm font-medium text-foreground mb-2"
              )}>
                Nội dung
              </label>
          <textarea
                rows={6}
            value={content}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= MAX_CONTENT_LENGTH) {
                    setContent(val);
                  }
                }}
                placeholder="Bạn đang nghĩ gì?"
                maxLength={MAX_CONTENT_LENGTH}
            className={cn(
              "w-full resize-y bg-background text-foreground",
              "border-[0.5px] border-border/20 rounded-lg p-4",
              "font-inherit text-base leading-6 outline-none",
              "transition-all duration-200",
              "focus:border-primary focus:ring-2 focus:ring-primary/10",
              "placeholder:text-muted-foreground/60"
            )}
          />
          <div className={cn(
                "text-xs mt-1 text-right",
                contentLength > MAX_CONTENT_LENGTH * 0.9
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}>
                {contentLength}/{MAX_CONTENT_LENGTH}
              </div>
            </div>

            {/* Action Buttons */}
            <div className={cn(
              "flex gap-3 justify-end pt-4 border-t border-border/30 mt-2 flex-shrink-0"
          )}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={submitting}
              className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200",
                "bg-muted/30 text-foreground",
                "hover:bg-muted/50",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
                {t('action.cancel') || 'Hủy'}
            </button>
            <button 
              type="submit" 
                disabled={submitting || (!content.trim() && totalImages === 0)}
              className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200 border-none",
                "bg-primary text-primary-foreground",
                "hover:opacity-90",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
                {submitting ? (t('action.saving') || 'Đang lưu...') : (t('action.save') || 'Lưu')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

PostEditModal.propTypes = {
  open: PropTypes.bool,
  post: PropTypes.object,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
};
