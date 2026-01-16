import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import { userApi } from "../../../api/userApi";
import { fetchAllEntities } from "../../../utils/sessionHelper";
import BarRegisterStep1 from "../components/BarRegisterStep1";
import BarRegisterStep2 from "../components/BarRegisterStep2";
import BarTermsModal from "../components/BarTermsModal";
import "../../../styles/modules/businessRegister.css";
import ProfilePreviewCard from "../components/ProfilePreviewCard";
import { formatAddressForSave, validateAddressFields } from "../../../utils/addressFormatter";

export default function BarRegister() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [info, setInfo] = useState({
    barName: "",
    address: "",
    phoneNumber: "",
    email: storedUser?.email || "",
    role: "Bar",
  });

  // Location states for AddressSelector
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  const [files, setFiles] = useState({ avatar: null, background: null });
  const [previews, setPreviews] = useState({ avatar: "", background: "" });

  // Load user profile to sync phone and email (not address)
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const res = await userApi.me();
        if (res?.status === "success" && res.data) {
          const user = res.data;
          
          // Update form with user's phone and email only (address fields remain empty)
          setInfo(prev => ({
            ...prev,
            phoneNumber: user.phone || prev.phoneNumber,
            email: user.email || prev.email || storedUser?.email || "",
          }));
        }
      } catch (error) {
        console.error("[BarRegister] Error loading user profile:", error);
      }
    };
    
    loadUserProfile();
  }, [storedUser?.email]);

  useEffect(() => {
    // Check if user already has a Bar entity from session
    try {
      const session = JSON.parse(localStorage.getItem("session"));
      if (session && session.entities) {
        const hasBar = session.entities.some(
          (e) => e.type === "BarPage" || (e.type === "Business" && e.role?.toLowerCase() === "bar")
        );
        if (hasBar) {
          setMessage("Tài khoản này đã tạo quán Bar, không thể tạo thêm");
        }
      }
    } catch (error) {
      console.error("[BarRegister] Error checking existing Bar:", error);
    }
  }, []);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

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

  const submitStep1 = (e) => {
    e.preventDefault();
    if (!info.barName.trim()) {
      setMessage("Vui lòng nhập tên quán Bar");
      return;
    }
    setMessage("");
    nextStep();
  };

  const submitStep2 = (e) => {
    e.preventDefault();
    if (!files.avatar && !files.background) {
      setMessage("Vui lòng chọn ít nhất một ảnh");
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

    // Clear any previous messages and show terms modal
    setMessage("");
    setShowTermsModal(true);
  };

  const handleAcceptTerms = async () => {
    // Format address as JSON string
    const addressJsonString = formatAddressForSave(addressDetail, selectedProvinceId, selectedDistrictId, selectedWardId);

    setIsLoading(true);
    setMessage("");
    setShowTermsModal(false);
    
    try {
      const res = await barPageApi.create({ 
        accountId: storedUser.id, 
        ...info,
        address: addressJsonString // Store JSON string in address field
      });
      const newBarPageId = res.data.BarPageId;

      const fd = new FormData();
      fd.append("barPageId", newBarPageId);
      if (files.avatar) fd.append("avatar", files.avatar);
      if (files.background) fd.append("background", files.background);
      fd.append("address", addressJsonString); // Store JSON string
      await barPageApi.upload(fd);

      try {
        const currentSession = JSON.parse(localStorage.getItem("session"));
        if (currentSession && currentSession.account) {
          const entities = await fetchAllEntities(storedUser.id, currentSession.account);
          currentSession.entities = entities;
          localStorage.setItem("session", JSON.stringify(currentSession));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("profileUpdated"));
          }
        }
      } catch (refreshError) {
        console.error("[BarRegister] Error refreshing session:", refreshError);
      }

      setIsSuccess(true);
      setMessage("Đăng ký thành công! Hồ sơ của bạn đang chờ quản trị viên duyệt.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Lỗi khi tạo BarPage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTermsModal = () => {
    setShowTermsModal(false);
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
          <h2 className="text-3xl font-bold text-foreground mb-2">Đăng ký Trang Quán Bar</h2>
          <p className="text-sm text-muted-foreground">Hoàn thành các bước sau để tạo trang quán Bar của bạn</p>
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
        <BarRegisterStep1
          info={info}
          handleInfoChange={handleInfoChange}
          submitStep1={submitStep1}
          isLoading={isLoading}
          message={message}
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
            // Keep full address for display purposes
            // The JSON will be stored separately via onAddressJsonChange
          }}
          onAddressJsonChange={(addressJson) => {
            // Update info.address with JSON string when valid
            if (addressJson) {
              setInfo(prev => ({ ...prev, address: addressJson }));
            }
          }}
        />
      )}

      {step === 2 && (
        <BarRegisterStep2
          info={info}
          files={files}
          previews={previews}
          handleFileChange={handleFileChange}
          submitStep2={submitStep2}
          isLoading={isLoading}
          prevStep={prevStep}
          message={message}
          Preview={ProfilePreviewCard}
        />
      )}
      </div>

      {/* Terms Modal */}
      <BarTermsModal
        isOpen={showTermsModal}
        onClose={handleCloseTermsModal}
        onAccept={handleAcceptTerms}
      />
    </div>
  );
}
