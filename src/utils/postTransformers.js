/**
 * Shared utilities for transforming post data for display
 * Used across all profile pages (BarProfile, DJProfile, DancerProfile, PublicProfile, Customer Profile)
 */

import { getSession } from "./sessionManager";

/**
 * Check if a URL is an audio file
 */
export const isAudioUrl = (url) => {
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

/**
 * Normalize media array from various formats
 */
// eslint-disable-next-line complexity
export const normalizeMediaArray = (medias) => {
  const images = [];
  const videos = [];
  const audios = [];

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
      const value = medias[key];
      if (!value) continue;

      // Hỗ trợ cả dạng { images: [...], videos: [...], audios: [...] }
      if (Array.isArray(value)) {
        for (const mediaItem of value) {
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
      } else {
        const mediaItem = value;
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
  }
  return { images, videos, audios };
};

/**
 * Count collection items (array, Map, object, number)
 */
export const countCollection = (value) => {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  if (value instanceof Map) return value.size;
  if (typeof value === "object") return Object.keys(value).length;
  if (typeof value === "number") return value;
  return 0;
};

/**
 * Format post time relative to now
 */
export const formatPostTime = (value, t) => {
  try {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
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

/**
 * Extract audio source from post music data
 */
const extractAudioFromMusic = (music) => {
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
};

/**
 * Extract audio from medias array
 */
// eslint-disable-next-line complexity
const extractAudioFromMedias = (medias) => {
  if (Array.isArray(medias)) {
    for (const mediaItem of medias) {
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      if (url && isAudioUrl(url)) return url;
    }
  } else if (medias && typeof medias === "object") {
    for (const key of Object.keys(medias)) {
      const mediaItem = medias[key];
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      if (url && isAudioUrl(url)) return url;
    }
  }
  return null;
};

const normalizeGuid = (value) => {
  if (!value) return null;
  return String(value).trim().toUpperCase();
};

const normalizeEntityAccountId = normalizeGuid;

const resolveViewerEntityAccountId = (explicitId) => {
  const normalizedExplicit = normalizeEntityAccountId(explicitId);
  if (normalizedExplicit) return normalizedExplicit;

  try {
    const session = getSession();
    return normalizeEntityAccountId(
      session?.activeEntity?.EntityAccountId ||
      session?.activeEntity?.entityAccountId ||
      session?.account?.EntityAccountId ||
      session?.account?.entityAccountId
    );
  } catch (error) {
    console.warn("[postTransformers] Failed to read session for viewer entity:", error);
    return null;
  }
};

const extractLikeEntityId = (like) => {
  if (!like) return null;
  if (typeof like === "string") return normalizeEntityAccountId(like);
  if (typeof like === "object") {
    return normalizeEntityAccountId(
      like.entityAccountId ||
      like.EntityAccountId
    );
  }
  return null;
};

// Chỉ dùng EntityAccountId để xác định likedByViewer
const isLikedByViewer = (likes, viewerEntityAccountId) => {
  if (!likes || !viewerEntityAccountId) return false;
  const viewer = normalizeEntityAccountId(viewerEntityAccountId);
  if (!viewer) return false;

  const match = (like, key) => {
    if (normalizeEntityAccountId(key) === viewer) return true;
    return extractLikeEntityId(like) === viewer;
  };

  if (Array.isArray(likes)) return likes.some(like => extractLikeEntityId(like) === viewer);
  if (likes instanceof Map) {
    for (const [k, v] of likes.entries()) if (match(v, k)) return true;
    return false;
  }
  if (typeof likes === "object") return Object.entries(likes).some(([k, v]) => match(v, k));
  return false;
};

// Không còn dùng accountId để quyết định quyền canManage,
// chỉ so sánh theo EntityAccountId (ownerEntityAccountId vs viewerEntityAccountId)

/**
 * Map post data to PostCard format
 * This is the main transformation function used across all profile pages
 * Updated to use new DTO schema: author, medias, stats, originalPost, topComments
 */
// eslint-disable-next-line complexity
export const mapPostForCard = (post, t, viewerEntityAccountId) => {
  // Support both new DTO schema and legacy schema for backward compatibility
  const id = post.id || post._id || post.postId;
  
  // Read from new DTO schema (author object)
  const author = post.author || post.account || {};
  const authorName = author.name || post.authorName || author.userName || post.user || t("common.user");
  const authorAvatar = author.avatar || post.authorAvatar || post.avatar || null;
  
  // Read medias from new DTO schema (clean array) or legacy format
  const mediasArray = post.medias || post.mediaIds || [];
  const mediaFromPost = normalizeMediaArray(mediasArray);
  
  // Legacy support: also check old format
  const mediaFromMediaIds = normalizeMediaArray(post.mediaIds);

  // Merge và loại trùng media theo (id|url) để tránh duplicate ảnh/video/audio
  const dedupeMedia = (items) => {
    const seen = new Set();
    const result = [];
    for (const item of items) {
      if (!item) continue;
      const key = `${item.id || item._id || ""}|${item.url || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return result;
  };

  const images = dedupeMedia([
    ...mediaFromPost.images,
    ...mediaFromMediaIds.images,
  ]);
  const videos = dedupeMedia([
    ...mediaFromPost.videos,
    ...mediaFromMediaIds.videos,
  ]);
  const audios = dedupeMedia([
    ...mediaFromPost.audios,
    ...mediaFromMediaIds.audios,
  ]);

  const resolvedViewerEntityId = resolveViewerEntityAccountId(viewerEntityAccountId);

  // Read music from new DTO schema (music object) or legacy format
  const music = post.music || post.musicId || {};
  const audioFromMusic = extractAudioFromMusic(music);
  const audioFromMedias = extractAudioFromMedias(mediasArray);
  const audioSrc = audioFromMusic || audios[0]?.url || audioFromMedias || post.audioSrc || post.audioUrl || null;

  // Read stats from new DTO schema or legacy format
  const stats = post.stats || {};
  const likes = stats.likeCount !== undefined ? stats.likeCount : countCollection(post.likes);
  const comments = stats.commentCount !== undefined ? stats.commentCount : countCollection(post.comments);
  const shares = stats.shareCount !== undefined ? stats.shareCount : (post.shares || 0);
  const views =
    stats.viewCount !== undefined
      ? stats.viewCount
      : (typeof post.views === "number" ? post.views : 0);
  const trendingScore =
    typeof stats.trendingScore === "number"
      ? stats.trendingScore
      : (typeof post.trendingScore === "number" ? post.trendingScore : 0);
  const likedByCurrentUser =
    stats.isLikedByMe !== undefined
      ? stats.isLikedByMe
      : isLikedByViewer(post.likes, resolvedViewerEntityId, null);

  // Read author info from new DTO schema
  const ownerEntityAccountId = normalizeEntityAccountId(
    author.entityAccountId ||
    post.entityAccountId ||
    post.authorEntityAccountId ||
    author.EntityAccountId
  );

  const canManage =
    resolvedViewerEntityId &&
    ownerEntityAccountId &&
    resolvedViewerEntityId === ownerEntityAccountId;

  // Read topComments from new DTO schema
  const topComments = Array.isArray(post.topComments) ? post.topComments : [];

  // Handle originalPost (repost) - already in DTO format
  const originalPost = post.originalPost || null;
  const repostedFromId = post.repostedFromId || 
                         originalPost?.id || 
                         originalPost?._id || 
                         null;

  // Transform originalPost recursively if exists (to ensure createdAt and other fields are preserved)
  let transformedOriginalPost = null;
  if (originalPost) {
    transformedOriginalPost = mapPostForCard(originalPost, t, viewerEntityAccountId);
    // Ensure createdAt is preserved for time display (in case it was lost during transformation)
    if (originalPost.createdAt) {
      transformedOriginalPost.createdAt = originalPost.createdAt;
    }
  }

  return {
    id,
    user: authorName,
    avatar: authorAvatar,
    time: formatPostTime(post.createdAt, t),
    createdAt: post.createdAt || null, // Preserve createdAt for time formatting
    content: post.content || post.caption || post["Tiêu Đề"] || "",
    caption: post.caption || "",
    medias: { images, videos, audios: audioSrc ? [{ url: audioSrc }] : audios },
    image: images[0]?.url || null,
    videoSrc: videos[0]?.url || null,
    audioSrc: audioSrc,
    audioTitle: music.title || post.musicTitle || post["Tên Bài Nhạc"] || post.title || null,
    artistName: music.artistName || music.artist || post.artistName || post["Tên Nghệ Sĩ"] || authorName || null,
    thumbnail: music.thumbnailUrl || music.coverUrl || post.musicBackgroundImage || post["Ảnh Nền Bài Nhạc"] || post.thumbnail || null,
    purchaseLink: music.purchaseLink || post.purchaseLink || post.musicPurchaseLink || null,
    likes,
    likedByCurrentUser,
    // Include stats object so PostCard can read stats.isLikedByMe directly
    stats: {
      likeCount: likes,
      commentCount: comments,
      shareCount: shares,
      viewCount: views,
      trendingScore,
      isLikedByMe: likedByCurrentUser,
    },
    comments,
    topComments,
    shares,
    hashtags: post.hashtags || [],
    verified: !!post.verified,
    location: post.location || null,
    title: post.title || null,
    canManage,
    ownerEntityAccountId: author.entityAccountId || post.entityAccountId || post.authorEntityAccountId || null,
    entityAccountId: author.entityAccountId || post.entityAccountId || post.authorEntityAccountId || null,
    authorEntityAccountId: author.entityAccountId || post.authorEntityAccountId || post.entityAccountId || null,
    authorEntityId: author.entityId || post.authorEntityId || post.authorId || post.accountId || null,
    authorEntityType: author.entityType || post.authorEntityType || post.entityType || post.type || null,
    ownerAccountId: post.accountId || post.ownerAccountId || author.id || null,
    targetType: post.type || "post",
    repostedFromId,
    originalPost: transformedOriginalPost || originalPost,
    status: post.status || "public" // Map status từ post
  };
};

