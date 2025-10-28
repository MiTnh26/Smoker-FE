// src/modules/dj/pages/DJProfile.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import PostCreate from "../../../components/layout/common/PostCreate";
import PostList from "../../../components/layout/common/PostList";
import "../../../styles/modules/djProfile.css";

export default function DJProfile() {
    const { businessId } = useParams();
    const [profile, setProfile] = useState({
        userName: "",
        role: "",
        avatar: "",
        background: "",
        address: "",
        phone: "",
        bio: "",
        gender: "",
        pricePerHours: "",
        pricePerSession: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("info");

    useEffect(() => {
        const fetchDJ = async () => {
            console.log("🎧 useParams businessId:", businessId);
            try {
                const res = await businessApi.getBusinessById(businessId);
                console.log("✅ API getBusinessById:", res);

                if (res.status === "success" && res.data) {
                    const data = res.data;

                    // 🔥 Chuẩn hóa key từ PascalCase -> camelCase
                    const mappedData = {
                        userName: data.UserName,
                        role: data.Role,
                        avatar: data.Avatar,
                        background: data.Background,
                        address: data.Address,
                        phone: data.Phone,
                        bio: data.Bio,
                        gender: data.Gender,
                        pricePerHours: data.PricePerHours,
                        pricePerSession: data.PricePerSession,
                    };

                    setProfile(mappedData);
                } else {
                    setError(res.message || "Không tải được hồ sơ DJ");
                }
            } catch (err) {
                console.error("❌ Lỗi tải DJ:", err);
                setError(err?.response?.data?.message || "Không tải được hồ sơ DJ");
            } finally {
                setLoading(false);
            }
        };

        fetchDJ();
    }, [businessId]);


    if (loading) return <div className="profile-loading">Đang tải hồ sơ...</div>;
    if (error) return <div className="profile-error">{error}</div>;

    const renderTabContent = () => {
        switch (activeTab) {
            case "info":
                return (
                    <div className="profile-body">
                        <div className="profile-info-card">
                            <h3>Giới thiệu</h3>
                            <p><strong>Giới tính:</strong> {profile.gender || "Chưa cập nhật"}</p>
                            <p><strong>Địa chỉ:</strong> {profile.address || "Chưa có địa chỉ"}</p>
                            <p><strong>Điện thoại:</strong> {profile.phone || "Chưa có"}</p>
                            <p><strong>Giới thiệu:</strong> {profile.bio || "Chưa có mô tả"}</p>
                            <p><strong>Giá/giờ:</strong> {profile.pricePerHours || 0} đ</p>
                            <p><strong>Giá/buổi:</strong> {profile.pricePerSession || 0} đ</p>
                        </div>
                    </div>
                );

            case "posts":
                return (
                    <>
                        <section className="post-section">
                            <PostCreate avatar={profile.avatar} />
                        </section>
                        <section className="post-list">
                            <PostList
                                posts={[]} // TODO: load bài viết DJ sau
                                avatar={profile.avatar}
                                userName={profile.userName}
                            />
                        </section>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="profile-container">
            {/* --- COVER & AVATAR --- */}
            <section
                className="profile-cover"
                style={{
                    backgroundImage: `url(${profile.background || "https://i.imgur.com/6IUbEMn.jpg"})`,
                }}
            >
                <div className="profile-info-header">
                    <div className="avatar-container">
                        <img
                            src={profile.avatar || "https://via.placeholder.com/120"}
                            alt={profile.userName}
                            className="profile-avatar"
                        />
                        <i className="bx bx-camera text-[#a78bfa] text-xl cursor-pointer hover:text-white transition"></i>
                    </div>

                    <div className="profile-details">
                        <h2>{profile.userName || "DJ mới"}</h2>
                        <p>Role: {profile.role || "DJ"}</p>
                    </div>

                    <div className="profile-actions flex gap-3">
                        <i className="bx bx-share-alt text-[#a78bfa] text-2xl cursor-pointer hover:text-white transition"></i>
                        <i className="bx bx-edit text-[#a78bfa] text-2xl cursor-pointer hover:text-white transition"></i>
                    </div>
                </div>
            </section>

            {/* --- TABS --- */}
            <div className="profile-tabs">
                <button
                    className={activeTab === "info" ? "active" : ""}
                    onClick={() => setActiveTab("info")}
                >
                    Thông tin
                </button>
                <button
                    className={activeTab === "posts" ? "active" : ""}
                    onClick={() => setActiveTab("posts")}
                >
                    Bài viết
                </button>
            </div>

            {/* --- MAIN CONTENT --- */}
            {renderTabContent()}
        </div>
    );
}
