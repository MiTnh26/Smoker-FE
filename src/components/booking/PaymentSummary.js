import React from "react";
import PropTypes from "prop-types";
import { Receipt } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * PaymentSummary Component - Receipt Card Style
 * Hiển thị thông tin thanh toán theo phong cách hóa đơn thu gọn
 */
export default function PaymentSummary({
  selectedSlots,
  priceCalculation,
  maxConsecutiveSlots,
  depositAmount,
  className = ""
}) {
  if (!selectedSlots || selectedSlots.length === 0 || !priceCalculation || priceCalculation.unitPrice <= 0) {
    return null;
  }

  const { unitPrice, totalPrice, priceType } = priceCalculation;
  const remaining = totalPrice > depositAmount ? totalPrice - depositAmount : 0;
  
  // Determine price label
  const priceLabel = priceType === 'pricePerSession' 
    ? 'Ưu đãi' 
    : 'Tiêu chuẩn';

  // Format dotted line helper
  const DottedLine = ({ width = '100%' }) => (
    <span className="flex-1 border-b border-dotted border-gray-300 mx-2" style={{ minWidth: '20px' }} />
  );

  return (
    <div className={cn(
      "bg-gray-50 rounded-lg border border-gray-200 p-4",
      "shadow-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Receipt size={18} className="text-gray-700" />
        <span className="text-sm font-semibold text-foreground">
          Thông tin thanh toán
        </span>
      </div>

      {/* Content */}
      <div className="space-y-3 text-sm">
        {/* Số slot đã chọn */}
        <div className="flex justify-between">
          <span className="text-foreground">Số slot đã chọn:</span>
          <span className="font-semibold text-foreground">{selectedSlots.length} slot</span>
        </div>

        {/* Đơn giá */}
        <div className="flex items-center justify-between">
          <span className="text-foreground">
            {selectedSlots.length} slot ({priceLabel})
          </span>
          <div className="flex items-center flex-1 max-w-[200px]">
            <DottedLine />
            <span className="text-foreground font-medium whitespace-nowrap">
              {unitPrice.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 pt-3 mt-3">
          {/* Tổng tiền */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base text-foreground">TỔNG TIỀN</span>
            <div className="flex items-center flex-1 max-w-[200px]">
              <DottedLine />
              <span className="font-bold text-lg text-primary whitespace-nowrap">
                {totalPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Đặt cọc */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">Đặt cọc</span>
            <div className="flex items-center flex-1 max-w-[200px]">
              <DottedLine />
              <span className="text-muted-foreground font-semibold whitespace-nowrap">
                {depositAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Còn lại */}
          {remaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Còn lại</span>
              <div className="flex items-center flex-1 max-w-[200px]">
                <DottedLine />
                <span className="text-muted-foreground whitespace-nowrap">
                  {remaining.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

PaymentSummary.propTypes = {
  selectedSlots: PropTypes.arrayOf(PropTypes.number).isRequired,
  priceCalculation: PropTypes.shape({
    unitPrice: PropTypes.number.isRequired,
    totalPrice: PropTypes.number.isRequired,
    priceType: PropTypes.oneOf(['pricePerHour', 'pricePerSession']).isRequired
  }).isRequired,
  maxConsecutiveSlots: PropTypes.number.isRequired,
  depositAmount: PropTypes.number.isRequired,
  className: PropTypes.string
};

