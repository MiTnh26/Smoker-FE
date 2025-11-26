/**
 * Shared utilities for transforming post data for display
 * Used across all profile pages (BarProfile, DJProfile, DancerProfile, PublicProfile, Customer Profile)
 */

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

/**
 * Map post data to PostCard format
 * This is the main transformation function used across all profile pages
 */
// eslint-disable-next-line complexity
export const mapPostForCard = (post, t) => {
  const id = post._id || post.id || post.postId;
  const author = post.author || post.account || {};
  const mediaFromPost = normalizeMediaArray(post.medias);
  const mediaFromMediaIds = normalizeMediaArray(post.mediaIds);
  const images = [...mediaFromPost.images, ...mediaFromMediaIds.images];
  const videos = [...mediaFromPost.videos, ...mediaFromMediaIds.videos];
  const audios = [...mediaFromPost.audios, ...mediaFromMediaIds.audios];

  const resolveUserName = () =>
    post.authorName ||
    author.userName ||
    author.name ||
    post.user ||
    t("common.user");

  const resolveAvatar = () =>
    post.authorAvatar ||
    author.avatar ||
    post.avatar ||
    "https://via.placeholder.com/40";

  // Get audio from various sources
  const music = post.musicId || post.music || {};
  const audioFromMusic = extractAudioFromMusic(music);
  const audioFromMedias = extractAudioFromMedias(post.medias);
  const audioSrc = audioFromMusic || audios[0]?.url || audioFromMedias || post.audioSrc || post.audioUrl || null;

  return {
    id,
    user: resolveUserName(),
    avatar: resolveAvatar(),
    time: formatPostTime(post.createdAt, t),
    content: post.content || post.caption || post["Tiêu Đề"] || "",
    caption: post.caption || "",
    medias: { images, videos, audios: audioSrc ? [{ url: audioSrc }] : audios },
    image: images[0]?.url || null,
    videoSrc: videos[0]?.url || null,
    audioSrc: audioSrc,
    audioTitle: music.title || post.musicTitle || post["Tên Bài Nhạc"] || post.title || null,
    artistName: music.artist || post.artistName || post["Tên Nghệ Sĩ"] || post.authorName || post.user || null,
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
    // Repost fields - chỉ lưu ID, query lại khi hiển thị
    repostedFromId: post.repostedFromId || null
  };
};

