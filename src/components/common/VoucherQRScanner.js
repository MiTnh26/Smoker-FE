// src/components/common/VoucherQRScanner.js
import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from 'qrcode.react';
import bookingApi from "../../api/bookingApi";
import { X, Loader2, TicketPercent, Calendar, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { cn } from "../../utils/cn";

const VoucherQRScanner = ({ onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [manualCode, setManualCode] = useState("");

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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
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

    // TODO: Integrate with jsQR library for actual QR code scanning
    // For now, we'll use manual input

    if (scanning) {
      setTimeout(scanQRCode, 500);
    }
  };

  const handleManualInput = async () => {
    if (!manualCode.trim()) {
      setError('Vui lòng nhập mã voucher');
      return;
    }

    await fetchVoucherByCode(manualCode.trim());
  };

  const fetchVoucherByCode = async (code) => {
    try {
      setLoading(true);
      setError(null);
      stopScanning();

      // Extract voucher code if it contains GUID (format: CODE-GUID)
      const cleanCode = code.split('-')[0];

      const response = await bookingApi.getVoucherByCode(cleanCode);

      if (response.data?.success) {
        setVoucherData(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Không tìm thấy voucher');
      }
    } catch (err) {
      console.error('Error fetching voucher:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi khi tải thông tin voucher');
    } finally {
      setLoading(false);
    }
  };

  if (voucherData) {
    return (
      <div className={cn("w-full max-w-md bg-card rounded-xl border border-border/20 shadow-lg p-6")}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn("text-2xl font-bold text-foreground")}>
            Chi tiết Voucher
          </h3>
          <button
            onClick={() => {
              setVoucherData(null);
              setManualCode("");
              startScanning();
            }}
            className={cn(
              "p-1 rounded-full hover:bg-muted transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <X size={24} />
          </button>
        </div>

        <div className={cn("space-y-4")}>
          {/* Voucher Code */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
            <TicketPercent className="text-primary" size={24} />
            <div>
              <p className="text-sm text-muted-foreground">Mã voucher</p>
              <p className="font-semibold text-foreground text-lg">
                {voucherData.VoucherCode || voucherData.voucherCode}
              </p>
            </div>
          </div>

          {/* Voucher Name */}
          {voucherData.VoucherName && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <TicketPercent className="text-primary" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Tên voucher</p>
                <p className="font-semibold text-foreground">
                  {voucherData.VoucherName || voucherData.voucherName}
                </p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
            {voucherData.Status === 'approved' || voucherData.Status === 'ACTIVE' ? (
              <CheckCircle className="text-green-500" size={24} />
            ) : (
              <XCircle className="text-red-500" size={24} />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Trạng thái</p>
              <p className={cn(
                "font-semibold",
                voucherData.Status === 'approved' || voucherData.Status === 'ACTIVE' 
                  ? "text-green-600" 
                  : "text-red-600"
              )}>
                {voucherData.Status === 'approved' || voucherData.Status === 'ACTIVE' 
                  ? 'Đang hoạt động' 
                  : voucherData.Status || 'Không xác định'}
              </p>
            </div>
          </div>

          {/* Max Usage */}
          {voucherData.MaxUsage !== undefined && voucherData.MaxUsage !== null && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <DollarSign className="text-primary" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Số lượt sử dụng tối đa</p>
                <p className="font-semibold text-foreground">
                  {voucherData.MaxUsage.toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          )}

          {/* Used Count */}
          {voucherData.UsedCount !== undefined && voucherData.UsedCount !== null && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <CheckCircle className="text-primary" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Đã sử dụng</p>
                <p className="font-semibold text-foreground">
                  {voucherData.UsedCount.toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          )}

          {/* Original Value */}
          {voucherData.OriginalValue !== undefined && voucherData.OriginalValue !== null && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <DollarSign className="text-primary" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Giá trị gốc</p>
                <p className="font-semibold text-foreground text-lg text-green-600">
                  {voucherData.OriginalValue.toLocaleString('vi-VN')} đ
                </p>
              </div>
            </div>
          )}

          {/* Sale Price */}
          {voucherData.SalePrice !== undefined && voucherData.SalePrice !== null && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <DollarSign className="text-primary" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Giá bán</p>
                <p className="font-semibold text-foreground text-lg text-blue-600">
                  {voucherData.SalePrice.toLocaleString('vi-VN')} đ
                </p>
              </div>
            </div>
          )}

          {/* Created At */}
          {voucherData.CreatedAt && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <Calendar className="text-primary" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Ngày tạo</p>
                <p className="font-semibold text-foreground">
                  {new Date(voucherData.CreatedAt).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "transition-colors"
            )}
          >
            Đóng
          </button>
          <button
            onClick={() => {
              setVoucherData(null);
              setManualCode("");
              startScanning();
            }}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-muted text-foreground hover:bg-muted/80",
              "transition-colors"
            )}
          >
            Quét tiếp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-md bg-card rounded-xl border border-border/20 shadow-lg p-6")}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={cn("text-2xl font-bold text-foreground")}>
          Quét QR Code Voucher
        </h3>
        <button
          onClick={onClose}
          className={cn(
            "p-1 rounded-full hover:bg-muted transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className={cn(
          "mb-4 p-3 rounded-lg",
          "bg-red-50 border border-red-200 text-red-600 text-sm"
        )}>
          {error}
        </div>
      )}

      {/* Camera View */}
      <div className={cn("relative w-full mb-4 rounded-lg overflow-hidden")}>
        <video
          ref={videoRef}
          className={cn(
            "w-full rounded-lg",
            scanning ? "block" : "hidden"
          )}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {!scanning && !error && (
          <div className={cn(
            "w-full h-64 bg-muted rounded-lg",
            "flex items-center justify-center text-muted-foreground"
          )}>
            Đang khởi tạo camera...
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && (
          <div className={cn(
            "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
            "w-48 h-48 border-2 border-primary rounded-lg pointer-events-none"
          )}>
            <div className={cn(
              "absolute -top-1 -left-1 w-5 h-5",
              "border-l-4 border-t-4 border-primary rounded-tl-lg"
            )} />
            <div className={cn(
              "absolute -top-1 -right-1 w-5 h-5",
              "border-r-4 border-t-4 border-primary rounded-tr-lg"
            )} />
            <div className={cn(
              "absolute -bottom-1 -left-1 w-5 h-5",
              "border-l-4 border-b-4 border-primary rounded-bl-lg"
            )} />
            <div className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5",
              "border-r-4 border-b-4 border-primary rounded-br-lg"
            )} />
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div className="mb-4">
        <label className={cn("block text-sm font-semibold text-foreground mb-2")}>
          Hoặc nhập mã voucher thủ công:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Nhập mã voucher..."
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border border-border",
              "bg-background text-foreground text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary"
            )}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleManualInput();
              }
            }}
          />
          <button
            onClick={handleManualInput}
            disabled={loading || !manualCode.trim()}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors flex items-center gap-2"
            )}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang tải...</span>
              </>
            ) : (
              "Tìm"
            )}
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={startScanning}
          disabled={scanning}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium",
            scanning 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-primary text-primary-foreground hover:bg-primary/90",
            "transition-colors"
          )}
        >
          {scanning ? 'Đang quét...' : 'Bắt đầu quét'}
        </button>

        <button
          onClick={onClose}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-muted text-foreground hover:bg-muted/80",
            "transition-colors"
          )}
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default VoucherQRScanner;
