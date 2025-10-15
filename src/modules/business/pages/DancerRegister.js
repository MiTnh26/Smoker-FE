import { useState } from "react";
import { useNavigate } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import "../../../styles/modules/businessRegister.css";

export default function DancerRegister() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const [formData, setFormData] = useState({
    stageName: "",
    danceStyle: "",
    experience: "",
    bio: "",
    avatar: null,
    background: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!storedUser?.id) {
      alert("Không tìm thấy tài khoản. Vui lòng đăng nhập lại.");
      return;
    }

    const payload = new FormData();
    payload.append("accountId", storedUser.id);
    payload.append("role", "dancer");
    payload.append("userName", formData.stageName);
    payload.append("bio", formData.bio || "");
    payload.append("danceStyle", formData.danceStyle || "");
    payload.append("experience", formData.experience || "");
    if (formData.avatar) payload.append("avatar", formData.avatar);
    if (formData.background) payload.append("background", formData.background);

    try {
      await businessApi.register(payload);
      navigate("/customer/newsfeed");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Đăng ký thất bại");
    }
  };

  return (
    <div className="business-register-container">
      <h2>Đăng ký Dancer</h2>
      <form onSubmit={handleSubmit} className="business-register-form" encType="multipart/form-data">
        <div className="form-group">
          <label>Nghệ danh</label>
          <input type="text" name="stageName" value={formData.stageName} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Phong cách nhảy</label>
          <input type="text" name="danceStyle" value={formData.danceStyle} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Kinh nghiệm (năm)</label>
          <input type="number" name="experience" min="0" value={formData.experience} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Giới thiệu bản thân</label>
          <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} />
        </div>

        <div className="form-group">
          <label>Ảnh đại diện</label>
          <input type="file" name="avatar" accept="image/*" onChange={handleFileChange} />
        </div>

        <div className="form-group">
          <label>Ảnh bìa</label>
          <input type="file" name="background" accept="image/*" onChange={handleFileChange} />
        </div>

        <button type="submit" className="business-register-btn">Gửi đăng ký</button>
      </form>
    </div>
  );
}
