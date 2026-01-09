// src/components/common/QRScanner.js
import { useState, useRef, useEffect } from "react";
import bookingApi from "../../api/bookingApi";

const QRScanner = ({ onScanSuccess, onScanError, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setScanning(true);
      setError(null);

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        scanQRCode();
      };
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Here you would integrate with a QR code library like jsQR
    // For now, we'll simulate the scanning process
    // In a real implementation, you would use jsQR or similar library

    // For demo purposes, we'll continue scanning
    if (scanning) {
      setTimeout(scanQRCode, 500); // Scan every 500ms
    }
  };

  const handleManualQRInput = async (qrText) => {
    try {
      setScanning(false);
      setError(null);

      // Parse QR data (assuming it's JSON)
      let qrData;
      try {
        qrData = JSON.parse(qrText);
      } catch (parseError) {
        throw new Error('QR code không hợp lệ');
      }

      // Validate QR data structure
      if (!qrData.type || qrData.type !== 'booking_confirmation') {
        throw new Error('Đây không phải là QR code xác nhận booking');
      }

      // Scan QR code
      const response = await bookingApi.scanQRCode(qrData);

      if (response.data?.success) {
        setScanResult(response.data.data);

        if (onScanSuccess) {
          onScanSuccess(response.data.data);
        }
      } else {
        throw new Error(response.data?.message || 'Không thể xác nhận booking');
      }

    } catch (err) {
      console.error('Error scanning QR:', err);
      setError(err.message || 'Lỗi khi quét QR code');

      if (onScanError) {
        onScanError(err);
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // Here you would process the uploaded QR code image
      // For now, we'll show a placeholder message
      setError('Tính năng upload ảnh QR code đang được phát triển. Vui lòng nhập mã QR thủ công.');
    };
    reader.readAsDataURL(file);
  };

  if (scanResult) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        background: '#f0fdf4',
        borderRadius: '12px',
        border: '2px solid #22c55e',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          color: '#22c55e'
        }}>
          ✅
        </div>

        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#15803d',
          marginBottom: '16px'
        }}>
          Xác nhận thành công!
        </h3>

        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '300px',
          marginBottom: '20px',
          border: '1px solid #dcfce7'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Khách hàng:</strong> {scanResult.customerName}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Combo:</strong> {scanResult.comboName}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Số tiền:</strong> {scanResult.amount?.toLocaleString('vi-VN')} đ
          </div>
          <div>
            <strong>Thời gian xác nhận:</strong> {new Date(scanResult.confirmedAt).toLocaleString('vi-VN')}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={() => window.location.href = scanResult.redirectTo || `/bar/bookings/${scanResult.bookingId}`}
            style={{
              padding: '10px 20px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Xem chi tiết booking
          </button>

          <button
            onClick={() => {
              setScanResult(null);
              setError(null);
              startScanning();
            }}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#22c55e',
              border: '1px solid #22c55e',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Quét tiếp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      maxWidth: '400px',
      width: '100%'
    }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        Quét QR Code Xác Nhận
      </h3>

      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
          width: '100%'
        }}>
          {error}
        </div>
      )}

      {/* Camera View */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '300px',
        marginBottom: '20px'
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            borderRadius: '8px',
            display: scanning ? 'block' : 'none'
          }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {!scanning && !error && (
          <div style={{
            width: '100%',
            height: '200px',
            background: '#f3f4f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280'
          }}>
            Đang khởi tạo camera...
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '200px',
            border: '2px solid #22c55e',
            borderRadius: '8px',
            pointerEvents: 'none'
          }}>
            <div style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              width: '20px',
              height: '20px',
              borderLeft: '4px solid #22c55e',
              borderTop: '4px solid #22c55e',
              borderRadius: '4px 0 0 0'
            }} />
            <div style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '20px',
              height: '20px',
              borderRight: '4px solid #22c55e',
              borderTop: '4px solid #22c55e',
              borderRadius: '0 4px 0 0'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              left: '-2px',
              width: '20px',
              height: '20px',
              borderLeft: '4px solid #22c55e',
              borderBottom: '4px solid #22c55e',
              borderRadius: '0 0 4px 0'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '20px',
              height: '20px',
              borderRight: '4px solid #22c55e',
              borderBottom: '4px solid #22c55e',
              borderRadius: '0 0 0 4px'
            }} />
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div style={{ width: '100%', marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Hoặc nhập mã QR thủ công:
        </label>
        <textarea
          placeholder="Dán nội dung QR code vào đây..."
          onChange={(e) => {
            if (e.target.value.trim()) {
              handleManualQRInput(e.target.value.trim());
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.9rem',
            minHeight: '80px',
            resize: 'vertical',
            fontFamily: 'monospace'
          }}
        />
      </div>

      {/* File Upload */}
      <div style={{ width: '100%', marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Hoặc upload ảnh QR code:
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <button
          onClick={startScanning}
          disabled={scanning}
          style={{
            flex: 1,
            padding: '10px',
            background: scanning ? '#e5e7eb' : '#22c55e',
            color: scanning ? '#6b7280' : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: scanning ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          {scanning ? 'Đang quét...' : 'Bắt đầu quét'}
        </button>

        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '10px',
            background: 'white',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default QRScanner;
