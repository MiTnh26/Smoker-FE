import React, { useState, useEffect } from "react";
import { Input } from "../../../components/common/Input";
import { Button } from "../../../components/common/Button";
import { userApi } from "../../../api/userApi";
import { useNavigate } from "react-router-dom";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ userName: "", avatar: "", background: "", bio: "", address: "", phone: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.me();
        if (res?.status === "success" && res?.data) {
          const u = res.data;
          setForm({
            userName: u.userName || "",
            avatar: u.avatar || "",
            background: u.background || "",
            bio: u.bio || "",
            address: u.address || "",
            phone: u.phone || "",
          });
        }
      } catch (e) {}
    })();
  }, []);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await userApi.updateProfile(form);
      if (res.status === "success") {
        setSuccess("Lưu hồ sơ thành công");
        setTimeout(() => navigate("/customer/newsfeed", { replace: true }), 800);
      } else {
        setError(res.message || "Lưu hồ sơ thất bại");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Lưu hồ sơ thất bại");
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h2>Hoàn thiện hồ sơ</h2>
      <p>Vui lòng bổ sung ít nhất Tên và Ảnh đại diện.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input placeholder="User name (bắt buộc)" value={form.userName} onChange={onChange("userName")} />
        <Input placeholder="Avatar URL (bắt buộc)" value={form.avatar} onChange={onChange("avatar")} />
        <Input placeholder="Background URL" value={form.background} onChange={onChange("background")} />
        <Input placeholder="Bio" value={form.bio} onChange={onChange("bio")} />
        <Input placeholder="Address" value={form.address} onChange={onChange("address")} />
        <Input placeholder="Phone" value={form.phone} onChange={onChange("phone")} />
        {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
        {success && <div style={{ color: "green", fontSize: 12 }}>{success}</div>}
        <Button type="submit">Lưu</Button>
      </form>
    </div>
  );
}


