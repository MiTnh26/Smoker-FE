import { useState } from "react";
import { useNavigate } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import "../../../styles/modules/businessRegister.css";

export default function DJRegister() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user"));

  // Step control
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Step 1: basic info
  const [info, setInfo] = useState({
    userName: "",
    address: "",
    phone: "",
    bio: "",
    gender: "",
    pricePerHours: "",
    pricePerSession: "",
    role: "DJ",
  });

  // Step 2: files + preview
  const [files, setFiles] = useState({ avatar: null, background: null });
  const [previews, setPreviews] = useState({ avatar: "", background: "" });

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: f } = e.target;
    const file = f && f[0];
    setFiles((prev) => ({ ...prev, [name]: file || null }));
    setPreviews((prev) => ({ ...prev, [name]: file ? URL.createObjectURL(file) : "" }));
  };

  const goNextStep = (e) => {
    e.preventDefault();
    setStep(2);
  };

  // Submit tất cả ở bước cuối
  const handleSubmitAll = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) throw new Error("Không tìm thấy tài khoản. Vui lòng đăng nhập lại.");

      // B1: Gọi API registerDJ để tạo business
      const payload = {
        accountId: user.id,
        userName: info.userName.trim(),
        role: "DJ",
        phone: info.phone || null,
        address: info.address || null,
        bio: info.bio || null,
        gender: info.gender || null,
        pricePerHours: Number(info.pricePerHours) || 0,
        pricePerSession: Number(info.pricePerSession) || 0,
      };

      const res = await businessApi.create(payload);
      if (res?.status !== "success" || !res?.data?.BussinessAccountId) {
        throw new Error(res?.message || "Tạo tài khoản DJ thất bại");
      }

      const businessId = res.data.BussinessAccountId;

      // B2: Upload file
      const fd = new FormData();
      fd.append("entityId", businessId);
      if (files.avatar) fd.append("avatar", files.avatar);
      if (files.background) fd.append("background", files.background);

      const uploadRes = await businessApi.upload(fd);
      if (uploadRes?.status !== "success") {
        throw new Error(uploadRes?.message || "Tải ảnh thất bại");
      }

      setMessage("🎉 Đăng ký DJ thành công!");
      navigate("/customer/newsfeed");
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="business-register-container">
      <h2>Đăng ký DJ</h2>

      {step === 1 && (
        <form onSubmit={goNextStep} className="business-register-form">
          <div className="form-group">
            <label>Tên nghệ danh</label>
            <input type="text" name="userName" value={info.userName} onChange={handleInfoChange} required />
          </div>

          <div className="form-group">
            <label>Giới tính</label>
            <select name="gender" value={info.gender} onChange={handleInfoChange}>
              <option value="">-- Chọn giới tính --</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div className="form-group">
            <label>Địa chỉ</label>
            <input type="text" name="address" value={info.address} onChange={handleInfoChange} />
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>
            <input type="text" name="phone" value={info.phone} onChange={handleInfoChange} />
          </div>

          <div className="form-group">
            <label>Giới thiệu bản thân</label>
            <textarea name="bio" value={info.bio} onChange={handleInfoChange} rows={3} />
          </div>

          <div className="form-group">
            <label>Giá thuê theo giờ (đồng)</label>
            <input type="number" name="pricePerHours" value={info.pricePerHours} onChange={handleInfoChange} />
          </div>

          <div className="form-group">
            <label>Giá thuê theo buổi (đồng)</label>
            <input type="number" name="pricePerSession" value={info.pricePerSession} onChange={handleInfoChange} />
          </div>

          <button type="submit" className="business-register-btn">Tiếp tục</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmitAll} className="business-register-form">
          <div className="form-group">
            <label>Ảnh đại diện (Avatar)</label>
            <input type="file" name="avatar" accept="image/*" onChange={handleFileChange} />
            {previews.avatar && <img src={previews.avatar} alt="avatar preview" className="preview-image" />}
          </div>

          <div className="form-group">
            <label>Ảnh bìa (Background)</label>
            <input type="file" name="background" accept="image/*" onChange={handleFileChange} />
            {previews.background && <img src={previews.background} alt="background preview" className="preview-image" />}
          </div>

          <button type="submit" className="business-register-btn" disabled={isLoading}>
            {isLoading ? "Đang đăng ký..." : "Hoàn tất đăng ký"}
          </button>
        </form>
      )}

      {message && <p className="business-register-message">{message}</p>}
    </div>
  );
}
