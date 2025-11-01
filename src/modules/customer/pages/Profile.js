import React, { useEffect, useState } from "react";
import { userApi } from "../../../api/userApi";
import { locationApi } from "../../../api/locationApi";
import axiosClient from "../../../api/axiosClient";
import { Button } from "../../../components/common/Button";
import AddressSelector from "../../../components/common/AddressSelector";
import "../../../styles/modules/profile.css";
import ProfileFollowInfo from "../components/ProfileFollowInfo";

export default function Profile() {
  const [profile, setProfile] = useState({
    userName: "",
    email: "",
    avatar: "",
    background: "",
    bio: "",
    address: "",
    phone: "",
    gender: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const handleEditClick = () => setShowEditModal(true);
  const handleCloseEdit = () => setShowEditModal(false);
  const [editingField, setEditingField] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // info, posts, videos, reviews
  
  // Location states
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.me();
        if (res.status === "success" && res.data) {
          setProfile(res.data);
          
          // Load structured address data if available
          if (res.data.addressData) {
            if (res.data.addressData.provinceId) {
              setSelectedProvinceId(res.data.addressData.provinceId);
              const districtsData = await locationApi.getDistricts(res.data.addressData.provinceId);
              // Store districts data - we'll need to manage this state
              
              if (res.data.addressData.districtId) {
                setSelectedDistrictId(res.data.addressData.districtId);
                const wardsData = await locationApi.getWards(res.data.addressData.districtId);
                
                if (res.data.addressData.wardId) {
                  setSelectedWardId(res.data.addressData.wardId);
                }
              }
            }
            // Extract address detail if stored separately
            if (res.data.address && res.data.addressData) {
              // Try to extract detail from full address
              const fullAddr = res.data.address;
              const parts = fullAddr.split(', ');
              if (parts.length > 3) {
                setAddressDetail(parts.slice(0, -3).join(', '));
              }
            }
          }
          
          // Load user posts after profile is loaded
          await loadUserPosts(res.data.id);
        } else setError(res.message || "Không tải được hồ sơ");
      } catch (e) {
        setError(e?.response?.data?.message || "Không tải được hồ sơ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadUserPosts = async (userId) => {
    try {
      setPostsLoading(true);
      
      // Get session to determine current user
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }
      
      const currentUserId = session?.activeEntity?.id || session?.account?.id;
      
      // Load posts from posts collection
      const postsResponse = await axiosClient.get(`/posts/author/${currentUserId}`);
      const posts = postsResponse.success ? postsResponse.data : [];
      
      // Load music posts from musics collection  
      const musicResponse = await axiosClient.get(`/music/author/${currentUserId}`);
      const musics = musicResponse.success ? musicResponse.data : [];
      
      // Transform and combine posts
      const transformedPosts = posts.map(post => ({
        id: post._id,
        type: 'post',
        title: post.title || post["Tiêu Đề"],
        content: post.content || post.caption,
        image: post.url && post.url !== "default-post.jpg" ? post.url : null,
        createdAt: post.createdAt,
        likes: post.likes ? Object.keys(post.likes).length : 0,
        comments: post.comments ? Object.keys(post.comments).length : 0,
        authorName: post.authorEntityName || "Người dùng",
        authorAvatar: post.authorEntityAvatar || null
      }));
      
      const transformedMusics = musics.map(music => ({
        id: music._id,
        type: 'music',
        title: music["Tên Bài Nhạc"],
        content: music["Chi Tiết"],
        image: music["Ảnh Nền Bài Nhạc"],
        audioUrl: music["Link Mua Nhạc"],
        artist: music["Tên Nghệ Sĩ"],
        createdAt: music.createdAt,
        likes: music["Thích"] ? Object.keys(music["Thích"]).length : 0,
        comments: music["Bình Luận"] ? Object.keys(music["Bình Luận"]).length : 0,
        authorName: music.authorEntityName || "Người dùng",
        authorAvatar: music.authorEntityAvatar || null
      }));
      
      // Combine and sort by creation date
      const allPosts = [...transformedPosts, ...transformedMusics]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setUserPosts(allPosts);
    } catch (error) {
      console.error("Error loading user posts:", error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleFileUpload = async (file, type) => {
    try {
      console.log(`[UPLOAD] Starting upload for ${type}`);
      console.log(`[UPLOAD] File details:`, { name: file.name, size: file.size, type: file.type });
      
      if (type === 'avatar') {
        setUploadingAvatar(true);
      } else {
        setUploadingBackground(true);
      }

      const formData = new FormData();
      formData.append('images', file);
      console.log(`[UPLOAD] FormData created, posting to /posts/upload`);

      const response = await axiosClient.post('/posts/upload', formData);
      console.log(`[UPLOAD] Response received:`, response);
      
      const uploadedFile = response.data?.[0] || response.data;
      console.log(`[UPLOAD] Uploaded file:`, uploadedFile);

      if (uploadedFile && uploadedFile.url) {
        const url = uploadedFile.url;
        console.log(`[UPLOAD] Success! URL:`, url);
        
        if (type === 'avatar') {
          setProfile(prev => ({ ...prev, avatar: url }));
        } else {
          setProfile(prev => ({ ...prev, background: url }));
        }
        return url;
      } else {
        console.error(`[UPLOAD] Upload failed - no URL in response`);
        throw new Error('Upload failed - no URL in response');
      }
    } catch (error) {
      console.error(`[UPLOAD] Error uploading ${type}:`, error);
      console.error(`[UPLOAD] Error details:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert('Upload ảnh thất bại. Vui lòng thử lại.');
      return null;
    } finally {
      if (type === 'avatar') {
        setUploadingAvatar(false);
      } else {
        setUploadingBackground(false);
      }
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh hợp lệ.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 5MB.');
        return;
      }

      await handleFileUpload(file, 'avatar');
    }
  };

  const handleBackgroundChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh hợp lệ.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 5MB.');
        return;
      }

      await handleFileUpload(file, 'background');
    }
  };

  const handleSaveProfile = async () => {
    try {
      console.log(`[SAVE PROFILE] Starting save`);
      setSaving(true);
      
      // Full address is already built by AddressSelector via onAddressChange
      let fullAddress = profile.address || '';
      
      // Prepare FormData for profile update
      const formData = new FormData();
      formData.append('userName', profile.userName || '');
      formData.append('bio', profile.bio || '');
      formData.append('address', fullAddress);
      
      // Send structured address data
      if (selectedProvinceId || selectedDistrictId || selectedWardId) {
        formData.append('addressData', JSON.stringify({
          provinceId: selectedProvinceId,
          districtId: selectedDistrictId,
          wardId: selectedWardId,
          fullAddress: fullAddress,
          detail: addressDetail
        }));
      }
      
      formData.append('phone', profile.phone || '');
      formData.append('gender', profile.gender || '');
      
      // IMPORTANT: Send avatar and background URLs as text fields
      // Backend will use these URLs if provided, otherwise keep current ones
      if (profile.avatar) {
        formData.append('avatar', profile.avatar);
        console.log(`[SAVE PROFILE] Sending avatar URL: ${profile.avatar.substring(0, 50)}...`);
      }
      if (profile.background) {
        formData.append('background', profile.background);
        console.log(`[SAVE PROFILE] Sending background URL: ${profile.background.substring(0, 50)}...`);
      }
      
      console.log(`[SAVE PROFILE] Profile data:`, {
        userName: profile.userName,
        bio: profile.bio,
        address: profile.address,
        phone: profile.phone,
        gender: profile.gender,
        avatar: profile.avatar?.substring(0, 50) + '...',
        background: profile.background?.substring(0, 50) + '...'
      });
      
      // Call API to update profile
      console.log(`[SAVE PROFILE] Sending request to /user/profile`);
      const response = await axiosClient.put('/user/profile', formData);
      console.log(`[SAVE PROFILE] Response received:`, response);
      
      if (response.status === "success") {
        console.log(`[SAVE PROFILE] Success!`);
        
        // Reload profile data from API
        console.log(`[SAVE PROFILE] Reloading profile data`);
        const res = await userApi.me();
        if (res.status === "success" && res.data) {
          setProfile(res.data);
          console.log(`[SAVE PROFILE] Profile reloaded`);
          
          // IMPORTANT: Update session in localStorage so other components show new avatar
          try {
            const sessionRaw = localStorage.getItem("session");
            if (sessionRaw) {
              const session = JSON.parse(sessionRaw);
              console.log(`[SAVE PROFILE] Current session:`, session);
              
              // Update avatar in session
              if (session.account) {
                console.log(`[SAVE PROFILE] Updating account.avatar from ${session.account.avatar} to ${res.data.avatar}`);
                session.account.avatar = res.data.avatar;
                session.account.userName = res.data.userName;
              }
              
              // Update activeEntity if exists
              if (session.activeEntity) {
                console.log(`[SAVE PROFILE] Updating activeEntity.avatar from ${session.activeEntity.avatar} to ${res.data.avatar}`);
                session.activeEntity.avatar = res.data.avatar;
                session.activeEntity.name = res.data.userName;
              }
              
              // Update entities array if exists
              if (session.entities && Array.isArray(session.entities)) {
                session.entities.forEach(entity => {
                  if (entity.type === "Account" && entity.id === session.account?.id) {
                    console.log(`[SAVE PROFILE] Updating entity.avatar in entities array`);
                    entity.avatar = res.data.avatar;
                    entity.name = res.data.userName;
                  }
                });
              }
              
              localStorage.setItem("session", JSON.stringify(session));
              console.log(`[SAVE PROFILE] Session updated in localStorage`);
              
              // Dispatch custom event to notify other components
              const event = new Event('profileUpdated');
              window.dispatchEvent(event);
              console.log(`[SAVE PROFILE] Dispatched profileUpdated event`);
              
              // Force a page reload after a short delay to ensure all components update
              console.log(`[SAVE PROFILE] Dispatching customEvent with detail`);
              const customEvent = new CustomEvent('profileUpdated', { 
                detail: { avatar: res.data.avatar, userName: res.data.userName }
              });
              window.dispatchEvent(customEvent);
              console.log(`[SAVE PROFILE] Dispatched customEvent with detail`);
            }
          } catch (error) {
            console.error(`[SAVE PROFILE] Error updating session:`, error);
          }
        }
        
        alert("Cập nhật hồ sơ thành công!");
        setShowEditModal(false);
        setEditingField(null);
      } else {
        console.error(`[SAVE PROFILE] Save failed:`, response.message);
        alert("Cập nhật thất bại: " + (response.message || "Lỗi không xác định"));
      }
    } catch (error) {
      console.error("[SAVE PROFILE] Error updating profile:", error);
      console.error("[SAVE PROFILE] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert("Cập nhật thất bại: " + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="profile-loading">Đang tải hồ sơ...</div>;

  return (
    <div className="profile-container">
      {/* --- COVER & AVATAR --- */}
      <section
        className="profile-cover"
        style={{
          backgroundImage: `url(${profile.background || "https://i.imgur.com/6IUbEMn.jpg"
            })`,
        }}
      >
        <div className="profile-info-header">
          <div className="avatar-container">
            <img
              src={profile.avatar || "https://via.placeholder.com/120"}
              alt="avatar"
              className="profile-avatar"
            />
            {/* Thay nút bằng icon nhỏ góc avatar */}
            <i className="bx bx-camera text-[#a78bfa] text-xl cursor-pointer hover:text-white transition"></i>
          </div>

          <div className="profile-details">
            <h2>{profile.userName || "Người dùng mới"}</h2>
            <p>{profile.address || "Chưa có địa chỉ"}</p>
            <p>{profile.gender || "Chưa có địa chỉ"}</p>
            <p>
              Giá thuê: <span className="highlight">300k/giờ</span>
            </p>
            <p>⭐ 4.1 (5 đánh giá)</p>
          </div>

           <div className="profile-actions flex gap-3 items-center">
            <i className="bx bx-share-alt text-[#a78bfa] text-2xl cursor-pointer hover:text-white transition"></i>

            {/* 🟢 Nút chỉnh sửa hồ sơ */}
            <button
              onClick={handleEditClick}
              className="flex items-center gap-1 px-3 py-1 bg-[#a78bfa] text-white rounded-xl hover:bg-[#8b5cf6] transition"
            >
              <i className="bx bx-edit text-lg"></i>
              Chỉnh sửa hồ sơ
            </button>
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
        <button 
          className={activeTab === "videos" ? "active" : ""}
          onClick={() => setActiveTab("videos")}
        >
          Video
        </button>
        <button 
          className={activeTab === "reviews" ? "active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          Đánh giá
        </button>
      </div>

      {/* --- MAIN CONTENT (TAB: INFO) --- */}
      {activeTab === "info" && (
        <div className="profile-body">
          {/* LEFT */}
          <div className="profile-left">
            <div className="profile-card">
              <h3 className="section-title">Sự kiện</h3>
              <div className="event-list">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="event-circle" />
                ))}
              </div>
            </div>

            <div className="profile-card mt-4">
              <h3 className="section-title">Menu</h3>
              <div className="menu-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="menu-item" />
                ))}
              </div>
              {/* Chuyển nút thành biểu tượng cây bút nhỏ ở góc */}
              <div className="flex justify-end mt-2">
                <i className="bx bx-edit-alt text-[#a78bfa] cursor-pointer hover:text-white transition"></i>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <ProfileFollowInfo
            followers={profile.followers || 2}
            following={profile.following || 2}
            friends={profile.friends || 2}
            bio={profile.bio}
          />
        </div>
      )}

      {/* --- TAB: POSTS --- */}
      {activeTab === "posts" && (
        <div className="profile-posts-tab">
          {/* POST CREATE AREA */}
          <section className="post-section">
            <div className="post-create">
              <img
                src={profile.avatar || "https://via.placeholder.com/40"}
                alt="avatar"
                className="avatar-small"
              />
              <input type="text" placeholder="Bạn muốn đăng gì..." />
              <i className="bx bx-image text-[#a78bfa] text-xl"></i>
            </div>
          </section>

          {/* POST LIST */}
          <section className="post-list">
            {postsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Đang tải bài viết...</p>
              </div>
            ) : userPosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Chưa có bài viết nào.</p>
              </div>
            ) : (
              userPosts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.authorAvatar || profile.avatar || "https://via.placeholder.com/40"}
                        alt="avatar"
                        className="avatar-small"
                      />
                      <div>
                        <h4>{post.authorName || profile.userName || "Người dùng"}</h4>
                        <p className="text-sm text-gray-400">
                          {new Date(post.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.type === 'music' && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">🎵 Nhạc</span>}
                      <i className="bx bx-dots-horizontal-rounded text-[#a78bfa]"></i>
                    </div>
                  </div>
                  
                  <div className="post-content mt-3">
                    <h5 className="font-semibold mb-2">{post.title}</h5>
                    <p>{post.content}</p>
                    {post.type === 'music' && post.artist && (
                      <p className="text-sm text-gray-500 mt-1">🎤 {post.artist}</p>
                    )}
                  </div>
                  
                  {post.image && (
                    <div className="post-image mt-3">
                      <img 
                        src={post.image} 
                        alt="post" 
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  {post.type === 'music' && post.audioUrl && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <audio controls className="w-full">
                        <source src={post.audioUrl} type="audio/mpeg" />
                        Trình duyệt không hỗ trợ phát audio.
                      </audio>
                    </div>
                  )}
                  
                  <div className="post-actions mt-3">
                    <button>❤️ {post.likes}</button>
                    <button>💬 {post.comments}</button>
                    <button>↗️ Chia sẻ</button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* --- TAB: VIDEOS --- */}
      {activeTab === "videos" && (
        <div className="profile-videos-tab">
          <div className="text-center py-12">
            <i className="bx bx-video text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-400 text-lg">Chức năng Video đang được phát triển</p>
          </div>
        </div>
      )}

      {/* --- TAB: REVIEWS --- */}
      {activeTab === "reviews" && (
        <div className="profile-reviews-tab">
          <div className="text-center py-12">
            <i className="bx bx-star text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-400 text-lg">Chức năng Đánh giá đang được phát triển</p>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-semibold mb-5 text-center">
              Chỉnh sửa hồ sơ cá nhân
            </h3>

            <div className="space-y-6">
              {/* --- Ảnh đại diện --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profile.avatar || "https://via.placeholder.com/100"}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border"
                    />
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="text-white text-xs">Đang upload...</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-lg">Ảnh đại diện</p>
                    <p className="text-sm text-gray-500">Hiển thị cho người dùng</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "avatar" ? null : "avatar")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "avatar" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "avatar" && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload ảnh từ máy tính:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    {uploadingAvatar && (
                      <p className="text-sm text-blue-600 mt-1">Đang upload ảnh...</p>
                    )}
                  </div>
                  <div className="text-center text-gray-500">hoặc</div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nhập link ảnh:</label>
                    <input
                      type="text"
                      placeholder="Nhập link ảnh đại diện..."
                      value={profile.avatar || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, avatar: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {/* --- Ảnh nền --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profile.background || "https://i.imgur.com/6IUbEMn.jpg"}
                      alt="Background"
                      className="w-24 h-16 rounded-lg object-cover border"
                    />
                    {uploadingBackground && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="text-white text-xs">Đang upload...</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-lg">Ảnh bìa</p>
                    <p className="text-sm text-gray-500">Hiển thị ở đầu trang</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "background" ? null : "background")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "background" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "background" && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload ảnh từ máy tính:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundChange}
                      disabled={uploadingBackground}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    {uploadingBackground && (
                      <p className="text-sm text-blue-600 mt-1">Đang upload ảnh...</p>
                    )}
                  </div>
                  <div className="text-center text-gray-500">hoặc</div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nhập link ảnh:</label>
                    <input
                      type="text"
                      placeholder="Nhập link ảnh bìa..."
                      value={profile.background || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, background: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {/* --- Tiểu sử / Bio --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="font-medium text-lg">Tiểu sử</p>
                  <p className="text-sm text-gray-500">
                    {profile.bio || "Chưa có tiểu sử"}
                  </p>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "bio" ? null : "bio")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "bio" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "bio" && (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                    value={profile.bio || ""}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {/* --- Thông tin chi tiết --- */}
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <p className="font-medium text-lg mb-1">Thông tin chi tiết</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Tên:</strong> {profile.userName || "Chưa có tên"}</p>
                    <p><strong>Địa chỉ:</strong> {profile.address || "Chưa có địa chỉ"}</p>
                    <p><strong>Điện thoại:</strong> {profile.phone || "Chưa có"}</p>
                    <p><strong>Email:</strong> {profile.email || "Chưa có"}</p>
                    <p><strong>Giới tính:</strong> {profile.gender || "Chưa có"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "info" ? null : "info")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium self-start"
                >
                  {editingField === "info" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>

              {editingField === "info" && (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium">Tên:</span>
                    <input
                      type="text"
                      value={profile.userName || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, userName: e.target.value }))
                      }
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
                    <span className="text-sm font-medium">Điện thoại:</span>
                    <input
                      type="text"
                      value={profile.phone || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Giới tính:</span>
                    <select
                      value={profile.gender || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, gender: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </label>
                </div>
              )}

              {/* --- Nút Lưu / Hủy --- */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleCloseEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-[#a78bfa] text-white rounded-lg hover:bg-[#8b5cf6] disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
