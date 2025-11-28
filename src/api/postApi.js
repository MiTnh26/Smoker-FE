
import axiosClient from "./axiosClient";

// Lấy danh sách post
// params can include:
//   - includeMedias, includeMusic: boolean flags
//   - cursor: base64 encoded cursor string for cursor-based pagination
//   - page, limit: for backward compatibility (offset-based pagination)
// Returns: { success, data, nextCursor, hasMore, pagination }
export const getPosts = (params) => axiosClient.get("/posts", { params });

// Lấy post theo id (supports includeMedias/includeMusic)
export const getPostById = (id, params) => axiosClient.get(`/posts/${id}`, { params });

// Tạo post mới
export const createPost = (data) => axiosClient.post("/posts", data);

// Cập nhật post
export const updatePost = (id, data) => axiosClient.put(`/posts/${id}`, data);

// Xóa post
export const deletePost = (id) => axiosClient.delete(`/posts/${id}`);

// Like post
export const likePost = (postId, data) => axiosClient.post(`/posts/${postId}/like`, data);

// Bỏ like post
export const unlikePost = (postId, data = {}) =>
  axiosClient.delete(`/posts/${postId}/like`, { data });

// Thêm comment
export const addComment = (postId, data) => axiosClient.post(`/posts/${postId}/comments`, data);

// Cập nhật comment
export const updateComment = (postId, commentId, data) => axiosClient.put(`/posts/${postId}/comments/${commentId}`, data);

// Xóa comment
export const deleteComment = (postId, commentId, data = {}) =>
  axiosClient.delete(`/posts/${postId}/comments/${commentId}`, { data });

// Like comment
export const likeComment = (postId, commentId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/like`, data);

// Bỏ like comment
export const unlikeComment = (postId, commentId, data = {}) => axiosClient.delete(`/posts/${postId}/comments/${commentId}/like`, { data });

// Thêm reply vào comment
export const addReply = (postId, commentId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/replies`, data);

// Thêm reply vào reply
export const addReplyToReply = (postId, commentId, replyId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/replies/${replyId}`, data);

// Cập nhật reply
export const updateReply = (postId, commentId, replyId, data) => axiosClient.put(`/posts/${postId}/comments/${commentId}/replies/${replyId}`, data);

// Xóa reply
export const deleteReply = (postId, commentId, replyId, data = {}) =>
  axiosClient.delete(`/posts/${postId}/comments/${commentId}/replies/${replyId}`, { data });

// Like reply
export const likeReply = (postId, commentId, replyId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, data);

// Bỏ like reply
export const unlikeReply = (postId, commentId, replyId, data = {}) => axiosClient.delete(`/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, { data });

// Tìm kiếm post
export const searchPosts = (params) => axiosClient.get("/posts/search", { params });

// Tìm kiếm post theo title
export const searchPostsByTitle = (params) => axiosClient.get("/posts/search/title", { params });

// Tìm kiếm post theo author
export const searchPostsByAuthor = (params) => axiosClient.get("/posts/search/author", { params });

// Get posts by author entity id (public)
export const getPostsByAuthor = (authorId, params) => axiosClient.get(`/posts/author/${authorId}`, { params });

// Upload media for posts (images, videos, audio)
export const uploadPostMedia = (formData) => axiosClient.post("/posts/upload", formData, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

// Get media details by ID
export const getMediaById = (mediaId) => axiosClient.get(`/medias/${mediaId}`);

// Get media details by postId and URL
export const getMediaByUrl = (postId, url) => {
  const params = { url };
  if (postId) params.postId = postId;
  return axiosClient.get("/medias/by-url", { params });
};

// Track post view (tăng số lượt xem)
export const trackPostView = (postId) => axiosClient.post(`/posts/${postId}/view`);

// Track post share (tăng số lượt share)
export const trackPostShare = (postId) => axiosClient.post(`/posts/${postId}/share`);

// Trash post (ẩn bài viết)
export const trashPost = (postId, data) => axiosClient.post(`/posts/${postId}/trash`, data);

// Restore post (khôi phục bài viết)
export const restorePost = (postId, data) => axiosClient.post(`/posts/${postId}/restore`, data);

// Lấy posts đã trash
export const getTrashedPosts = (params) => axiosClient.get("/posts/trash", { params });

// ========== MEDIA-SPECIFIC APIs ==========

// Like media
export const likeMedia = (mediaId, data) => axiosClient.post(`/medias/${mediaId}/like`, data);

// Unlike media
export const unlikeMedia = (mediaId) => axiosClient.delete(`/medias/${mediaId}/like`);

// Track media share
export const trackMediaShare = (mediaId) => axiosClient.post(`/medias/${mediaId}/share`);

// Add comment to media
export const addMediaComment = (mediaId, data) => axiosClient.post(`/medias/${mediaId}/comments`, data);

// Update comment on media
export const updateMediaComment = (mediaId, commentId, data) => axiosClient.put(`/medias/${mediaId}/comments/${commentId}`, data);

// Delete comment from media
export const deleteMediaComment = (mediaId, commentId) => axiosClient.delete(`/medias/${mediaId}/comments/${commentId}`);

// Like comment on media
export const likeMediaComment = (mediaId, commentId, data) => axiosClient.post(`/medias/${mediaId}/comments/${commentId}/like`, data);

// Unlike comment on media
export const unlikeMediaComment = (mediaId, commentId, data = {}) => axiosClient.delete(`/medias/${mediaId}/comments/${commentId}/like`, { data });

// Add reply to comment on media
export const addMediaCommentReply = (mediaId, commentId, data) => axiosClient.post(`/medias/${mediaId}/comments/${commentId}/replies`, data);

// Add reply to reply on media (nested reply)
export const addMediaReplyToReply = (mediaId, commentId, replyId, data) => axiosClient.post(`/medias/${mediaId}/comments/${commentId}/replies/${replyId}`, data);

// Update reply on media
export const updateMediaReply = (mediaId, commentId, replyId, data) => axiosClient.put(`/medias/${mediaId}/comments/${commentId}/replies/${replyId}`, data);

// Delete reply from media
export const deleteMediaReply = (mediaId, commentId, replyId) => axiosClient.delete(`/medias/${mediaId}/comments/${commentId}/replies/${replyId}`);

// Like reply on media
export const likeMediaReply = (mediaId, commentId, replyId, data) => axiosClient.post(`/medias/${mediaId}/comments/${commentId}/replies/${replyId}/like`, data);

// Unlike reply on media
export const unlikeMediaReply = (mediaId, commentId, replyId, data = {}) => axiosClient.delete(`/medias/${mediaId}/comments/${commentId}/replies/${replyId}/like`, { data });