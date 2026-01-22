import React from "react";
import { ChevronDown } from "lucide-react";
import AddressSelector from "../../../components/common/AddressSelector";
import { cn } from "../../../utils/cn";

export default function DancerRegisterStep1({ 
  info, 
  handleInfoChange, 
  goNextStep,
  selectedProvinceId,
  selectedDistrictId,
  selectedWardId,
  addressDetail,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  onAddressDetailChange,
  onAddressChange,
  onAddressJsonChange
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={goNextStep}>
        <div className="space-y-6">
          {/* Tên Dancer */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Tên Dancer <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="userName"
              value={info.userName}
              onChange={handleInfoChange}
              required
              className={cn(
                "w-full px-4 py-3 rounded-lg",
                "bg-white border border-border/20",
                "text-foreground placeholder:text-muted-foreground/60 placeholder:italic",
                "outline-none transition-all duration-200",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              )}
              placeholder="Nhập tên Dancer của bạn"
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
                  onAddressJsonChange={onAddressJsonChange}
                  required={true}
                  className="space-y-3"
                />
              </div>
            </div>
          </div>

          {/* Giới tính */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Giới tính
            </label>
            <div className="relative">
              <select
                name="gender"
                value={info.gender}
                onChange={handleInfoChange}
                className={cn(
                  "w-full px-4 py-3 pr-10 rounded-lg appearance-none",
                  "bg-white border border-border/20",
                  "text-foreground",
                  "outline-none transition-all duration-200",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                )}
              >
                <option value="">-- Chọn giới tính --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Số điện thoại <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="phone"
              value={info.phone}
              onChange={handleInfoChange}
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

          {/* Giới thiệu bản thân */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Giới thiệu bản thân
            </label>
            <textarea
              name="bio"
              value={info.bio}
              onChange={handleInfoChange}
              rows={3}
              className={cn(
                "w-full px-4 py-3 rounded-lg",
                "bg-white border border-border/20",
                "text-foreground placeholder:text-muted-foreground/60 placeholder:italic",
                "outline-none transition-all duration-200 resize-none",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              )}
              placeholder="Nhập giới thiệu về bản thân"
            />
          </div>

          {/* Giá thuê - 2 cột */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Giá thuê theo giờ */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Giá thuê theo giờ (đồng)
              </label>
              <input
                type="number"
                name="pricePerHours"
                value={info.pricePerHours}
                onChange={handleInfoChange}
                min="0"
                className={cn(
                  "w-full px-4 py-3 rounded-lg",
                  "bg-white border border-border/20",
                  "text-foreground placeholder:text-muted-foreground/60 placeholder:italic",
                  "outline-none transition-all duration-200",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                )}
                placeholder="Nhập giá theo giờ"
              />
            </div>

            {/* Giá thuê theo buổi */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Giá thuê theo buổi (đồng)
              </label>
              <input
                type="number"
                name="pricePerSession"
                value={info.pricePerSession}
                onChange={handleInfoChange}
                min="0"
                className={cn(
                  "w-full px-4 py-3 rounded-lg",
                  "bg-white border border-border/20",
                  "text-foreground placeholder:text-muted-foreground/60 placeholder:italic",
                  "outline-none transition-all duration-200",
                  "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                )}
                placeholder="Nhập giá theo buổi"
              />
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
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
            Tiếp tục
            <span className="text-lg">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}

