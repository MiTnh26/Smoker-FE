import axiosClient from "./axiosClient";

const songApi = {
  // Lấy tất cả bài hát
  getSongs: () => {
    console.log("Fetching songs...", axiosClient.get("/song/"));
    return axiosClient.get("/song/");
  },
  // Stream nhạc theo filename (legacy)
  getSongStreamUrl: (filename) => {
    return `${process.env.REACT_APP_API_URL || "http://localhost:9999/api"}/song/stream/${filename}`;
  },
  // Stream nhạc theo GridFS file id (ưu tiên)
  getSongStreamUrlById: (fileId) => {
    return `${process.env.REACT_APP_API_URL || "http://localhost:9999/api"}/song/stream-id/${fileId}`;
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
