// src/modules/dancer/pages/DancerProfile.js
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import { locationApi } from "../../../api/locationApi";
import AddressSelector from "../../../components/common/AddressSelector";
import PostFeed from "../../feeds/components/PostFeed";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import messageApi from "../../../api/messageApi";
import "../../../styles/modules/publicProfile.css";

export default function DancerProfile() {
    const { t } = useTranslation();
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
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [saving, setSaving] = useState(false);
    const [currentUserEntityId, setCurrentUserEntityId] = useState(null);
    const [businessEntityId, setBusinessEntityId] = useState(null);
    
    // Location states
    const [selectedProvinceId, setSelectedProvinceId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');
    const [selectedWardId, setSelectedWardId] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
    
    // Get current user entity ID for followers/following and chat
    useEffect(() => {
        try {
            const sessionRaw = localStorage.getItem("session");
            if (!sessionRaw) return;
            const session = JSON.parse(sessionRaw);
            const active = session?.activeEntity || {};
            const entities = session?.entities || [];
            const resolvedId =
                active.EntityAccountId ||
                active.entityAccountId ||
                active.id ||
                entities[0]?.EntityAccountId ||
                entities[0]?.entityAccountId ||
                null;
            setCurrentUserEntityId(resolvedId || null);
        } catch {}
    }, []);
    
    const { followers, fetchFollowers } = useFollowers(businessEntityId);
    const { following, fetchFollowing } = useFollowing(businessEntityId);
    
    useEffect(() => {
        if (businessEntityId) {
            fetchFollowers();
            fetchFollowing();
        }
    }, [businessEntityId, fetchFollowers, fetchFollowing]);

    useEffect(() => {
        const fetchDancer = async () => {
            console.log("💃 useParams businessId:", businessId);
            try {
                const res = await businessApi.getBusinessById(businessId);
                console.log("✅ API getBusinessById:", res);

                if (res.status === "success" && res.data) {
                    const data = res.data;
                    console.log("🔍 Full API response data:", data);
                    console.log("🔍 addressData:", data.addressData);
                    console.log("🔍 Address:", data.Address);
                    
                    // Set business entity ID for followers/following
                    if (data.EntityAccountId || data.entityAccountId || data.id) {
                        setBusinessEntityId(data.EntityAccountId || data.entityAccountId || data.id);
                    }

                    // Map gender from Vietnamese to English if needed
                    const mapGender = (gender) => {
                        if (!gender) return '';
                        const genderLower = gender.toLowerCase();
                        if (genderLower === 'nam' || genderLower === 'male') return 'male';
                        if (genderLower === 'nữ' || genderLower === 'female') return 'female';
                        if (genderLower === 'khác' || genderLower === 'other') return 'other';
                        return gender; // Return as-is if unknown format
                    };

                    // 🔥 Chuẩn hóa key từ PascalCase -> camelCase
                    const mappedData = {
                        userName: data.UserName,
                        role: data.Role,
                        avatar: data.Avatar,
                        background: data.Background,
                        address: data.Address,
                        phone: data.Phone,
                        bio: data.Bio,
                        gender: mapGender(data.Gender),
                        pricePerHours: data.PricePerHours,
                        pricePerSession: data.PricePerSession,
                    };

                    setProfile(mappedData);
                    
                    // Try to get addressData - could be object or JSON string
                    let addressDataObj = null;
                    if (data.addressData) {
                        if (typeof data.addressData === 'string') {
                            try {
                                addressDataObj = JSON.parse(data.addressData);
                            } catch (e) {
                                console.error('Failed to parse addressData string:', e);
                            }
                        } else {
                            addressDataObj = data.addressData;
                        }
                    }
                    
                    console.log("🔍 Parsed addressDataObj:", addressDataObj);
                    
                    // Load structured address data if available
                    if (addressDataObj && addressDataObj.provinceId) {
                        console.log("✅ Loading address with provinceId:", addressDataObj.provinceId);
                        setSelectedProvinceId(addressDataObj.provinceId);
                        try {
                            await locationApi.getDistricts(addressDataObj.provinceId);
                            
                            if (addressDataObj.districtId) {
                                console.log("✅ Loading district:", addressDataObj.districtId);
                                setSelectedDistrictId(addressDataObj.districtId);
                                try {
                                    await locationApi.getWards(addressDataObj.districtId);
                                    
                                    if (addressDataObj.wardId) {
                                        console.log("✅ Loading ward:", addressDataObj.wardId);
                                        setSelectedWardId(addressDataObj.wardId);
                                    }
                                } catch (error) {
                                    console.error('Failed to load wards:', error);
                                }
                            }
                        } catch (error) {
                            console.error('Failed to load districts:', error);
                        }
                        
                        // Extract address detail
                        if (addressDataObj.detail) {
                            setAddressDetail(addressDataObj.detail);
                        } else if (data.Address) {
                            // Try to extract from full address string
                            const fullAddr = data.Address;
                            const parts = fullAddr.split(', ');
                            if (parts.length > 3) {
                                setAddressDetail(parts.slice(0, -3).join(', '));
                            }
                        }
                    } else if (data.Address) {
                        // Fallback: try to parse address string if no addressData
                        console.log("⚠️ No addressData, trying to parse from Address string");
                        // This is a fallback, might not always work
                    }
                } else {
                    setError(res.message || "Không tải được hồ sơ Dancer");
                }
            } catch (err) {
                console.error("❌ Lỗi tải Dancer:", err);
                setError(err?.response?.data?.message || "Không tải được hồ sơ Dancer");
            } finally {
                setLoading(false);
            }
        };

        fetchDancer();
    }, [businessId]);


    // Helper to display gender in Vietnamese
    const displayGender = (gender) => {
        if (!gender) return "Chưa cập nhật";
        const genderLower = gender.toLowerCase();
        if (genderLower === 'male') return 'Nam';
        if (genderLower === 'female') return 'Nữ';
        if (genderLower === 'other') return 'Khác';
        // If already in Vietnamese, return as-is
        return gender;
    };

    if (loading) return <div className="pp-container">{t('profile.loadingProfile')}</div>;
    if (error) return <div className="pp-container">{error}</div>;
    
    const isOwnProfile = currentUserEntityId && businessEntityId && String(currentUserEntityId).toLowerCase() === String(businessEntityId).toLowerCase();

    const renderTabContent = () => {
        switch (activeTab) {
            case "info":
                return (
                    <div className="profile-body">
                        <div className="profile-info-card">
                            <h3>{t('profile.about')}</h3>
                            <p><strong>{t('profile.gender')}:</strong> {displayGender(profile.gender)}</p>
                            <p><strong>{t('profile.address')}:</strong> {profile.address || ''}</p>
                            <p><strong>{t('profile.phone')}:</strong> {profile.phone || ''}</p>
                            <p><strong>{t('profile.bio')}:</strong> {profile.bio || ''}</p>
                            <p><strong>{t('profile.pricePerHour')}:</strong> {profile.pricePerHours || 0} đ</p>
                            <p><strong>{t('profile.pricePerSession')}:</strong> {profile.pricePerSession || 0} đ</p>
                        </div>
                    </div>
                );

            case "posts":
                return (
                    <div className="flex flex-col gap-6">
                        <PostFeed />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="pp-container">
            <section
                className="pp-cover"
                style={{
                    backgroundImage: `url(${profile.background || "https://i.imgur.com/6IUbEMn.jpg"})`,
                }}
            >
                <div className="pp-header">
                    <img
                        src={profile.avatar || "https://via.placeholder.com/120"}
                        alt={profile.userName}
                        className="pp-avatar"
                    />
                    <div>
                        <h2 className="pp-title">{profile.userName || "Dancer"}</h2>
                        <div className="pp-type">{profile.role || "Dancer"}</div>
                    </div>
                </div>
                <div className="pp-follow">
                    {!isOwnProfile && (
                        <>
                            <button
                                className="pp-chat-button"
                                onClick={async () => {
                                    try {
                                        if (!currentUserEntityId || !businessEntityId) return;
                                        const res = await messageApi.createOrGetConversation(currentUserEntityId, businessEntityId);
                                        const conversation = res?.data?.data || res?.data;
                                        const conversationId = conversation?._id || conversation?.conversationId || conversation?.id;
                                        if (conversationId && window.__openChat) {
                                            window.__openChat({
                                                id: conversationId,
                                                name: profile.userName || "Dancer",
                                                avatar: profile.avatar || null, // Pass avatar
                                                entityId: businessEntityId // Pass entityId for profile navigation
                                            });
                                        }
                                    } catch (error) {
                                        console.error("Error opening chat:", error);
                                    }
                                }}
                            >
                                <i className="bx bx-message-rounded"></i>
                                Chat
                            </button>
                        </>
                    )}
                    {isOwnProfile && (
                        <button onClick={() => setShowEditModal(true)} className="pp-chat-button">
                            <i className="bx bx-edit"></i>
                            {t('profile.editProfile')}
                        </button>
                    )}
                </div>
            </section>

            <section className="pp-stats">
                <div>
                    <div className="pp-stat-label">{t('publicProfile.followers')}</div>
                    <div className="pp-stat-value">{followers.length}</div>
                </div>
                <div>
                    <div className="pp-stat-label">{t('publicProfile.following')}</div>
                    <div className="pp-stat-value">{following.length}</div>
                </div>
            </section>

            <section className="pp-section">
                {profile.bio && (
                    <div>
                        <h3>{t("publicProfile.about")}</h3>
                        <p style={{ whiteSpace: "pre-wrap" }}>{profile.bio}</p>
                    </div>
                )}
                <div style={{ marginTop: profile.bio ? 12 : 0 }}>
                    <h4>{t("publicProfile.contact")}</h4>
                    {profile.phone && <div>{t("common.phone") || "Phone"}: {profile.phone}</div>}
                    {profile.address && <div>{t("common.address") || "Address"}: {profile.address}</div>}
                    {profile.gender && <div>{t("profile.gender")}: {displayGender(profile.gender)}</div>}
                    {profile.pricePerHours && <div>{t("profile.pricePerHour")}: {profile.pricePerHours} đ</div>}
                    {profile.pricePerSession && <div>{t("profile.pricePerSession")}: {profile.pricePerSession} đ</div>}
                </div>
            </section>

            {isOwnProfile && (
                <section style={{ padding: '0 24px 24px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setActiveTab("info")}
                            style={{
                                padding: '8px 16px',
                                background: activeTab === "info" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                cursor: 'pointer'
                            }}
                        >
                            {t('profile.infoTab')}
                        </button>
                        <button
                            onClick={() => setActiveTab("posts")}
                            style={{
                                padding: '8px 16px',
                                background: activeTab === "posts" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                cursor: 'pointer'
                            }}
                        >
                            {t('profile.postsTab')}
                        </button>
                    </div>
                    {renderTabContent()}
                </section>
            )}
            
            {/* Edit Modal - Copy từ DJProfile */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-2xl font-semibold mb-5 text-center">{t('profile.editDancer')}</h3>
                        
                        <div className="space-y-6">
                            {/* Avatar */}
                            <div className="flex justify-between items-center border-b pb-3">
                                <div className="flex items-center gap-4">
                                    <img src={profile.avatar || "https://via.placeholder.com/100"} alt="Avatar" className="w-20 h-20 rounded-full object-cover border" />
                                    <div>
                                        <p className="font-medium text-lg">Ảnh đại diện</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingField(editingField === "avatar" ? null : "avatar")}
                                    className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                                >
                                    {editingField === "avatar" ? t('profile.close') : t('profile.editProfile')}
                                </button>
                            </div>
                            {editingField === "avatar" && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        placeholder="Nhập link ảnh đại diện..."
                                        value={profile.avatar}
                                        onChange={(e) => setProfile(prev => ({ ...prev, avatar: e.target.value }))}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>
                            )}
                            
                            {/* Background */}
                            <div className="flex justify-between items-center border-b pb-3">
                                <div className="flex items-center gap-4">
                                    <img src={profile.background || "https://i.imgur.com/6IUbEMn.jpg"} alt="Background" className="w-24 h-16 rounded-lg object-cover border" />
                                    <div>
                                        <p className="font-medium text-lg">Ảnh bìa</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingField(editingField === "background" ? null : "background")}
                                    className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                                >
                                    {editingField === "background" ? t('profile.close') : t('profile.editProfile')}
                                </button>
                            </div>
                            {editingField === "background" && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        placeholder="Nhập link ảnh bìa..."
                                        value={profile.background}
                                        onChange={(e) => setProfile(prev => ({ ...prev, background: e.target.value }))}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>
                            )}
                            
                            {/* Info */}
                            <div className="flex justify-between items-start border-b pb-3">
                                <div>
                                    <p className="font-medium text-lg mb-1">{t('profile.about')}</p>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p><strong>Tên:</strong> {profile.userName || "Chưa có tên"}</p>
                                        <p><strong>Địa chỉ:</strong> {profile.address || "Chưa có địa chỉ"}</p>
                                        <p><strong>Điện thoại:</strong> {profile.phone || "Chưa có"}</p>
                                        <p><strong>Giới tính:</strong> {displayGender(profile.gender)}</p>
                                        <p><strong>Giá/giờ:</strong> {profile.pricePerHours || 0} đ</p>
                                        <p><strong>Giá/buổi:</strong> {profile.pricePerSession || 0} đ</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingField(editingField === "info" ? null : "info")}
                                    className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium self-start"
                                >
                                    {editingField === "info" ? t('profile.close') : t('profile.editProfile')}
                                </button>
                            </div>
                            
                            {editingField === "info" && (
                                <div className="mt-3 space-y-3">
                                    <label className="block">
                                        <span className="text-sm font-medium">Tên:</span>
                                        <input
                                            type="text"
                                            value={profile.userName || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, userName: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                    
                                    <div>
                                        <span className="text-sm font-medium block mb-2">Địa chỉ:</span>
                                        <AddressSelector
                                            selectedProvinceId={selectedProvinceId}
                                            selectedDistrictId={selectedDistrictId}
                                            selectedWardId={selectedWardId}
                                            addressDetail={addressDetail}
                                            onProvinceChange={(id) => {
                                                setSelectedProvinceId(id);
                                                setSelectedDistrictId('');
                                                setSelectedWardId('');
                                            }}
                                            onDistrictChange={(id) => {
                                                setSelectedDistrictId(id);
                                                setSelectedWardId('');
                                            }}
                                            onWardChange={setSelectedWardId}
                                            onAddressDetailChange={setAddressDetail}
                                            onAddressChange={(fullAddr) => {
                                                setProfile(prev => ({ ...prev, address: fullAddr }));
                                            }}
                                        />
                                    </div>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.phone')}:</span>
                                        <input
                                            type="text"
                                            value={profile.phone || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.gender')}:</span>
                                        <select
                                            value={profile.gender || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        >
                                            <option value="">Chọn giới tính</option>
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.pricePerHour')} (VNĐ):</span>
                                        <input
                                            type="number"
                                            value={profile.pricePerHours || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, pricePerHours: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.pricePerSession')} (VNĐ):</span>
                                        <input
                                            type="number"
                                            value={profile.pricePerSession || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, pricePerSession: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                    
                                    <label className="block">
                                    <span className="text-sm font-medium">{t('profile.bio')}:</span>
                                        <textarea
                                            rows={3}
                                            value={profile.bio || ""}
                                            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2 mt-1"
                                        />
                                    </label>
                                </div>
                            )}
                            
                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    disabled={saving}
                                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                >
                                    {t('profile.close')}
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setSaving(true);
                                            
                                            const formData = new FormData();
                                            formData.append('entityId', businessId);
                                            formData.append('userName', profile.userName || '');
                                            formData.append('phone', profile.phone || '');
                                            formData.append('bio', profile.bio || '');
                                            formData.append('gender', profile.gender || '');
                                            formData.append('pricePerHours', profile.pricePerHours || 0);
                                            formData.append('pricePerSession', profile.pricePerSession || 0);
                                            
                                            // Build fullAddress from current states or use profile.address
                                            let fullAddress = profile.address || '';
                                            
                                            // If we have location selections, build address from them
                                            if (selectedProvinceId || selectedDistrictId || selectedWardId || addressDetail) {
                                                const parts = [];
                                                if (addressDetail) parts.push(addressDetail);
                                                
                                                // Fetch names for IDs to build full address (order: detail, ward, district, province)
                                                if (selectedProvinceId) {
                                                    try {
                                                        // Get province name
                                                        const provinces = await locationApi.getProvinces();
                                                        const selectedProvince = provinces.find(p => p.id === selectedProvinceId);
                                                        
                                                        // Get district name if district is selected
                                                        if (selectedDistrictId) {
                                                            const districts = await locationApi.getDistricts(selectedProvinceId);
                                                            const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
                                                            
                                                            // Get ward name if ward is selected
                                                            if (selectedWardId) {
                                                                const wards = await locationApi.getWards(selectedDistrictId);
                                                                const selectedWard = wards.find(w => w.id === selectedWardId);
                                                                if (selectedWard) parts.push(selectedWard.name);
                                                            }
                                                            
                                                            if (selectedDistrict) parts.push(selectedDistrict.name);
                                                        }
                                                        
                                                        if (selectedProvince) parts.push(selectedProvince.name);
                                                    } catch (e) {
                                                        console.error('Failed to build address from IDs:', e);
                                                        // Fallback to profile.address if build fails
                                                        fullAddress = profile.address || '';
                                                    }
                                                }
                                                
                                                if (parts.length > 0) {
                                                    fullAddress = parts.join(', ');
                                                }
                                            }
                                            
                                            // Send structured address data
                                            if (selectedProvinceId || selectedDistrictId || selectedWardId) {
                                                formData.append('addressData', JSON.stringify({
                                                    provinceId: selectedProvinceId || null,
                                                    districtId: selectedDistrictId || null,
                                                    wardId: selectedWardId || null,
                                                    fullAddress: fullAddress,
                                                    detail: addressDetail || null
                                                }));
                                                formData.append('address', fullAddress);
                                            } else {
                                                formData.append('address', fullAddress || profile.address || '');
                                            }
                                            
                                            // Send avatar and background URLs
                                            if (profile.avatar) formData.append('avatar', profile.avatar);
                                            if (profile.background) formData.append('background', profile.background);
                                            
                                            const res = await businessApi.upload(formData);
                                            
                                            if (res.status === "success") {
                                                // Reload profile
                                                const reloadRes = await businessApi.getBusinessById(businessId);
                                                if (reloadRes.status === "success" && reloadRes.data) {
                                                    const data = reloadRes.data;
                                                    
                                                    // Map gender from Vietnamese to English if needed
                                                    const mapGender = (gender) => {
                                                        if (!gender) return '';
                                                        const genderLower = gender.toLowerCase();
                                                        if (genderLower === 'nam' || genderLower === 'male') return 'male';
                                                        if (genderLower === 'nữ' || genderLower === 'female') return 'female';
                                                        if (genderLower === 'khác' || genderLower === 'other') return 'other';
                                                        return gender; // Return as-is if unknown format
                                                    };
                                                    
                                                    setProfile({
                                                        userName: data.UserName,
                                                        role: data.Role,
                                                        avatar: data.Avatar,
                                                        background: data.Background,
                                                        address: data.Address,
                                                        phone: data.Phone,
                                                        bio: data.Bio,
                                                        gender: mapGender(data.Gender),
                                                        pricePerHours: data.PricePerHours,
                                                        pricePerSession: data.PricePerSession,
                                                    });
                                                    
                                                    // Reload address data
                                                    let reloadAddressDataObj = null;
                                                    if (data.addressData) {
                                                        if (typeof data.addressData === 'string') {
                                                            try {
                                                                reloadAddressDataObj = JSON.parse(data.addressData);
                                                            } catch (e) {
                                                                console.error('Failed to parse addressData string on reload:', e);
                                                            }
                                                        } else {
                                                            reloadAddressDataObj = data.addressData;
                                                        }
                                                    }
                                                    
                                                    if (reloadAddressDataObj && reloadAddressDataObj.provinceId) {
                                                        setSelectedProvinceId(reloadAddressDataObj.provinceId);
                                                        try {
                                                            await locationApi.getDistricts(reloadAddressDataObj.provinceId);
                                                            
                                                            if (reloadAddressDataObj.districtId) {
                                                                setSelectedDistrictId(reloadAddressDataObj.districtId);
                                                                try {
                                                                    await locationApi.getWards(reloadAddressDataObj.districtId);
                                                                    
                                                                    if (reloadAddressDataObj.wardId) {
                                                                        setSelectedWardId(reloadAddressDataObj.wardId);
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Failed to load wards on reload:', error);
                                                                }
                                                            }
                                                        } catch (error) {
                                                            console.error('Failed to load districts on reload:', error);
                                                        }
                                                        
                                                        // Extract address detail
                                                        if (reloadAddressDataObj.detail) {
                                                            setAddressDetail(reloadAddressDataObj.detail);
                                                        } else if (data.Address) {
                                                            const fullAddr = data.Address;
                                                            const parts = fullAddr.split(', ');
                                                            if (parts.length > 3) {
                                                                setAddressDetail(parts.slice(0, -3).join(', '));
                                                            }
                                                        }
                                                    }
                                                }
                                                alert("Đã lưu thay đổi!");
                                                setShowEditModal(false);
                                            } else {
                                                alert("Lưu thất bại: " + (res.message || "Lỗi không xác định"));
                                            }
                                        } catch (error) {
                                            console.error("Error saving Dancer profile:", error);
                                            alert("Lưu thất bại: " + (error.response?.data?.message || error.message));
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#a78bfa] text-white rounded-lg hover:bg-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? t('profile.saving') : t('profile.saveChanges')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
