import React, { useEffect, useState } from "react";
import { userApi } from "../../../api/userApi";
import { Input } from "../../../components/common/Input";
import { Button } from "../../../components/common/Button";

export default function Profile() {
  const [profile, setProfile] = useState({ userName: "", email: "", avatar: "", background: "", bio: "", address: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.me();
        if (res.status === "success" && res.data) {
          setProfile({
            userName: res.data.userName || "",
            email: res.data.email || "",
            avatar: res.data.avatar || "",
            background: res.data.background || "",
            bio: res.data.bio || "",
            address: res.data.address || "",
            phone: res.data.phone || "",
          });
        } else {
          setError(res.message || "Không tải được hồ sơ");
        }
      } catch (e) {
        setError(e?.response?.data?.message || "Không tải được hồ sơ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const { email, ...payload } = profile; // email không cập nhật
      const res = await userApi.updateProfile(payload);
      if (res.status === "success") {
        setSuccess("Cập nhật thành công");
      } else {
        setError(res.message || "Cập nhật thất bại");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Cập nhật thất bại");
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Hồ sơ của tôi</h2>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginTop: 16 }}>
        <div style={{ width: 180 }}>
          <img src={profile.avatar || "https://via.placeholder.com/160"} alt="avatar" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 8 }} />
        </div>
        <form onSubmit={onSave} style={{ flex: 1 }} className="space-y-3">
          <Input placeholder="Email" value={profile.email} disabled />
          <Input placeholder="User name" value={profile.userName} onChange={onChange("userName")} />
          <Input placeholder="Avatar URL" value={profile.avatar} onChange={onChange("avatar")} />
          <Input placeholder="Background URL" value={profile.background} onChange={onChange("background")} />
          <Input placeholder="Bio" value={profile.bio} onChange={onChange("bio")} />
          <Input placeholder="Address" value={profile.address} onChange={onChange("address")} />
          <Input placeholder="Phone" value={profile.phone} onChange={onChange("phone")} />
          {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
          {success && <div style={{ color: "green", fontSize: 12 }}>{success}</div>}
          <Button type="submit">Lưu thay đổi</Button>
        </form>
      </div>
    </div>
  );
}


