import axiosClient from "./axiosClient";

// Get API base URL from environment or default
const getApiBaseUrl = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:9999/api";
  // Remove /api if it's already there (some env might have it)
  return apiUrl.replace(/\/api\/?$/, "");
};

const songApi = {
  // Lấy tất cả bài hát
  getSongs: () => {
    console.log("Fetching songs...", axiosClient.get("/song/"));
    return axiosClient.get("/song/");
  },
  // Stream nhạc (trả về url, FE dùng <audio src=...>)
  getSongStreamUrl: (filename) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/api/song/stream/${filename}`;
  },
  // Stream nhạc theo id (fallback dùng filename nếu BE không hỗ trợ id)
  getSongStreamUrlById: (idOrFilename) => {
    const baseUrl = getApiBaseUrl();
    if (!idOrFilename) return "";
    return `${baseUrl}/api/song/stream/${idOrFilename}`;
  },
  // Upload nhạc (formData: {file, ...})
  uploadSong: (formData) => {
    return axiosClient.post("/song/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Xóa bài hát
  deleteSong: (id) => {
    return axiosClient.delete(`/song/delete/${id}`);
  },
};

export default songApi;
