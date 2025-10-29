
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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
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
      setShowForm(false);
      setFormData({ title: "", content: "", images: "", type: "post" });
      setImageFile(null);
      fetchPosts();
    } catch (err) {
      setError("Tạo bài viết thất bại");
    }
    setLoading(false);
  };
  // Xử lý chọn file ảnh để gửi lên BE
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
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
    } catch (err) {
      setError("Không lấy được dữ liệu bài viết");
    }
  };

  const handleUpdate = async (e) => {
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
          onSubmit={editingId ? handleUpdate : handleCreate}
        >
          <div className="mb-2">
            <label className="block font-medium">Tiêu đề</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium">Nội dung</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              rows={3}
              required
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium">Ảnh (tải lên hoặc dán link)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mb-1"
            />
            <input
              type="text"
              name="images"
              value={formData.images}
              onChange={handleInputChange}
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
                setEditingId(null);
                setFormData({ title: "", content: "", images: "" });
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
