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
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [activeTab, setActiveTab] = useState("posts"); // posts, videos
  const [userVideos, setUserVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [currentUserEntityId, setCurrentUserEntityId] = useState(null);
  
  // Location states
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  
  // Get current user entity ID for followers/following
  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return;
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      const entities = session?.entities || [];
      const resolvedId =
        active.EntityAccountId ||
        active.entityAccountId ||
        active.id ||
        entities[0]?.EntityAccountId ||
        entities[0]?.entityAccountId ||
        null;
      setCurrentUserEntityId(resolvedId || null);
    } catch {}
  }, []);
  
  const { followers, fetchFollowers } = useFollowers(currentUserEntityId);
  const { following, fetchFollowing } = useFollowing(currentUserEntityId);
  
  useEffect(() => {
    if (currentUserEntityId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [currentUserEntityId, fetchFollowers, fetchFollowing]);

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
          
          // Load user posts and videos after profile is loaded
          await loadUserContent();
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
      setPostsLoading(true);
      setVideosLoading(true);
      
      // Get session to determine current user
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }
      
      const currentUserId = session?.activeEntity?.id || session?.account?.id;
      
      // Load posts from posts collection (include medias for videos tab)
      const postsResponse = await axiosClient.get(`/posts/author/${currentUserId}`, {
        params: { includeMedias: true }
      });
      const posts = postsResponse.success ? postsResponse.data : [];
      
      // Load music posts from musics collection  
      const musicResponse = await axiosClient.get(`/music/author/${currentUserId}`);
      const musics = musicResponse.success ? musicResponse.data : [];
      
      // Transform and combine posts
      const transformedPosts = posts.map(post => ({
        id: post._id,
        type: 'post',
        title: post.title || post["Tiêu Đề"],
        content: post.content || post.caption,
        image: post.url && post.url !== "default-post.jpg" ? post.url : (post.medias && post.medias[0]?.url && !/\.(mp4|webm|mov)$/i.test(post.medias[0]?.url) ? post.medias[0].url : null),
        createdAt: post.createdAt,
        likes: post.likes ? Object.keys(post.likes).length : 0,
        comments: post.comments ? Object.keys(post.comments).length : 0,
        authorName: post.authorEntityName || "Người dùng",
        authorAvatar: post.authorEntityAvatar || null
      }));
      
      const transformedMusics = musics.map(music => ({
        id: music._id,
        type: 'music',
        title: music["Tên Bài Nhạc"],
        content: music["Chi Tiết"],
        image: music["Ảnh Nền Bài Nhạc"],
        audioUrl: music["Link Mua Nhạc"],
        artist: music["Tên Nghệ Sĩ"],
        createdAt: music.createdAt,
        likes: music["Thích"] ? Object.keys(music["Thích"]).length : 0,
        comments: music["Bình Luận"] ? Object.keys(music["Bình Luận"]).length : 0,
        authorName: music.authorEntityName || "Người dùng",
        authorAvatar: music.authorEntityAvatar || null
      }));
      
      // Combine and sort by creation date
      const allPosts = [...transformedPosts, ...transformedMusics]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setUserPosts(allPosts);

      // Extract videos from post medias
      const isVideoMedia = (m) => {
        const mime = (m?.mime || '').toLowerCase();
        const url = m?.url || '';
        return mime.startsWith('video/') || /\.(mp4|webm|mov|mkv|m4v)$/i.test(url);
      };

      const videos = (posts || []).flatMap(p => {
        const medias = Array.isArray(p.medias) ? p.medias : [];
        return medias.filter(isVideoMedia).map(m => ({
          id: m._id || `${p._id}-${m.url}`,
          postId: p._id,
          url: m.url,
          mime: m.mime || '',
          createdAt: p.createdAt,
          title: p.title || p.caption || 'Video',
          authorName: p.authorEntityName || 'Người dùng',
          authorAvatar: p.authorEntityAvatar || null
        }));
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setUserVideos(videos);
    } catch (error) {
      console.error("Error loading user posts:", error);
    } finally {
      setPostsLoading(false);
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
      {/* Cover Photo Section - Instagram Style */}
      <section className={cn("relative w-full h-[200px] md:h-[250px] overflow-hidden rounded-b-lg")}>
        <div
          className={cn("absolute inset-0 bg-cover bg-center")}
          style={{
            backgroundImage: `url(${profile.background || "https://i.imgur.com/6IUbEMn.jpg"})`,
          }}
        />
        {/* Gradient Overlay */}
        <div className={cn("absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60")} />
        
        {/* Edit Button */}
        <div className={cn("absolute top-4 right-4 z-10")}>
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
        </div>

        {/* Profile Info Overlay */}
        <div className={cn("absolute bottom-0 left-0 right-0 p-4 md:p-6")}>
          <div className={cn("flex items-end gap-3 md:gap-4")}>
            {/* Avatar - Large & Prominent */}
            <div className={cn("relative")}>
              <img
                src={profile.avatar || "https://via.placeholder.com/150"}
                alt="avatar"
                className={cn(
                  "w-20 h-20 md:w-24 md:h-24 rounded-full object-cover",
                  "border-4 border-card shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                  "bg-card"
                )}
              />
            </div>
            <div className={cn("flex-1 pb-1")}>
              <h1 className={cn(
                "text-xl md:text-2xl font-bold text-primary-foreground mb-0.5",
                "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              )}>
                {profile.userName || t('profile.editPersonalProfile')}
              </h1>
              <div className={cn(
                "text-xs md:text-sm text-primary-foreground/90",
                "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              )}>
                USER
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className={cn("max-w-6xl mx-auto px-4 md:px-6 py-6")}>
        {/* Stats Bar - Refined & Balanced Design */}
        <section className={cn(
          "flex items-center justify-center gap-8 md:gap-12 lg:gap-16",
          "py-6 px-4",
          "border-b border-border/30"
        )}>
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {userPosts.length}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t('publicProfile.posts')}
            </span>
          </button>
          
          <div className={cn(
            "h-10 w-px bg-border/20",
            "hidden md:block"
          )} />
          
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {followers.length}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t('publicProfile.followers')}
            </span>
          </button>
          
          <div className={cn(
            "h-10 w-px bg-border/20",
            "hidden md:block"
          )} />
          
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {following.length}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t('publicProfile.following')}
            </span>
          </button>
        </section>

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
                  <div className={cn("mt-4 space-y-4")}>
                    <div>
                      <label className={cn("block text-sm font-medium mb-2 text-foreground")}>
                        Upload ảnh từ máy tính:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={uploadingAvatar}
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg",
                          "border-[0.5px] border-border/20",
                          "bg-background text-foreground",
                          "outline-none transition-all duration-200",
                          "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      />
                      {uploadingAvatar && (
                        <p className={cn("text-sm text-primary mt-2")}>
                          Đang upload ảnh...
                        </p>
                      )}
                    </div>
                    <div className={cn("text-center text-muted-foreground text-sm")}>
                      hoặc
                    </div>
                    <div>
                      <label className={cn("block text-sm font-medium mb-2 text-foreground")}>
                        Nhập link ảnh:
                      </label>
                      <input
                        type="text"
                        placeholder="Nhập link ảnh đại diện..."
                        value={profile.avatar || ""}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, avatar: e.target.value }))
                        }
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
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload ảnh từ máy tính:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundChange}
                      disabled={uploadingBackground}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    {uploadingBackground && (
                      <p className="text-sm text-blue-600 mt-1">Đang upload ảnh...</p>
                    )}
                  </div>
                  <div className="text-center text-gray-500">hoặc</div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nhập link ảnh:</label>
                    <input
                      type="text"
                      placeholder="Nhập link ảnh bìa..."
                      value={profile.background || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, background: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
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
                disabled={saving}
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
                disabled={saving}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold text-sm",
                  "bg-primary text-primary-foreground border-none",
                  "hover:bg-primary/90 transition-all duration-200",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
