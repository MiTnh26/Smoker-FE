import React from "react";

export default function BarRegisterStep1({ info, handleInfoChange, submitStep1, isLoading }) {
  return (
    <form onSubmit={submitStep1} className="business-register-form">
      <div className="form-group">
        <label>Tên quán Bar</label>
        <input
          type="text"
          name="barName"
          value={info.barName}
          onChange={handleInfoChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Địa chỉ</label>
        <input
          type="text"
          name="address"
          value={info.address}
          onChange={handleInfoChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Số điện thoại</label>
        <input
          type="text"
          name="phoneNumber"
          value={info.phoneNumber}
          onChange={handleInfoChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={info.email}
          onChange={handleInfoChange}
          required
        />
      </div>

      <button type="submit" className="business-register-btn" disabled={isLoading}>
        {isLoading ? "Đang tạo..." : "Tạo Trang Bar"}
      </button>
    </form>
  );
}
