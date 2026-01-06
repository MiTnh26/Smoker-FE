import React from "react";
import { ChevronDown } from "lucide-react";
import AddressSelector from "../../../components/common/AddressSelector";
import { cn } from "../../../utils/cn";

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
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={submitStep1}>
        <div className="space-y-6">
          {/* Tên quán Bar */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Tên quán Bar <span className="text-destructive">*</span>
            </label>
        <input
          type="text"
          name="barName"
          value={info.barName}
          onChange={handleInfoChange}
          required
              className={cn(
                "w-full px-4 py-3 rounded-lg",
                "bg-white border border-border/20",
                "text-foreground placeholder:text-muted-foreground/60 placeholder:italic",
                "outline-none transition-all duration-200",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              )}
              placeholder="Nhập tên quán Bar của bạn"
        />
      </div>

          {/* Địa chỉ */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Địa chỉ
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Tỉnh/Thành phố
                </label>
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
                  className="space-y-3"
        />
              </div>
            </div>
      </div>

          {/* Số điện thoại và Email - 2 cột */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Số điện thoại */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Số điện thoại <span className="text-destructive">*</span>
              </label>
        <input
          type="text"
          name="phoneNumber"
          value={info.phoneNumber}
          onChange={handleInfoChange}
          required
                className={cn(
                  "w-full px-4 py-3 rounded-lg",
                  "bg-white border border-border/20",
                  "text-foreground placeholder:text-muted-foreground/60 placeholder:italic",
                  "outline-none transition-all duration-200",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                )}
                placeholder="Nhập số điện thoại"
        />
      </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Email <span className="text-destructive">*</span>
              </label>
        <input
          type="email"
          name="email"
          value={info.email}
          onChange={handleInfoChange}
          required
                className={cn(
                  "w-full px-4 py-3 rounded-lg",
                  "bg-white border border-border/20",
                  "text-foreground placeholder:text-muted-foreground/60 placeholder:italic",
                  "outline-none transition-all duration-200",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                )}
                placeholder="Nhập email"
        />
      </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full px-6 py-3 rounded-lg",
              "bg-[#00B2FF] text-white",
              "font-semibold text-base",
              "transition-all duration-200",
              "hover:bg-[#0099E6] hover:shadow-lg",
              "active:scale-[0.98]",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#00B2FF]",
              "flex items-center justify-center gap-2"
            )}
          >
            {isLoading ? "Đang tạo..." : (
              <>
                Tiếp tục
                <span className="text-lg">→</span>
              </>
            )}
      </button>

          {message && (
            <p className="text-sm text-destructive text-center">{message}</p>
          )}
        </div>
    </form>
    </div>
  );
}
