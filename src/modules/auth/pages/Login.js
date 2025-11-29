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
import AuthHeader from "../../../components/layout/AuthHeader";

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
        // Retry logic: Backend will create EntityAccount if it doesn't exist
        let accountEntityAccountId = null;
        const maxRetries = 3;
        const retryDelay = 500; // 500ms delay between retries
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[Login] Fetching EntityAccountId for AccountId: ${res.user.id} (attempt ${attempt}/${maxRetries})`);
            const entityAccountRes = await userApi.getEntityAccountId(res.user.id);
            
            // Parse response - handle both success and error formats
            if (entityAccountRes?.data?.status === 'success' && entityAccountRes?.data?.data?.EntityAccountId) {
              accountEntityAccountId = entityAccountRes.data.data.EntityAccountId;
              console.log("[Login] Fetched EntityAccountId:", accountEntityAccountId);
              break; // Success, exit retry loop
            } else if (entityAccountRes?.data?.data?.EntityAccountId) {
              // Alternative response format
              accountEntityAccountId = entityAccountRes.data.data.EntityAccountId;
              console.log("[Login] Fetched EntityAccountId (alt format):", accountEntityAccountId);
              break;
            } else if (entityAccountRes?.data?.EntityAccountId) {
              // Direct EntityAccountId in data
              accountEntityAccountId = entityAccountRes.data.EntityAccountId;
              console.log("[Login] Fetched EntityAccountId (direct):", accountEntityAccountId);
              break;
            } else if (entityAccountRes?.response?.status === 404) {
              // EntityAccount doesn't exist yet - backend should create it
              console.log(`[Login] EntityAccount not found (404), attempt ${attempt}/${maxRetries}. Backend should create it.`);
              if (attempt < maxRetries) {
                // Wait before retrying to allow backend to create EntityAccount
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                continue; // Retry
              } else {
                console.warn("[Login] EntityAccountId still null after retries. Backend may need to create EntityAccount.");
              }
            } else {
              console.warn(`[Login] Unexpected response format, attempt ${attempt}/${maxRetries}:`, entityAccountRes);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                continue;
              }
            }
          } catch (err) {
            console.error(`[Login] Failed to fetch EntityAccountId (attempt ${attempt}/${maxRetries}):`, err);
            if (err?.response?.status === 404) {
              // 404 means EntityAccount doesn't exist - backend should create it
              if (attempt < maxRetries) {
                console.log(`[Login] Retrying after ${retryDelay * attempt}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                continue; // Retry
              } else {
                console.error("[Login] EntityAccountId still null after all retries");
              }
            } else {
              // Other errors - don't retry
              console.error("[Login] Error details:", err?.response?.data || err?.message);
              break;
            }
          }
        }
        
        if (!accountEntityAccountId) {
          console.warn("[Login] EntityAccountId is null after all attempts. Session will be saved with null EntityAccountId.");
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
        <div
          className={cn(
            "grid w-full gap-4",
            "max-w-md md:max-w-2xl lg:max-w-4xl",
            "grid-cols-1 lg:grid-cols-[1.05fr_1fr]"
          )}
        >
          <section
            className={cn(
              borderStyles.card,
              "hidden flex-col justify-between bg-muted/40 p-6 text-foreground lg:flex",
              "backdrop-blur-sm"
            )}
          >
            <div className="flex items-center gap-2 text-xl font-semibold text-primary">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                S
              </span>
              Smoker
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold leading-tight">
                  {t("auth.welcomeTitle", "Welcome back to Smoker")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(
                    "auth.welcomeDesc",
                    "Connect with the nightlife community, book services, and discover new experiences every night."
                  )}
                </p>
              </div>
              <div className="grid gap-3">
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
              "bg-card px-4 pt-2 pb-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:px-5 sm:pt-3 sm:pb-5",
              "rounded-2xl md:rounded-3xl"
            )}
          >
            <div className="mb-3 flex flex-col gap-0.5 text-center sm:text-left">
              <h1 className="text-xl font-semibold sm:text-2xl">
                {t("auth.loginTitle", "Đăng nhập vào Smoker")}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t("auth.loginSubtitle", "Tiếp tục hành trình nightlife của bạn.")}
              </p>
          </div>

            <form className="space-y-2.5" onSubmit={handleSubmit}>
              <div className="space-y-2.5">
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-muted-foreground sm:text-sm">
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
                  "rounded-lg py-2.5 text-base font-semibold sm:rounded-xl sm:py-3",
                  "transition-all duration-200",
                  "hover:bg-primary/90 active:scale-95"
                )}
              >
                {t("auth.login")}
              </button>

              <div className="flex flex-col gap-2 text-xs text-center sm:flex-row sm:items-center sm:justify-between sm:text-left sm:text-sm">
                <div className="text-muted-foreground">
                  {t("auth.notHaveAccount", "Chưa có tài khoản?")}{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-primary hover:text-primary/90"
                  >
                    {t("auth.createAccount", "Create new account")}
                  </Link>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary hover:text-primary/90"
                >
                  {t("auth.forgot")}
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <span className="h-[1px] flex-1 bg-border/30" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("auth.orContinue", "hoặc tiếp tục với")}
                </span>
                <span className="h-[1px] flex-1 bg-border/30" />
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

                {/* <FacebookLoginButton /> */}

             
            </form>

          
          </section>
        </div>
      </div>
    </div>
  );
}
