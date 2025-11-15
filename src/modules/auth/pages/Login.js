import React, { useState } from "react"; // ✅ import useState
import { useTranslation } from "react-i18next";
import { Input } from "../../../components/common/Input";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { authApi, userApi } from "../../../api/userApi";
import { useAuth } from "../../../hooks/useAuth";
import FacebookLoginButton from '../pages/FacebookLoginButton';
import { fetchAllEntities } from "../../../utils/sessionHelper";
import { cn } from "../../../utils/cn";
import { borderStyles } from "../../../utils/border-patterns";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import PublicHeader from "../../../components/layout/PublicHeader";

export function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Google login uses button only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await authApi.login(email, password);
      if (res && res.token) {
        await login({ token: res.token, user: res.user });
        
        // Fetch all entities (bars, businesses)
        const entities = await fetchAllEntities(res.user.id, res.user);
        
        // Fetch EntityAccountId for Account entity
        let accountEntityAccountId = null;
        try {
          console.log("[Login] Fetching EntityAccountId for AccountId:", res.user.id);
          const entityAccountRes = await userApi.getEntityAccountId(res.user.id);
          accountEntityAccountId = entityAccountRes?.data?.data?.EntityAccountId || entityAccountRes?.data?.EntityAccountId || null;
          console.log("[Login] Fetched EntityAccountId:", accountEntityAccountId);
          
          if (!accountEntityAccountId) {
            console.warn("[Login] EntityAccountId is null, response:", entityAccountRes);
          }
        } catch (err) {
          console.error("[Login] Failed to fetch EntityAccountId for Account:", err);
          console.error("[Login] Error details:", err?.response?.data || err?.message);
        }
        
        // Find Account entity in entities array and update it with EntityAccountId
        const accountEntity = entities.find(e => e.type === "Account");
        if (accountEntity && accountEntityAccountId) {
          accountEntity.EntityAccountId = accountEntityAccountId;
        }
        
        // ✅ Initialize session using sessionManager
        const { initializeSession } = await import("../../../utils/sessionManager");
        initializeSession({
          token: res.token,
          user: res.user,
          entities: entities,
          entityAccountId: accountEntityAccountId
        });
        if (!res.needProfile) {
          navigate("/customer/newsfeed", { replace: true });
        } else {
          navigate("/profile-setup", { replace: true });
        }
      } else {
        setError(res?.message || t('auth.loginFailed'));
      }
    } catch (err) {
      setError(err?.response?.data?.message || t('auth.loginFailed'));
    }
  };

  // const handleGoogleLogin = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   try {
  //     const res = await authApi.googleLogin();
  //     if (res && res.token) {
  //       await login({ token: res.token, user: res.user });
  //       if (!res.needProfile) {
  //         navigate("/customer/newsfeed", { replace: true });
  //       } else {
  //         navigate("/profile-setup", { replace: true });
  //       }
  //     } else {
  //       setError(res?.message || "Đăng nhập thất bại");
  //     }
  //   } catch (err) {
  //     setError(err?.response?.data?.message || "Đăng nhập thất bại");
  //   }
  // };

  return (
    <div className="bg-background text-foreground">
      <PublicHeader />
      <div
        className={cn(
          "container mx-auto flex min-h-[calc(100vh-73px)] w-full items-center justify-center",
          "px-4 pb-16 pt-[84px] sm:px-6 sm:pt-[96px] md:pb-20"
        )}
      >
        <div
          className={cn(
            "grid w-full gap-8",
            "max-w-lg md:max-w-3xl lg:max-w-5xl",
            "grid-cols-1 lg:grid-cols-[1.05fr_1fr]"
          )}
        >
          <section
            className={cn(
              borderStyles.card,
              "hidden flex-col justify-between bg-muted/40 p-8 text-foreground lg:flex",
              "backdrop-blur-sm"
            )}
          >
            <div className="flex items-center gap-2 text-xl font-semibold text-primary">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                S
              </span>
              Smoker
            </div>
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-semibold leading-tight">
                  {t("auth.welcomeTitle", "Welcome back to Smoker")}
                </h2>
                <p className="mt-3 text-muted-foreground">
                  {t(
                    "auth.welcomeDesc",
                    "Connect with the nightlife community, book services, and discover new experiences every night."
                  )}
                </p>
              </div>
              <div className="grid gap-4">
                {[
                  t("auth.benefitDiscover", "Khám phá địa điểm trending"),
                  t("auth.benefitBook", "Đặt DJ, dancer cho sự kiện"),
                  t("auth.benefitConnect", "Kết nối cùng bạn bè và bar yêu thích"),
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 rounded-lg bg-background/60 p-3",
                      "border-[0.5px] border-border/20"
                    )}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Smoker Platform. All rights reserved.
            </div>
          </section>

          <section
            className={cn(
              borderStyles.card,
              "bg-card p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:p-7 md:p-8",
              "rounded-3xl md:rounded-[32px]"
            )}
          >
            <div className="mb-6 flex flex-col gap-2 text-center sm:text-left">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {t("auth.loginTitle", "Đăng nhập vào Smoker")}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                {t("auth.loginSubtitle", "Tiếp tục hành trình nightlife của bạn.")}
              </p>
          </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground sm:text-base">
                    {t("auth.emailOrPhone")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                type="text"
                      placeholder={t("auth.emailOrPhone")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                      className="pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground sm:text-base">
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
              </div>

              {error ? (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className={cn(
                  "w-full bg-primary text-primary-foreground border-none",
                  "rounded-lg py-3 text-base font-semibold sm:rounded-xl sm:py-3.5",
                  "transition-all duration-200",
                  "hover:bg-primary/90 active:scale-95"
                )}
              >
                {t("auth.login")}
              </button>

              <div className="flex flex-col gap-4 text-sm text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <div className="text-muted-foreground">
                  {t("auth.notHaveAccount", "Chưa có tài khoản?")}{" "}
                  <Link
                    to="/signup"
                    className="font-semibold text-primary hover:text-primary/90"
                  >
                    {t("auth.createAccount")}
                  </Link>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary hover:text-primary/90"
                >
                  {t("auth.forgot")}
                </Link>
              </div>

              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <span className="h-[1px] w-full flex-1 bg-border/30 sm:w-auto" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("auth.orContinue", "hoặc tiếp tục với")}
                </span>
                <span className="h-[1px] w-full flex-1 bg-border/30 sm:w-auto" />
              </div>

              <button
                type="button"
                className={cn(
                  "w-full bg-muted/40 text-foreground border-none",
                  "rounded-lg py-2.5 text-sm font-semibold sm:rounded-xl sm:py-3",
                  "transition-all duration-200",
                  "hover:bg-muted/60 active:scale-95"
                )}
                onClick={() => navigate("/login/google")}
              >
                {t("auth.loginWithGoogle")}
              </button>

                <FacebookLoginButton />

              <div className="rounded-xl bg-primary/5 px-3 py-3 text-xs text-muted-foreground sm:text-sm">
                <span className="font-medium text-foreground">{t("auth.tipsTitle", "Mẹo:")}</span>{" "}
                {t("auth.tipsContent", "Bật xác thực hai lớp để bảo vệ tài khoản của bạn tốt hơn.")}
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.createPageFor")}{" "}
              <Link to="/create-page" className="font-semibold text-primary hover:text-primary/90">
                {t("auth.createPage")}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
