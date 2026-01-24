import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Phone, LockKeyhole, Eye, EyeOff, BadgeCheck } from "lucide-react";
import { cn } from "../../../utils/cn";
import { Input } from "../../../components/common/Input";
import { managerAuthApi } from "../../../api/managerAuthApi";

export default function AccountantRegistration() {
  const { t } = useTranslation();

  const fixedRole = "accountant";
  const roleLabel = useMemo(
    () => t("admin.accountantRegistration.roleValue", { defaultValue: "Kế toán" }),
    [t]
  );

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const validate = () => {
    if (!email || !email.includes("@")) {
      return t("admin.accountantRegistration.errors.invalidEmail", { defaultValue: "Email không hợp lệ" });
    }
    if (!password || password.length < 8) {
      return t("admin.accountantRegistration.errors.passwordMin", { defaultValue: "Mật khẩu phải có ít nhất 8 ký tự" });
    }
    if (password !== confirmPassword) {
      return t("admin.accountantRegistration.errors.confirmMismatch", { defaultValue: "Mật khẩu xác nhận không khớp" });
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    try {
      setLoading(true);

      // NOTE: BE endpoint trả về token của tài khoản vừa tạo.
      // Admin chỉ "tạo tài khoản" nên tuyệt đối KHÔNG lưu token/session để tránh bị đăng nhập hộ.
      const res = await managerAuthApi.register(email.trim(), password, fixedRole, phone.trim() || null);

      if (res?.status === "success") {
        const createdEmail = res?.data?.manager?.email || email.trim();
        setSuccessMsg(
          t("admin.accountantRegistration.success", {
            defaultValue: "Tạo tài khoản kế toán thành công: {{email}}",
            email: createdEmail,
          })
        );
        setEmail("");
        setPhone("");
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(res?.message || t("admin.accountantRegistration.errors.failed", { defaultValue: "Đăng ký thất bại" }));
      }
    } catch (err) {
      console.error("[AccountantRegistration] register error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("admin.accountantRegistration.errors.failed", { defaultValue: "Đăng ký thất bại" })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full p-4 md:p-6")}>
      <div className={cn("max-w-2xl mx-auto")}>
        <div className={cn("mb-5")}>
          <h1 className={cn("text-2xl font-bold text-foreground")}>
            {t("admin.accountantRegistration.title", { defaultValue: "Đăng ký kế toán" })}
          </h1>
          <p className={cn("mt-1 text-sm text-muted-foreground")}>
            {t("admin.accountantRegistration.subtitle", {
              defaultValue: "Tạo tài khoản trong bảng Managers với role = accountant.",
            })}
          </p>
        </div>

        <div
          className={cn(
            "bg-card rounded-xl p-6 md:p-8",
            "border border-border/20",
            "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          )}
        >
          <form onSubmit={handleSubmit} className={cn("space-y-4")}>
            {/* Role (fixed) */}
            <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/20")}>
              <BadgeCheck className={cn("w-5 h-5 text-primary")} />
              <div className={cn("flex-1")}>
                <p className={cn("m-0 text-sm font-medium text-foreground")}>
                  {t("admin.accountantRegistration.roleLabel", { defaultValue: "Vai trò" })}
                </p>
                <p className={cn("m-0 text-xs text-muted-foreground")}>{roleLabel}</p>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={cn("block text-sm font-medium mb-2")}>
                {t("admin.accountantRegistration.emailLabel", { defaultValue: "Email" })}{" "}
                <span className={cn("text-destructive")}>*</span>
              </label>
              <div className={cn("relative")}>
                <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("admin.accountantRegistration.emailPlaceholder", { defaultValue: "Nhập email" })}
                  className={cn("pl-10")}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={cn("block text-sm font-medium mb-2")}>
                {t("admin.accountantRegistration.phoneLabel", { defaultValue: "Số điện thoại" })}
              </label>
              <div className={cn("relative")}>
                <Phone className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("admin.accountantRegistration.phonePlaceholder", {
                    defaultValue: "Nhập số điện thoại (tùy chọn)",
                  })}
                  className={cn("pl-10")}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={cn("block text-sm font-medium mb-2")}>
                {t("admin.accountantRegistration.passwordLabel", { defaultValue: "Mật khẩu" })}{" "}
                <span className={cn("text-destructive")}>*</span>
              </label>
              <div className={cn("relative")}>
                <LockKeyhole className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("admin.accountantRegistration.passwordPlaceholder", {
                    defaultValue: "Nhập mật khẩu (tối thiểu 8 ký tự)",
                  })}
                  className={cn("pl-10 pr-10")}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground")}
                  aria-label={t("admin.accountantRegistration.togglePassword", { defaultValue: "Hiện/ẩn mật khẩu" })}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={cn("block text-sm font-medium mb-2")}>
                {t("admin.accountantRegistration.confirmPasswordLabel", { defaultValue: "Xác nhận mật khẩu" })}{" "}
                <span className={cn("text-destructive")}>*</span>
              </label>
              <div className={cn("relative")}>
                <LockKeyhole className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("admin.accountantRegistration.confirmPasswordPlaceholder", { defaultValue: "Nhập lại mật khẩu" })}
                  className={cn("pl-10 pr-10")}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground")}
                  aria-label={t("admin.accountantRegistration.toggleConfirmPassword", { defaultValue: "Hiện/ẩn xác nhận mật khẩu" })}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={cn("p-3 rounded-lg bg-destructive/10 text-destructive text-sm")}>
                {error}
              </div>
            )}

            {successMsg && (
              <div className={cn("p-3 rounded-lg bg-primary/10 text-primary text-sm")}>
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg font-medium",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading
                ? t("admin.accountantRegistration.submitting", { defaultValue: "Đang tạo..." })
                : t("admin.accountantRegistration.submit", { defaultValue: "Tạo tài khoản kế toán" })}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


