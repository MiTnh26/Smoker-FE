
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
export const deleteStory = (id) => axiosClient.delete(`/stories/${id}`);
