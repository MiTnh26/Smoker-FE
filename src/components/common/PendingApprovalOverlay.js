import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock } from "lucide-react";
import { getSession, updateSession } from "../../utils/sessionManager";
import { cn } from "../../utils/cn";

/**
 * Overlay component hiển thị khi tài khoản đang chờ duyệt
 * @param {Object} props
 * @param {string} props.userRole - Role của user: 'Bar', 'DJ', 'Dancer'
 * @param {string} props.entityType - Loại entity: 'BarPage', 'BusinessAccount'
 */
export default function PendingApprovalOverlay({ userRole, entityType }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
        
        // Trigger session update event để các component khác cập nhật (Sidebar, Header, etc.)
        if (typeof window !== "undefined" && window.dispatchEvent) {
          window.dispatchEvent(new Event("sessionUpdated"));
          // Also trigger storage event để các component lắng nghe storage event cũng cập nhật
          window.dispatchEvent(new StorageEvent("storage", { key: "session" }));
        }
      }
    } catch (err) {
      console.error("[PendingApprovalOverlay] Error switching to Account:", err);
    }
    
    // Quay lại customer account
    navigate("/own/profile", { replace: true });
  };

  const getPendingMessage = () => {
    if (entityType === "BarPage" || userRole === "Bar") {
      return t('profile.pendingDescriptionBar', {
        defaultValue: "Hồ sơ Bar của bạn đang chờ quản trị viên duyệt. Sau khi được duyệt, bạn sẽ có thể sử dụng đầy đủ các chức năng của Bar. Vui lòng đợi trong giây lát."
      });
    } else if (entityType === "BusinessAccount" || ["DJ", "Dancer"].includes(userRole)) {
      const roleText = userRole === "DJ" ? "DJ" : "Dancer";
      return t('profile.pendingDescriptionBusiness', {
        defaultValue: `Hồ sơ ${roleText} của bạn đang chờ quản trị viên duyệt. Sau khi được duyệt, bạn sẽ có thể sử dụng đầy đủ các chức năng của ${roleText}. Vui lòng đợi trong giây lát.`,
        role: roleText
      });
    } else {
      return t('profile.pendingDescription', {
        defaultValue: "Hồ sơ của bạn đang chờ quản trị viên duyệt. Vui lòng đợi trong giây lát."
      });
    }
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[99999]",
        "flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        "px-4",
        "pointer-events-auto"
      )}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className={cn(
          "relative z-10",
          "max-w-xl w-full",
          "bg-card border border-warning/40 rounded-2xl p-8 shadow-lg",
          "text-center",
          "pointer-events-auto"
        )}
        style={{ pointerEvents: 'auto' }}
      >
        <div className={cn(
          "flex items-center justify-center mb-4"
        )}>
          <Clock className={cn(
            "w-12 h-12",
            "text-warning"
          )} />
        </div>
        
        <h2 className={cn(
          "text-2xl font-semibold mb-3",
          "text-warning"
        )}>
          {t('profile.pendingTitle', { defaultValue: "Đang chờ duyệt" })}
        </h2>
        
        <p className={cn(
          "text-muted-foreground mb-6",
          "leading-relaxed"
        )}>
          {getPendingMessage()}
        </p>

        <div className={cn("flex items-center justify-center gap-3")}>
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              "flex items-center gap-2",
              "px-6 py-2.5",
              "bg-primary text-primary-foreground",
              "rounded-lg font-medium",
              "hover:bg-primary/90",
              "transition-colors",
              "cursor-pointer",
              "pointer-events-auto"
            )}
            style={{ pointerEvents: 'auto' }}
          >
            <ArrowLeft size={18} />
            <span>{t('common.back', { defaultValue: "Quay lại" })}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

PendingApprovalOverlay.propTypes = {
  userRole: PropTypes.string,
  entityType: PropTypes.string
};

