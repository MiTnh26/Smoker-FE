import React, { useEffect, useState } from "react";

import {
  getStories,
  createStory,
  updateStory,
  deleteStory,
  getStoryById
} from "../../../api/storyApi";

const ManageStory = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "", images: "", expiredAt: "",  type: "story" });
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const fetchStories = async () => {
    setLoading(true);
    try {
      const res = await getStories();
      setStories(res.data || []);
    } catch (err) {
      setError("Lỗi tải story");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Lấy entityAccountId từ activeEntity trong session
      let session, entityAccountId, authorEntityId, authorEntityType;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }
      const activeEntity = session?.activeEntity || session?.account;
      entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      authorEntityId = activeEntity?.id || session?.account?.id || null;
      const rawRole = (activeEntity?.role || session?.account?.role || "").toLowerCase();
      if (rawRole === "bar" || rawRole === "barpage") {
        authorEntityType = "BarPage";
      } else if (rawRole === "dj" || rawRole === "dancer" || rawRole === "business") {
        authorEntityType = "BusinessAccount";
      } else {
        authorEntityType = "Account";
      }
      
      let data;
      if (imageFile) {
        data = new FormData();
        data.append("title", formData.title);
        data.append("content", formData.content);
        data.append("expiredAt", formData.expiredAt);
        data.append("images", imageFile);
        data.append("type", "story");
        if (entityAccountId) data.append("entityAccountId", entityAccountId);
        if (authorEntityId) data.append("authorEntityId", authorEntityId);
        if (authorEntityType) data.append("authorEntityType", authorEntityType);
      } else {
        data = { 
          ...formData, 
          images: formData.images || "",
          entityAccountId: entityAccountId || undefined,
          authorEntityId: authorEntityId || undefined,
          authorEntityType: authorEntityType || undefined
        };
      }
      await createStory(data);
      setShowForm(false);
      setFormData({ title: "", content: "", images: "", expiredAt: "", type: "story" });
      setImageFile(null);
      
      // Đợi một chút để backend kịp lưu story mới vào DB
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh stories từ API để lấy story mới với đầy đủ thông tin
      await fetchStories();
    } catch (err) {
      setError("Tạo story thất bại");
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
      const res = await getStoryById(id);
      setFormData({
        title: res.data.title,
        content: res.data.content,
        images: typeof res.data.images === "string" ? res.data.images : "",
        expiredAt: res.data.expiredAt ? res.data.expiredAt.slice(0, 16) : "",
        type: res.data.type || "story"
      });
      setImageFile(null);
    } catch (err) {
      setError("Không lấy được dữ liệu story");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Lấy entityAccountId từ activeEntity trong session
      let session, entityAccountId, authorEntityId, authorEntityType;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }
      const activeEntity = session?.activeEntity || session?.account;
      entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      authorEntityId = activeEntity?.id || session?.account?.id || null;
      const rawRole = (activeEntity?.role || session?.account?.role || "").toLowerCase();
      if (rawRole === "bar" || rawRole === "barpage") {
        authorEntityType = "BarPage";
      } else if (rawRole === "dj" || rawRole === "dancer" || rawRole === "business") {
        authorEntityType = "BusinessAccount";
      } else {
        authorEntityType = "Account";
      }
      
      let data;
      if (imageFile) {
        data = new FormData();
        data.append("title", formData.title);
        data.append("content", formData.content);
        data.append("expiredAt", formData.expiredAt);
        data.append("images", imageFile);
        data.append("type", "story");
        if (entityAccountId) data.append("entityAccountId", entityAccountId);
        if (authorEntityId) data.append("authorEntityId", authorEntityId);
        if (authorEntityType) data.append("authorEntityType", authorEntityType);
      } else {
        data = { 
          ...formData, 
          images: formData.images || "", 
          type: "story",
          entityAccountId: entityAccountId || undefined,
          authorEntityId: authorEntityId || undefined,
          authorEntityType: authorEntityType || undefined
        };
      }
      await updateStory(editingId, data);
      setEditingId(null);
      setShowForm(false);
      setFormData({ title: "", content: "", images: "", expiredAt: "", type: "story" });
      setImageFile(null);
      fetchStories();
    } catch (err) {
      setError("Cập nhật story thất bại");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa story này?")) return;
    setLoading(true);
    setError("");
    try {
      await deleteStory(id);
      fetchStories();
    } catch (err) {
      setError("Xóa story thất bại");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
  <h2 className="text-2xl font-bold mb-4">Quản lý Story Bar</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700"
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
          setFormData({ title: "", content: "", images: "", expiredAt: "" });
          setImageFile(null);
        }}
      >
  + Tạo story mới
      </button>
      {showForm && (
        <form
          className="bg-white shadow rounded p-4 mb-6"
          onSubmit={editingId ? handleUpdate : handleCreate}
        >
          <div className="mb-2">
            <label className="block font-medium">Tiêu đề story</label>
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
            <label className="block font-medium">Nội dung story</label>
          <div className="mb-2">
            <label className="block font-medium">Thời gian hết hạn (expiredAt)</label>
            <input
              type="datetime-local"
              name="expiredAt"
              value={formData.expiredAt}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>
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
            {imageFile && (
              <img src={URL.createObjectURL(imageFile)} alt="preview" className="max-h-32 rounded mt-2" />
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
        ) : stories.length === 0 ? (
          <div>Chưa có story nào.</div>
        ) : (
          <ul>
            {stories.map((story) => (
              <li key={story._id} className="border-b py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{story.title}</div>
                  <div className="text-gray-700 text-sm mb-1">{story.content}</div>
                  {story.images && typeof story.images === "string" && story.images !== "" && (
                    <img
                      src={story.images}
                      alt=""
                      className="max-h-32 rounded mt-1"
                    />
                  )}
                  <div className="text-xs text-gray-500 mt-1">{new Date(story.createdAt).toLocaleString()}</div>
                  <div className="text-xs text-red-500 mt-1">Hết hạn: {story.expiredAt ? new Date(story.expiredAt).toLocaleString() : ""}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    onClick={() => handleEdit(story._id)}
                  >
                    Sửa
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    onClick={() => handleDelete(story._id)}
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

export default ManageStory;
