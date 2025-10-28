import { useNavigate } from "react-router-dom";
import "../../../styles/modules/selectAccountType.css";

export default function SelectAccountType() {
  const navigate = useNavigate();

  const handleSelect = (type) => {
    if (type === "bar") navigate("/register/bar");
    else if (type === "dj") navigate("/register/dj");
    else if (type === "dancer") navigate("/register/dancer");
  };

  return (
    <div className="select-account-type-container">
      <h2 className="text-2xl font-bold mb-4 text-center">Chọn loại tài khoản kinh doanh</h2>

      <div className="account-type-grid">
        <button onClick={() => handleSelect("bar")} className="account-type-card">
          <h3>Đăng ký quán Bar</h3>
          <p>Quản lý quán bar, sự kiện, nhân viên và đặt vé.</p>
        </button>

        <button onClick={() => handleSelect("dj")} className="account-type-card">
          <h3>Đăng ký DJ</h3>
          <p>Tạo hồ sơ DJ, nhận booking và quảng bá bản thân.</p>
        </button>

        <button onClick={() => handleSelect("dancer")} className="account-type-card">
          <h3>Đăng ký Dancer</h3>
          <p>Đăng hồ sơ biểu diễn, nhận show và kết nối với bar.</p>
        </button>
      </div>
    </div>
  );
}
