import React, { useState } from "react";
import { Modal } from "../../../components/common/Modal";
import { X, FileText, CheckCircle, AlertCircle, Shield, DollarSign, Calendar, Ban, Users } from "lucide-react";
import { cn } from "../../../utils/cn";

export default function DancerTermsModal({ isOpen, onClose, onAccept }) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const scrolledPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
    if (scrolledPercentage > 80) {
      setHasScrolled(true);
    }
  };

  const handleAccept = () => {
    if (isAccepted) {
      onAccept();
    }
  };

  const handleClose = () => {
    setIsAccepted(false);
    setHasScrolled(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" className="max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Điều khoản dành cho Dancer</h2>
            <p className="text-sm text-muted-foreground">Vui lòng đọc kỹ trước khi đăng ký tài khoản Dancer</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted transition-colors"
          )}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-6"
        onScroll={handleScroll}
        style={{ maxHeight: "calc(90vh - 200px)" }}
      >
        {/* Warning Banner */}
        <div className={cn(
          "rounded-lg p-4 border-l-4",
          "bg-warning/10 border-warning",
          "flex items-start gap-3"
        )}>
          <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Quan trọng
            </p>
            <p className="text-sm text-muted-foreground">
              Vui lòng đọc kỹ toàn bộ điều khoản trước khi đồng ý. Bằng việc nhấn "Tạo tài khoản Dancer", bạn xác nhận đã hiểu và đồng ý với tất cả các điều khoản này.
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Quy định đặt show & giá thuê</h3>
          </div>
          <div className="ml-10 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Khách hàng (quán bar) có thể đặt show Dancer qua hệ thống với hai loại giá:</p>
            </div>
            <div className="ml-4 space-y-2 mb-3">
              <div className="bg-muted/30 rounded-lg p-3 border border-border/20">
                <p className="font-semibold text-foreground mb-2">Giá tiêu chuẩn:</p>
                <p className="text-xs text-muted-foreground">Dành cho đặt lẻ (đặt ít slot)</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="font-semibold text-foreground mb-2">Giá ưu đãi:</p>
                <p className="text-xs text-muted-foreground mb-2">Khi đặt nhiều slot. Điều kiện áp dụng:</p>
                <div className="ml-3 space-y-1 text-xs text-muted-foreground">
                  <p>- 4 slot liền nhau, HOẶC</p>
                  <p>- 6 slot bất kỳ</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Bạn có thể thay đổi giá thuê bất cứ lúc nào, nhưng giá mới chỉ áp dụng cho các show mới, không ảnh hưởng đến các show đã được xác nhận trước đó.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Show chỉ có hiệu lực khi khách hàng thanh toán đầy đủ theo quy định.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Bạn có trách nhiệm thực hiện đúng thời gian và chất lượng biểu diễn đã cam kết.</p>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Phí sàn & thanh toán
            </h3>
          </div>
          <div className="ml-10 space-y-3">
            <div className="bg-muted/50 rounded-lg p-4 border border-border/20">
              <p className="text-sm text-muted-foreground mb-3">
                Khi khách hàng đặt show, họ sẽ phải thanh toán <span className="font-semibold text-foreground">phí sàn 50.000 VNĐ</span> cho hệ thống để xác nhận show.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p className="text-sm text-muted-foreground">Phí sàn 50.000 VNĐ là số tiền cố định, bắt buộc phải thanh toán trước khi show được xác nhận.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p className="text-sm text-muted-foreground">Phí sàn 50.000 VNĐ thuộc về hệ thống, không phải là tiền của bạn.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p className="text-sm text-muted-foreground">Sau khi hoàn thành show, bạn sẽ nhận toàn bộ số tiền show (không bị trừ phí hoa hồng).</p>
                </div>
                <div className="pt-2 border-t border-border/20">
                  <p className="text-sm font-semibold text-foreground mb-2">Quy trình thanh toán:</p>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p>1. Khách thanh toán phí sàn 50.000 VNĐ cho hệ thống → Show được xác nhận</p>
                    <p>2. Khách thanh toán phần còn lại (nếu có) trước hoặc sau khi hoàn thành show</p>
                    <p>3. Sau khi hoàn thành show thành công → Bạn nhận toàn bộ số tiền show</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/20">
                    <p className="text-xs text-muted-foreground italic">
                      Ví dụ: Show 2.000.000 VNĐ, khách thanh toán phí sàn 50.000 VNĐ cho hệ thống, bạn nhận toàn bộ 2.000.000 VNĐ sau khi hoàn thành.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Xác nhận show
            </h3>
          </div>
          <div className="ml-10 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Khách hàng phải thanh toán phí sàn 50.000 VNĐ cho hệ thống để show được xác nhận.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Sau khi khách thanh toán phí sàn thành công:</p>
            </div>
            <div className="ml-4 space-y-1">
              <p className="text-xs">- Lịch show được lưu trong hệ thống</p>
              <p className="text-xs">- Thông tin show được gửi đến bạn và khách hàng</p>
              <p className="text-xs">- Bạn có trách nhiệm xác nhận và thực hiện show đúng thời gian</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Khách hàng có thể thanh toán phần còn lại trước hoặc sau khi hoàn thành show.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Bạn sẽ nhận toàn bộ số tiền show sau khi hoàn thành thành công.</p>
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">4</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Ban className="w-5 h-5 text-primary" />
              Hủy show & hoàn tiền
            </h3>
          </div>
          <div className="ml-10 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Đối với khách hàng:</p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p>Không được hủy show sau khi đã thanh toán, trừ trường hợp có thỏa thuận với Dancer.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p>Nếu khách không đến hoặc hủy không có lý do chính đáng, khách có thể mất một phần hoặc toàn bộ số tiền đã thanh toán.</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Đối với Dancer:</p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p>Không được hủy show sau khi khách đã thanh toán, trừ trường hợp bất khả kháng.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p>Nếu hủy show không có lý do chính đáng, bạn có thể bị phạt và ảnh hưởng đến uy tín tài khoản.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p>Nếu không thực hiện đúng chất lượng biểu diễn đã cam kết, khách có quyền gửi phản hồi và yêu cầu hoàn tiền.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <p>Hệ thống sẽ kiểm tra và xử lý yêu cầu hoàn tiền nếu hợp lệ.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">5</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Quy định về hồ sơ & thông tin
            </h3>
          </div>
          <div className="ml-10 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Thông tin hồ sơ phải chính xác, không được gian lận hoặc cung cấp thông tin sai lệch.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Giá thuê phải được công khai minh bạch, không được thu thêm phí ngoài giá đã công bố.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Hồ sơ của bạn sẽ được hệ thống kiểm duyệt trước khi được phép nhận show.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <p>Nội dung biểu diễn phải phù hợp với quy định và không vi phạm pháp luật.</p>
            </div>
          </div>
        </div>

        {/* Section 6 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">6</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Xác nhận điều khoản</h3>
          </div>
          <div className="ml-10">
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Bằng việc nhấn <span className="font-semibold text-foreground">"Tạo tài khoản Dancer"</span>, bạn xác nhận đã đọc và đồng ý toàn bộ điều khoản trên, bao gồm quy định về <span className="font-semibold text-primary">phí sàn 50.000 VNĐ</span> và các quy định về show, thanh toán, hủy show.
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        {!hasScrolled && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground animate-pulse">
              ↓ Cuộn xuống để đọc tiếp ↓
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/20 p-6 bg-muted/30">
        <div className="space-y-4">
          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(e) => setIsAccepted(e.target.checked)}
              className={cn(
                "mt-1 w-5 h-5 rounded border-2 border-border",
                "text-primary focus:ring-2 focus:ring-primary/20",
                "cursor-pointer transition-all",
                "checked:bg-primary checked:border-primary"
              )}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Tôi đã đọc và đồng ý với tất cả các điều khoản trên
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Bao gồm quy định về phí sàn 50.000 VNĐ và các quy định về show, thanh toán, hủy show và hồ sơ.
              </p>
            </div>
          </label>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                "flex-1 px-6 py-3 rounded-lg",
                "bg-muted text-foreground",
                "font-semibold text-sm",
                "transition-all duration-200",
                "hover:bg-muted/80 hover:shadow-md",
                "active:scale-[0.98]"
              )}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!isAccepted}
              className={cn(
                "flex-1 px-6 py-3 rounded-lg",
                "bg-primary text-primary-foreground",
                "font-semibold text-sm",
                "transition-all duration-200",
                "hover:opacity-90 hover:brightness-110 hover:shadow-lg",
                "active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "disabled:hover:bg-primary disabled:hover:shadow-none",
                "flex items-center justify-center gap-2"
              )}
            >
              {isAccepted ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Tạo tài khoản Dancer
                </>
              ) : (
                "Chấp nhận để tiếp tục"
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

