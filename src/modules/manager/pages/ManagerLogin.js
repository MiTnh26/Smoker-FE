import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../../../components/common/Input";
import { managerAuthApi } from "../../../api/managerAuthApi";
import { cn } from "../../../utils/cn";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import AuthHeader from "../../../components/layout/AuthHeader";

export default function ManagerLogin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await managerAuthApi.login(email, password);
      
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
        setError(res?.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      console.error("Manager login error:", err);
      setError(
        err.response?.data?.message || 
        err.message || 
        "Đăng nhập thất bại"
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
              Đăng nhập Quản lý
            </h1>
            <p className={cn("text-sm text-muted-foreground text-center mb-6")}>
              Đăng nhập vào hệ thống quản lý
            </p>

            <form onSubmit={handleSubmit} className={cn("space-y-4")}>
              {/* Email */}
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  Email
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

              {/* Password */}
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  Mật khẩu
                </label>
                <div className={cn("relative")}>
                  <LockKeyhole className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground")} />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
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
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              <div className={cn("text-center text-sm")}>
                <span className={cn("text-muted-foreground")}>
                  Chưa có tài khoản?{" "}
                </span>
                <Link
                  to="/manager/register"
                  className={cn("text-primary hover:underline")}
                >
                  Đăng ký
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

