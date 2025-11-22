import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { userApi } from "../../../api/userApi";
import { locationApi } from "../../../api/locationApi";
import axiosClient from "../../../api/axiosClient";
import AddressSelector from "../../../components/common/AddressSelector";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import { cn } from "../../../utils/cn";
import CreatePostBox from "../../feeds/components/shared/CreatePostBox";
import PostComposerModal from "../../feeds/components/modals/PostComposerModal";
import PostCard from "../../feeds/components/post/PostCard";
import { getPostsByAuthor } from "../../../api/postApi";
import { mapPostForCard } from "../../../utils/postTransformers";
import { useProfilePosts } from "../../../hooks/useProfilePosts";
import { useCurrentUserEntity } from "../../../hooks/useCurrentUserEntity";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileStats } from "../../../components/profile/ProfileStats";
import { ImageUploadField } from "../../../components/profile/ImageUploadField";

export default function Profile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState({
    userName: "",
    email: "",
    avatar: "",
    background: "",
    bio: "",
    address: "",
    phone: "",
    gender: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const handleEditClick = () => setShowEditModal(true);
  const handleCloseEdit = () => setShowEditModal(false);
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [activeTab, setActiveTab] = useState("posts"); // posts, videos
  const [userVideos, setUserVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  
  // Location states
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  
  // Get current user entity ID using shared hook
  const currentUserEntityId = useCurrentUserEntity();
  
  const { followers, fetchFollowers } = useFollowers(currentUserEntityId);
  const { following, fetchFollowing } = useFollowing(currentUserEntityId);
  
  // Use shared hook for posts
  const { posts: userPosts, loading: postsLoading } = useProfilePosts(currentUserEntityId);
  
  useEffect(() => {
    if (currentUserEntityId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [currentUserEntityId, fetchFollowers, fetchFollowing]);

  // Load videos when userPosts are available
  useEffect(() => {
    if (userPosts && userPosts.length >= 0) {
      loadUserContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPosts]);

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.me();
        if (res.status === "success" && res.data) {
          setProfile(res.data);
          
          // Load structured address data if available
          if (res.data.addressData) {
            if (res.data.addressData.provinceId) {
              setSelectedProvinceId(res.data.addressData.provinceId);
              const districtsData = await locationApi.getDistricts(res.data.addressData.provinceId);
              // Store districts data - we'll need to manage this state
              
              if (res.data.addressData.districtId) {
                setSelectedDistrictId(res.data.addressData.districtId);
                const wardsData = await locationApi.getWards(res.data.addressData.districtId);
                
                if (res.data.addressData.wardId) {
                  setSelectedWardId(res.data.addressData.wardId);
                }
              }
            }
            // Extract address detail if stored separately
            if (res.data.address && res.data.addressData) {
              // Try to extract detail from full address
              const fullAddr = res.data.address;
              const parts = fullAddr.split(', ');
              if (parts.length > 3) {
                setAddressDetail(parts.slice(0, -3).join(', '));
              }
            }
          }
          
          // Videos will be loaded when userPosts are available
        } else setError(res.message || "Không tải được hồ sơ");
      } catch (e) {
        setError(e?.response?.data?.message || "Không tải được hồ sơ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadUserContent = async () => {
    try {
      setVideosLoading(true);
      
      // Extract videos from userPosts (already loaded by useProfilePosts)
      if (!userPosts || userPosts.length === 0) {
        setUserVideos([]);
        setVideosLoading(false);
        return;
      }
      
      // Extract videos from posts
      const videos = userPosts
        .filter(p => p.videoSrc || (p.medias?.videos && p.medias.videos.length > 0))
        .map(p => ({
          id: p.id,
          postId: p.id,
          url: p.videoSrc || p.medias?.videos?.[0]?.url,
          createdAt: p.time,
          title: p.title || p.content || 'Video',
          user: p.user,
          avatar: p.avatar,
          ...p
        }))
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

      setUserVideos(videos);
    } catch (error) {
      console.error("Error loading user videos:", error);
    } finally {
      setVideosLoading(false);
    }
  };

  const handleFileUpload = async (file, type) => {
    try {
      console.log(`[UPLOAD] Starting upload for ${type}`);
      console.log(`[UPLOAD] File details:`, { name: file.name, size: file.size, type: file.type });
      
      if (type === 'avatar') {
        setUploadingAvatar(true);
      } else {
        setUploadingBackground(true);
      }

      const formData = new FormData();
      formData.append('images', file);
      console.log(`[UPLOAD] FormData created, posting to /posts/upload`);

      const response = await axiosClient.post('/posts/upload', formData);
      console.log(`[UPLOAD] Response received:`, response);
      
      const uploadedFile = response.data?.[0] || response.data;
      console.log(`[UPLOAD] Uploaded file:`, uploadedFile);

      if (uploadedFile && uploadedFile.url) {
        const url = uploadedFile.url;
        console.log(`[UPLOAD] Success! URL:`, url);
        
        if (type === 'avatar') {
          setProfile(prev => ({ ...prev, avatar: url }));
        } else {
          setProfile(prev => ({ ...prev, background: url }));
        }
        return url;
      } else {
        console.error(`[UPLOAD] Upload failed - no URL in response`);
        throw new Error('Upload failed - no URL in response');
      }
    } catch (error) {
      console.error(`[UPLOAD] Error uploading ${type}:`, error);
      console.error(`[UPLOAD] Error details:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert('Upload ảnh thất bại. Vui lòng thử lại.');
      return null;
    } finally {
      if (type === 'avatar') {
        setUploadingAvatar(false);
      } else {
        setUploadingBackground(false);
      }
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh hợp lệ.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 5MB.');
        return;
      }

      await handleFileUpload(file, 'avatar');
    }
  };

  const handleBackgroundChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh hợp lệ.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 5MB.');
        return;
      }

      await handleFileUpload(file, 'background');
    }
  };

  const handleSaveProfile = async () => {
    try {
      console.log(`[SAVE PROFILE] Starting save`);
      setSaving(true);
      
      // Full address is already built by AddressSelector via onAddressChange
      let fullAddress = profile.address || '';
      
      // Prepare FormData for profile update
      const formData = new FormData();
      formData.append('userName', profile.userName || '');
      formData.append('bio', profile.bio || '');
      formData.append('address', fullAddress);
      
      // Send structured address data
      if (selectedProvinceId || selectedDistrictId || selectedWardId) {
        formData.append('addressData', JSON.stringify({
          provinceId: selectedProvinceId,
          districtId: selectedDistrictId,
          wardId: selectedWardId,
          fullAddress: fullAddress,
          detail: addressDetail
        }));
      }
      
      formData.append('phone', profile.phone || '');
      formData.append('gender', profile.gender || '');
      
      // IMPORTANT: Send avatar and background URLs as text fields
      // Backend will use these URLs if provided, otherwise keep current ones
      if (profile.avatar) {
        formData.append('avatar', profile.avatar);
        console.log(`[SAVE PROFILE] Sending avatar URL: ${profile.avatar.substring(0, 50)}...`);
      }
      if (profile.background) {
        formData.append('background', profile.background);
        console.log(`[SAVE PROFILE] Sending background URL: ${profile.background.substring(0, 50)}...`);
      }
      
      console.log(`[SAVE PROFILE] Profile data:`, {
        userName: profile.userName,
        bio: profile.bio,
        address: profile.address,
        phone: profile.phone,
        gender: profile.gender,
        avatar: profile.avatar?.substring(0, 50) + '...',
        background: profile.background?.substring(0, 50) + '...'
      });
      
      // Call API to update profile
      console.log(`[SAVE PROFILE] Sending request to /user/profile`);
      const response = await axiosClient.put('/user/profile', formData);
      console.log(`[SAVE PROFILE] Response received:`, response);
      
      if (response.status === "success") {
        console.log(`[SAVE PROFILE] Success!`);
        
        // Reload profile data from API
        console.log(`[SAVE PROFILE] Reloading profile data`);
        const res = await userApi.me();
        if (res.status === "success" && res.data) {
          setProfile(res.data);
          console.log(`[SAVE PROFILE] Profile reloaded`);
          
          // IMPORTANT: Update session in localStorage so other components show new avatar
          try {
            const { getSession, updateSession } = await import("../../../utils/sessionManager");
            const session = getSession();
            
            if (session) {
              console.log(`[SAVE PROFILE] Current session:`, session);
              
              // Preserve EntityAccountId when updating account
              const accountEntityAccountId = session.account?.EntityAccountId || session.account?.entityAccountId || null;
              
              // Update account (preserve EntityAccountId)
              const updatedAccount = {
                ...session.account,
                avatar: res.data.avatar,
                userName: res.data.userName,
                EntityAccountId: accountEntityAccountId, // Preserve EntityAccountId
              };
              
              // Update activeEntity if exists (preserve EntityAccountId)
              const updatedActiveEntity = session.activeEntity ? {
                ...session.activeEntity,
                avatar: res.data.avatar,
                name: res.data.userName,
                EntityAccountId: session.activeEntity.EntityAccountId || session.activeEntity.entityAccountId || null, // Preserve EntityAccountId
              } : null;
              
              // Update entities array if exists
              const updatedEntities = session.entities && Array.isArray(session.entities) 
                ? session.entities.map(entity => {
                    if (entity.type === "Account" && entity.id === session.account?.id) {
                      return {
                        ...entity,
                        avatar: res.data.avatar,
                        name: res.data.userName,
                        EntityAccountId: entity.EntityAccountId || entity.entityAccountId || null, // Preserve EntityAccountId
                      };
                    }
                    return entity;
                  })
                : session.entities;
              
              // Update session using sessionManager
              updateSession({
                account: updatedAccount,
                activeEntity: updatedActiveEntity || session.activeEntity,
                entities: updatedEntities,
              });
              
              console.log(`[SAVE PROFILE] Session updated via sessionManager`);
              
              // Dispatch custom event to notify other components
              const event = new Event('profileUpdated');
              window.dispatchEvent(event);
              console.log(`[SAVE PROFILE] Dispatched profileUpdated event`);
              
              // Force a page reload after a short delay to ensure all components update
              console.log(`[SAVE PROFILE] Dispatching customEvent with detail`);
              const customEvent = new CustomEvent('profileUpdated', { 
                detail: { avatar: res.data.avatar, userName: res.data.userName }
              });
              window.dispatchEvent(customEvent);
              console.log(`[SAVE PROFILE] Dispatched customEvent with detail`);
            }
          } catch (error) {
            console.error(`[SAVE PROFILE] Error updating session:`, error);
          }
        }
        
        alert("Cập nhật hồ sơ thành công!");
        setShowEditModal(false);
        setEditingField(null);
      } else {
        console.error(`[SAVE PROFILE] Save failed:`, response.message);
        alert("Cập nhật thất bại: " + (response.message || "Lỗi không xác định"));
      }
    } catch (error) {
      console.error("[SAVE PROFILE] Error updating profile:", error);
      console.error("[SAVE PROFILE] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert("Cập nhật thất bại: " + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-muted-foreground")}>{t('publicProfile.loading')}</div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background")}>
      <ProfileHeader
        background={profile.background}
        avatar={profile.avatar}
        name={profile.userName || t('profile.editPersonalProfile')}
        role="USER"
        actionButtons={
          <button
            onClick={handleEditClick}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold text-sm",
              "bg-card/80 backdrop-blur-sm text-foreground border-none",
              "hover:bg-card/90 transition-all duration-200",
              "active:scale-95",
              "flex items-center gap-2"
            )}
          >
            <i className="bx bx-edit text-base"></i>
            {t('profile.editProfile')}
          </button>
        }
      />

      {/* Main Content Container */}
      <div className={cn("max-w-6xl mx-auto px-4 md:px-6 py-6")}>
        <ProfileStats followers={followers} following={following} />

        {/* Bio & Info Section */}
        {(profile.bio || profile.email || profile.phone || profile.address || profile.gender) && (
          <section className={cn(
            "py-6 border-b border-border/30",
            "bg-card rounded-lg p-6 mb-6",
            "border-[0.5px] border-border/20",
            "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          )}>
            {profile.bio && (
              <div className={cn("mb-4")}>
                <h3 className={cn("text-lg font-semibold text-foreground mb-2")}>
                  {t("publicProfile.about")}
                </h3>
                <p className={cn("text-foreground whitespace-pre-wrap leading-relaxed")}>
                  {profile.bio}
                </p>
              </div>
            )}
            {(profile.email || profile.phone || profile.address || profile.gender) && (
              <div className={cn("mt-4 pt-4 border-t border-border/30")}>
                <h4 className={cn("text-base font-semibold text-foreground mb-3")}>
                  {t("publicProfile.contact")}
                </h4>
                <div className={cn("space-y-2 text-sm text-muted-foreground")}>
                  {profile.email && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-envelope text-base"></i>
                      <span>{t("common.email")}: {profile.email}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-phone text-base"></i>
                      <span>{t("common.phone") || "Phone"}: {profile.phone}</span>
                    </div>
                  )}
                  {profile.address && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-map text-base"></i>
                      <span>{t("common.address") || "Address"}: {profile.address}</span>
                    </div>
                  )}
                  {profile.gender && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-user text-base"></i>
                      <span>{t("profile.gender")}: {profile.gender}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Posts Section - Instagram Grid Style */}
        <section className={cn("py-6")}>
          {/* Tabs */}
          <div className={cn("flex items-center gap-1 mb-6 border-b border-border/30")}>
            <button
              onClick={() => setActiveTab("posts")}
              className={cn(
                "px-6 py-3 text-sm font-semibold border-none bg-transparent",
                "transition-all duration-200 relative",
                activeTab === "posts"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("publicProfile.posts")}
              {activeTab === "posts" && (
                <span className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5",
                  "bg-primary"
                )} />
              )}
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={cn(
                "px-6 py-3 text-sm font-semibold border-none bg-transparent",
                "transition-all duration-200 relative",
                activeTab === "videos"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Videos
              {activeTab === "videos" && (
                <span className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5",
                  "bg-primary"
                )} />
              )}
            </button>
          </div>

          {/* Content */}
          {activeTab === "posts" ? (
            <>
              {postsLoading ? (
                <div className={cn("text-center py-12 text-muted-foreground")}>
                  {t('common.loading')}
                </div>
              ) : userPosts && userPosts.length > 0 ? (
                <div className={cn("space-y-4")}>
                  {userPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onShared={() => loadUserContent()}
                    />
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "text-center py-12 text-muted-foreground",
                  "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
                )}>
                  {t("publicProfile.noPosts")}
                </div>
              )}
            </>
          ) : (
            <>
              {videosLoading ? (
                <div className={cn("text-center py-12 text-muted-foreground")}>
                  {t('common.loading')}
                </div>
              ) : userVideos && userVideos.length > 0 ? (
                <div className={cn("space-y-4")}>
                  {userVideos.map(video => (
                    <PostCard
                      key={video.id}
                      post={video}
                      onShared={() => loadUserContent()}
                    />
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "text-center py-12 text-muted-foreground",
                  "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
                )}>
                  Không có video
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showEditModal && (
        <div className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm",
          "flex items-center justify-center z-50 p-4"
        )}>
          <div className={cn(
            "bg-card text-card-foreground rounded-lg",
            "border-[0.5px] border-border/20",
            "shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
            "w-full max-w-2xl max-h-[90vh] overflow-y-auto",
            "flex flex-col"
          )}>
            {/* Header */}
            <div className={cn(
              "p-4 border-b border-border/30",
              "flex items-center justify-between flex-shrink-0"
            )}>
              <h3 className={cn("text-xl font-semibold text-foreground")}>
                {t('profile.editPersonalProfile')}
              </h3>
              <button
                onClick={handleCloseEdit}
                className={cn(
                  "w-8 h-8 flex items-center justify-center",
                  "bg-transparent border-none text-muted-foreground",
                  "rounded-lg transition-all duration-200",
                  "hover:bg-muted/50 hover:text-foreground",
                  "active:scale-95"
                )}
              >
                <i className="bx bx-x text-xl"></i>
              </button>
            </div>

            {/* Content */}
            <div className={cn("p-6 flex-1 overflow-y-auto")}>
              <div className={cn("space-y-6")}>
                {/* --- Ảnh đại diện --- */}
                <div className={cn("flex justify-between items-center border-b border-border/30 pb-4")}>
                  <div className={cn("flex items-center gap-4")}>
                    <div className={cn("relative")}>
                      <img
                        src={profile.avatar || "https://via.placeholder.com/100"}
                        alt="Avatar"
                        className={cn(
                          "w-20 h-20 rounded-full object-cover",
                          "border-2 border-border/20"
                        )}
                      />
                      {uploadingAvatar && (
                        <div className={cn(
                          "absolute inset-0 bg-black/50 rounded-full",
                          "flex items-center justify-center"
                        )}>
                          <div className={cn("text-primary-foreground text-xs")}>
                            Đang upload...
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={cn("font-semibold text-base text-foreground")}>
                        Ảnh đại diện
                      </p>
                      <p className={cn("text-sm text-muted-foreground")}>
                        Hiển thị cho người dùng
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingField(editingField === "avatar" ? null : "avatar")}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm",
                      "bg-transparent border-none text-primary",
                      "hover:bg-primary/10 transition-all duration-200",
                      "active:scale-95"
                    )}
                  >
                    {editingField === "avatar" ? "Đóng" : "Chỉnh sửa"}
                  </button>
                </div>
                {editingField === "avatar" && (
                  <div className={cn("mt-4")}>
                    <ImageUploadField
                      label="Ảnh đại diện"
                      value={profile.avatar}
                      onChange={(url) => setProfile((prev) => ({ ...prev, avatar: url }))}
                      uploadMode={true}
                      urlInput={true}
                      uploading={uploadingAvatar}
                      onUploadStateChange={(uploading) => setUploadingAvatar(uploading)}
                      />
                  </div>
                )}

              {/* --- Ảnh nền --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profile.background || "https://i.imgur.com/6IUbEMn.jpg"}
                      alt="Background"
                      className="w-24 h-16 rounded-lg object-cover border"
                    />
                    {uploadingBackground && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="text-white text-xs">Đang upload...</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-lg">Ảnh bìa</p>
                    <p className="text-sm text-gray-500">Hiển thị ở đầu trang</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "background" ? null : "background")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "background" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "background" && (
                <div className={cn("mt-4")}>
                  <ImageUploadField
                    label="Ảnh bìa"
                    value={profile.background}
                    onChange={(url) => setProfile((prev) => ({ ...prev, background: url }))}
                    uploadMode={true}
                    urlInput={true}
                    uploading={uploadingBackground}
                    onUploadStateChange={(uploading) => setUploadingBackground(uploading)}
                  />
                </div>
              )}

              {/* --- Tiểu sử / Bio --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="font-medium text-lg">Tiểu sử</p>
                  <p className="text-sm text-gray-500">
                    {profile.bio || "Chưa có tiểu sử"}
                  </p>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "bio" ? null : "bio")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "bio" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "bio" && (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                    value={profile.bio || ""}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {/* --- Thông tin chi tiết --- */}
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <p className="font-medium text-lg mb-1">Thông tin chi tiết</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Tên:</strong> {profile.userName || "Chưa có tên"}</p>
                    <p><strong>Địa chỉ:</strong> {profile.address || "Chưa có địa chỉ"}</p>
                    <p><strong>Điện thoại:</strong> {profile.phone || "Chưa có"}</p>
                    <p><strong>Email:</strong> {profile.email || "Chưa có"}</p>
                    <p><strong>Giới tính:</strong> {profile.gender || "Chưa có"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "info" ? null : "info")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium self-start"
                >
                  {editingField === "info" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>

              {editingField === "info" && (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium">Tên:</span>
                    <input
                      type="text"
                      value={profile.userName || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, userName: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </label>

                  <div>
                    <span className="text-sm font-medium block mb-2">Địa chỉ:</span>
                    <AddressSelector
                      selectedProvinceId={selectedProvinceId}
                      selectedDistrictId={selectedDistrictId}
                      selectedWardId={selectedWardId}
                      addressDetail={addressDetail}
                      onProvinceChange={(id) => {
                        setSelectedProvinceId(id);
                        setSelectedDistrictId('');
                        setSelectedWardId('');
                      }}
                      onDistrictChange={(id) => {
                        setSelectedDistrictId(id);
                        setSelectedWardId('');
                      }}
                      onWardChange={setSelectedWardId}
                      onAddressDetailChange={setAddressDetail}
                      onAddressChange={(fullAddr) => {
                        setProfile(prev => ({ ...prev, address: fullAddr }));
                      }}
                    />
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium">Điện thoại:</span>
                    <input
                      type="text"
                      value={profile.phone || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Giới tính:</span>
                    <select
                      value={profile.gender || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, gender: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </label>
                </div>
              )}

              </div>
            </div>

            {/* Footer */}
            <div className={cn(
              "p-4 border-t border-border/30",
              "flex items-center justify-end gap-3 flex-shrink-0"
            )}>
              <button
                onClick={handleCloseEdit}
                disabled={saving || uploadingAvatar || uploadingBackground}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold text-sm",
                  "bg-transparent border-none text-muted-foreground",
                  "hover:text-foreground hover:bg-muted/50",
                  "transition-all duration-200",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Đóng
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving || uploadingAvatar || uploadingBackground}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold text-sm",
                  "bg-primary text-primary-foreground border-none",
                  "hover:bg-primary/90 transition-all duration-200",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving || uploadingAvatar || uploadingBackground ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
