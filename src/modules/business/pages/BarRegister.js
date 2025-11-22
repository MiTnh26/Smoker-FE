import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import { userApi } from "../../../api/userApi";
import { fetchAllEntities } from "../../../utils/sessionHelper";
import BarRegisterStep1 from "../components/BarRegisterStep1";
import BarRegisterStep2 from "../components/BarRegisterStep2";
import "../../../styles/modules/businessRegister.css";

export default function BarRegister() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState("");

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

  const buildAddress = () => {
    const parts = [];
    if (addressDetail) parts.push(addressDetail);
    return info.address || addressDetail || "";
  };

  const submitStep2 = async (e) => {
    e.preventDefault();
    if (!files.avatar && !files.background) {
      setMessage("Vui lòng chọn ít nhất một ảnh");
      return;
    }

    setIsLoading(true);
    setMessage("");
    try {
      const addressData = {
        provinceId: selectedProvinceId || null,
        districtId: selectedDistrictId || null,
        wardId: selectedWardId || null,
        detail: addressDetail || null,
        fullAddress: info.address || buildAddress() || null
      };

      const res = await barPageApi.create({ 
        accountId: storedUser.id, 
        ...info,
        addressData: addressData
      });
      const newBarPageId = res.data.BarPageId;

      const fd = new FormData();
      fd.append("barPageId", newBarPageId);
      if (files.avatar) fd.append("avatar", files.avatar);
      if (files.background) fd.append("background", files.background);
      if (selectedProvinceId || selectedDistrictId || selectedWardId) {
        fd.append("addressData", JSON.stringify(addressData));
        fd.append("address", addressData.fullAddress || info.address || "");
      }
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

  if (isSuccess) {
    return (
      <div className="business-register-container text-center">
        <h2>Đăng ký thành công</h2>
        <p className="business-register-message">{message}</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="business-register-container">
      <h2>Đăng ký Trang Quán Bar</h2>

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
            setInfo(prev => ({ ...prev, address: fullAddr }));
          }}
        />
      )}

      {step === 2 && (
        <BarRegisterStep2
          files={files}
          previews={previews}
          handleFileChange={handleFileChange}
          submitStep2={submitStep2}
          isLoading={isLoading}
          prevStep={prevStep}
          message={message}
        />
      )}

      {message && !isSuccess && <p className="business-register-message">{message}</p>}
    </div>
  );
}
