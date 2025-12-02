import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, LogOut } from "lucide-react";
import { clearSession, getSession, updateSession } from "../../utils/sessionManager";
import { cn } from "../../utils/cn";

/**
 * Overlay component hiển thị khi tài khoản bị banned
 * @param {Object} props
 * @param {string} props.userRole - Role của user: 'Customer', 'Bar', 'DJ', 'Dancer'
 * @param {string} props.entityType - Loại entity: 'Account', 'BarPage', 'BusinessAccount'
 */
export default function BannedAccountOverlay({ userRole, entityType }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isBusinessEntity = ["Bar", "DJ", "Dancer"].includes(userRole) || 
                          ["BarPage", "BusinessAccount"].includes(entityType);

  const handleBack = () => {
    // Chuyển activeEntity về Account (Customer) trước khi navigate
    try {
      const session = getSession();
      if (session) {
        // Tìm Account entity trong entities array
        const entities = session.entities || [];
        const accountEntity = entities.find(e => 
          e.type === "Account" || 
          (e.role && e.role.toLowerCase() === "customer") ||
          (e.type && e.type.toLowerCase() === "account")
        );
        
        // Nếu tìm thấy Account entity, set làm activeEntity
        if (accountEntity) {
          updateSession({
            activeEntity: {
              ...accountEntity,
              role: "Customer",
              type: "Account"
            }
          });
        } else if (session.account) {
          // Fallback: dùng account info để tạo activeEntity
          updateSession({
            activeEntity: {
              id: session.account.id || session.account.AccountId,
              name: session.account.userName || session.account.UserName,
              avatar: session.account.avatar || session.account.Avatar,
              role: "Customer",
              type: "Account"
            }
          });
        }
      }
    } catch (err) {
      console.error("[BannedAccountOverlay] Error switching to Account:", err);
    }
    
    // Quay lại customer account
    navigate("/own/profile", { replace: true });
  };

  const handleLogout = async () => {
    try {
      clearSession();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("[BannedAccountOverlay] Logout error:", err);
      // Fallback
      localStorage.removeItem("session");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    }
  };

  const getBannedMessage = () => {
    if (entityType === "BarPage" || userRole === "Bar") {
      return t('profile.bannedDescriptionBar', {
        defaultValue: "Trang Bar này đã bị khóa. Mọi truy cập đều bị chặn cho đến khi được mở lại. Liên hệ smokerteam@gmail.com để được hỗ trợ."
      });
    } else if (entityType === "BusinessAccount" || ["DJ", "Dancer"].includes(userRole)) {
      const roleText = userRole === "DJ" ? "DJ" : "Dancer";
      return t('profile.bannedDescriptionBusiness', {
        defaultValue: `Tài khoản ${roleText} này đã bị khóa. Mọi truy cập đều bị chặn cho đến khi được mở lại. Liên hệ smokerteam@gmail.com để được hỗ trợ.`,
        role: roleText
      });
    } else {
      return t('profile.bannedDescriptionCustomer', {
        defaultValue: "Tài khoản của bạn đã bị khóa. Mọi truy cập đều bị chặn cho đến khi được mở lại. Liên hệ smokerteam@gmail.com để được hỗ trợ."
      });
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[99999]",
      "flex items-center justify-center",
      "bg-black/60 backdrop-blur-sm",
      "px-4"
    )}>
      <div className={cn(
        "relative z-10",
        "max-w-xl w-full",
        "bg-card border border-destructive/40 rounded-2xl p-8 shadow-lg",
        "text-center"
      )}>
        <h2 className={cn(
          "text-2xl font-semibold mb-3",
          "text-destructive"
        )}>
          {t('profile.bannedTitle', { defaultValue: "Tài khoản đã bị cấm" })}
        </h2>
        
        <p className={cn(
          "text-muted-foreground mb-6",
          "leading-relaxed"
        )}>
          {getBannedMessage()}
        </p>

        <div className={cn("flex items-center justify-center gap-3")}>
          {isBusinessEntity ? (
            <button
              onClick={handleBack}
              className={cn(
                "flex items-center gap-2",
                "px-6 py-2.5",
                "bg-primary text-primary-foreground",
                "rounded-lg font-medium",
                "hover:bg-primary/90",
                "transition-colors"
              )}
            >
              <ArrowLeft size={18} />
              <span>{t('common.back', { defaultValue: "Quay lại" })}</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-2",
                "px-6 py-2.5",
                "bg-destructive text-destructive-foreground",
                "rounded-lg font-medium",
                "hover:bg-destructive/90",
                "transition-colors"
              )}
            >
              <LogOut size={18} />
              <span>{t('menu.logout', { defaultValue: "Đăng xuất" })}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

BannedAccountOverlay.propTypes = {
  userRole: PropTypes.string,
  entityType: PropTypes.string
};

