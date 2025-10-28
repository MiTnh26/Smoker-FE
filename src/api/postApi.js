
import axiosClient from "./axiosClient";

// Lấy danh sách post
export const getPosts = (params) => axiosClient.get("/posts", { params });

// Lấy post theo id
export const getPostById = (id) => axiosClient.get(`/posts/${id}`);

// Tạo post mới
export const createPost = (data) => axiosClient.post("/posts", data);

// Cập nhật post
export const updatePost = (id, data) => axiosClient.put(`/posts/${id}`, data);

// Xóa post
export const deletePost = (id) => axiosClient.delete(`/posts/${id}`);

// Like post
export const likePost = (postId, data) => axiosClient.post(`/posts/${postId}/like`, data);

// Bỏ like post
export const unlikePost = (postId) => axiosClient.delete(`/posts/${postId}/like`);

// Thêm comment
export const addComment = (postId, data) => axiosClient.post(`/posts/${postId}/comments`, data);

// Xóa comment
export const deleteComment = (postId, commentId) => axiosClient.delete(`/posts/${postId}/comments/${commentId}`);

// Like comment
export const likeComment = (postId, commentId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/like`, data);

// Bỏ like comment
export const unlikeComment = (postId, commentId) => axiosClient.delete(`/posts/${postId}/comments/${commentId}/like`);

// Thêm reply vào comment
export const addReply = (postId, commentId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/replies`, data);

// Thêm reply vào reply
export const addReplyToReply = (postId, commentId, replyId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/replies/${replyId}`, data);

// Xóa reply
export const deleteReply = (postId, commentId, replyId) => axiosClient.delete(`/posts/${postId}/comments/${commentId}/replies/${replyId}`);

// Like reply
export const likeReply = (postId, commentId, replyId, data) => axiosClient.post(`/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, data);

// Bỏ like reply
export const unlikeReply = (postId, commentId, replyId) => axiosClient.delete(`/posts/${postId}/comments/${commentId}/replies/${replyId}/like`);

// Tìm kiếm post
export const searchPosts = (params) => axiosClient.get("/posts/search", { params });

// Tìm kiếm post theo title
export const searchPostsByTitle = (params) => axiosClient.get("/posts/search/title", { params });

// Tìm kiếm post theo author
export const searchPostsByAuthor = (params) => axiosClient.get("/posts/search/author", { params });
