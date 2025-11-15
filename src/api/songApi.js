import axiosClient from "./axiosClient";

const songApi = {
  // Lấy tất cả bài hát
  getSongs: () => {
    console.log("Fetching songs...", axiosClient.get("/song/"));
    return axiosClient.get("/song/");
  },
  // Stream nhạc (trả về url, FE dùng <audio src=...>)
  getSongStreamUrl: (filename) => {
    return `http://localhost:9999/api/song/stream/${filename}`;
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
