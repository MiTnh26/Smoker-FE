import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { authApi, userApi } from "../../../api/userApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { fetchAllEntities } from "../../../utils/sessionHelper";
import PublicHeader from "../../../components/layout/PublicHeader";

export default function GoogleLoginButton() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSuccess = async (credentialResponse) => {
    try {
      const idToken = credentialResponse.credential;
      const data = await authApi.googleLogin({ idToken });
  
      if (data?.token) {
        await login({ token: data.token, user: data.user });
      
        // Fetch EntityAccountId FIRST before creating entities
        // Retry logic: Backend will create EntityAccount if it doesn't exist
        let accountEntityAccountId = null;
        const maxRetries = 3;
        const retryDelay = 500; // 500ms delay between retries
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[GoogleLogin] Fetching EntityAccountId for AccountId: ${data.user.id} (attempt ${attempt}/${maxRetries})`);
            const entityAccountRes = await userApi.getEntityAccountId(data.user.id);
            
            // Parse response - handle both success and error formats
            // Backend returns: { status: "success", data: { EntityAccountId: "..." } }
            // Axios wraps it: { data: { status: "success", data: { EntityAccountId: "..." } } }
            if (entityAccountRes?.data?.status === 'success' && entityAccountRes?.data?.data?.EntityAccountId) {
              accountEntityAccountId = entityAccountRes.data.data.EntityAccountId;
              console.log("[GoogleLogin] ✅ Fetched EntityAccountId:", accountEntityAccountId);
              break; // Success, exit retry loop
            } else if (entityAccountRes?.data?.data?.EntityAccountId) {
              // Alternative response format (without status check)
              accountEntityAccountId = entityAccountRes.data.data.EntityAccountId;
              console.log("[GoogleLogin] ✅ Fetched EntityAccountId (alt format):", accountEntityAccountId);
              break;
            } else if (entityAccountRes?.data?.EntityAccountId) {
              // Direct EntityAccountId in data (unlikely but handle it)
              accountEntityAccountId = entityAccountRes.data.EntityAccountId;
              console.log("[GoogleLogin] ✅ Fetched EntityAccountId (direct):", accountEntityAccountId);
              break;
            } else {
              // Log the full response for debugging
              console.warn(`[GoogleLogin] ⚠️ Unexpected response format, attempt ${attempt}/${maxRetries}:`, {
                status: entityAccountRes?.status,
                data: entityAccountRes?.data,
                response: entityAccountRes?.response?.data
              });
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                continue;
              }
            }
          } catch (err) {
            console.error(`[GoogleLogin] ❌ Failed to fetch EntityAccountId (attempt ${attempt}/${maxRetries}):`, {
              status: err?.response?.status,
              data: err?.response?.data,
              message: err?.message
            });
            if (err?.response?.status === 404) {
              // 404 means EntityAccount doesn't exist - backend should create it
              if (attempt < maxRetries) {
                console.log(`[GoogleLogin] 🔄 Retrying after ${retryDelay * attempt}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                continue; // Retry
              } else {
                console.error("[GoogleLogin] ❌ EntityAccountId still null after all retries");
              }
            } else {
              // Other errors - don't retry
              console.error("[GoogleLogin] ❌ Non-retryable error:", err?.response?.data || err?.message);
              break;
            }
          }
        }
        
        if (!accountEntityAccountId) {
          console.warn("[GoogleLogin] ⚠️ EntityAccountId is null after all attempts. Session will be saved with null EntityAccountId.");
        }
        
        // Fetch all entities (bars, businesses) - NOW with EntityAccountId available
        const entities = await fetchAllEntities(data.user.id, data.user, accountEntityAccountId);
        
        // Ensure Account entity has EntityAccountId (double-check)
        const accountEntity = entities.find(e => e.type === "Account");
        if (accountEntity) {
          if (accountEntityAccountId && !accountEntity.EntityAccountId) {
            accountEntity.EntityAccountId = accountEntityAccountId;
            console.log("[GoogleLogin] ✅ Updated Account entity with EntityAccountId:", accountEntityAccountId);
          } else if (!accountEntityAccountId) {
            console.warn("[GoogleLogin] ⚠️ Account entity EntityAccountId is still null:", accountEntity);
          }
        }
      
        // ✅ Initialize session using sessionManager
        const { initializeSession } = await import("../../../utils/sessionManager");
        initializeSession({
          token: data.token,
          user: data.user,
          entities: entities,
          entityAccountId: accountEntityAccountId
        });
      
        setMessage(t('auth.googleLoginSuccess'));
        setError("");
        
        if (data.needProfile) {
          setTimeout(() => navigate("/profile-setup", { replace: true }), 800);
        } else {
          setTimeout(() => navigate("/customer/newsfeed", { replace: true }), 800);
        }
  
      } else if (data?.message) {
        setMessage(data.message);
        setError("");
      } else {
        setError(t('auth.googleAuthFailed'));
        setMessage("");
      }
    } catch (err) {
      setError(err?.response?.data?.message || t('auth.googleAuthFailed'));
      setMessage("");
    }
  };
  

  return (
    <div className="bg-background text-foreground">
      <PublicHeader />
      <div className="container mx-auto min-h-[calc(100vh-73px)] px-4 pt-[73px] pb-12 flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border-[0.5px] border-border/20 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-semibold">{t('auth.loginWithGoogle')}</h2>
            <p className="text-sm text-muted-foreground">{t('auth.googleLoginSubtitle')}</p>
          </div>
          <div className="min-h-[28px]">
            {error ? (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger text-center">{error}</div>
            ) : null}
            {message && !error ? (
              <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success text-center">{message}</div>
            ) : null}
          </div>
          <div className="mt-4 flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError(t('auth.googleLoginFailed'))}
              width="320"
              size="large"
              shape="pill"
              text="signin_with"
              theme="outline"
              useOneTap
            />
          </div>
        </div>
      </div>
    </div>
  );
}
