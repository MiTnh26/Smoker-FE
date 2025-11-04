
import React, { useEffect, useState } from "react";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getPostById
} from "../../../api/postApi";

const ManagePost = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "", images: "", type: "post" });
  const [imageFile, setImageFile] = useState(null);
  const [postType, setPostType] = useState(null); // "media" or "music"
  const [mediaFormData, setMediaFormData] = useState({ title: "", content: "", images: {}, videos: {}, caption: "" });
  const [musicFormData, setMusicFormData] = useState({ 
    musicTitle: "", 
    artistName: "", 
    description: "", 
    hashTag: "", 
    musicPurchaseLink: "", 
    musicBackgroundImage: "",
    audioFile: null,
    audioUrl: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await getPosts();
      setPosts(res.data.data || []);
    } catch (err) {
      setError("Lỗi tải bài viết");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleMediaInputChange = (e) => {
    setMediaFormData({ ...mediaFormData, [e.target.name]: e.target.value });
  };

  const handleMusicInputChange = (e) => {
    setMusicFormData({ ...musicFormData, [e.target.name]: e.target.value });
  };

  const handleCreateMedia = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let data;
      if (imageFile) {
        data = new FormData();
        data.append("title", formData.title);
        data.append("content", formData.content);
        data.append("images", imageFile);
        data.append("type", "post");
      } else {
        data = { ...formData, images: formData.images || "", type: "post" };
      }
      await createPost(data);
      // Format data for image/video post
      const postData = {
        title: mediaFormData.title,
        content: mediaFormData.content,
        caption: mediaFormData.caption || mediaFormData.content,
        images: Object.keys(mediaFormData.images || {}).length > 0 ? mediaFormData.images : undefined,
        videos: Object.keys(mediaFormData.videos || {}).length > 0 ? mediaFormData.videos : undefined,
      };
      await createPost(postData);
      setShowForm(false);
      setFormData({ title: "", content: "", images: "", type: "post" });
      setImageFile(null);
      setPostType(null);
      setMediaFormData({ title: "", content: "", images: {}, videos: {}, caption: "" });
      fetchPosts();
    } catch (err) {
      setError("Tạo bài viết thất bại");
    }
    setLoading(false);
  };
  // Xử lý chọn file ảnh để gửi lên BE
  const handleFileChange = (e) => {}

  const handleCreateMusic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Format data for music post - like SoundCloud
      const postData = {
        title: musicFormData.musicTitle,
        content: musicFormData.description,
        caption: musicFormData.description,
        audios: {
          "1": {
            url: musicFormData.audioUrl,
            artist: musicFormData.artistName,
            thumbnail: musicFormData.musicBackgroundImage
          }
        },
        // Additional music fields
        musicTitle: musicFormData.musicTitle,
        artistName: musicFormData.artistName,
        description: musicFormData.description,
        hashTag: musicFormData.hashTag,
        musicPurchaseLink: musicFormData.musicPurchaseLink,
        musicBackgroundImage: musicFormData.musicBackgroundImage
      };
      await createPost(postData);
      setShowForm(false);
      setPostType(null);
      setMusicFormData({ 
        musicTitle: "", 
        artistName: "", 
        description: "", 
        hashTag: "", 
        musicPurchaseLink: "", 
        musicBackgroundImage: "",
        audioFile: null,
        audioUrl: ""
      });
      fetchPosts();
    } catch (err) {
      setError("Tạo bài nhạc thất bại");
    }
    setLoading(false);
  };
  // Hàm upload file lên Cloudinary (unsigned upload)
  const uploadToCloudinary = async (file, resourceType = "image") => {
    const url = `https://api.cloudinary.com/v1_1/dienwsyhr/${resourceType}/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_preset");
    formData.append("resource_type", resourceType);
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
    return res.json();
  };
  
  // Xử lý upload file ảnh/video lên Cloudinary
  const handleMediaFileChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setLoading(true);
      setError("");
      try {
        const uploadedImages = {};
        const uploadedVideos = {};
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const resourceType = file.type.startsWith("video/") ? "video" : "image";
          const result = await uploadToCloudinary(file, resourceType);
          if (result.secure_url) {
            const key = (i + 1).toString();
            if (resourceType === "video") {
              uploadedVideos[key] = {
                url: result.secure_url,
                caption: mediaFormData.caption || "",
                type: "video"
              };
            } else {
              uploadedImages[key] = {
                url: result.secure_url,
                caption: mediaFormData.caption || ""
              };
            }
          } else {
            setError(`Upload ${resourceType} thất bại`);
            setLoading(false);
            return;
          }
        }
        if (Object.keys(uploadedImages).length > 0) {
          setMediaFormData((prev) => ({ 
            ...prev, 
            images: { ...prev.images, ...uploadedImages }
          }));
        }
        if (Object.keys(uploadedVideos).length > 0) {
          setMediaFormData((prev) => ({ 
            ...prev, 
            videos: { ...prev.videos, ...uploadedVideos }
          }));
        }
      } catch (err) {
        setError("Upload file thất bại");
      }
      setLoading(false);
    }
  };

  // Xử lý upload nhạc lên Cloudinary
  const handleMusicFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      setError("");
      try {
        const result = await uploadToCloudinary(file, "raw"); // Audio files use raw type
        if (result.secure_url) {
          setMusicFormData((prev) => ({
            ...prev,
            audioUrl: result.secure_url,
            audioFile: file
          }));
        } else {
          setError("Upload nhạc thất bại");
        }
      } catch (err) {
        setError("Upload nhạc thất bại");
      }
      setLoading(false);
    }
  };

  // Xử lý upload ảnh nền nhạc
  const handleMusicImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setLoading(true);
      setError("");
      try {
        const result = await uploadToCloudinary(file, "image");
        if (result.secure_url) {
          setMusicFormData((prev) => ({
            ...prev,
            musicBackgroundImage: result.secure_url
          }));
        } else {
          setError("Upload ảnh nền thất bại");
        }
      } catch (err) {
        setError("Upload ảnh nền thất bại");
      }
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    setEditingId(id);
    setShowForm(true);
    setError("");
    try {
      const res = await getPostById(id);
      setFormData({
        title: res.data.data.title,
        content: res.data.data.content,
        images: typeof res.data.data.images === "string" ? res.data.data.images : "",
        type: res.data.data.type || "post"
      });
      setImageFile(null);
      const post = res.data.data;
      // Check if it's a music post (has songId) or media post
      if (post.songId) {
        setPostType("music");
        setMusicFormData({
          musicTitle: post.title || "",
          artistName: post.artistName || "",
          description: post.content || "",
          hashTag: post.hashTag || "",
          musicPurchaseLink: post.musicPurchaseLink || "",
          musicBackgroundImage: post.musicBackgroundImage || "",
          audioFile: null,
          audioUrl: post.audioUrl || ""
        });
      } else {
        setPostType("media");
        setMediaFormData({
          title: post.title || "",
          content: post.content || "",
          caption: post.caption || "",
          images: post.images || post.medias || {},
          videos: post.videos || {}
        });
      }
    } catch (err) {
      setError("Không lấy được dữ liệu bài viết");
    }
  };

  const handleUpdateMedia = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const postData = {
        title: mediaFormData.title,
        content: mediaFormData.content,
        caption: mediaFormData.caption || mediaFormData.content,
        images: Object.keys(mediaFormData.images || {}).length > 0 ? mediaFormData.images : undefined,
        videos: Object.keys(mediaFormData.videos || {}).length > 0 ? mediaFormData.videos : undefined,
      };
      await updatePost(editingId, postData);
      setEditingId(null);
      setShowForm(false);
      setPostType(null);
      setMediaFormData({ title: "", content: "", images: {}, videos: {}, caption: "" });
      fetchPosts();
    } catch (err) {
      setError("Cập nhật thất bại");
    }
    setLoading(false);
  };

  const handleUpdateMusic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let data;
      if (imageFile) {
        data = new FormData();
        data.append("title", formData.title);
        data.append("content", formData.content);
        data.append("images", imageFile);
        data.append("type", "post");
      } else {
        data = { ...formData, images: formData.images || "", type: "post" };
      }
      await updatePost(editingId, data);
      setEditingId(null);
      setShowForm(false);
      setFormData({ title: "", content: "", images: "", type: "post" });
      setImageFile(null);
      fetchPosts();
    } catch (err) {
      setError("Cập nhật thất bại");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết này?")) return;
    setLoading(true);
    setError("");
    try {
      await deletePost(id);
      fetchPosts();
    } catch (err) {
      setError("Xóa thất bại");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Quản lý bài viết Bar</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700"
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
          setFormData({ title: "", content: "", images: "", type: "post" });
          setImageFile(null);
        }}
      >
        + Tạo bài viết mới
      </button>
      {showForm && (
        <form
          className="bg-white shadow rounded p-4 mb-6"
          onSubmit={editingId ? handleUpdateMedia : handleCreateMedia}
        >
          <h3 className="text-lg font-semibold mb-3">📷 Đăng Ảnh/Video</h3>
          <div className="mb-2">
            <label htmlFor="media-title" className="block font-medium">Tiêu đề</label>
            <input
              id="media-title"
              type="text"
              name="title"
              value={mediaFormData.title}
              onChange={handleMediaInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="media-content" className="block font-medium">Nội dung</label>
            <textarea
              id="media-content"
              name="content"
              value={mediaFormData.content}
              onChange={handleMediaInputChange}
              className="w-full border rounded px-2 py-1"
              rows={3}
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="media-caption" className="block font-medium">Caption (mô tả)</label>
            <input
              id="media-caption"
              type="text"
              name="caption"
              value={mediaFormData.caption}
              onChange={handleMediaInputChange}
              className="w-full border rounded px-2 py-1"
              placeholder="Nhập caption"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="media-file" className="block font-medium">Ảnh/Video (tải lên)</label>
            <input
              id="media-file"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaFileChange}
              className="mb-1"
            />
            <input
              type="text"
              name="images"
              value={formData.images}
              // onChange={handleInputChange}
              className="w-full border rounded px-2 py-1 mt-1"
              placeholder="Nhập link ảnh hoặc tải lên"
            />
            {(imageFile || formData.images) && (
              <img src={imageFile ? URL.createObjectURL(imageFile) : formData.images} alt="preview" className="max-h-32 rounded mt-2" />
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              disabled={loading}
            >
              {editingId ? "Cập nhật" : "Đăng bài"}
            </button>
            <button
              type="button"
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              onClick={() => {
                setShowForm(false);
                setPostType(null);
                setEditingId(null);
                setMediaFormData({ title: "", content: "", images: {}, videos: {}, caption: "" });
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {showForm && postType === "music" && (
        <form
          className="bg-white shadow rounded p-4 mb-6"
          onSubmit={editingId ? handleUpdateMusic : handleCreateMusic}
        >
          <h3 className="text-lg font-semibold mb-3">🎵 Đăng Nhạc (SoundCloud style)</h3>
          <div className="mb-2">
            <label htmlFor="music-title" className="block font-medium">Tên Bài Nhạc *</label>
            <input
              id="music-title"
              type="text"
              name="musicTitle"
              value={musicFormData.musicTitle}
              onChange={handleMusicInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="music-artist" className="block font-medium">Tên Nghệ Sĩ *</label>
            <input
              id="music-artist"
              type="text"
              name="artistName"
              value={musicFormData.artistName}
              onChange={handleMusicInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="music-description" className="block font-medium">Chi Tiết/Mô Tả *</label>
            <textarea
              id="music-description"
              name="description"
              value={musicFormData.description}
              onChange={handleMusicInputChange}
              className="w-full border rounded px-2 py-1"
              rows={3}
              placeholder="Mô tả về bài nhạc..."
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="music-hashtag" className="block font-medium">HashTag</label>
            <input
              id="music-hashtag"
              type="text"
              name="hashTag"
              value={musicFormData.hashTag}
              onChange={handleMusicInputChange}
              className="w-full border rounded px-2 py-1"
              placeholder="#hashtag1 #hashtag2"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="music-purchase-link" className="block font-medium">Link Mua Nhạc</label>
            <input
              id="music-purchase-link"
              type="url"
              name="musicPurchaseLink"
              value={musicFormData.musicPurchaseLink}
              onChange={handleMusicInputChange}
              className="w-full border rounded px-2 py-1"
              placeholder="https://..."
            />
          </div>
          <div className="mb-2">
            <label htmlFor="music-audio" className="block font-medium">File Nhạc (MP3, WAV, etc.) *</label>
            <input
              id="music-audio"
              type="file"
              accept="audio/*"
              onChange={handleMusicFileChange}
              className="mb-1"
            />
            {musicFormData.audioUrl && (
              <audio controls src={musicFormData.audioUrl} className="w-full mt-2" />
            )}
          </div>
          <div className="mb-2">
            <label htmlFor="music-image" className="block font-medium">Ảnh Nền Bài Nhạc *</label>
            <input
              id="music-image"
              type="file"
              accept="image/*"
              onChange={handleMusicImageChange}
              className="mb-1"
            />
            {musicFormData.musicBackgroundImage && (
              <img src={musicFormData.musicBackgroundImage} alt="preview" className="max-h-32 rounded mt-2" />
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              disabled={loading}
            >
              {editingId ? "Cập nhật" : "Đăng nhạc"}
            </button>
            <button
              type="button"
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              onClick={() => {
                setShowForm(false);
                setPostType(null);
                setEditingId(null);
                setMusicFormData({ 
                  musicTitle: "", 
                  artistName: "", 
                  description: "", 
                  hashTag: "", 
                  musicPurchaseLink: "", 
                  musicBackgroundImage: "",
                  audioFile: null,
                  audioUrl: ""
                });
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="bg-white shadow rounded p-4">
        {loading ? (
          <div>Đang tải...</div>
        ) : posts.length === 0 ? (
          <div>Chưa có bài viết nào.</div>
        ) : (
          <ul>
            {posts.map((post) => (
              <li key={post._id} className="border-b py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{post.title}</div>
                  <div className="text-gray-700 text-sm mb-1">{post.content}</div>
                  {post.images && (
                    <img
                      src={typeof post.images === "string" ? post.images : Object.values(post.images)[0]?.url}
                      alt=""
                      className="max-h-32 rounded mt-1"
                    />
                  )}
                  <div className="text-xs text-gray-500 mt-1">{new Date(post.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    onClick={() => handleEdit(post._id)}
                  >
                    Sửa
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    onClick={() => handleDelete(post._id)}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ManagePost;
