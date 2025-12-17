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
  
  // Google register modal states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleError, setGoogleError] = useState("");

  // 18+ age confirmation modal
  const [showAgeConfirm, setShowAgeConfirm] = useState(false);
  // Lưu thông tin đăng ký tạm thời, chỉ gọi API khi user đồng ý 18+
  const [pendingAction, setPendingAction] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Gọi API pre-check: validate + kiểm tra email đã tồn tại
      await authApi.checkRegister(email, password, confirmPassword);

      // Nếu không lỗi -> lưu thông tin và yêu cầu xác nhận 18+
      setPendingAction({
        type: "email",
        payload: { email, password, confirmPassword },
      });
      setShowAgeConfirm(true);
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

  const handleGoogleRegisterClick = (e) => {
    e.preventDefault();
    setShowGoogleModal(true);
    setGoogleEmail("");
    setGoogleError("");
  };

  const handleGoogleRegisterSubmit = async () => {
    if (!googleEmail) {
      setGoogleError(t('auth.pleaseEnterEmail', "Vui lòng nhập email"));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(googleEmail)) {
      setGoogleError(t('auth.invalidEmail', "Email không hợp lệ"));
      return;
    }

    // Không gọi API ngay, lưu pending action và hiển thị xác nhận 18+
    setPendingAction({
      type: "google",
      payload: { email: googleEmail },
    });
    setShowGoogleModal(false);
    setShowAgeConfirm(true);
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

            {/* Social Login Buttons - ĐẶT TRƯỚC */}
            <div className="space-y-2.5 mb-3">
              <button
                type="button"
                onClick={handleGoogleRegisterClick}
                disabled={isLoading}
                className={cn(
                  "w-full bg-muted/40 text-foreground border-none rounded-lg py-2.5 text-sm font-semibold",
                  "sm:rounded-xl sm:py-3",
                  "transition-all duration-200 hover:bg-muted/60 active:scale-95",
                  "flex items-center justify-center gap-2",
                  isLoading && "opacity-60 cursor-not-allowed"
                )}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t("auth.registerWithGoogle", "Đăng ký với Google")}
              </button>

              {/* <button
                type="button"
                onClick={handleFacebookRegister}
                disabled={isLoading}
                className={cn(
                  "w-full rounded-lg py-2.5 text-sm font-semibold text-white bg-[#1877F2] border-none",
                  "sm:rounded-xl sm:py-3",
                  "transition-all duration-200 hover:bg-[#1664CF] active:scale-95",
                  "flex items-center justify-center gap-2",
                  isLoading && "opacity-60 cursor-not-allowed"
                )}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                {t("auth.registerWithFacebook", "Đăng ký với Facebook")}
              </button> */}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <span className="h-[1px] flex-1 bg-border/30" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("auth.orContinue", "hoặc tiếp tục với email")}
              </span>
              <span className="h-[1px] flex-1 bg-border/30" />
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

      {/* Google Register Modal */}
      <Modal
        isOpen={showGoogleModal}
        onClose={() => {
          setShowGoogleModal(false);
          setGoogleEmail("");
          setGoogleError("");
        }}
        size="md"
        className="p-6"
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {t("auth.registerWithGoogle", "Đăng ký với Google")}
            </h2>
            <button
              onClick={() => {
                setShowGoogleModal(false);
                setGoogleEmail("");
                setGoogleError("");
              }}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                "text-2xl leading-none",
                "transition-colors"
              )}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("auth.googleRegisterDesc", "Vui lòng nhập email của bạn để tiếp tục đăng ký với Google")}
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("auth.email", "Email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  type="email"
                  placeholder={t("auth.emailPlaceholder", "example@gmail.com")}
                  value={googleEmail}
                  onChange={(e) => {
                    setGoogleEmail(e.target.value);
                    setGoogleError("");
                  }}
                  className="pl-12"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleGoogleRegisterSubmit();
                    }
                  }}
                />
              </div>
            </div>

            {googleError && (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {googleError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
            <Button
              onClick={() => {
                setShowGoogleModal(false);
                setGoogleEmail("");
                setGoogleError("");
              }}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 rounded-lg",
                "bg-muted text-muted-foreground",
                "hover:bg-muted/80",
                "transition-colors",
                isLoading && "opacity-60 cursor-not-allowed"
              )}
            >
              {t("common.cancel", "Hủy")}
            </Button>
            <Button
              onClick={handleGoogleRegisterSubmit}
              disabled={isLoading || !googleEmail}
              className={cn(
                "px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "transition-colors",
                "flex items-center gap-2",
                (isLoading || !googleEmail) && "opacity-60 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {t("auth.processing", "Đang xử lý...")}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t("auth.continue", "Tiếp tục")}
                </>
              )}
            </Button>
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
                  } else if (pendingAction.type === "google") {
                    res = await authApi.googleRegister({ email: pendingAction.payload.email });
                    if (res.status !== "NEW_USER") {
                      throw new Error(res.message || t("auth.registerFailed"));
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
