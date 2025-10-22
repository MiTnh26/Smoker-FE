import { useState } from "react";
import barPageApi from "../../../api/barPageApi";
import BarRegisterStep1 from "../components/BarRegisterStep1";
import BarRegisterStep2 from "../components/BarRegisterStep2";
import BarRegisterStep3 from "../components/BarRegisterStep3";
import BarRegisterStep4 from "../components/BarRegisterStep4";
import "../../../styles/modules/businessRegister.css";

export default function BarRegister() {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [info, setInfo] = useState({
    barName: "",
    address: "",
    phoneNumber: "",
    email: storedUser?.email || "",
    role: "Bar",
  });

  const [barPageId, setBarPageId] = useState(null);
  const [files, setFiles] = useState({ avatar: null, background: null });
  const [previews, setPreviews] = useState({ avatar: "", background: "" });

  // Handle input changes
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

  // Step 1: Create BarPage
  const submitStep1 = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const user = storedUser;
      if (!user?.id) throw new Error("Không tìm thấy tài khoản. Vui lòng đăng nhập lại.");

      const payload = {
        accountId: user.id,
        barName: info.barName.trim(),
        address: info.address || null,
        phoneNumber: info.phoneNumber || null,
        email: info.email || null,
        role: info.role,
      };

      const res = await barPageApi.create(payload);
      if (res?.status === "success" && res?.data?.BarPageId) {
        setBarPageId(res.data.BarPageId);
        setStep(2);
        setMessage("Tạo trang Bar thành công. Tiếp tục tải ảnh.");
      } else {
        throw new Error(res?.message || "Tạo trang Bar thất bại");
      }
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Upload Avatar/Background
  const submitStep2 = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      if (!barPageId) throw new Error("Thiếu BarPageId");

      const fd = new FormData();
      fd.append("barPageId", barPageId);
      if (files.avatar) fd.append("avatar", files.avatar);
      if (files.background) fd.append("background", files.background);

      const res = await barPageApi.upload(fd);
      if (res?.status === "success") {
        setMessage("Tải ảnh thành công!");
        setStep(3); // Mở rộng bước 3: tạo bàn
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

  // Step 3 and 4 are now handled by their respective components

  return (
    <div className="business-register-container">
      <h2>Đăng ký Trang Quán Bar</h2>

      {step === 1 && (
        <BarRegisterStep1
          info={info}
          handleInfoChange={handleInfoChange}
          submitStep1={submitStep1}
          isLoading={isLoading}
        />
      )}

      {step === 2 && (
        <BarRegisterStep2
          files={files}
          previews={previews}
          handleFileChange={handleFileChange}
          submitStep2={submitStep2}
          isLoading={isLoading}
        />
      )}

      {step === 3 && (
        <BarRegisterStep3
          barPageId={barPageId}
          setStep={setStep}
          isLoading={isLoading}
          setMessage={setMessage}
          setIsLoading={setIsLoading}
        />
      )}
      {step === 4 && (
        <BarRegisterStep4 
        barPageId={barPageId} 
        setMessage={setMessage} 
        setIsLoading={setIsLoading} />
      )}
      {message && <p className="business-register-message">{message}</p>}
    </div>
  );
}
