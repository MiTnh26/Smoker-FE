// src/modules/business/pages/DancerRegister.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DancerRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    stageName: "",
    danceStyle: "",
    experience: "",
    bio: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dancer registration data:", formData);
    // TODO: call API đăng ký dancer tại đây
    navigate("/customer/newsfeed");
  };

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-6 rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Đăng ký Dancer</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Nghệ danh</label>
          <input
            type="text"
            name="stageName"
            value={formData.stageName}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Phong cách nhảy</label>
          <input
            type="text"
            name="danceStyle"
            value={formData.danceStyle}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Kinh nghiệm (năm)</label>
          <input
            type="number"
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            min="0"
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Giới thiệu bản thân</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-lg p-2"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Gửi đăng ký
        </button>
      </form>
    </div>
  );
}
