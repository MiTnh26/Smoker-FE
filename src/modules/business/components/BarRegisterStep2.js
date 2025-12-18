import React, { useRef } from "react";

export default function BarRegisterStep2({ info, files, previews, handleFileChange, submitStep2, isLoading ,prevStep, message, Preview }) {
  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);

  const triggerAvatar = () => avatarInputRef.current?.click();
  const triggerBackground = () => bgInputRef.current?.click();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!files.avatar || !files.background) {
      alert("Vui lòng thêm đủ ảnh đại diện và ảnh bìa trước khi hoàn thành.");
      return;
    }
    submitStep2(e);
  };

  return (
    <form onSubmit={handleSubmit} className="register-vertical-layout">
      <div className="register-form-section">
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
      </div>

      {Preview && (
        <div className="register-preview-section">
          <div className="preview-section-header">
            <h3>Cài đặt hồ sơ</h3>
            <p className="preview-section-subtitle">Đây là cách hồ sơ của bạn sẽ hiển thị</p>
          </div>
          <Preview
            name={info.barName}
            roleLabel="BAR"
            address={info.address}
            bio={info.description}
            avatar={previews.avatar}
            background={previews.background}
            phone={info.phoneNumber}
            onSelectAvatar={triggerAvatar}
            onSelectBackground={triggerBackground}
          />
        </div>
      )}

      <div className="form-navigation">
        <button type="button" onClick={prevStep} className="back-btn">
          <span>←</span> Quay lại
        </button>
        <button type="submit" className="next-btn" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : "Hoàn thành →"}
        </button>
      </div>
      {message && <p className="business-register-message">{message}</p>}
    </form>
  );
}
