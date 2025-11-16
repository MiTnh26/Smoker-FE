// src/modules/dj/pages/DJProfile.js
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import { locationApi } from "../../../api/locationApi";
import AddressSelector from "../../../components/common/AddressSelector";
import PostCard from "../../feeds/components/post/PostCard";
import { getPostsByAuthor } from "../../../api/postApi";
import { cn } from "../../../utils/cn";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import { Edit, DollarSign, Music2 } from "lucide-react";
import "../../../styles/modules/publicProfile.css";
import PerformerReviews from "../../business/components/PerformerReviews";

// Helper functions for post transformation (same as PublicProfile)
const normalizeMediaArray = (medias) => {
  const images = [];
  const videos = [];
  const audios = [];

  const isAudioUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    return (
      u.includes('.mp3') ||
      u.includes('.m4a') ||
      u.includes('.wav') ||
      u.includes('.ogg') ||
      u.includes('.aac')
    );
  };

  if (Array.isArray(medias)) {
    for (const mediaItem of medias) {
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      const type = (mediaItem.type || "").toLowerCase();
      if (!url) continue;
      if (type === "audio" || isAudioUrl(url)) {
        audios.push({ url, id: mediaItem._id || mediaItem.id || url });
      } else if (type === "video" || url.includes(".mp4") || url.includes(".webm")) {
        videos.push({ url, id: mediaItem._id || mediaItem.id || url });
      } else {
        images.push({ url, id: mediaItem._id || mediaItem.id || url });
      }
    }
  } else if (medias && typeof medias === "object") {
    for (const key of Object.keys(medias)) {
      const mediaItem = medias[key];
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      const type = (mediaItem.type || "").toLowerCase();
      if (!url) continue;
      if (type === "audio" || isAudioUrl(url)) {
        audios.push({ url, id: mediaItem._id || mediaItem.id || url });
      } else if (type === "video" || url.includes(".mp4") || url.includes(".webm")) {
        videos.push({ url, id: mediaItem._id || mediaItem.id || url });
      } else {
        images.push({ url, id: mediaItem._id || mediaItem.id || url });
      }
    }
  }
  return { images, videos, audios };
};

const countCollection = (value) => {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  if (value instanceof Map) return value.size;
  if (typeof value === "object") return Object.keys(value).length;
  if (typeof value === "number") return value;
  return 0;
};

const formatPostTime = (value, t) => {
  try {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return d.toLocaleString('vi-VN');
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t('time.justNow') || 'vừa xong';
    if (minutes < 60) return t('time.minutesAgo', { minutes }) || `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { hours }) || `${hours} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return new Date().toLocaleString('vi-VN');
  }
};

// eslint-disable-next-line complexity
const mapPostForCard = (post, t) => {
  const id = post._id || post.id || post.postId;
  const author = post.author || post.account || {};
  const mediaFromPost = normalizeMediaArray(post.medias);
  const mediaFromMediaIds = normalizeMediaArray(post.mediaIds);
  const images = [...mediaFromPost.images, ...mediaFromMediaIds.images];
  const videos = [...mediaFromPost.videos, ...mediaFromMediaIds.videos];
  const audios = [...mediaFromPost.audios, ...mediaFromMediaIds.audios];

  const resolveUserName = () =>
    post.authorName ||
    post.authorEntityName ||
    author.userName ||
    author.name ||
    post.user ||
    t("common.user");

  const resolveAvatar = () =>
    post.authorAvatar ||
    post.authorEntityAvatar ||
    author.avatar ||
    post.avatar ||
    "https://via.placeholder.com/40";

  // Extract audio from post
  const isAudioUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    return (
      u.includes('.mp3') ||
      u.includes('.m4a') ||
      u.includes('.wav') ||
      u.includes('.ogg') ||
      u.includes('.aac')
    );
  };

  // Get audio from various sources
  const music = post.musicId || post.music || {};
  const audioFromMusic = (() => {
    if (!music) return null;
    const candidates = [
      music.audioUrl,
      music.streamUrl,
      music.fileUrl,
      music.url,
      music.sourceUrl,
      music.downloadUrl,
    ];
    for (const c of candidates) if (c && isAudioUrl(c)) return c;
    return null;
  })();

  // Check medias for audio
  const audioFromMedias = (() => {
    if (Array.isArray(post.medias)) {
      for (const mediaItem of post.medias) {
        if (!mediaItem) continue;
        const url = mediaItem.url || mediaItem.src || mediaItem.path;
        if (url && isAudioUrl(url)) return url;
      }
    } else if (post.medias && typeof post.medias === "object") {
      for (const key of Object.keys(post.medias)) {
        const mediaItem = post.medias[key];
        if (!mediaItem) continue;
        const url = mediaItem.url || mediaItem.src || mediaItem.path;
        if (url && isAudioUrl(url)) return url;
      }
    }
    return null;
  })();

  const audioSrc = audioFromMusic || audios[0]?.url || audioFromMedias || post.audioSrc || post.audioUrl || null;

  return {
    id,
    user: resolveUserName(),
    avatar: resolveAvatar(),
    time: formatPostTime(post.createdAt, t),
    content: post.content || post.caption || post["Tiêu Đề"] || "",
    medias: { images, videos, audios: audioSrc ? [{ url: audioSrc }] : audios },
    image: images[0]?.url || null,
    videoSrc: videos[0]?.url || null,
    audioSrc: audioSrc,
    audioTitle: music.title || post.musicTitle || post["Tên Bài Nhạc"] || post.title || null,
    artistName: music.artist || post.artistName || post["Tên Nghệ Sĩ"] || post.authorEntityName || post.user || null,
    thumbnail: music.coverUrl || post.musicBackgroundImage || post["Ảnh Nền Bài Nhạc"] || post.thumbnail || null,
    purchaseLink: music.purchaseLink || post.purchaseLink || post.musicPurchaseLink || null,
    likes: countCollection(post.likes),
    likedByCurrentUser: false,
    comments: countCollection(post.comments),
    shares: post.shares || 0,
    hashtags: post.hashtags || [],
    verified: !!post.verified,
    location: post.location || null,
    title: post.title || null,
    canManage: false,
    ownerEntityAccountId: post.entityAccountId || post.authorEntityAccountId || null,
    entityAccountId: post.entityAccountId || post.authorEntityAccountId || null,
    authorEntityAccountId: post.authorEntityAccountId || post.entityAccountId || null,
    authorEntityId: post.authorEntityId || post.authorId || post.accountId || null,
    authorEntityType: post.authorEntityType || post.entityType || post.type || null,
    ownerAccountId: post.accountId || post.ownerAccountId || author.id || null,
    targetType: post.type || "post",
  };
};

export default function DJProfile() {
    const { t } = useTranslation();
    const { businessId } = useParams();
    const [profile, setProfile] = useState({
        userName: "",
        role: "",
        avatar: "",
        background: "",
        address: "",
        phone: "",
        bio: "",
        gender: "",
        pricePerHours: "",
        pricePerSession: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("info");
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [saving, setSaving] = useState(false);
    const [currentUserEntityId, setCurrentUserEntityId] = useState(null);
    const [businessEntityId, setBusinessEntityId] = useState(null);
    const [businessAccountId, setBusinessAccountId] = useState(null);
    const [businessPosts, setBusinessPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);
    
    // Location states
    const [selectedProvinceId, setSelectedProvinceId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');
    const [selectedWardId, setSelectedWardId] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
    
    // Get current user entity ID for followers/following and chat
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

    // Check if this is own profile: compare businessId (from URL) with activeEntity.id (businessId of current role)
    // Similar to how BarProfile checks activeBarPageId
    const [activeBusinessId, setActiveBusinessId] = useState(null);
    useEffect(() => {
        try {
            const sessionRaw = localStorage.getItem("session");
            if (!sessionRaw) return;
            const session = JSON.parse(sessionRaw);
            const active = session?.activeEntity || {};
            // If active entity is Business with role "DJ", use its id (which is businessId)
            if (active.type === "Business" && active.role && active.role.toLowerCase() === "dj") {
                setActiveBusinessId(active.id);
            }
        } catch {}
    }, []);
    
    const { followers, fetchFollowers } = useFollowers(businessEntityId);
    const { following, fetchFollowing } = useFollowing(businessEntityId);
    
    useEffect(() => {
        if (businessEntityId) {
            fetchFollowers();
            fetchFollowing();
        }
    }, [businessEntityId, fetchFollowers, fetchFollowing]);

    // Load posts for this business
    useEffect(() => {
        let alive = true;
        const loadBusinessPosts = async () => {
            if (!businessEntityId && !businessId) {
                setPostsLoading(false);
                return;
            }
            
            try {
                setPostsLoading(true);
                const entityId = businessEntityId || businessId;
                const resp = await getPostsByAuthor(entityId, {});
                if (!alive) return;

                let rawPosts = [];
                if (Array.isArray(resp?.data)) {
                    rawPosts = resp.data;
                } else if (Array.isArray(resp?.data?.data)) {
                    rawPosts = resp.data.data;
                }

                const transformed = rawPosts.map((post) => mapPostForCard(post, t));
                setBusinessPosts(transformed);
            } catch (error) {
                console.error("Error loading business posts:", error);
                setBusinessPosts([]);
            } finally {
                if (alive) setPostsLoading(false);
            }
        };
        
        if (businessEntityId || businessId) {
            loadBusinessPosts();
        }
        
        return () => { alive = false; };
    }, [businessEntityId, businessId, t]);

    useEffect(() => {
        const fetchDJ = async () => {
            console.log("🎧 useParams businessId:", businessId);
            try {
                const res = await businessApi.getBusinessById(businessId);
                console.log("✅ API getBusinessById:", res);

                if (res.status === "success" && res.data) {
                    const data = res.data;
                    console.log("🔍 Full API response data:", data);
                    console.log("🔍 addressData:", data.addressData);
                    console.log("🔍 Address:", data.Address);
                    
                    // Set business entity ID for followers/following
                    // Prioritize EntityAccountId for consistency with follow system
                    const entityAccountId = data.EntityAccountId || data.entityAccountId;
                    if (entityAccountId || data.id) {
                        setBusinessEntityId(entityAccountId || data.id);
                    }

                    // Map gender from Vietnamese to English if needed
                    const mapGender = (gender) => {
                        if (!gender) return '';
                        const genderLower = gender.toLowerCase();
                        if (genderLower === 'nam' || genderLower === 'male') return 'male';
                        if (genderLower === 'nữ' || genderLower === 'female') return 'female';
                        if (genderLower === 'khác' || genderLower === 'other') return 'other';
                        return gender; // Return as-is if unknown format
                    };

                    // 🔥 Chuẩn hóa key từ PascalCase -> camelCase
                    const mappedData = {
                        userName: data.UserName,
                        role: data.Role,
                        avatar: data.Avatar,
                        background: data.Background,
                        address: data.Address,
                        phone: data.Phone,
                        bio: data.Bio,
                        gender: mapGender(data.Gender),
                        pricePerHours: data.PricePerHours,
                        pricePerSession: data.PricePerSession,
                    };

                    setProfile(mappedData);
                    
                    const resolvedBusinessAccountId =
                        data.BussinessAccountId ||
                        data.BusinessAccountId ||
                        data.BusinessId ||
                        data.businessAccountId ||
                        null;
                    setBusinessAccountId(resolvedBusinessAccountId);
                    
                    // Try to get addressData - could be object or JSON string
                    let addressDataObj = null;
                    if (data.addressData) {
                        if (typeof data.addressData === 'string') {
                            try {
                                addressDataObj = JSON.parse(data.addressData);
                            } catch (e) {
                                console.error('Failed to parse addressData string:', e);
                            }
                        } else {
                            addressDataObj = data.addressData;
                        }
                    }
                    
                    console.log("🔍 Parsed addressDataObj:", addressDataObj);
                    
                    // Load structured address data if available
                    if (addressDataObj && addressDataObj.provinceId) {
                        console.log("✅ Loading address with provinceId:", addressDataObj.provinceId);
                        setSelectedProvinceId(addressDataObj.provinceId);
                        try {
                            await locationApi.getDistricts(addressDataObj.provinceId);
                            
                            if (addressDataObj.districtId) {
                                console.log("✅ Loading district:", addressDataObj.districtId);
                                setSelectedDistrictId(addressDataObj.districtId);
                                try {
                                    await locationApi.getWards(addressDataObj.districtId);
                                    
                                    if (addressDataObj.wardId) {
                                        console.log("✅ Loading ward:", addressDataObj.wardId);
                                        setSelectedWardId(addressDataObj.wardId);
                                    }
                                } catch (error) {
                                    console.error('Failed to load wards:', error);
                                }
                            }
                        } catch (error) {
                            console.error('Failed to load districts:', error);
                        }
                        
                        // Extract address detail
                        if (addressDataObj.detail) {
                            setAddressDetail(addressDataObj.detail);
                        } else if (data.Address) {
                            // Try to extract from full address string
                            const fullAddr = data.Address;
                            const parts = fullAddr.split(', ');
                            if (parts.length > 3) {
                                setAddressDetail(parts.slice(0, -3).join(', '));
                            }
                        }
                    } else if (data.Address) {
                        // Fallback: try to parse address string if no addressData
                        console.log("⚠️ No addressData, trying to parse from Address string");
                        // This is a fallback, might not always work
                    }
                } else {
                    setError(res.message || "Không tải được hồ sơ DJ");
                }
            } catch (err) {
                console.error("❌ Lỗi tải DJ:", err);
                setError(err?.response?.data?.message || "Không tải được hồ sơ DJ");
            } finally {
                setLoading(false);
            }
        };

        fetchDJ();
    }, [businessId]);


    // Helper to display gender in Vietnamese
    const displayGender = (gender) => {
        if (!gender) return "Chưa cập nhật";
        const genderLower = gender.toLowerCase();
        if (genderLower === 'male') return 'Nam';
        if (genderLower === 'female') return 'Nữ';
        if (genderLower === 'other') return 'Khác';
        // If already in Vietnamese, return as-is
        return gender;
    };

    if (loading) return <div className="pp-container">{t('profile.loadingProfile')}</div>;
    if (error) return <div className="pp-container">{error}</div>;
    
    // Check if this is own profile: compare businessId (from URL) with activeBusinessId (businessId of current role)
    // Similar to how BarProfile checks activeBarPageId
    const isOwnProfile = activeBusinessId && businessId && String(activeBusinessId).toLowerCase() === String(businessId).toLowerCase();

    const renderTabContent = () => {
        switch (activeTab) {
            case "info":
                return (
                    <div className={cn("flex flex-col gap-6")}>
                        {/* Price Highlight Section */}
                        {(profile.pricePerHours || profile.pricePerSession) && (
                            <div className={cn(
                                "bg-gradient-to-br from-primary/20 to-primary/5",
                                "rounded-lg p-6 border-[0.5px] border-primary/30",
                                "shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                            )}>
                                <h3 className={cn("text-xl font-bold text-foreground mb-4 flex items-center gap-2")}>
                                    <DollarSign className="w-5 h-5" />
                                    {t('profile.priceTable')}
                                </h3>
                                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4")}>
                                    {profile.pricePerHours && (
                                        <div className={cn(
                                            "bg-card rounded-lg p-4 border border-border/20"
                                        )}>
                                            <p className={cn("text-sm text-muted-foreground mb-1")}>
                                                {t('profile.pricePerHour')}
                                            </p>
                                            <p className={cn("text-2xl font-bold text-primary")}>
                                                {parseInt(profile.pricePerHours || 0).toLocaleString('vi-VN')} đ
                                            </p>
                                        </div>
                                    )}
                                    {profile.pricePerSession && (
                                        <div className={cn(
                                            "bg-card rounded-lg p-4 border border-border/20"
                                        )}>
                                            <p className={cn("text-sm text-muted-foreground mb-1")}>
                                                {t('profile.pricePerSession')}
                                            </p>
                                            <p className={cn("text-2xl font-bold text-primary")}>
                                                {parseInt(profile.pricePerSession || 0).toLocaleString('vi-VN')} đ
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Info Card */}
                        <div className={cn(
                            "bg-card rounded-lg p-6 border-[0.5px] border-border/20",
                            "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        )}>
                            <h3 className={cn("text-lg font-semibold text-foreground mb-4")}>
                                {t('profile.about')}
                            </h3>
                            <div className={cn("space-y-3 text-sm")}>
                                {profile.bio && (
                                    <p className={cn("text-foreground whitespace-pre-wrap leading-relaxed")}>
                                        {profile.bio}
                                    </p>
                                )}
                                <div className={cn("space-y-2 text-muted-foreground")}>
                                    {profile.gender && (
                                        <p><strong className={cn("text-foreground")}>{t('profile.gender')}:</strong> {displayGender(profile.gender)}</p>
                                    )}
                                    {profile.address && (
                                        <p><strong className={cn("text-foreground")}>{t('profile.address')}:</strong> {profile.address}</p>
                                    )}
                                    {profile.phone && (
                                        <p><strong className={cn("text-foreground")}>{t('profile.phone')}:</strong> {profile.phone}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "posts":
                return (
                    <div className="flex flex-col gap-6">
                        {postsLoading ? (
                            <div className={cn("text-center py-12 text-muted-foreground")}>
                                {t('common.loading')}
                            </div>
                        ) : businessPosts && businessPosts.length > 0 ? (
                            <div className={cn("space-y-4")}>
                                {businessPosts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
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
                    </div>
                );

            case "music": {
                // Filter posts that have music (musicId, audioSrc, or type is music)
                const musicPosts = businessPosts.filter(post => {
                    return post.audioSrc || 
                           post.audioTitle || 
                           post.purchaseLink ||
                           post.targetType === "music" ||
                           (post.medias?.audios && post.medias.audios.length > 0);
                });
                
                return (
                    <div className={cn("flex flex-col gap-6")}>
                        {postsLoading ? (
                            <div className={cn("text-center py-12 text-muted-foreground")}>
                                {t('common.loading')}
                            </div>
                        ) : musicPosts && musicPosts.length > 0 ? (
                            <div className={cn("space-y-4")}>
                                {musicPosts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={cn(
                                "text-center py-12 text-muted-foreground",
                                "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
                            )}>
                                <div className={cn("flex items-center justify-center gap-2 mb-2")}>
                                    <Music2 className="w-5 h-5" />
                                    <p>{t('profile.musicTab')}</p>
                                </div>
                                <p className={cn("text-sm mt-2")}>Chưa có bài nhạc nào</p>
                            </div>
                        )}
                    </div>
                );
            }

            case "reviews":
                return (
                    <div className={cn("flex flex-col gap-6")}>
                        {businessAccountId && (
                            <PerformerReviews
                                businessAccountId={businessAccountId}
                                performerName={profile.userName}
                                performerRole={profile.role || "DJ"}
                                isOwnProfile={isOwnProfile}
                                allowSubmission={true}
                            />
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

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

                {/* Action Buttons */}
                {isOwnProfile && (
                    <div className={cn("absolute top-4 right-4 z-10")}>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className={cn(
                                "px-4 py-2 rounded-lg font-semibold text-sm",
                                "bg-card/80 backdrop-blur-sm text-foreground border-none",
                                "hover:bg-card/90 transition-all duration-200",
                                "active:scale-95",
                                "flex items-center gap-2"
                            )}
                        >
                            <Edit className="w-4 h-4" />
                            <span>{t('profile.editProfile')}</span>
                        </button>
                    </div>
                )}

                {/* Profile Info Overlay */}
                <div className={cn("absolute bottom-0 left-0 right-0 p-4 md:p-6")}>
                    <div className={cn("flex items-end gap-3 md:gap-4")}>
                        {/* Avatar */}
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
                                {profile.userName || "DJ"}
                            </h1>
                            <div className={cn(
                                "text-xs md:text-sm text-primary-foreground/90",
                                "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                            )}>
                                {profile.role || "DJ"}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Container */}
            <div className={cn("max-w-6xl mx-auto px-4 md:px-6 py-6")}>
                {/* Stats Bar */}
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
                            {followers.length}
                        </span>
                        <span className={cn(
                            "text-[11px] md:text-xs text-muted-foreground",
                            "font-medium uppercase tracking-wider",
                            "group-hover:text-foreground/80 transition-colors duration-200"
                        )}>
                            {t("publicProfile.followers")}
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
                            {t("publicProfile.following")}
                        </span>
                    </button>
                </section>

            {/* Tabs Section */}
            <section className={cn("py-6 max-w-6xl mx-auto px-4 md:px-6")}>
                {/* Tabs Navigation */}
                <div className={cn("flex items-center gap-1 mb-6 border-b border-border/30 overflow-x-auto")}>
                    <button
                        onClick={() => setActiveTab("info")}
                        className={cn(
                            "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                            "transition-all duration-200 relative whitespace-nowrap",
                            activeTab === "info"
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('profile.infoTab')}
                        {activeTab === "info" && (
                            <span className={cn(
                                "absolute bottom-0 left-0 right-0 h-0.5",
                                "bg-primary"
                            )} />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={cn(
                            "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                            "transition-all duration-200 relative whitespace-nowrap",
                            activeTab === "posts"
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('profile.postsTab')}
                        {activeTab === "posts" && (
                            <span className={cn(
                                "absolute bottom-0 left-0 right-0 h-0.5",
                                "bg-primary"
                            )} />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("music")}
                        className={cn(
                            "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                            "transition-all duration-200 relative whitespace-nowrap",
                            activeTab === "music"
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('profile.musicTab')}
                        {activeTab === "music" && (
                            <span className={cn(
                                "absolute bottom-0 left-0 right-0 h-0.5",
                                "bg-primary"
                            )} />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("reviews")}
                        className={cn(
                            "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                            "transition-all duration-200 relative whitespace-nowrap",
                            activeTab === "reviews"
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('profile.reviewsTab')}
                        {activeTab === "reviews" && (
                            <span className={cn(
                                "absolute bottom-0 left-0 right-0 h-0.5",
                                "bg-primary"
                            )} />
                        )}
                    </button>
                </div>
                {/* Tab Content */}
                {renderTabContent()}
            </section>
            </div>
            
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-2xl font-semibold mb-5 text-center">{t('profile.editDJ')}</h3>
                        
                        <div className="space-y-6">
                            {/* Avatar */}
                            <div className="flex justify-between items-center border-b pb-3">
                                <div className="flex items-center gap-4">
                                    <img src={profile.avatar || "https://via.placeholder.com/100"} alt="Avatar" className="w-20 h-20 rounded-full object-cover border" />
                                    <div>
                                        <p className="font-medium text-lg">Ảnh đại diện</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingField(editingField === "avatar" ? null : "avatar")}
                                    className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                                >
                                    {editingField === "avatar" ? t('profile.close') : t('profile.editProfile')}
                                </button>
                            </div>
                            {editingField === "avatar" && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        placeholder="Nhập link ảnh đại diện..."
                                        value={profile.avatar}
                                        onChange={(e) => setProfile(prev => ({ ...prev, avatar: e.target.value }))}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>
                            )}
                            
                            {/* Background */}
                            <div className="flex justify-between items-center border-b pb-3">
                                <div className="flex items-center gap-4">
                                    <img src={profile.background || "https://i.imgur.com/6IUbEMn.jpg"} alt="Background" className="w-24 h-16 rounded-lg object-cover border" />
                                    <div>
                                        <p className="font-medium text-lg">Ảnh bìa</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingField(editingField === "background" ? null : "background")}
                                    className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                                >
                                    {editingField === "background" ? t('profile.close') : t('profile.editProfile')}
                                </button>
                            </div>
                            {editingField === "background" && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        placeholder="Nhập link ảnh bìa..."
                                        value={profile.background}
                                        onChange={(e) => setProfile(prev => ({ ...prev, background: e.target.value }))}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>
                            )}
                            
                            {/* Info */}
                            <div className="flex justify-between items-start border-b pb-3">
                                <div>
                                    <p className="font-medium text-lg mb-1">{t('profile.about')}</p>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p><strong>Tên:</strong> {profile.userName || "Chưa có tên"}</p>
                                        <p><strong>Địa chỉ:</strong> {profile.address || "Chưa có địa chỉ"}</p>
                                        <p><strong>Điện thoại:</strong> {profile.phone || "Chưa có"}</p>
                                        <p><strong>Giới tính:</strong> {displayGender(profile.gender)}</p>
                                        <p><strong>Giá/giờ:</strong> {profile.pricePerHours || 0} đ</p>
                                        <p><strong>Giá/buổi:</strong> {profile.pricePerSession || 0} đ</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingField(editingField === "info" ? null : "info")}
                                    className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium self-start"
                                >
                                    {editingField === "info" ? t('profile.close') : t('profile.editProfile')}
                                </button>
                            </div>
                            
                            {editingField === "info" && (
                                <div className="mt-3 space-y-3">
                                    <label className="block">
                                        <span className="text-sm font-medium">Tên:</span>
                                        <input
                                            type="text"
                                            value={profile.userName || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, userName: e.target.value }))}
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
                                    <span className="text-sm font-medium">{t('profile.phone')}:</span>
                                        <input
                                            type="text"
                                            value={profile.phone || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.gender')}:</span>
                                        <select
                                            value={profile.gender || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        >
                                            <option value="">Chọn giới tính</option>
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.pricePerHour')} (VNĐ):</span>
                                        <input
                                            type="number"
                                            value={profile.pricePerHours || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, pricePerHours: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.pricePerSession')} (VNĐ):</span>
                                        <input
                                            type="number"
                                            value={profile.pricePerSession || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, pricePerSession: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.bio')}:</span>
                                        <textarea
                                            rows={3}
                                            value={profile.bio || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                </div>
                            )}
                            
                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    disabled={saving}
                                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                >
                                    {t('profile.close')}
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setSaving(true);
                                            
                                            const formData = new FormData();
                                            formData.append('entityId', businessId);
                                            formData.append('userName', profile.userName || '');
                                            formData.append('phone', profile.phone || '');
                                            formData.append('bio', profile.bio || '');
                                            formData.append('gender', profile.gender || '');
                                            formData.append('pricePerHours', profile.pricePerHours || 0);
                                            formData.append('pricePerSession', profile.pricePerSession || 0);
                                            
                                            // Build fullAddress from current states or use profile.address
                                            let fullAddress = profile.address || '';
                                            
                                            // If we have location selections, build address from them
                                            if (selectedProvinceId || selectedDistrictId || selectedWardId || addressDetail) {
                                                const parts = [];
                                                if (addressDetail) parts.push(addressDetail);
                                                
                                                // Fetch names for IDs to build full address (order: detail, ward, district, province)
                                                if (selectedProvinceId) {
                                                    try {
                                                        // Get province name
                                                        const provinces = await locationApi.getProvinces();
                                                        const selectedProvince = provinces.find(p => p.id === selectedProvinceId);
                                                        
                                                        // Get district name if district is selected
                                                        if (selectedDistrictId) {
                                                            const districts = await locationApi.getDistricts(selectedProvinceId);
                                                            const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
                                                            
                                                            // Get ward name if ward is selected
                                                            if (selectedWardId) {
                                                                const wards = await locationApi.getWards(selectedDistrictId);
                                                                const selectedWard = wards.find(w => w.id === selectedWardId);
                                                                if (selectedWard) parts.push(selectedWard.name);
                                                            }
                                                            
                                                            if (selectedDistrict) parts.push(selectedDistrict.name);
                                                        }
                                                        
                                                        if (selectedProvince) parts.push(selectedProvince.name);
                                                    } catch (e) {
                                                        console.error('Failed to build address from IDs:', e);
                                                        // Fallback to profile.address if build fails
                                                        fullAddress = profile.address || '';
                                                    }
                                                }
                                                
                                                if (parts.length > 0) {
                                                    fullAddress = parts.join(', ');
                                                }
                                            }
                                            
                                            // Send structured address data
                                            if (selectedProvinceId || selectedDistrictId || selectedWardId) {
                                                formData.append('addressData', JSON.stringify({
                                                    provinceId: selectedProvinceId || null,
                                                    districtId: selectedDistrictId || null,
                                                    wardId: selectedWardId || null,
                                                    fullAddress: fullAddress,
                                                    detail: addressDetail || null
                                                }));
                                                formData.append('address', fullAddress);
                                            } else {
                                                formData.append('address', fullAddress || profile.address || '');
                                            }
                                            
                                            // Send avatar and background URLs
                                            if (profile.avatar) formData.append('avatar', profile.avatar);
                                            if (profile.background) formData.append('background', profile.background);
                                            
                                            const res = await businessApi.upload(formData);
                                            
                                            if (res.status === "success") {
                                                // Reload profile
                                                const reloadRes = await businessApi.getBusinessById(businessId);
                                                if (reloadRes.status === "success" && reloadRes.data) {
                                                    const data = reloadRes.data;
                                                    
                                                    // Map gender from Vietnamese to English if needed
                                                    const mapGender = (gender) => {
                                                        if (!gender) return '';
                                                        const genderLower = gender.toLowerCase();
                                                        if (genderLower === 'nam' || genderLower === 'male') return 'male';
                                                        if (genderLower === 'nữ' || genderLower === 'female') return 'female';
                                                        if (genderLower === 'khác' || genderLower === 'other') return 'other';
                                                        return gender; // Return as-is if unknown format
                                                    };
                                                    
                                                    setProfile({
                                                        userName: data.UserName,
                                                        role: data.Role,
                                                        avatar: data.Avatar,
                                                        background: data.Background,
                                                        address: data.Address,
                                                        phone: data.Phone,
                                                        bio: data.Bio,
                                                        gender: mapGender(data.Gender),
                                                        pricePerHours: data.PricePerHours,
                                                        pricePerSession: data.PricePerSession,
                                                    });
                                                    
                                                    // Reload address data
                                                    let reloadAddressDataObj = null;
                                                    if (data.addressData) {
                                                        if (typeof data.addressData === 'string') {
                                                            try {
                                                                reloadAddressDataObj = JSON.parse(data.addressData);
                                                            } catch (e) {
                                                                console.error('Failed to parse addressData string on reload:', e);
                                                            }
                                                        } else {
                                                            reloadAddressDataObj = data.addressData;
                                                        }
                                                    }
                                                    
                                                    if (reloadAddressDataObj && reloadAddressDataObj.provinceId) {
                                                        setSelectedProvinceId(reloadAddressDataObj.provinceId);
                                                        try {
                                                            await locationApi.getDistricts(reloadAddressDataObj.provinceId);
                                                            
                                                            if (reloadAddressDataObj.districtId) {
                                                                setSelectedDistrictId(reloadAddressDataObj.districtId);
                                                                try {
                                                                    await locationApi.getWards(reloadAddressDataObj.districtId);
                                                                    
                                                                    if (reloadAddressDataObj.wardId) {
                                                                        setSelectedWardId(reloadAddressDataObj.wardId);
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Failed to load wards on reload:', error);
                                                                }
                                                            }
                                                        } catch (error) {
                                                            console.error('Failed to load districts on reload:', error);
                                                        }
                                                        
                                                        // Extract address detail
                                                        if (reloadAddressDataObj.detail) {
                                                            setAddressDetail(reloadAddressDataObj.detail);
                                                        } else if (data.Address) {
                                                            const fullAddr = data.Address;
                                                            const parts = fullAddr.split(', ');
                                                            if (parts.length > 3) {
                                                                setAddressDetail(parts.slice(0, -3).join(', '));
                                                            }
                                                        }
                                                    }
                                                }
                                                alert("Đã lưu thay đổi!");
                                                setShowEditModal(false);
                                            } else {
                                                alert("Lưu thất bại: " + (res.message || "Lỗi không xác định"));
                                            }
                                        } catch (error) {
                                            console.error("Error saving DJ profile:", error);
                                            alert("Lưu thất bại: " + (error.response?.data?.message || error.message));
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#a78bfa] text-white rounded-lg hover:bg-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? t('profile.saving') : t('profile.saveChanges')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
