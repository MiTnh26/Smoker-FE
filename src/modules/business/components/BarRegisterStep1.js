import React from "react";
import AddressSelector from "../../../components/common/AddressSelector";

export default function BarRegisterStep1({ 
  info, 
  handleInfoChange, 
  submitStep1, 
  isLoading, 
  message,
  selectedProvinceId,
  selectedDistrictId,
  selectedWardId,
  addressDetail,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  onAddressDetailChange,
  onAddressChange
}) {
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
        <AddressSelector
          selectedProvinceId={selectedProvinceId}
          selectedDistrictId={selectedDistrictId}
          selectedWardId={selectedWardId}
          addressDetail={addressDetail}
          onProvinceChange={onProvinceChange}
          onDistrictChange={onDistrictChange}
          onWardChange={onWardChange}
          onAddressDetailChange={onAddressDetailChange}
          onAddressChange={onAddressChange}
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
        {isLoading ? "Đang tạo..." : "Tiếp tục ➜"}
      </button>
      {message && <p className="business-register-message">{message}</p>}

    </form>
  );
}
