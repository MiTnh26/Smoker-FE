import { useState, useEffect } from "react";
import barPageApi from "../../../api/barPageApi";
import BarRegisterStep1 from "../components/BarRegisterStep1";
import BarRegisterStep2 from "../components/BarRegisterStep2";
import BarRegisterStep3 from "../components/BarRegisterStep3";
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

  const [files, setFiles] = useState({ avatar: null, background: null });
  const [previews, setPreviews] = useState({ avatar: "", background: "" });
  const [tableTypes, setTableTypes] = useState([]);

  useEffect(() => {
    if (storedUser?.businessId) {
      setMessage("Tài khoản này đã tạo quán Bar, không thể tạo thêm");
    }
  }, [storedUser]);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
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

  // -------------------
  // Step 1: Thông tin quán
  // -------------------
  const submitStep1 = (e) => {
    e.preventDefault();
    if (!info.barName.trim()) {
      setMessage("Vui lòng nhập tên quán Bar");
      return;
    }
    setMessage("");
    nextStep();
  };

  // -------------------
  // Step 2: Ảnh quán
  // -------------------
  const submitStep2 = (e) => {
    e.preventDefault();
    if (!files.avatar && !files.background) {
      setMessage("Vui lòng chọn ít nhất một ảnh");
      return;
    }
    setMessage("");
    nextStep();
  };

  // -------------------
  // Step 3: Loại bàn và tạo BarPage
  // -------------------
  const submitStep3 = async (e) => {
    e.preventDefault();
    if (tableTypes.length === 0 || tableTypes.some(t => !t.name.trim())) {
      setMessage("Vui lòng nhập ít nhất một loại bàn hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      // 1️⃣ Tạo BarPage
      const res = await barPageApi.create({ accountId: storedUser.id, ...info });
      const newBarPageId = res.data.BarPageId;

      // 2️⃣ Upload ảnh
      const fd = new FormData();
      fd.append("barPageId", newBarPageId);
      if (files.avatar) fd.append("avatar", files.avatar);
      if (files.background) fd.append("background", files.background);
      await barPageApi.upload(fd);

      // 3️⃣ Tạo loại bàn
      await barPageApi.createTableTypes({ barPageId: newBarPageId, tableTypes });

      // 4️⃣ Cập nhật session và redirect
      const updatedUser = { ...storedUser, role: "bar", businessId: newBarPageId };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setMessage("Tạo BarPage thành công!");
      window.location.href = `/bar/profile/${newBarPageId}`;
    } catch (err) {
      setMessage(err.response?.data?.message || "Lỗi khi tạo BarPage");
    } finally {
      setIsLoading(false);
    }
  };

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

      {step === 3 && (
        <BarRegisterStep3
          tableTypes={tableTypes}
          setTableTypes={setTableTypes}
          submitStep3={submitStep3}
          isLoading={isLoading}
          prevStep={prevStep}
          message={message}
        />
      )}

      {message && <p className="business-register-message">{message}</p>}
    </div>
  );
}
