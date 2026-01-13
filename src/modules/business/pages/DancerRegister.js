import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import { userApi } from "../../../api/userApi";
import { fetchAllEntities } from "../../../utils/sessionHelper";
import "../../../styles/modules/businessRegister.css";
import ProfilePreviewCard from "../components/ProfilePreviewCard";
import DancerRegisterStep1 from "../components/DancerRegisterStep1";
import { formatAddressForSave, validateAddressFields } from "../../../utils/addressFormatter";

export default function DancerRegister() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user"));

  // Step control
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState("");

  // Step 1: basic info
  const [info, setInfo] = useState({
    userName: "",
    address: "", // Will store JSON string: {"detail":"13","provinceId":"1","districtId":"21","wardId":"617"}
    phone: "",
    bio: "",
    gender: "",
    pricePerHours: "",
    pricePerSession: "",
    role: "Dancer",
  });

  // Location states for AddressSelector
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressJson, setAddressJson] = useState(null); // JSON string from AddressSelector

  // Step 2: files + preview
  const [files, setFiles] = useState({ avatar: null, background: null });
  const [previews, setPreviews] = useState({ avatar: "", background: "" });
  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);

  useEffect(() => {
    // Check if user already has a Dancer entity from session
    try {
      const session = JSON.parse(localStorage.getItem("session"));
      if (session && session.entities) {
        const hasDancer = session.entities.some(
          (e) => e.role?.toLowerCase() === "dancer" || (e.type === "Business" && e.role?.toLowerCase() === "dancer")
        );
        if (hasDancer) {
          setMessage("Tài khoản này đã đăng ký Dancer, không thể đăng ký thêm");
        }
      }
    } catch (error) {
      console.error("[DancerRegister] Error checking existing Dancer:", error);
    }
  }, []);

  // Load user profile to sync phone (not address)
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const res = await userApi.me();
        if (res?.status === "success" && res.data) {
          const user = res.data;
          
          // Update form with user's phone only (address fields remain empty)
          setInfo(prev => ({
            ...prev,
            phone: user.phone || prev.phone,
          }));
        }
      } catch (error) {
        console.error("[DancerRegister] Error loading user profile:", error);
      }
    };
    
    loadUserProfile();
  }, []);

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

  const goBackStep = () => {
    setStep(1);
  };

  const triggerAvatar = () => avatarInputRef.current?.click();
  const triggerBackground = () => bgInputRef.current?.click();

  // Submit tất cả ở bước cuối
  const handleSubmitAll = async (e) => {
    e.preventDefault();
    if (!files.avatar || !files.background) {
      alert("Vui lòng thêm đủ ảnh đại diện và ảnh bìa trước khi hoàn thành.");
      return;
    }

    // Validate address: must have all 4 fields
    if (!validateAddressFields(addressDetail, selectedProvinceId, selectedDistrictId, selectedWardId)) {
      setMessage("Vui lòng điền đầy đủ thông tin địa chỉ (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, và Địa chỉ chi tiết)");
      return;
    }

    // Format address as JSON string
    const addressJsonString = formatAddressForSave(addressDetail, selectedProvinceId, selectedDistrictId, selectedWardId);
    if (!addressJsonString) {
      setMessage("Lỗi khi format địa chỉ. Vui lòng thử lại.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) throw new Error("Không tìm thấy tài khoản. Vui lòng đăng nhập lại.");

      // B1: Gọi API registerDancer để tạo business
      const payload = {
        accountId: user.id,
        userName: info.userName.trim(),
        role: "Dancer",
        phone: info.phone || null,
        address: addressJsonString, // Store JSON string in address field
        bio: info.bio || null,
        gender: info.gender || null,
        pricePerHours: Number(info.pricePerHours) || 0,
        pricePerSession: Number(info.pricePerSession) || 0,
      };

      const res = await businessApi.create(payload);
      if (res?.status !== "success" || !res?.data?.BussinessAccountId) {
        throw new Error(res?.message || "Tạo tài khoản Dancer thất bại");
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

      // Refresh session with updated entities
      try {
        const currentSession = JSON.parse(localStorage.getItem("session"));
        if (currentSession && currentSession.account) {
          const entities = await fetchAllEntities(user.id, currentSession.account);
          currentSession.entities = entities;
          localStorage.setItem("session", JSON.stringify(currentSession));
          
          // Trigger profile update event
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("profileUpdated"));
          }
        }
      } catch (refreshError) {
        console.error("[DancerRegister] Error refreshing session:", refreshError);
        // Continue anyway, registration was successful
      }

      setIsSuccess(true);
      setMessage("Đăng ký thành công! Hồ sơ của bạn đang chờ quản trị viên duyệt.");
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="business-register-container text-center">
        <h2>Đăng ký thành công</h2>
        <p className="business-register-message">{message}</p>
        <button onClick={() => navigate('/customer/newsfeed')} className="btn-primary mt-4">
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Đăng ký Dancer</h2>
          <p className="text-sm text-muted-foreground">Hoàn thành các bước sau để tạo trang Dancer của bạn</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                1
              </div>
              <span className="text-sm font-medium text-foreground mt-2">Thông tin</span>
            </div>
            
            {/* Connector Line */}
            <div className="w-24 h-0.5 bg-border relative">
              <div className={`absolute inset-0 h-full transition-all duration-300 ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
          </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className={`text-sm mt-2 ${step >= 2 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                Hình ảnh
              </span>
            </div>
          </div>
          </div>

        {step === 1 && (
        <DancerRegisterStep1
          info={info}
          handleInfoChange={handleInfoChange}
          goNextStep={goNextStep}
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
                setInfo(prev => ({ ...prev, address: fullAddr }));
              }}
            />
      )}

      {step === 2 && (
        <div className="register-vertical-layout">
          <div className="register-form-section">
            <form onSubmit={handleSubmitAll} className="business-register-form">
              <input
                ref={avatarInputRef}
                type="file"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input-hidden"
              />
              <input
                ref={bgInputRef}
                type="file"
                name="background"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input-hidden"
              />
              <p className="form-hint">
                Nhấn trực tiếp vào avatar hoặc ảnh bìa bên dưới để chọn ảnh. Ảnh được cập nhật ngay trong phần xem trước.
              </p>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={goBackStep}
                  className="back-btn"
                  disabled={isLoading}
                >
                  Quay lại
                </button>
                <button type="submit" className="business-register-btn flex-1" disabled={isLoading}>
                  {isLoading ? "Đang đăng ký..." : "Hoàn tất đăng ký"}
                </button>
              </div>
              {message && <p className="business-register-message">{message}</p>}
            </form>
          </div>

          <div className="register-preview-section">
            <div className="preview-section-header">
              <h3>Xem trước hồ sơ</h3>
              <p className="preview-section-subtitle">Đây là cách hồ sơ của bạn sẽ hiển thị</p>
            </div>
            <ProfilePreviewCard
              name={info.userName}
              roleLabel="Dancer"
              address={info.address}
              bio={info.bio}
              avatar={previews.avatar}
              background={previews.background}
              phone={info.phone}
              onSelectAvatar={triggerAvatar}
              onSelectBackground={triggerBackground}
            />
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
