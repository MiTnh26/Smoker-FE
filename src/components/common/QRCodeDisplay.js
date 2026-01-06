// src/components/common/QRCodeDisplay.js
import { useState, useEffect } from "react";
import bookingApi from "../../api/bookingApi";

const QRCodeDisplay = ({ bookingId, onError }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await bookingApi.getBookingQRCode(bookingId);
        // axiosClient có interceptor unwrap response.data => response có thể là payload {success, data, ...}
        const payload = response?.success !== undefined ? response : response?.data;
        if (payload?.success) {
          setQrData(payload.data);
        } else {
          throw new Error(payload?.message || "Không thể tải QR code");
        }
      } catch (err) {
        console.error("Error fetching QR code:", err);
        setError(err.message || "Không thể tải QR code");
        if (onError) onError(err);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchQRCode();
    }
  }, [bookingId, onError]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          width: '200px',
          height: '200px',
          background: '#e5e7eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #d1d5db',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'qr-spin 1s linear infinite'
          }} />
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Đang tải QR code...
        </p>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes qr-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          color: '#dc2626'
        }}>
          ⚠️
        </div>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          color: '#dc2626',
          marginBottom: '8px'
        }}>
          Không thể tải QR code
        </h3>
        <p style={{
          color: '#7f1d1d',
          fontSize: '0.9rem'
        }}>
          {error}
        </p>
      </div>
    );
  }

  if (!qrData) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
      background: '#f9fafb',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        QR Code Xác Nhận
      </h3>

      <p style={{
        color: '#6b7280',
        fontSize: '0.9rem',
        textAlign: 'center',
        marginBottom: '20px',
        maxWidth: '300px'
      }}>
        Hãy đưa mã QR này cho nhân viên quán bar khi bạn đến để xác nhận đã có mặt.
      </p>

      {/* QR Code Image */}
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <img
          src={qrData.qrCode}
          alt="Booking QR Code"
          style={{
            width: '200px',
            height: '200px',
            display: 'block'
          }}
        />
      </div>

      {/* Booking Details */}
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '300px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '0.9rem'
        }}>
          <span style={{ color: '#6b7280' }}>Combo:</span>
          <span style={{ fontWeight: '600', color: '#1f2937' }}>
            {qrData.bookingDetails.comboName}
          </span>
        </div>

       

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '0.9rem'
        }}>
          <span style={{ color: '#6b7280' }}>Ngày:</span>
          <span style={{ fontWeight: '600', color: '#1f2937' }}>
            {new Date(qrData.bookingDetails.bookingDate).toLocaleDateString('vi-VN')}
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '0.9rem'
        }}>
          <span style={{ color: '#6b7280' }}>Số tiền:</span>
          <span style={{ fontWeight: '600', color: 'rgb(var(--success))' }}>
            {qrData.bookingDetails.amount.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.9rem'
        }}>
          <span style={{ color: '#6b7280' }}>Trạng thái:</span>
          <span style={{
            fontWeight: '600',
            color: qrData.bookingDetails.status === 'Arrived' || qrData.bookingDetails.status === 'Confirmed' ? 'rgb(var(--success))' : 
                   qrData.bookingDetails.status === 'Pending' ? '#f59e0b' : '#1f2937'
          }}>
            {(() => {
              const status = qrData.bookingDetails.status;
              switch (status) {
                case 'Pending': return 'Chờ xác nhận';
                case 'Confirmed': return 'Đã xác nhận';
                case 'Arrived': return 'Đã tới quán';
                case 'Ended': return 'Kết thúc';
                case 'Completed': return 'Hoàn thành';
                case 'Canceled': return 'Đã hủy';
                case 'Rejected': return 'Bị từ chối';
                default: return status || 'N/A';
              }
            })()}
          </span>
        </div>

        {/* Xác nhận (không dùng confirmedAt nữa, dùng status để suy ra) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '0.9rem'
        }}>
          <span style={{ color: '#6b7280' }}>Xác nhận:</span>
          <span style={{
            fontWeight: '600',
            color:
              qrData.bookingDetails.status === 'Pending'
                ? '#f59e0b'
                : (qrData.bookingDetails.status === 'Canceled' || qrData.bookingDetails.status === 'Rejected')
                ? '#dc2626'
                : 'rgb(var(--success))'
          }}>
            {(() => {
              const status = qrData.bookingDetails.status;
              if (status === 'Canceled') return 'Đã hủy';
              if (status === 'Rejected') return 'Bị từ chối';
              // Pending = chưa được bar scan lần đầu
              if (status === 'Pending') return 'Chưa xác nhận';
              // Confirmed/Arrived/Ended/Completed => đã được xác nhận (scan/confirm)
              return 'Đã xác nhận';
            })()}
          </span>
        </div>

        {(qrData.bookingDetails.status === 'Arrived' || qrData.bookingDetails.status === 'Confirmed') && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'rgb(var(--success))',
            fontWeight: '600'
          }}>
            ✅ {qrData.bookingDetails.status === 'Arrived' ? 'Đã xác nhận tới quán' : 'Booking đã được xác nhận'}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #f59e0b',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#92400e',
        maxWidth: '300px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          📱 Hướng dẫn
        </div>
        <div>
          Nhân viên quán bar sẽ quét mã QR này bằng app quản lý để xác nhận bạn đã đến quán.
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
