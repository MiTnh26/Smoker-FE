
import axiosClient from "./axiosClient";

// Lấy danh sách story
export const getStories = (params) => axiosClient.get("/stories", { params });

// Lấy story theo id
export const getStoryById = (id) => axiosClient.get(`/stories/${id}`);

// Tạo story mới
export const createStory = (data) => axiosClient.post("/stories", data);

// Cập nhật story
export const updateStory = (id, data) => axiosClient.put(`/stories/${id}`, data);

// Xóa story
export const deleteStory = (id, entityAccountId) => {
  const config = {};
  if (entityAccountId) {
    // Try sending in query params
    config.params = { entityAccountId };
    // Also try sending in body (some backends require this for DELETE)
    // Note: Some axios versions don't support body in DELETE, but we'll try
    try {
      config.data = { entityAccountId };
    } catch (e) {
      // Ignore if body not supported
    }
  }
  return axiosClient.delete(`/stories/${id}`, config);
};

// Đánh dấu một story đã được xem
export const markStoryAsViewed = (storyId, entityAccountId) => 
  axiosClient.post(`/stories/${storyId}/view`, { entityAccountId });

// Đánh dấu nhiều stories đã được xem (batch)
export const markStoriesAsViewed = (storyIds, entityAccountId) => 
  axiosClient.post("/stories/view", { storyIds, entityAccountId });

// Lấy danh sách story IDs đã được xem (optional)
export const getViewedStories = (entityAccountId) => 
  axiosClient.get("/stories/viewed", { params: { entityAccountId } });

// Lấy danh sách người đã xem story
export const getStoryViewers = (storyId) => 
  axiosClient.get(`/stories/${storyId}/viewers`);

// Like story
export const likeStory = (storyId, data) => axiosClient.post(`/stories/${storyId}/like`, data);

// Unlike story
export const unlikeStory = (storyId) => axiosClient.delete(`/stories/${storyId}/like`);