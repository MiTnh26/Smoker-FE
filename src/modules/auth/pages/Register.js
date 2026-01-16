import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../components/common/Input";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../../api/userApi";
import AuthHeader from "../../../components/layout/AuthHeader";
import { Modal } from "../../../components/common/Modal";
import { Button } from "../../../components/common/Button";
import { Eye, EyeOff, Mail, LockKeyhole } from "lucide-react";
import { cn } from "../../../utils/cn";

export function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // OTP verification
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // 18+ age confirmation modal
  const [showAgeConfirm, setShowAgeConfirm] = useState(false);
  // Lưu thông tin đăng ký tạm thời, chỉ gọi API khi user đồng ý 18+
  const [pendingAction, setPendingAction] = useState(null);

  // Validation email
  const validateEmail = (emailValue) => {
    if (!emailValue || !emailValue.trim()) {
      return "Vui lòng nhập email";
    }

    const trimmedEmail = emailValue.trim();

    // Kiểm tra format email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return "Email không hợp lệ";
    }

    // Lấy phần local (trước @) và domain (sau @)
    const [localPart, domain] = trimmedEmail.split('@');
    
    if (!domain) {
      return "Email không hợp lệ";
    }

    const domainLower = domain.toLowerCase();

    // Kiểm tra email linh tinh/không tồn tại - fake domains
    const fakeDomains = [
      'test.com', 'test.test', 'example.com', 'example.test',
      '123.com', '123.123', 'abc.com', 'abc.abc',
      'fake.com', 'fake.fake', 'temp.com', 'temp.temp',
      'demo.com', 'demo.demo', 'sample.com', 'sample.sample'
    ];
    
    if (fakeDomains.includes(domainLower)) {
      return "Email không hợp lệ hoặc không tồn tại";
    }

    // Kiểm tra email có domain hợp lệ (ít nhất 2 ký tự sau dấu chấm)
    const domainParts = domainLower.split('.');
    if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
      return "Email không hợp lệ";
    }

    // Kiểm tra email không tồn tại - pattern không hợp lệ
    // 1. Kiểm tra có quá nhiều số liên tiếp (>= 10 số)
    const consecutiveNumbers = localPart.match(/\d{10,}/);
    if (consecutiveNumbers) {
      return "Email không hợp lệ hoặc không tồn tại";
    }

    // 2. Kiểm tra có ký tự lặp lại quá nhiều (>= 8 ký tự giống nhau liên tiếp)
    const repeatedChars = localPart.match(/(.)\1{7,}/);
    if (repeatedChars) {
      return "Email không hợp lệ hoặc không tồn tại";
    }

    // 3. Kiểm tra có quá nhiều số trong email (>= 15 số)
    const digitCount = (localPart.match(/\d/g) || []).length;
    if (digitCount >= 15) {
      return "Email không hợp lệ hoặc không tồn tại";
    }

    // 4. Kiểm tra pattern không hợp lệ: chỉ có số hoặc chỉ có ký tự đặc biệt
    if (/^\d+$/.test(localPart) || /^[^a-zA-Z0-9]+$/.test(localPart)) {
      return "Email không hợp lệ hoặc không tồn tại";
    }

    // 5. Kiểm tra email quá dài (local part > 64 ký tự theo RFC 5321)
    if (localPart.length > 64) {
      return "Email không hợp lệ";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate email trước (basic validation)
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);

    try {
      // Gọi API pre-check: validate + kiểm tra email đã tồn tại + verify email có tồn tại thực sự
      await authApi.checkRegister(email, password, confirmPassword);

      // Nếu không lỗi -> gửi OTP
      try {
        await authApi.sendRegisterOtp(email);
        setShowOtpModal(true);
        setError("");
      } catch (error_) {
        const otpMsg = error_?.response?.data?.message || error_?.message || "Không thể gửi OTP";
        setError(otpMsg);
      }
    } catch (err) {
      const msg =
        err?.response?.status === 409
          ? t("auth.emailExists", "Email đã tồn tại")
          : err?.response?.data?.message || err?.message || t("auth.registerFailed", "Đăng ký thất bại");
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Vui lòng nhập đầy đủ 6 số OTP");
      return;
    }

    setIsLoading(true);
    setOtpError("");

    try {
      await authApi.verifyOtp({ email, otp: otp });
      
      // OTP đúng -> đóng modal OTP và hiển thị age confirm
      setShowOtpModal(false);
      setPendingAction({
        type: "email",
        payload: { email, password, confirmPassword },
      });
      setShowAgeConfirm(true);
      setOtp("");
    } catch (err) {
      setOtpError(err?.response?.data?.message || err?.message || "OTP không đúng hoặc đã hết hạn");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setOtpError("");
    setOtp("");

    try {
      await authApi.sendRegisterOtp(email);
      setOtpError("");
    } catch (err) {
      setOtpError(err?.response?.data?.message || err?.message || "Không thể gửi lại OTP");
    } finally {
      setIsLoading(false);
    }
  };


  const handleFacebookRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError(t('auth.pleaseEnterEmail'));
      return;
    }
    
    // Không gọi API ngay, lưu pending action và hiển thị xác nhận 18+
    setPendingAction({
      type: "facebook",
      payload: { email },
    });
    setShowAgeConfirm(true);
  };

  return (
    <div className="bg-background text-foreground h-screen overflow-hidden relative">
      <AuthHeader />
      <div
        className={cn(
          "container mx-auto flex w-full items-center justify-center",
          "px-3 sm:px-4",
          "h-[calc(100vh-73px)]",
          "absolute top-[73px] left-0 right-0"
        )}
      >
        <div className="w-full max-w-lg">
          {/* Signup Form */}
          <div
            className={cn(
              "bg-card rounded-3xl border-[0.5px] border-border/20",
              "shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
              "px-5 pt-2 pb-5 sm:px-6 sm:pt-3 sm:pb-6"
            )}
          >
            {/* Header */}
            <div className="mb-3 text-center sm:text-left">
              <h1 className="text-xl font-semibold mb-0.5 sm:text-2xl">
                {t("auth.registerTitle", "Tạo tài khoản mới")}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t("auth.registerSubtitle", "Tham gia cộng đồng nightlife của chúng tôi")}
              </p>
            </div>


            {/* Form đăng ký thường */}
            <form className="space-y-2.5" onSubmit={handleSubmit}>
              <div className="space-y-2.5">
                {/* Email */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      type="email"
                      placeholder={t("auth.email") + " (example@gmail.com)"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2",
                        "text-muted-foreground/70",
                        "bg-transparent border-none p-1 rounded-lg",
                        "hover:text-foreground hover:bg-muted/50",
                        "transition-colors duration-200"
                      )}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {t("auth.confirmPassword")}
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder={t("auth.confirmPassword")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2",
                        "text-muted-foreground/70",
                        "bg-transparent border-none p-1 rounded-lg",
                        "hover:text-foreground hover:bg-muted/50",
                        "transition-colors duration-200"
                      )}
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? t("auth.hidePassword") : t("auth.showPassword")}
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Messages */}
              {error && (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full bg-primary text-primary-foreground border-none rounded-lg py-2.5 text-base font-semibold",
                  "sm:rounded-xl sm:py-3",
                  "transition-all duration-200 hover:bg-primary/90 active:scale-95",
                  isLoading && "opacity-60 cursor-not-allowed"
                )}
              >
                {isLoading
                  ? t("auth.registering", "Đang đăng ký...")
                  : t("auth.signUp", "Đăng ký")}
              </button>

              {/* Login Link */}
              <div className="text-center text-sm text-muted-foreground">
                {t("auth.alreadyHave", "Đã có tài khoản?")}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:text-primary/90"
                >
                  {t("auth.loginLink", "Đăng nhập")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          setOtp("");
          setOtpError("");
        }}
        size="md"
        className="p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
              Xác thực email
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Chúng tôi đã gửi mã OTP 6 số đến email <b>{email}</b>. Vui lòng kiểm tra và nhập mã OTP để tiếp tục đăng ký.
            </p>
          </div>

          {/* OTP Input */}
          <div className="space-y-2">
            <label htmlFor="otp-input" className="text-sm font-medium text-foreground">
              Mã OTP
            </label>
            <Input
              id="otp-input"
              type="text"
              placeholder="Nhập 6 số OTP"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replaceAll(/\D/g, "").slice(0, 6);
                setOtp(value);
                setOtpError("");
              }}
              className="text-center text-2xl tracking-widest font-semibold"
              maxLength={6}
            />
            {otpError && (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {otpError}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setShowOtpModal(false);
                setOtp("");
                setOtpError("");
              }}
              className={cn(
                "w-full sm:w-auto px-6 py-2.5 rounded-lg",
                "bg-muted text-foreground font-semibold",
                "hover:bg-muted/80 transition-colors"
              )}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isLoading}
              className={cn(
                "w-full sm:w-auto px-6 py-2.5 rounded-lg",
                "bg-secondary text-secondary-foreground font-semibold",
                "hover:bg-secondary/90 transition-colors",
                isLoading && "opacity-60 cursor-not-allowed"
              )}
            >
              Gửi lại OTP
            </button>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isLoading || otp.length !== 6}
              className={cn(
                "w-full sm:flex-1 px-6 py-2.5 rounded-lg",
                "bg-primary text-primary-foreground font-semibold",
                "hover:bg-primary/90 transition-colors",
                (isLoading || otp.length !== 6) && "opacity-60 cursor-not-allowed"
              )}
            >
              {isLoading ? "Đang xác thực..." : "Xác thực"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Age confirmation modal (18+) */}
      <Modal
        isOpen={showAgeConfirm}
        onClose={() => {
          setShowAgeConfirm(false);
          setPendingAction(null);
        }}
        size="lg"
        className="p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
              Để tiếp tục, bạn cần xác nhận đủ 18 tuổi
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bằng việc sử dụng SMOKER, bạn đồng ý chỉ tham gia nền tảng khi đã đủ 18 tuổi
              và đã đọc kỹ Điều khoản, Chính sách quyền riêng tư và Chính sách cookie của chúng tôi.
            </p>
          </div>

          {/* Main content */}
          <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
            <p>
              - Nền tảng có thể hiển thị nội dung liên quan đến nightlife, quán bar, sự kiện
              và các hoạt động giải trí về đêm. Đây không phải là dịch vụ dành cho người dưới 18 tuổi.
            </p>
            <p>
              - Chúng tôi sử dụng thông tin của bạn để cá nhân hoá trải nghiệm, phân tích và cải thiện dịch vụ.
              Chi tiết được mô tả trong Điều khoản sử dụng và Chính sách quyền riêng tư.
            </p>
            <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-destructive text-xs sm:text-sm">
              Để sử dụng dịch vụ này, bạn xác nhận rằng mình đã đủ 18 tuổi trở lên.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowAgeConfirm(false);
                setPendingAction(null);
                navigate("/");
              }}
            >
              Tôi chưa đủ 18 tuổi
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={async () => {
                if (!pendingAction) {
                  setShowAgeConfirm(false);
                  return;
                }
                setShowAgeConfirm(false);
                setIsLoading(true);
                setError("");
                try {
                  let res;
                  if (pendingAction.type === "email") {
                    const { email: em, password: pw, confirmPassword: cpw } = pendingAction.payload;
                    res = await authApi.register(em, pw, cpw);
                    if (!res || !res.message) {
                      throw new Error(res?.message || t("auth.registerFailed"));
                    }
                  } else if (pendingAction.type === "facebook") {
                    res = await authApi.facebookRegister(pendingAction.payload.email);
                    if (res.status !== "NEW_USER") {
                      throw new Error(res.message || t("auth.registerFailed"));
                    }
                  }
                  navigate("/login");
                } catch (err) {
                  const msg =
                    err?.response?.status === 409
                      ? t("auth.emailExists")
                      : err?.response?.data?.message || err?.message || t("auth.registerFailed");
                  setError(msg);
                } finally {
                  setIsLoading(false);
                  setPendingAction(null);
                }
              }}
            >
              Tôi đồng ý và tiếp tục
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
