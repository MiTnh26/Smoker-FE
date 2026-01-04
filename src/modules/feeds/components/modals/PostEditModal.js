import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { X, Image as ImageIcon, Trash2, Plus, Pencil, Globe, Lock, ChevronDown } from "lucide-react";
import { updatePost, uploadPostMedia, getPostById } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";
import { formatPostTime, mapPostForCard } from "../../../../utils/postTransformers";

export default function PostEditModal({ open, post, onClose, onUpdated }) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [currentImages, setCurrentImages] = useState([]); // Images hiện có từ post
  const [newImages, setNewImages] = useState([]); // Images mới upload
  const [uploadingImages, setUploadingImages] = useState([]); // Images đang upload
  const [submitting, setSubmitting] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [isMusicPost, setIsMusicPost] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [status, setStatus] = useState("public"); // "public" hoặc "private"
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [userAvatar, setUserAvatar] = useState("");
  const [userName, setUserName] = useState("");
  const [captionModalOpen, setCaptionModalOpen] = useState(false);
  const [editingImageId, setEditingImageId] = useState(null);
  const [editingImageIsNew, setEditingImageIsNew] = useState(false);
  const [editingCaption, setEditingCaption] = useState("");
  const [originalPost, setOriginalPost] = useState(null); // Original post data for repost
  const [loadingOriginalPost, setLoadingOriginalPost] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const MAX_CONTENT_LENGTH = 5000;
  const MAX_IMAGES = 10;
  const MAX_CAPTION_LENGTH = 500;

  // Normalize medias from a post object
  const hydratePostMedias = (p) => {
    const images = Array.isArray(p?.medias?.images)
      ? p.medias.images
      : Array.isArray(p?.medias)
        ? p.medias
        : [];
    return images.map((img) => ({
      ...img,
      caption: img?.caption || "",
      url: img?.url || img?.path || "",
      id: img?.id || img?._id,
      type: img?.type || "image",
    }));
  };

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
      console.error("[EDIT] Error loading user info:", err);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !post) return;

    const loadPostDetail = async () => {
      setLoadingPost(true);
      try {
        // First, check if this is a repost from the initial post object
        const isRepostFromPost = !!(post.repostedFromId || post.originalPost);
        
        const res = await getPostById(post.id || post._id, { includeMedias: true, includeMusic: true });
        const detailed = res?.data?.data || res?.data || res;
        const target = detailed || post;

        // Check if this is a repost (from target or initial post)
        const isRepost = !!(target.repostedFromId || target.originalPost || isRepostFromPost);

        setContent(target.content || target.caption || target.description || "");
        setIsMusicPost(Boolean(target.musicId || target.songId || (target.type || "").toLowerCase() === "music"));
        setStatus(target.status || "public"); // Load status từ post
        
        // Only load medias if NOT a repost (reposts don't have their own medias)
        if (!isRepost) {
        const hydrated = hydratePostMedias(target);
        setCurrentImages(hydrated);
        setHasVideo(hydrated.some((m) => (m.type || "").toLowerCase() === "video"));
        setHasImage(hydrated.some((m) => (m.type || "image").toLowerCase() === "image"));
        } else {
          // For reposts, clear medias
          setCurrentImages([]);
          setHasVideo(false);
          setHasImage(false);
        }

        // Load original post if this is a repost
        if (isRepost) {
          setLoadingOriginalPost(true);
          try {
            const originalPostId = target.repostedFromId || target.originalPost?.id || target.originalPost?._id;
            if (originalPostId) {
              const originalRes = await getPostById(originalPostId, { includeMedias: true, includeMusic: true });
              const originalData = originalRes?.data?.data || originalRes?.data || originalRes || target.originalPost;
              // Map original post to card format for consistent display
              const mappedOriginal = mapPostForCard(originalData, t, null);
              setOriginalPost(mappedOriginal);
            } else if (target.originalPost) {
              // Map original post to card format if already available
              const mappedOriginal = mapPostForCard(target.originalPost, t, null);
              setOriginalPost(mappedOriginal);
            }
          } catch (err) {
            console.warn("[EDIT] Could not load original post:", err);
            if (target.originalPost) {
              const mappedOriginal = mapPostForCard(target.originalPost, t, null);
              setOriginalPost(mappedOriginal);
            }
          } finally {
            setLoadingOriginalPost(false);
          }
        } else {
          setOriginalPost(null);
        }
      } catch (err) {
        console.warn("[EDIT] Could not load post detail, fallback to passed post", err);
        
        // Check if repost from passed post
        const isRepostFromPost = !!(post.repostedFromId || post.originalPost);
        
        setContent(post.content || post.caption || post.description || "");
        setStatus(post.status || "public"); // Load status từ post
        setIsMusicPost(Boolean(post.musicId || post.songId || (post.type || "").toLowerCase() === "music"));
        
        // Only load medias if NOT a repost
        if (!isRepostFromPost) {
        const hydrated = hydratePostMedias(post);
        setCurrentImages(hydrated);
        setHasVideo(hydrated.some((m) => (m.type || "").toLowerCase() === "video"));
        setHasImage(hydrated.some((m) => (m.type || "image").toLowerCase() === "image"));
        } else {
          // For reposts, clear medias
          setCurrentImages([]);
          setHasVideo(false);
          setHasImage(false);
        }
        
        // Load original post if repost
        if (isRepostFromPost) {
          if (post.originalPost) {
            const mappedOriginal = mapPostForCard(post.originalPost, t, null);
            setOriginalPost(mappedOriginal);
          } else {
            setOriginalPost(null);
          }
        } else {
          setOriginalPost(null);
        }
      } finally {
        setNewImages([]);
        setUploadingImages([]);
        setShowPrivacyDropdown(false);
        setLoadingOriginalPost(false);
        setLoadingPost(false);
      }
    };

    loadPostDetail();
  }, [open, post]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setOriginalPost(null);
      setLoadingOriginalPost(false);
      setShowTooltip(false);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
    }
  }, [open]);

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
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, submitting, onClose]);

  if (!open) return null;

  // Handle file selection
  const handleFileSelect = async (e) => {
    // Don't allow file selection for repost
    if (originalPost) {
      e.target.value = '';
      return;
    }
    
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalImages = currentImages.length + newImages.length + uploadingImages.length;
    const remainingSlots = MAX_IMAGES - totalImages;
    
    if (files.length > remainingSlots) {
      alert(`Bạn chỉ có thể thêm tối đa ${MAX_IMAGES} ảnh. Hiện tại bạn có ${totalImages} ảnh, chỉ có thể thêm ${remainingSlots} ảnh nữa.`);
      files.splice(remainingSlots);
    }

    // Validate media files (image or video)
    const mediaFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`File ${file.name} không phải là ảnh hoặc video.`);
        return false;
      }
      return true;
    });

    if (mediaFiles.length === 0) return;

    // Create preview URLs
    const previewImages = mediaFiles.map(file => {
      const isVideo = file.type.startsWith('video/');
      return ({
      id: `preview-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      isNew: true,
      uploading: true,
      caption: "",
      type: isVideo ? "video" : "image"
    });
    });

    setUploadingImages(prev => [...prev, ...previewImages]);

    // Upload images
    try {
      const uploadPromises = mediaFiles.map(async (file, index) => {
        const formData = new FormData();
        // Backend expects "images" for images, "videos" for videos
        const isVideo = file.type.startsWith('video/');
        formData.append(isVideo ? 'videos' : 'images', file);

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
          caption: "",
          type: isVideo ? "video" : "image"
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
  };
  
  // Update caption inline (applies when saving the post)
  const handleCaptionChange = (imageId, isNew, value) => {
    const nextVal = value.slice(0, MAX_CAPTION_LENGTH);
    if (isNew) {
      setNewImages(prev => prev.map(img => img.id === imageId ? { ...img, caption: nextVal } : img));
    } else {
      setCurrentImages(prev => prev.map(img => (img.id || img._id) === imageId ? { ...img, caption: nextVal } : img));
    }
  };

  // Open caption edit modal
  const handleOpenCaptionModal = (imageId, isNew) => {
    const image = isNew 
      ? newImages.find(img => img.id === imageId)
      : currentImages.find(img => (img.id || img._id) === imageId);
    
    if (image) {
      setEditingImageId(imageId);
      setEditingImageIsNew(isNew);
      setEditingCaption(image.caption || "");
      setCaptionModalOpen(true);
    }
  };

  // Save caption from modal
  const handleSaveCaption = () => {
    if (editingImageId !== null) {
      handleCaptionChange(editingImageId, editingImageIsNew, editingCaption);
      setCaptionModalOpen(false);
      setEditingImageId(null);
      setEditingImageIsNew(false);
      setEditingCaption("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // For repost, only require content. For regular post, require content or media
    const isRepost = !!originalPost;
    if (!content.trim() && !isMusicPost && !isRepost && currentImages.length === 0 && newImages.length === 0) {
      alert('Vui lòng nhập nội dung hoặc thêm ảnh.');
      return;
    }
    
    try {
      setSubmitting(true);
      const payload = {};
      
      // Always include content (even if empty) to satisfy backend validation
      // Backend requires at least one of: title, content, caption, or medias
      payload.content = content.trim() || "";
      
      // Thêm status vào payload
      payload.status = status;

      // Only handle media for non-repost posts
      if (!isRepost && hasMedia) {
        // Prepare media data with captions (image/video)
        const mediaData = [];
        
        currentImages.forEach(img => {
          mediaData.push({
            id: img.id || img._id,
            url: img.url || img.path,
            caption: img.caption || "",
            type: (img.type || "").toLowerCase() || "image"
          });
        });
        
        newImages.forEach(img => {
          mediaData.push({
            id: img.id || img._id,
            url: img.url || img.path,
            caption: img.caption || "",
            type: (img.type || "").toLowerCase() || "image"
          });
        });

        if (mediaData.length > 0) {
          payload.medias = mediaData;
        } else if (currentImages.length === 0 && newImages.length === 0) {
          payload.medias = [];
        }
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
  const isSaving = submitting || uploadingImages.length > 0 || loadingPost;
  const hasMedia = (hasImage || hasVideo) && !isMusicPost;

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]",
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
        {/* Header - Facebook style */}
        <div className={cn(
          "p-4 border-b border-border/30",
          "flex items-center justify-between flex-shrink-0",
          "bg-card"
        )}>
          <h2 className={cn(
            "text-lg font-semibold m-0 text-foreground",
            "flex-1 text-center"
          )}>
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
              "hover:bg-muted/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <form ref={formRef} onSubmit={handleSubmit} className={cn("flex flex-col")}>
            {/* User Info & Privacy - Facebook style */}
            <div className="px-4 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
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
              </div>
              
            {/* Main Content Area */}
            <div className="px-4 py-4 flex flex-col gap-4">
              {/* Content Textarea - Facebook style */}
              <div>
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
                    "post-form-textarea-modern w-full",
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

              {/* Original Post Preview - For Repost */}
              {originalPost && (
                <div className={cn(
                  "border-[0.5px] border-border/20 rounded-lg overflow-hidden",
                  "bg-card shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                )}>
                  {/* Original Post Header */}
                  <div className="px-3 py-2 flex items-center gap-2 border-b border-border/20">
                    {originalPost.avatar ? (
                      <img
                        src={originalPost.avatar}
                        alt={originalPost.user || "User"}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {(originalPost.user || "U")[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {originalPost.user || "Người dùng"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {originalPost.createdAt && (
                          <>
                            <span>{formatPostTime(originalPost.createdAt, t)}</span>
                            <span>•</span>
                          </>
                        )}
                        {originalPost.status === "private" ? (
                          <Lock size={12} />
                        ) : (
                          <Globe size={12} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Original Post Content */}
                  {originalPost.content && (
                    <div className="px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                      {originalPost.content}
                    </div>
                  )}

                  {/* Original Post Media */}
                  {originalPost.medias && (
                    <div className="relative">
                      {originalPost.medias.images && originalPost.medias.images.length > 0 && (
                        <img
                          src={originalPost.medias.images[0]?.url || originalPost.image}
                          alt="Original post"
                          className="w-full max-h-[400px] object-cover bg-muted/10"
                        />
                      )}
                      {originalPost.medias.videos && originalPost.medias.videos.length > 0 && (
                        <video
                          src={originalPost.medias.videos[0]?.url || originalPost.videoSrc}
                          className="w-full max-h-[400px] object-cover bg-muted/10"
                          controls
                        />
                      )}
                    </div>
                  )}
                  {/* Fallback: Check for image/videoSrc directly */}
                  {(!originalPost.medias || 
                    (!originalPost.medias.images?.length && !originalPost.medias.videos?.length)) && 
                    (originalPost.image || originalPost.videoSrc) && (
                    <div className="relative">
                      {originalPost.image && (
                        <img
                          src={originalPost.image}
                          alt="Original post"
                          className="w-full max-h-[400px] object-cover bg-muted/10"
                        />
                      )}
                      {originalPost.videoSrc && (
                        <video
                          src={originalPost.videoSrc}
                          className="w-full max-h-[400px] object-cover bg-muted/10"
                          controls
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Media Preview - Facebook style - Only show for non-repost */}
              {!originalPost && hasMedia && (currentImages.length > 0 || newImages.length > 0 || uploadingImages.length > 0) && (
                <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={submitting || !canAddMore}
              />

              {(currentImages.length > 0 || newImages.length > 0 || uploadingImages.length > 0) && (
                    <div className={cn("space-y-3")}>
                      {/* Current Images - Facebook style */}
                  {currentImages.map((img, idx) => {
                    const imageId = img.id || img._id || idx;
                    return (
                      <div
                        key={imageId}
                        className={cn(
                              "relative rounded-lg overflow-hidden",
                          "bg-muted/10"
                        )}
                      >
                            {(img.type || "").toLowerCase() === "video" ? (
                              <video
                                src={img.url}
                                className="w-full max-h-[400px] object-contain rounded-lg"
                                controls
                              />
                            ) : (
                              <img
                                src={img.url}
                                alt={img.caption || `Ảnh ${idx + 1}`}
                                className="w-full max-h-[400px] object-contain rounded-lg"
                              />
                            )}
                            {/* Edit and Delete buttons - Facebook style */}
                            <div className="absolute top-2 left-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenCaptionModal(imageId, false)}
                                disabled={submitting}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg border",
                                  "bg-card text-foreground text-sm font-medium",
                                  "border-border hover:bg-muted/50",
                                  "transition-all duration-200",
                                  "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                              >
                                <Pencil size={14} className="inline mr-1" />
                                Chỉnh sửa
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(imageId, false)}
                              disabled={submitting}
                              className={cn(
                                "absolute top-2 right-2 z-20",
                                "w-8 h-8 rounded-full bg-black/70 text-white",
                                "flex items-center justify-center",
                                "opacity-80 hover:opacity-100",
                                "transition-all duration-200",
                                "hover:bg-black/90",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                              aria-label="Xóa ảnh"
                            >
                              <X size={16} />
                            </button>
                            {/* Caption display */}
                            {img.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm rounded-b-lg">
                                {img.caption}
                          </div>
                            )}
                      </div>
                    );
                  })}

                      {/* New Images - Facebook style */}
                  {newImages.map((img, idx) => {
                    return (
                      <div
                        key={img.id || idx}
                        className={cn(
                              "relative rounded-lg overflow-hidden",
                          "bg-muted/10"
                        )}
                      >
                            {(img.type || "").toLowerCase() === "video" ? (
                              <video
                                src={img.url}
                                className="w-full max-h-[400px] object-contain rounded-lg"
                                controls
                              />
                            ) : (
                              <img
                                src={img.url}
                                alt={`Ảnh mới ${idx + 1}`}
                                className="w-full max-h-[400px] object-contain rounded-lg"
                              />
                            )}
                            {/* Edit and Delete buttons - Facebook style */}
                            <div className="absolute top-2 left-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenCaptionModal(img.id, true)}
                                disabled={submitting}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg border",
                                  "bg-card text-foreground text-sm font-medium",
                                  "border-border hover:bg-muted/50",
                                  "transition-all duration-200",
                                  "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                              >
                                <Pencil size={14} className="inline mr-1" />
                                Chỉnh sửa
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id, true)}
                              disabled={submitting}
                              className={cn(
                                "absolute top-2 right-2 z-20",
                                "w-8 h-8 rounded-full bg-black/70 text-white",
                                "flex items-center justify-center",
                                "opacity-80 hover:opacity-100",
                                "transition-all duration-200",
                                "hover:bg-black/90",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                              aria-label="Xóa ảnh"
                            >
                              <X size={16} />
                            </button>
                            {/* Caption display */}
                            {img.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm rounded-b-lg">
                                {img.caption}
                          </div>
                            )}
                      </div>
                    );
                  })}

                  {/* Uploading Images */}
                  {uploadingImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className={cn(
                        "relative rounded-lg overflow-hidden",
                            "bg-muted/10 opacity-60"
                      )}
                    >
                      <img
                        src={img.url}
                        alt={`Đang tải ${idx + 1}`}
                            className="w-full max-h-[400px] object-contain rounded-lg"
                      />
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center",
                            "bg-black/50 text-white text-sm font-medium rounded-lg"
                      )}>
                        Đang tải...
                      </div>
                    </div>
                  ))}
                </div>
              )}

                  {/* Add more media button - Only show for non-repost */}
                  {!originalPost && canAddMore && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg border",
                        "text-sm font-medium",
                        "bg-muted/40 border-border hover:bg-muted/60",
                        "text-foreground transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <Plus size={16} />
                      Thêm ảnh/video
                    </button>
                  )}
                </div>
              )}

              {/* Add media placeholder - Only show for non-repost */}
              {!originalPost && hasMedia && totalImages === 0 && (
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

            {/* Footer - Facebook style */}
            <div className="px-4 py-3 border-t border-border/30 flex-shrink-0">
              {/* Add to post options - Always show, but disable for repost */}
              <div className="mb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>Thêm vào bài viết của bạn</span>
                </div>
                <div className="flex items-center gap-2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (originalPost) {
                        // Show tooltip for repost
                        setShowTooltip(true);
                        // Clear existing timeout
                        if (tooltipTimeoutRef.current) {
                          clearTimeout(tooltipTimeoutRef.current);
                        }
                        // Hide tooltip after 3 seconds
                        tooltipTimeoutRef.current = setTimeout(() => {
                          setShowTooltip(false);
                        }, 3000);
                      } else {
                        // Normal behavior for non-repost
                        fileInputRef.current?.click();
                      }
                    }}
                    disabled={submitting || (!originalPost && !canAddMore)}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full",
                      "bg-transparent hover:bg-muted/50",
                      "text-foreground transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      originalPost && "cursor-not-allowed"
                    )}
                    title={originalPost ? "Không thể kết hợp mục này với những gì bạn đã thêm vào bài viết" : "Ảnh/Video"}
                  >
                    <ImageIcon size={20} className="text-green-500" />
                  </button>
                  {/* Tooltip for repost */}
                  {showTooltip && originalPost && (
                    <div className={cn(
                      "absolute left-0 bottom-full mb-2 px-3 py-2",
                      "bg-gray-900 text-white text-xs rounded-lg",
                      "whitespace-nowrap z-50",
                      "shadow-lg"
                    )}>
                      Không thể kết hợp mục này với những gì bạn đã thêm vào bài viết
                      <div className={cn(
                        "absolute top-full left-4 w-0 h-0",
                        "border-l-4 border-r-4 border-t-4",
                        "border-transparent border-t-gray-900"
                      )} />
                    </div>
                  )}
                  {/* Có thể thêm các icon khác ở đây nếu cần */}
                </div>
              </div>

              {/* Save Button - Facebook style */}
              <button 
                type="submit" 
                disabled={isSaving || (!content.trim() && totalImages === 0)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg text-sm font-semibold",
                  "cursor-pointer transition-all duration-200 border-none",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90",
                  "disabled:cursor-not-allowed",
                  "disabled:opacity-50"
                )}
              >
                {isSaving ? (t('action.saving') || 'Đang lưu...') : (t('action.save') || 'Lưu')}
              </button>
            </div>
        </form>
        </div>
      </div>

      {/* Caption Edit Modal - Facebook style */}
      {captionModalOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[2000]",
            "flex items-center justify-center p-4",
            "bg-black/50 backdrop-blur-sm"
          )}
          onClick={() => {
            setCaptionModalOpen(false);
            setEditingImageId(null);
            setEditingImageIsNew(false);
            setEditingCaption("");
          }}
        >
          <div
            className={cn(
              "w-full max-w-md bg-card rounded-lg",
              "border border-primary/30 shadow-2xl",
              "overflow-hidden"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Facebook style */}
            <div className={cn(
              "px-4 py-3 border-b border-border/20",
              "flex items-center justify-between",
              "bg-card"
            )}>
              <h3 className={cn(
                "text-base font-semibold text-foreground m-0"
              )}>
                Chỉnh sửa mô tả
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCaptionModalOpen(false);
                  setEditingImageId(null);
                  setEditingImageIsNew(false);
                  setEditingCaption("");
                }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "bg-transparent hover:bg-muted/50",
                  "text-muted-foreground hover:text-foreground",
                  "transition-all duration-200"
                )}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content - Facebook style */}
            <div className="px-4 py-4">
          <textarea
                value={editingCaption}
                onChange={(e) => {
                  const val = e.target.value.slice(0, MAX_CAPTION_LENGTH);
                  setEditingCaption(val);
                }}
                placeholder="Nhập mô tả cho ảnh/video..."
                rows={4}
                maxLength={MAX_CAPTION_LENGTH}
            className={cn(
                  "post-form-textarea-modern w-full",
              "placeholder:text-muted-foreground/60"
            )}
                autoFocus
          />
          <div className={cn(
                "text-xs mt-2 text-right",
                editingCaption.length > MAX_CAPTION_LENGTH * 0.9
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}>
                {editingCaption.length}/{MAX_CAPTION_LENGTH}
              </div>
            </div>

            {/* Footer - Facebook style */}
            <div className={cn(
              "px-4 py-3 border-t border-border/20",
              "flex gap-2 justify-end",
              "bg-card"
          )}>
            <button 
              type="button" 
                onClick={() => {
                  setCaptionModalOpen(false);
                  setEditingImageId(null);
                  setEditingImageIsNew(false);
                  setEditingCaption("");
                }}
              className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-transparent text-foreground",
                  "hover:bg-muted/30",
                  "transition-all duration-200"
              )}
            >
                Hủy
            </button>
            <button 
                type="button"
                onClick={handleSaveCaption}
              className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold",
                "bg-primary text-primary-foreground",
                "hover:opacity-90",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                disabled={submitting}
            >
                Lưu
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

PostEditModal.propTypes = {
  open: PropTypes.bool,
  post: PropTypes.object,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
};
