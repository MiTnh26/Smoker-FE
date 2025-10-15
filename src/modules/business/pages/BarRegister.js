import { useState } from "react";
import { useNavigate } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import "../../../styles/modules/businessRegister.css";

export default function BarRegister() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user"));

  // Step control
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Step 1: basic info
  const [info, setInfo] = useState({
    userName: storedUser?.userName || "",
    address: storedUser?.address || "",
    phone: storedUser?.phone || "",
    bio: storedUser?.bio || "",
    role: "bar",
  });

  // Created BussinessAccountId after step 1
  const [businessId, setBusinessId] = useState(null);

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

  const submitStep1 = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) throw new Error("Không tìm thấy tài khoản. Vui lòng đăng nhập lại.");

      const payload = {
        accountId: user.id,
        userName: info.userName.trim(),
        role: info.role,
        phone: info.phone || null,
        address: info.address || null,
        bio: info.bio || null,
      };

      const res = await businessApi.create(payload);
      if (res?.status === "success" && res?.data?.BussinessAccountId) {
        setBusinessId(res.data.BussinessAccountId);
        setStep(2);
        setMessage("Tạo tài khoản kinh doanh thành công. Tiếp tục tải ảnh.");
      } else {
        throw new Error(res?.message || "Tạo tài khoản thất bại");
      }
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep2 = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      if (!businessId) throw new Error("Thiếu BussinessAccountId");
      const fd = new FormData();
      fd.append("entityId", businessId);
      if (files.avatar) fd.append("avatar", files.avatar);
      if (files.background) fd.append("background", files.background);

      const res = await businessApi.upload(fd);
      if (res?.status === "success") {
        setMessage("Tải ảnh thành công!");
        navigate("/customer/newsfeed");
      } else {
        throw new Error(res?.message || "Upload thất bại");
      }
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="business-register-container">
      <h2>Đăng ký Quán Bar</h2>

      {step === 1 && (
        <form onSubmit={submitStep1} className="business-register-form">
          <div className="form-group">
            <label>Tên quán Bar</label>
            <input type="text" name="userName" value={info.userName} onChange={handleInfoChange} required />
          </div>

          <div className="form-group">
            <label>Địa chỉ</label>
            <input type="text" name="address" value={info.address} onChange={handleInfoChange} required />
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>
            <input type="text" name="phone" value={info.phone} onChange={handleInfoChange} required />
          </div>

          <div className="form-group">
            <label>Mô tả</label>
            <textarea name="bio" value={info.bio} onChange={handleInfoChange} rows={4} />
          </div>

          <button type="submit" className="business-register-btn" disabled={isLoading}>
            {isLoading ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitStep2} className="business-register-form">
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
            {isLoading ? "Đang tải ảnh..." : "Hoàn tất đăng ký"}
          </button>
        </form>
      )}

      {message && <p className="business-register-message">{message}</p>}
    </div>
  );
}
