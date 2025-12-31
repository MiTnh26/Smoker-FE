import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../../../components/common/Input";
import { managerAuthApi } from "../../../api/managerAuthApi";
import { cn } from "../../../utils/cn";
import { Eye, EyeOff, LockKeyhole, Mail, Phone } from "lucide-react";
import AuthHeader from "../../../components/layout/AuthHeader";

export default function ManagerRegister() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (!email.includes("@")) {
      setError("Email không hợp lệ");
      return;
    }

    setLoading(true);

    try {
      const res = await managerAuthApi.register(email, password, role, phone);
      
      if (res && res.status === "success" && res.data) {
        // Lưu token và manager info
        const { saveSession } = await import("../../../utils/sessionManager");
        saveSession({
          token: res.data.token,
          manager: res.data.manager,
          type: "manager",
          _createdAt: new Date().toISOString(),
        });

        // Lưu vào localStorage
        localStorage.setItem("manager", JSON.stringify(res.data.manager));
        localStorage.setItem("token", res.data.token);

        // Redirect dựa trên role
        // Admin (role = "Admin") → trang admin đầy đủ
        // Accountant (role = "Accountant") → trang kế toán
        const managerRole = res.data.manager?.role?.toLowerCase();
        if (managerRole === "accountant") {
          navigate("/accountant/dashboard");
        } else {
          // Admin hoặc bất kỳ role nào khác → vào trang admin đầy đủ
          navigate("/admin/dashboard");
        }
      } else {
        setError(res?.message || "Đăng ký thất bại");
      }
    } catch (err) {
      console.error("Manager register error:", err);
      setError(
        err.response?.data?.message || 
        err.message || 
        "Đăng ký thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background flex flex-col")}>
      <AuthHeader />
      <div className={cn("flex-1 flex items-center justify-center px-4 py-12")}>
        <div className={cn("w-full max-w-md")}>
          <div className={cn("bg-card rounded-xl p-8 border border-border/20 shadow-lg")}>
            <h1 className={cn("text-2xl font-bold mb-2 text-center")}>
              Đăng ký Quản lý
            </h1>
            <p className={cn("text-sm text-muted-foreground text-center mb-6")}>
              Tạo tài khoản quản lý mới
            </p>

            <form onSubmit={handleSubmit} className={cn("space-y-4")}>
              {/* Email */}
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  Email <span className={cn("text-destructive")}>*</span>
                </label>
                <div className={cn("relative")}>
                  <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email"
                    className={cn("pl-10")}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  Vai trò
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg",
                    "border-[0.5px] border-border/20",
                    "bg-background text-foreground",
                    "outline-none transition-all duration-200",
                    "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                  )}
                  disabled={loading}
                >
                  <option value="Manager">Quản lý</option>
                  <option value="Accountant">Kế toán</option>
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  Số điện thoại
                </label>
                <div className={cn("relative")}>
                  <Phone className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại (tùy chọn)"
                    className={cn("pl-10")}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  Mật khẩu <span className={cn("text-destructive")}>*</span>
                </label>
                <div className={cn("relative")}>
                  <LockKeyhole className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                    className={cn("pl-10 pr-10")}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground")}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  Xác nhận mật khẩu <span className={cn("text-destructive")}>*</span>
                </label>
                <div className={cn("relative")}>
                  <LockKeyhole className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className={cn("pl-10 pr-10")}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground")}
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
                {loading ? "Đang đăng ký..." : "Đăng ký"}
              </button>

              <div className={cn("text-center text-sm")}>
                <span className={cn("text-muted-foreground")}>
                  Đã có tài khoản?{" "}
                </span>
                <Link
                  to="/manager/login"
                  className={cn("text-primary hover:underline")}
                >
                  Đăng nhập
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

