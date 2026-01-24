// src/modules/customer/pages/BarTablesPage.js
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";
import barTableApi from "../../../api/barTableApi";
import barPageApi from "../../../api/barPageApi";
import bookingApi from "../../../api/bookingApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/customer.css";

// Combo Selection Component - REMOVED (no longer needed)

// Voucher Terms Modal Component
const VoucherTermsModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            Điều kiện & Điều khoản Voucher
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <div style={{
          fontSize: '0.9rem',
          lineHeight: '1.6',
          color: '#374151'
        }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>1. Định nghĩa:</strong><br />
            Phiếu ưu đãi (Voucher) là phiếu mua hàng và/ hoặc phiếu sử dụng dịch vụ của các nhà cung cấp dịch vụ/ hàng hóa bên thứ ba kinh doanh thông qua Ứng Dụng Smoker.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>2. Thời hạn sử dụng:</strong><br />
            Phiếu ưu đãi này chỉ được sử dụng 01 lần duy nhất và có giá trị trong vòng thời gian quy định kể từ ngày mua.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>3. Xuất trình voucher:</strong><br />
            Người dùng cần phải xuất trình phiếu ưu đãi cho quán bar trước khi thanh toán. Quán bar có quyền từ chối việc sử dụng phiếu ưu đãi nếu Người dùng cung cấp phiếu ưu đãi sau khi đã hoàn thành việc đặt lịch.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>4. Thời gian áp dụng:</strong><br />
            Phiếu ưu đãi này chỉ có thể được đổi vào các ngày và thời gian áp dụng như được nêu trên phiếu ưu đãi.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>5. Địa điểm sử dụng:</strong><br />
            Phiếu ưu đãi này chỉ có thể được đổi tại địa chỉ của quán bar phát hành nêu tại phiếu ưu đãi này, không áp dụng để đổi tại các chi nhánh khác của quán bar, nếu có.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>6. Không chia nhỏ:</strong><br />
            Phiếu ưu đãi này không thể được chia nhỏ để sử dụng cho các giao dịch khác nhau.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>7. Giá trị hóa đơn thấp hơn:</strong><br />
            Nếu giá trị hóa đơn thanh toán của bạn tại quán bar thấp hơn giá trị phiếu ưu đãi, Người dùng sẽ không được nhận lại phần giá trị chênh lệch.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>8. Giá trị hóa đơn cao hơn:</strong><br />
            Nếu giá trị hóa đơn thanh toán cao hơn giá trị phiếu ưu đãi, Người dùng phải thanh toán thêm khoản chênh lệch bằng tiền mặt hoặc các phương thức thanh toán không dùng tiền mặt khác.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>9. Không áp dụng cùng khuyến mại khác:</strong><br />
            Phiếu ưu đãi này không thể áp dụng cùng lúc với các chương trình khuyến mại, giảm giá, ưu đãi khác.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>10. Chỉ áp dụng tại quán bar:</strong><br />
            Phiếu ưu đãi này chỉ áp dụng để đổi trực tiếp tại quán bar.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>11. Phương thức thanh toán:</strong><br />
            Chỉ có phương thức thanh toán không tiền mặt (thẻ ngân hàng, ví điện tử Momo/ZaloPay trên Ứng dụng Smoker) mới được chấp nhận làm phương thức thanh toán cho phiếu ưu đãi.
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>12. Không quy đổi và chuyển nhượng:</strong><br />
            Phiếu ưu đãi không có giá trị quy đổi thành tiền mặt và không thể chuyển nhượng cho Người dùng khác.
          </p>

          <p style={{ marginBottom: '0' }}>
            <strong>13. Quyền sửa đổi:</strong><br />
            Smoker có quyền sửa đổi các điều khoản và điều kiện nếu thấy cần thiết.
          </p>
        </div>
      </div>
    </div>
  );
};

// Voucher Selector Component
const VoucherSelector = ({
  vouchers,
  selectedVoucher,
  onSelectVoucher,
  loading,
  onSkipVoucher
}) => {
  const [showTermsModal, setShowTermsModal] = useState(false);
  // API đã filter sẵn voucher khả dụng (chỉ voucher của bar này và đã được admin duyệt)
  // Chỉ cần filter theo usage count
  const availableVouchers = vouchers.filter(v =>
    (v.UsedCount || 0) < (v.MaxUsage || 0)
  );

  // Vouchers that are used up (for display with disabled state)
  const usedUpVouchers = vouchers.filter(v =>
    (v.UsedCount || 0) >= (v.MaxUsage || 0)
  );

  if (loading) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
          Voucher giảm giá (tùy chọn)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[1, 2].map(i => (
            <SkeletonCard key={i} style={{ height: '80px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          Voucher giảm giá (tùy chọn)
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTermsModal(true);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          title="Xem điều khoản và điều kiện"
        >
          <Info size={18} color="#6b7280" />
        </button>
      </div>
      
      <VoucherTermsModal open={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {/* Skip voucher option */}
        <motion.div
          onClick={onSkipVoucher}
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: selectedVoucher === null
              ? '2px solid rgb(var(--success))'
              : '2px solid #e5e7eb',
            background: selectedVoucher === null
              ? 'rgba(var(--success), 0.05)'
              : 'white',
            cursor: 'pointer',
            textAlign: 'center'
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div style={{ fontWeight: '600', color: '#1f2937' }}>Không dùng voucher</div>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '4px' }}>
            Thanh toán đầy đủ
          </div>
        </motion.div>

        {/* Available vouchers */}
        {availableVouchers.map(voucher => {
          // Tính giá bán: giảm 10% từ giá gốc (hệ thống trích 10% lợi nhuận)
          const originalValue = Number(voucher.OriginalValue) || 0;
          const salePrice = Math.round(originalValue * 0.9); // Giảm 10%
          const userBenefit = originalValue - salePrice; // Lợi ích người dùng
          
          return (
            <motion.div
              key={voucher.VoucherId}
              onClick={() => onSelectVoucher(voucher)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: selectedVoucher?.VoucherId === voucher.VoucherId
                  ? '2px solid rgb(var(--success))'
                  : '2px solid #e5e7eb',
                background: selectedVoucher?.VoucherId === voucher.VoucherId
                  ? 'rgba(var(--success), 0.05)'
                  : 'white',
                cursor: 'pointer'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1f2937' }}>
                {voucher.VoucherName}
              </div>
              
              {/* Giá bán (nổi bật) */}
              <div style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'rgb(var(--success))',
                marginBottom: '2px'
              }}>
                Giá bán: {salePrice.toLocaleString('vi-VN')} đ
              </div>
            </motion.div>
          );
        })}
        
        {/* Used up vouchers (displayed with disabled state) */}
        {usedUpVouchers.map(voucher => {
          const originalValue = Number(voucher.OriginalValue) || 0;
          const salePrice = Math.round(originalValue * 0.9);
          const isUsedUp = (voucher.UsedCount || 0) >= (voucher.MaxUsage || 0);
          
          return (
            <motion.div
              key={voucher.VoucherId}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                background: '#f9fafb',
                cursor: 'not-allowed',
                opacity: 0.5,
                position: 'relative'
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#9ca3af' }}>
                {voucher.VoucherName}
              </div>
              
              <div style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: '#9ca3af',
                marginBottom: '2px'
              }}>
                Giá bán: {salePrice.toLocaleString('vi-VN')} đ
              </div>
              
              {/* Badge hiển thị trạng thái */}
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#dc2626',
                marginTop: '4px',
                padding: '2px 6px',
                background: '#fee2e2',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                {isUsedUp ? 'Đã hết lượt sử dụng' : 'Không khả dụng'}
              </div>
            </motion.div>
          );
        })}
      </div>
      {availableVouchers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280',
          fontSize: '0.9rem'
        }}>
          Quán bar này chưa có voucher hoặc các voucher đã hết lượt sử dụng. Bạn có thể đặt bàn mà không cần voucher.
        </div>
      )}
    </div>
  );
};

// Table Icon Component - Sử dụng CSS variables
const TableIcon = ({ status, color, className = "" }) => {
  const getStatusColor = () => {
    // Nếu có màu từ table.Color (màu của loại bàn), ưu tiên dùng nó khi available
    if (status === "available" && color) {
      return color;
    }
    
    // Sử dụng CSS variables từ variables.css
    switch (status) {
      case "available": 
        return "rgb(var(--success))"; // Màu xanh từ --success
      case "booked": 
        return "rgb(var(--danger))"; // Màu đỏ từ --danger
      case "maintenance": 
        return "rgb(var(--muted-foreground))"; // Màu xám từ --muted-foreground
      default: 
        return color || "rgb(var(--muted-foreground))";
    }
  };

  const iconColor = getStatusColor();

  return (
    <svg
      className={className}
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: iconColor }}
    >
      {/* Table top */}
      <rect
        x="15"
        y="20"
        width="50"
        height="35"
        rx="5"
        fill="currentColor"
        fillOpacity={status === "booked" ? "0.4" : "0.2"}
        stroke="currentColor"
        strokeWidth="2.5"
      />
      
      {/* Status indicator */}
      {status === "booked" && (
        <text
          x="40"
          y="42"
          textAnchor="middle"
          fill="currentColor"
          fontSize="14"
          fontWeight="bold"
          opacity="0.9"
        >
          ĐÃ ĐẶT
        </text>
      )}
      
      {/* Table legs */}
      <line x1="25" y1="55" x2="25" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="55" y1="55" x2="55" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="65" x2="55" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

// Status Badge - Sử dụng CSS variables
const StatusBadge = ({ status }) => {
  const configs = {
    available: { 
      label: "Bàn trống", 
      color: "rgb(var(--success))", 
      bg: "rgba(var(--success), 0.1)" // 10% opacity của success color
    },
    booked: { 
      label: "Đã đặt", 
      color: "rgb(var(--danger))", 
      bg: "rgba(var(--danger), 0.1)" // 10% opacity của danger color
    },
    maintenance: { 
      label: "Bảo trì", 
      color: "rgb(var(--muted-foreground))", 
      bg: "rgba(var(--muted-foreground), 0.1)" // 10% opacity của muted-foreground
    }
  };
  const config = configs[status] || configs.available;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: config.bg,
      color: config.color,
      border: `1px solid ${config.color}40` // 40 = 25% opacity trong hex
    }}>
      {config.label}
    </span>
  );
};

// Booking Modal Component with Voucher (optional)
const BookingModal = ({
  open,
  onClose,
  tables = [],
  selectedDate,
  onConfirm,
  vouchers = [],
  selectedVoucher,
  onSelectVoucher,
  onSkipVoucher,
  loadingVouchers
}) => {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Calculate amounts - only deposit 100k if no voucher, or voucher price + deposit if has voucher
  const calculateAmounts = () => {
    const DEPOSIT_AMOUNT = 100000; // Cọc cố định 100k
    
    if (!selectedVoucher) {
      // Chỉ thanh toán cọc 100k
      return {
        depositAmount: DEPOSIT_AMOUNT,
        voucherPrice: 0,
        totalAmount: DEPOSIT_AMOUNT
      };
    }

    // Có voucher: tính giá bán (giảm 10% từ giá gốc) + cọc 100k
    const originalValue = Number(selectedVoucher.OriginalValue) || 0;
    const salePrice = Math.round(originalValue * 0.9); // Giảm 10%
    const totalAmount = salePrice + DEPOSIT_AMOUNT;

    return {
      depositAmount: DEPOSIT_AMOUNT,
      voucherPrice: salePrice,
      originalValue: originalValue,
      userBenefit: originalValue - salePrice,
      totalAmount: totalAmount
    };
  };

  const amounts = calculateAmounts();

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameTrimmed = customerName.trim();
    const phoneTrimmed = phone.trim();

    setPhoneError("");

    if (!nameTrimmed || !phoneTrimmed) {
      alert("Vui lòng nhập đầy đủ Tên khách hàng và Số điện thoại");
      return;
    }

    // Validate số điện thoại
    const rawPhone = phoneTrimmed.replace(/\s/g, "");
    let normalizedPhone = rawPhone;
    if (normalizedPhone.startsWith("+84")) {
      normalizedPhone = "0" + normalizedPhone.substring(3);
    } else if (normalizedPhone.startsWith("84") && normalizedPhone.length >= 10) {
      normalizedPhone = "0" + normalizedPhone.substring(2);
    }

    const isVietnameseFormat = /^0\d{9,10}$/.test(normalizedPhone);
    if (!isVietnameseFormat) {
      setPhoneError("Số điện thoại Việt Nam không hợp lệ. Ví dụ hợp lệ: 0987654321 hoặc 0912345678");
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        customerName: nameTrimmed,
        phone: normalizedPhone,
        note: note.trim(),
      });
      // Reset form
      setCustomerName("");
      setPhone("");
      setNote("");
      onClose();
    } catch (error) {
      console.error("Booking error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '24px',
          color: '#1f2937'
        }}>
          Đặt bàn
        </h2>

        {/* Bàn đã chọn */}
        {tables.length > 0 && (
          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              Bàn đã chọn: {tables[0].TableName}
            </div>
          </div>
        )}

        {/* Voucher Selection (optional) */}
        <VoucherSelector
          vouchers={vouchers}
          selectedVoucher={selectedVoucher}
          onSelectVoucher={onSelectVoucher}
          loading={loadingVouchers}
          onSkipVoucher={onSkipVoucher}
        />

        {/* Payment Summary */}
        {amounts && (
          <div style={{
            background: '#f3f4f6',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
              Tóm tắt thanh toán
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {amounts.voucherPrice > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Giá voucher:</span>
                  <span style={{ fontWeight: '600', color: 'rgb(var(--success))' }}>
                    {amounts.voucherPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tiền cọc:</span>
                <span>{amounts.depositAmount.toLocaleString('vi-VN')} đ</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #d1d5db',
                paddingTop: '8px',
                fontWeight: '700',
                fontSize: '1.1rem',
                color: 'rgb(var(--success))'
              }}>
                <span>Tổng tiền thanh toán:</span>
                <span>{amounts.totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        )}

        {/* Customer Information Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Tên khách hàng *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              placeholder="Nhập tên của bạn"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError("");
              }}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              placeholder="Ví dụ: 0987654321 hoặc 0912345678"
            />
            {phoneError && (
              <div style={{
                marginTop: '4px',
                fontSize: '0.85rem',
                color: '#b91c1c'
              }}>
                {phoneError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              placeholder="Thời gian đến, yêu cầu đặc biệt..."
            />
          </div>

          {/* Payment Notice */}
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            background: '#FEF3C7',
            borderRadius: '8px',
            border: '1px solid #FCD34D'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#92400E',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              <span>💳</span>
              <span>
                {selectedVoucher 
                  ? `Bạn sẽ thanh toán giá voucher + tiền cọc 100.000 đ. Sau khi thanh toán thành công, hệ thống sẽ tạo QR code để quán bar xác nhận.`
                  : `Bạn sẽ thanh toán tiền cọc 100.000 đ. Sau khi thanh toán thành công, hệ thống sẽ tạo QR code để quán bar xác nhận.`
                }
              </span>
            </div>
          </div>

          {/* Important Notice */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#FEE2E2',
            borderRadius: '8px',
            border: '1px solid #FCA5A5'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              color: '#991B1B'
            }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '700',
                  marginBottom: '8px',
                  fontSize: '0.95rem'
                }}>
                  Lưu ý quan trọng:
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  color: '#7F1D1D'
                }}>
                  Sau khi bạn đặt bàn và thanh toán, bạn sẽ <strong>không thể hủy</strong>. Vui lòng kiểm tra kỹ thông tin trước khi xác nhận thanh toán.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: '#3b82f6',
                color: 'white',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Đang xử lý...' : selectedVoucher ? 'Thanh toán Voucher + Cọc' : 'Thanh toán Cọc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BarTablesPage = ({ barId: propBarId }) => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  
  const barId = propBarId || params.barId;
  
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [receiverId, setReceiverId] = useState(null);

  // Filter states
  const [selectedDate, setSelectedDate] = useState(() => {
    if (propBarId) {
      return new Date().toISOString().split('T')[0];
    }
    return searchParams.get('date') || new Date().toISOString().split('T')[0];
  });

  // Booking modal with voucher (combo removed)
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  // Voucher data (combo removed)
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Fetch receiverId
  useEffect(() => {
    const fetchReceiverId = async () => {
      try {
        console.log('[BarTablesPage] Fetching bar details for barId:', barId);
        const barDetails = await barPageApi.getBarPageById(barId);
        console.log('[BarTablesPage] Bar details response:', barDetails);

        // API trả về: { status: "success", data: { EntityAccountId, ... } }
        const entityAccountId = barDetails.data?.data?.EntityAccountId;
        console.log('[BarTablesPage] Extracted EntityAccountId:', entityAccountId);

        if (entityAccountId) {
          setReceiverId(entityAccountId);
        } else {
          console.warn('[BarTablesPage] No EntityAccountId found in response');
        }
      } catch (error) {
        console.error("Error fetching bar details:", error);
      }
    };

    if (barId) {
      fetchReceiverId();
    }
  }, [barId]);

  // Fetch vouchers for this bar when barId is available
  useEffect(() => {
    const fetchBarVouchers = async () => {
      if (!barId) return;

      console.log('[BarTablesPage] fetchBarVouchers - barId:', barId, 'receiverId:', receiverId);
      console.log('[BarTablesPage] Full URL:', window.location.href);
      console.log('[BarTablesPage] Expected voucher BarPageId: 5527E08A-B130-4CDB-9338-7E111CA53467');
      console.log('[BarTablesPage] Current barId matches expected:', barId === '5527E08A-B130-4CDB-9338-7E111CA53467');

      try {
        setLoadingVouchers(true);
        // Gọi API với barId (là barPageId) để chỉ lấy voucher của quán bar này
        console.log('[BarTablesPage] Calling getAvailableVouchers with barId:', barId);
        const response = await bookingApi.getAvailableVouchers(barId);
        console.log('[BarTablesPage] API response (axios interceptor already returns response.data):', response);

        // Vì axios interceptor trả về response.data trực tiếp, response chính là API payload
        const payload = response;
        console.log('[BarTablesPage] Payload:', payload);
        console.log('[BarTablesPage] payload.success:', payload?.success);

        if (payload?.success === true) {
          // API đã filter theo barId và chỉ trả voucher đã được admin duyệt
          console.log('[BarTablesPage] Setting vouchers:', payload.data || []);
          setVouchers(payload.data || []);
        } else {
          console.log('[BarTablesPage] No success or success !== true, setting empty vouchers. Payload:', payload);
          setVouchers([]);
        }
      } catch (error) {
        console.error("Error fetching vouchers:", error);
        // Không hiển thị voucher nếu có lỗi
        setVouchers([]);
      } finally {
        setLoadingVouchers(false);
      }
    };

    fetchBarVouchers();
  }, [barId]);

  // Voucher fetching moved to barId effect above

  // Fetch bookings for date - wrap trong useCallback để tránh infinite loop
  const fetchBookingsForDate = useCallback(async (date) => {
    if (!receiverId) return [];
    
    try {
      const res = await bookingApi.getBookingsByReceiver(receiverId, { date });
      const bookings = res.data?.data || res.data || [];
      
      // Filter by date
      if (date) {
        return bookings.filter(booking => {
          const bookingDate = new Date(booking.bookingDate || booking.StartTime || booking.BookingDate);
          const filterDate = new Date(date);
          return bookingDate.toDateString() === filterDate.toDateString();
        });
      }
      
      return bookings;
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return [];
    }
  }, [receiverId]);


  // Fetch tables
  const fetchTables = useCallback(async () => {
    if (!barId) {
      setError("Không tìm thấy thông tin bar");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await barTableApi.getTablesByBar(barId);
      console.log("📊 API Response:", res);
      console.log("📊 res.data:", res.data);
      
      // API trả về { status: "success", data: [...] }
      let tablesData = [];
      if (res.data?.data && Array.isArray(res.data.data)) {
        tablesData = res.data.data;
      } else if (Array.isArray(res.data)) {
        tablesData = res.data;
      } else if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        tablesData = res.data.data;
      }
      
      console.log("📊 Tables Data:", tablesData);
      console.log("📊 Tables Count:", tablesData.length);

      if (!Array.isArray(tablesData) || tablesData.length === 0) {
        console.warn("⚠️ Không có bàn nào hoặc dữ liệu không hợp lệ");
        setTables([]);
        setLoading(false);
        return;
      }

      // Fetch bookings for selected date (chỉ khi có receiverId)
      let bookings = [];
      if (receiverId) {
        try {
          bookings = await fetchBookingsForDate(selectedDate);
          console.log("📅 Bookings for date:", bookings);
        } catch (bookingError) {
          console.warn("⚠️ Lỗi fetch bookings (tiếp tục với tables):", bookingError);
          // Tiếp tục với tables dù không fetch được bookings
        }
      }
      
      // Enhance tables with booking status
      const enhancedTables = tablesData.map(table => {
        // Find bookings for this table in the selected date
        const tableBookings = bookings.filter(booking => {
          // 1. Kiểm tra scheduleStatus:
          //    - Confirmed: luôn khoá bàn (đã khóa bàn)
          //    - Pending: luôn khoá bàn (đã khóa bàn, đang chờ xác nhận)
          //    - Ended/Canceled/Rejected: bỏ qua (có thể đặt lại)
          const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
          
          if (scheduleStatus === "Ended" || scheduleStatus === "Canceled" || scheduleStatus === "Rejected") {
            return false; // Bỏ qua booking đã ended/canceled/rejected - có thể đặt lại
          }
          
          // 2. Kiểm tra booking có trong ngày đã chọn không
          const bookingDate = booking.bookingDate || booking.BookingDate || booking.StartTime;
          if (bookingDate) {
            const bookingDateObj = new Date(bookingDate);
            const selectedDateObj = new Date(selectedDate);
            // So sánh theo ngày (bỏ qua giờ)
            if (bookingDateObj.toDateString() !== selectedDateObj.toDateString()) {
              return false; // Không cùng ngày
            }
          }

          // 3. Check if booking has this table in detailSchedule
          const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
          if (!detailSchedule || !detailSchedule.Table) {
            return false; // Không có detailSchedule hoặc Table
          }

          // detailSchedule.Table có thể là Map (MongoDB) hoặc Object
          let tableMap = detailSchedule.Table;
          
          // Nếu là Map, convert sang Object
          if (tableMap instanceof Map) {
            tableMap = Object.fromEntries(tableMap);
          }
          
          // Nếu là Object với toObject method (Mongoose document)
          if (tableMap && typeof tableMap.toObject === 'function') {
            tableMap = tableMap.toObject();
          }

          // Kiểm tra xem bàn này có trong booking không
          const tableKeys = Object.keys(tableMap || {});
          const currentTableId = table.BarTableId?.toLowerCase();
          
          const isTableInBooking = tableKeys.some(key => {
            const tableId = key.toLowerCase();
            return tableId === currentTableId;
          });

          // Chỉ block nếu bàn này có trong booking VÀ booking có trạng thái Pending hoặc Confirmed
          if (isTableInBooking && (scheduleStatus === "Confirmed" || scheduleStatus === "Pending")) {
            return true; // Khóa bàn này
          }
          
          // Các trường hợp khác không block
          return false;
        });
        
        // Bàn được coi là "booked" nếu có ít nhất 1 booking confirmed trong ngày đó
        const isBooked = tableBookings.length > 0;
        
        const status = table.Status?.toLowerCase() === 'active' 
          ? (isBooked ? 'booked' : 'available')
          : 'maintenance';

        return {
          ...table,
          status,
          isSelectable: status === 'available' && !isBooked // Chỉ selectable nếu available và không booked
        };
      });

      // Log để debug
      console.log("📅 Selected Date:", selectedDate);
      console.log("📋 Bookings for date:", bookings.length);
      console.log("📋 Bookings details:", bookings.map(b => ({
        id: b.BookedScheduleId,
        date: b.bookingDate || b.BookingDate,
        status: b.scheduleStatus || b.ScheduleStatus,
        hasDetailSchedule: !!(b.detailSchedule || b.DetailSchedule),
        tableCount: b.detailSchedule?.Table ? Object.keys(b.detailSchedule.Table).length : 0
      })));
      console.log("✅ Enhanced Tables:", enhancedTables.map(t => ({
        id: t.BarTableId,
        name: t.TableName,
        status: t.status,
        isSelectable: t.isSelectable
      })));
      setTables(enhancedTables);
    } catch (err) {
      console.error("❌ Error fetching tables:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      setError("Không tải được danh sách bàn. Vui lòng thử lại sau.");
      addToast("Lỗi tải danh sách bàn", "error");
      setTables([]); // Đảm bảo tables là array rỗng khi lỗi
    } finally {
      setLoading(false);
    }
  }, [barId, selectedDate, receiverId, addToast, fetchBookingsForDate]);

  // Apply filters
  useEffect(() => {
    console.log("🔄 Updating filteredTables, tables count:", tables.length);
    console.log("🔄 Tables:", tables);
    setFilteredTables(tables);
  }, [tables]);

  // Update URL
  useEffect(() => {
    if (!propBarId) {
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      setSearchParams(params);
    }
  }, [selectedDate, propBarId, setSearchParams]);

  // Refetch when date changes
  useEffect(() => {
    // Chỉ fetch khi có barId
    if (barId) {
      console.log("🔄 Refetching tables - barId:", barId, "receiverId:", receiverId);
      fetchTables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barId, selectedDate, receiverId]); // Loại bỏ fetchTables khỏi deps để tránh loop

  // Handle table click - chỉ cho phép chọn 1 bàn
  const handleTableClick = (table) => {
    // Kiểm tra lại trạng thái bàn trước khi cho phép chọn
    if (table.status === 'booked') {
      addToast("Bàn này đã được đặt trong ngày này", "warning");
      return;
    }
    
    if (!table.isSelectable) {
      addToast("Bàn này đã được đặt hoặc đang bảo trì", "warning");
      return;
    }
    
    // Chỉ cho phép chọn 1 bàn - nếu đã chọn bàn khác thì thay thế
    setSelectedTables(prev => {
      const isSelected = prev.some(t => t.BarTableId === table.BarTableId);
      if (isSelected) {
        // Bỏ chọn nếu click vào bàn đã chọn
        return [];
      } else {
        // Chọn bàn mới (thay thế bàn cũ nếu có)
        return [table];
      }
    });
  };

  // Handle open booking modal
  const handleOpenBookingModal = () => {
    if (selectedTables.length === 0) {
      addToast("Vui lòng chọn một bàn", "warning");
      return;
    }

    // Reset voucher selection when opening modal
    setSelectedVoucher(null);

    setBookingModalOpen(true);
  };

  // Handle voucher selection
  const handleSelectVoucher = (voucher) => {
    setSelectedVoucher(voucher);
  };

  // Handle skip voucher
  const handleSkipVoucher = () => {
    setSelectedVoucher(null);
  };

  // Handle booking confirm with voucher (optional) and deposit 100k
  const handleBookingConfirm = async (formData) => {
    if (!receiverId || selectedTables.length === 0) {
      addToast("Lỗi: Thiếu thông tin bắt buộc", "error");
      return;
    }

    try {
      // Tính startTime và endTime
      const now = new Date();
      const selectedDateObj = new Date(selectedDate);
      const isToday = selectedDateObj.toDateString() === now.toDateString();

      let startTime, endTime;
      if (isToday) {
        startTime = now.toISOString();
        const endOfDay = new Date(selectedDateObj);
        endOfDay.setHours(23, 59, 59, 999);
        endTime = endOfDay.toISOString();
      } else {
        const startOfDay = new Date(selectedDateObj);
        startOfDay.setHours(0, 0, 0, 0);
        startTime = startOfDay.toISOString();
        const endOfDay = new Date(selectedDateObj);
        endOfDay.setHours(23, 59, 59, 999);
        endTime = endOfDay.toISOString();
      }

      // Luôn dùng API createBookingWithVoucher (voucher là optional)
      // Tính giá bán: giảm 10% từ giá gốc (hệ thống trích 10% lợi nhuận)
      let salePrice = null;
      if (selectedVoucher) {
        const originalValue = Number(selectedVoucher.OriginalValue) || 0;
        salePrice = Math.round(originalValue * 0.9); // Giảm 10%
      }
      
      const bookingData = {
        receiverId: receiverId,
        tableId: selectedTables[0].BarTableId,
        voucherId: selectedVoucher?.VoucherId || null,
        salePrice: salePrice,
        bookingDate: selectedDate,
        startTime: startTime,
        endTime: endTime,
        note: `${formData.customerName} - ${formData.phone}${formData.note ? ` - ${formData.note}` : ''}`
      };

      console.log("[BarTablesPage] Creating booking:", bookingData);

      const result = await bookingApi.createBookingWithVoucher(bookingData);

      if (!result.success) {
        throw new Error(result.message || "Đặt bàn thất bại");
      }

      // API đã tạo payment link, redirect
      if (result.data?.paymentLink) {
        window.location.href = result.data.paymentLink;
      } else {
        throw new Error("Không thể tạo link thanh toán");
      }
    } catch (error) {
      console.error("Booking error:", error);
      addToast(error.message || "Lỗi khi đặt bàn", "error");
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
          Đặt bàn
        </h1>
        <p style={{ color: '#6b7280' }}>Chọn ngày và bàn phù hợp với bạn</p>
      </div>

      {/* Selected tables summary and booking button - Sử dụng CSS variables */}
      {selectedTables.length > 0 && (
        <div style={{
          background: 'rgba(var(--success), 0.1)', // 10% opacity của success
          border: '2px solid rgb(var(--success))',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontWeight: '600', color: 'rgb(var(--success))', marginBottom: '4px' }}>
              Đã chọn bàn: {selectedTables[0]?.TableName || selectedTables[0]?.name || 'Bàn đã chọn'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgb(var(--success))' }}>
              Bạn có thể chọn voucher (tùy chọn) ở bước tiếp theo
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSelectedTables([])}
              style={{
                padding: '10px 20px',
                border: '1px solid rgb(var(--success))',
                borderRadius: '8px',
                background: 'rgb(var(--card))',
                color: 'rgb(var(--success))',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Bỏ chọn
            </button>
            <button
              onClick={handleOpenBookingModal}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'rgb(var(--success))',
                color: 'rgb(var(--white))',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Đặt bàn
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Ngày
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
        </div>

      </div>

      {/* Error State */}
      {error && (
        <div style={{
          padding: '20px',
          background: '#fef2f2',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={fetchTables}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Tables Grid - 4 bàn 1 hàng */}
      <div className="bar-tables-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px'
      }}>
        <AnimatePresence>
          {filteredTables.map((table) => {
            const isDisabled = !table.isSelectable;
            const isSelected = selectedTables.some(t => t.BarTableId === table.BarTableId);
            
            return (
              <motion.div
                key={table.BarTableId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleTableClick(table)}
                style={{
                  background: isSelected ? 'rgba(var(--success), 0.1)' : 'rgb(var(--card))',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: isDisabled 
                    ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                    : isSelected
                    ? '0 4px 12px rgba(var(--success), 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: isDisabled 
                    ? `2px solid rgb(var(--border))` 
                    : isSelected
                    ? '2px solid rgb(var(--success))'
                    : '2px solid transparent',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.6 : 1,
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgb(var(--success))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgb(var(--white))',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    ✓
                  </div>
                )}

                {/* Table Icon */}
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <TableIcon status={table.status} color={table.Color} />
                </div>

                {/* Table Name */}
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  {table.TableName}
                </h3>

                {/* Status Badge */}
                <div style={{ marginBottom: '12px' }}>
                  <StatusBadge status={table.status} />
                </div>

                {/* Table Info */}
                {table.TableTypeName && (
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    margin: '0 0 8px 0'
                  }}>
                    {table.TableTypeName}
                  </p>
                )}

                {/* Disabled Overlay */}
                {isDisabled && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{
                      background: '#ef4444',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {table.status === 'booked' ? 'Đã được đặt' : 'Bảo trì'}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && filteredTables.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              Không có bàn nào
            </h3>
            <p style={{ color: '#6b7280' }}>
              Bar này chưa có bàn nào được thiết lập
            </p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
        }}
        tables={selectedTables}
        selectedDate={selectedDate}
        onConfirm={handleBookingConfirm}
        vouchers={vouchers}
        selectedVoucher={selectedVoucher}
        onSelectVoucher={handleSelectVoucher}
        onSkipVoucher={handleSkipVoucher}
        loadingVouchers={loadingVouchers}
      />
    </div>
  );
};

export default BarTablesPage;

