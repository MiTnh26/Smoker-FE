import React from "react";

export default function BarRegisterStep2({ files, previews, handleFileChange, submitStep2, isLoading ,prevStep, message}) {
  return (
    <form onSubmit={submitStep2} className="business-register-form">
      <div className="form-group">
        <label>Ảnh đại diện (Avatar)</label>
        <input type="file" name="avatar" accept="image/*" onChange={handleFileChange} />
        {previews.avatar && (
          <img src={previews.avatar} alt="avatar preview" className="preview-image" />
        )}
      </div>

      <div className="form-group">
        <label>Ảnh bìa (Background)</label>
        <input type="file" name="background" accept="image/*" onChange={handleFileChange} />
        {previews.background && (
          <img src={previews.background} alt="background preview" className="preview-image" />
        )}
      </div>

      <div className="form-navigation">
        <button type="button" onClick={prevStep} className="back-btn">⬅ Quay lại</button>
        <button type="submit" className="next-btn" disabled={isLoading}>
          {isLoading ? "Đang tải ảnh..." : "Tiếp tục ➜"}
        </button>
      </div>
      {message && <p className="business-register-message">{message}</p>}

    </form>
  );
}
