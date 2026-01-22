import React, { useState } from "react";
import { Modal } from "../../../components/common/Modal";
import {
  X,
  CheckCircle,
  AlertCircle,
  Shield,
  DollarSign,
  Calendar,
  Ban,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "../../../utils/cn";

export default function BarTermsModal({ isOpen, onClose, onAccept }) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const scrolledPercentage =
      (scrollTop / (scrollHeight - clientHeight)) * 100;
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      className="max-h-[90vh] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Điều khoản dành cho Quán Bar
            </h2>
            <p className="text-sm text-muted-foreground">
              Vui lòng đọc kỹ trước khi đăng ký và sử dụng hệ thống
            </p>
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

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-6"
        onScroll={handleScroll}
        style={{ maxHeight: "calc(90vh - 200px)" }}
      >
        {/* Warning */}
        <div
          className={cn(
            "rounded-lg p-4 border-l-4",
            "bg-warning/10 border-warning",
            "flex items-start gap-3"
          )}
        >
          <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Quan trọng
            </p>
            <p className="text-sm text-muted-foreground">
              Việc tạo tài khoản Quán Bar đồng nghĩa với việc bạn đã đọc, hiểu và
              đồng ý với toàn bộ các điều khoản dưới đây.
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <Section
          number={1}
          title="Quy định về bàn & combo"
          icon={FileText}
        >
          <Bullet>
            Bàn trong hệ thống chỉ có giá trị sử dụng khi được gắn với một combo
            cụ thể.
          </Bullet>
          <Bullet>
            Combo là mức chi tiêu tối thiểu áp dụng cho bàn và không được hoàn
            tiền nếu khách hàng không sử dụng hết.
          </Bullet>
          <Bullet>
            Quán Bar có trách nhiệm cung cấp đúng combo, đúng giá trị và đúng
            nội dung đã công bố trên hệ thống.
          </Bullet>
        </Section>

        {/* Section 2 */}
        <Section
          number={2}
          title="Hoa hồng & phí sàn"
          icon={DollarSign}
        >
          <Bullet>
            Khi có khách hàng đặt bàn thành công qua hệ thống, Quán Bar đồng ý
            chia <strong>15% giá trị combo</strong> làm phí sàn cho hệ thống.
          </Bullet>
          <Bullet>
            Phí sàn này được trừ trực tiếp vào doanh thu của mỗi đơn đặt bàn.
          </Bullet>
          <Bullet>
            Quán Bar hiểu và đồng ý rằng phí sàn là điều kiện bắt buộc khi tham
            gia hệ thống.
          </Bullet>
        </Section>

        {/* Section 3 */}
        <Section
          number={3}
          title="Voucher & ưu đãi cho khách hàng"
          icon={Shield}
        >
          <Bullet>
            Hệ thống có thể áp dụng voucher giảm giá cho khách hàng khi đặt bàn.
          </Bullet>
          <Bullet>
            Voucher chỉ áp dụng trên giá combo và không áp dụng cộng dồn.
          </Bullet>
          <Bullet>
            Giá trị giảm giá tối đa cho mỗi voucher là 5% theo quy định của hệ
            thống.
          </Bullet>
          <Bullet>
            Quán Bar đồng ý rằng phần giảm giá cho khách hàng được trừ vào phần
            doanh thu của hệ thống, không ảnh hưởng đến quyền lợi đã thỏa thuận
            của Quán Bar.
          </Bullet>
        </Section>

        {/* Section 4 */}
        <Section
          number={4}
          title="Hủy bàn & hoàn tiền"
          icon={Ban}
        >
          <Bullet>
            Quán Bar không được tự ý hủy bàn sau khi khách hàng đã đặt bàn thành
            công.
          </Bullet>
          <Bullet>
            Trường hợp không phục vụ đúng combo, khách hàng có quyền gửi phản hồi
            và yêu cầu hoàn tiền.
          </Bullet>
          <Bullet>
            Hệ thống sẽ là bên kiểm duyệt và quyết định cuối cùng đối với các yêu
            cầu hoàn tiền hợp lệ.
          </Bullet>
        </Section>

        {/* Section 5 */}
        <Section
          number={5}
          title="Xác nhận đặt bàn & trách nhiệm"
          icon={Calendar}
        >
          <Bullet>
            Mỗi đơn đặt bàn hợp lệ sẽ được lưu trữ trên hệ thống và tạo mã QR để
            xác nhận.
          </Bullet>
          <Bullet>
            Quán Bar có trách nhiệm kiểm tra thông tin đặt bàn và phục vụ đúng
            lịch đã xác nhận.
          </Bullet>
          <Bullet>
            Trường hợp khách hàng không đến, Quán Bar không có nghĩa vụ hoàn tiền.
          </Bullet>
        </Section>

        {/* Section 6 */}
        <Section number={6} title="Xác nhận điều khoản">
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              Bằng việc nhấn{" "}
              <span className="font-semibold text-foreground">
                "Tạo tài khoản Quán Bar"
              </span>
              , bạn xác nhận đã đọc, hiểu và đồng ý toàn bộ điều khoản trên, bao
              gồm quy định về phí sàn, hoa hồng, voucher và trách nhiệm phục vụ
              khách hàng.
            </p>
          </div>
        </Section>

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
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={isAccepted}
            onChange={(e) => setIsAccepted(e.target.checked)}
            className="mt-1 w-5 h-5"
          />
          <p className="text-sm font-semibold text-foreground">
            Tôi đã đọc và đồng ý với tất cả các điều khoản trên
          </p>
        </label>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 rounded-lg bg-muted font-semibold"
          >
            Hủy
          </button>
          <button
            onClick={handleAccept}
            disabled={!isAccepted}
            className={cn(
              "flex-1 px-6 py-3 rounded-lg font-semibold",
              "bg-primary text-primary-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isAccepted ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Tạo tài khoản Quán Bar
              </>
            ) : (
              "Chấp nhận để tiếp tục"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ===== Helpers ===== */

function Section({ number, title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{number}</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          {title}
        </h3>
      </div>
      <div className="ml-10 space-y-2 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-primary mt-1">•</span>
      <p>{children}</p>
    </div>
  );
}
