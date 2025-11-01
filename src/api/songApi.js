import axiosClient from "./axiosClient";

const songApi = {
  // Lấy tất cả bài hát
  getSongs: () => {
    return axiosClient.get("/api/song/");
  },
  // Stream nhạc (trả về url, FE dùng <audio src=...>)
  getSongStreamUrl: (filename) => {
    return `/api/song/stream/${filename}`;
  },
  // Upload nhạc (formData: {file, ...})
  uploadSong: (formData) => {
    return axiosClient.post("/api/song/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Xóa bài hát
  deleteSong: (id) => {
    return axiosClient.delete(`/api/song/delete/${id}`);
  },
};

export default songApi;
