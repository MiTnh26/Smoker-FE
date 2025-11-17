import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { ImageUploadField } from "./ImageUploadField";
import AddressSelector from "../common/AddressSelector";

/**
 * Reusable Profile Edit Modal Component
 * Supports config-based field rendering with collapsible fields
 * Keep exact same modal structure and styling as original
 */
export const ProfileEditModal = ({
  profile,
  fields = [],
  onSave,
  onClose,
  addressConfig,
  saving = false,
  uploadingStates = {},
  title = "Chỉnh sửa hồ sơ",
  onUploadStateChange,
}) => {
  const { t } = useTranslation();
  const [editingField, setEditingField] = useState(null);
  const [localProfile, setLocalProfile] = useState(profile);

  // Update local profile when prop changes
  React.useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  // Check if save button should be disabled
  const isSaveDisabled = saving || 
    (uploadingStates.avatar === true) || 
    (uploadingStates.background === true) ||
    Object.values(uploadingStates).some(state => state === true);

  const handleFieldChange = (fieldKey, value) => {
    setLocalProfile(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleSave = () => {
    onSave(localProfile);
  };

  const renderField = (field) => {
    const { key, type, label, uploadMode, urlInput, options, placeholder } = field;
    const value = localProfile[key] || "";
    const isEditing = editingField === key;

    // Image field
    if (type === "image") {
      return (
        <div key={key} className={cn("flex justify-between items-center border-b border-border/30 pb-4")}>
          <div className={cn("flex items-center gap-4")}>
            <div className={cn("relative")}>
              <img
                src={value || (key === "avatar" || key === "Avatar" ? "https://via.placeholder.com/100" : "https://i.imgur.com/6IUbEMn.jpg")}
                alt={label}
                className={cn(
                  key === "avatar" || key === "Avatar" 
                    ? "w-20 h-20 rounded-full object-cover border-2 border-border/20"
                    : "w-24 h-16 rounded-lg object-cover border-2 border-border/20"
                )}
              />
              {uploadingStates[key] && (
                <div className={cn(
                  "absolute inset-0 bg-black/50 rounded-full flex items-center justify-center",
                  key !== "avatar" && key !== "Avatar" && "rounded-lg"
                )}>
                  <div className={cn("text-primary-foreground text-xs")}>
                    Đang upload...
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className={cn("font-semibold text-base text-foreground")}>
                {label}
              </p>
              <p className={cn("text-sm text-muted-foreground")}>
                {key === "avatar" || key === "Avatar" ? "Hiển thị cho người dùng" : "Hiển thị ở đầu trang"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditingField(isEditing ? null : key)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm",
              "bg-transparent border-none text-primary",
              "hover:bg-primary/10 transition-all duration-200",
              "active:scale-95"
            )}
          >
            {isEditing ? t('profile.close') : t('profile.editProfile')}
          </button>
        </div>
      );
    }

    // Text/Textarea/Email/Number fields
    if (["text", "textarea", "email", "number"].includes(type)) {
      const displayValue = value || `Chưa có ${label.toLowerCase()}`;
      return (
        <div key={key} className={cn("flex justify-between items-center border-b border-border/30 pb-4")}>
          <div>
            <p className={cn("font-semibold text-base text-foreground")}>
              {label}
            </p>
            <p className={cn("text-sm text-muted-foreground mt-1")}>
              {displayValue}
            </p>
          </div>
          <button
            onClick={() => setEditingField(isEditing ? null : key)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm",
              "bg-transparent border-none text-primary",
              "hover:bg-primary/10 transition-all duration-200",
              "active:scale-95"
            )}
          >
            {isEditing ? t('profile.close') : t('profile.editProfile')}
          </button>
        </div>
      );
    }

    // Select field
    if (type === "select") {
      const displayValue = value || `Chưa có ${label.toLowerCase()}`;
      return (
        <div key={key} className={cn("flex justify-between items-center border-b border-border/30 pb-4")}>
          <div>
            <p className={cn("font-semibold text-base text-foreground")}>
              {label}
            </p>
            <p className={cn("text-sm text-muted-foreground mt-1")}>
              {displayValue}
            </p>
          </div>
          <button
            onClick={() => setEditingField(isEditing ? null : key)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm",
              "bg-transparent border-none text-primary",
              "hover:bg-primary/10 transition-all duration-200",
              "active:scale-95"
            )}
          >
            {isEditing ? t('profile.close') : t('profile.editProfile')}
          </button>
        </div>
      );
    }

    // Address field
    if (type === "address") {
      return (
        <div key={key} className={cn("flex justify-between items-start border-b border-border/30 pb-4")}>
          <div>
            <p className={cn("font-semibold text-base text-foreground mb-2")}>
              {label}
            </p>
            <div className={cn("text-sm text-muted-foreground space-y-1")}>
              {Object.entries(localProfile).filter(([k]) => 
                addressConfig && (k === "Address" || k === "address")
              ).map(([k, v]) => (
                <p key={k}><strong className={cn("text-foreground")}>{k}:</strong> {v || "Chưa có"}</p>
              ))}
            </div>
          </div>
          <button
            onClick={() => setEditingField(isEditing ? null : key)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm",
              "bg-transparent border-none text-primary",
              "hover:bg-primary/10 transition-all duration-200",
              "active:scale-95 self-start"
            )}
          >
            {isEditing ? t('profile.close') : t('profile.editProfile')}
          </button>
        </div>
      );
    }

    return null;
  };

  const renderFieldEditor = (field) => {
    const { key, type, label, uploadMode, urlInput, options, placeholder } = field;
    const value = localProfile[key] || "";
    const isEditing = editingField === key;

    if (!isEditing) return null;

    // Image field editor
    if (type === "image") {
      return (
        <div key={`${key}-editor`} className={cn("mt-4")}>
          <ImageUploadField
            label={label}
            value={value}
            onChange={(url) => handleFieldChange(key, url)}
            uploadMode={uploadMode}
            urlInput={urlInput}
            uploadEndpoint="/posts/upload"
            maxSize={5 * 1024 * 1024}
            uploading={uploadingStates[key] || false}
            onUploadStateChange={(uploading) => {
              if (onUploadStateChange) {
                onUploadStateChange(key, uploading);
              }
            }}
            previewClassName={key === "avatar" || key === "Avatar" ? "w-20 h-20 rounded-full" : "w-24 h-16 rounded-lg"}
          />
        </div>
      );
    }

    // Text field editor
    if (type === "text" || type === "email") {
      return (
        <div key={`${key}-editor`} className={cn("mt-4")}>
          <input
            type={type === "email" ? "email" : "text"}
            placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
            value={value}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg",
              "border-[0.5px] border-border/20",
              "bg-background text-foreground",
              "outline-none transition-all duration-200",
              "placeholder:text-muted-foreground/60",
              "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
            )}
          />
        </div>
      );
    }

    // Textarea field editor
    if (type === "textarea") {
      return (
        <div key={`${key}-editor`} className={cn("mt-4")}>
          <textarea
            rows={3}
            placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
            value={value}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg",
              "border-[0.5px] border-border/20",
              "bg-background text-foreground",
              "outline-none transition-all duration-200",
              "placeholder:text-muted-foreground/60",
              "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
              "resize-y"
            )}
          />
        </div>
      );
    }

    // Number field editor
    if (type === "number") {
      return (
        <div key={`${key}-editor`} className={cn("mt-4")}>
          <input
            type="number"
            placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
            value={value}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg",
              "border-[0.5px] border-border/20",
              "bg-background text-foreground",
              "outline-none transition-all duration-200",
              "placeholder:text-muted-foreground/60",
              "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
            )}
          />
        </div>
      );
    }

    // Select field editor
    if (type === "select" && options) {
      return (
        <div key={`${key}-editor`} className={cn("mt-4")}>
          <select
            value={value}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg",
              "border-[0.5px] border-border/20",
              "bg-background text-foreground",
              "outline-none transition-all duration-200",
              "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
            )}
          >
            <option value="">Chọn {label.toLowerCase()}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Address field editor
    if (type === "address" && addressConfig) {
      return (
        <div key={`${key}-editor`} className={cn("mt-4 space-y-4")}>
          <div>
            <span className={cn("text-sm font-medium text-foreground block mb-2")}>
              {label}:
            </span>
            <AddressSelector
              selectedProvinceId={addressConfig.selectedProvinceId}
              selectedDistrictId={addressConfig.selectedDistrictId}
              selectedWardId={addressConfig.selectedWardId}
              addressDetail={addressConfig.addressDetail}
              onProvinceChange={(id) => {
                addressConfig.onProvinceChange(id);
              }}
              onDistrictChange={(id) => {
                addressConfig.onDistrictChange(id);
              }}
              onWardChange={addressConfig.onWardChange}
              onAddressDetailChange={addressConfig.onAddressDetailChange}
              onAddressChange={(fullAddr) => {
                handleFieldChange(key, fullAddr);
                if (addressConfig.onAddressChange) {
                  addressConfig.onAddressChange(fullAddr);
                }
              }}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 backdrop-blur-sm",
      "flex items-center justify-center z-50 p-4"
    )}>
      <div className={cn(
        "bg-card text-card-foreground rounded-lg",
        "border-[0.5px] border-border/20",
        "shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
        "w-full max-w-2xl max-h-[90vh] overflow-y-auto",
        "flex flex-col"
      )}>
        {/* Header */}
        <div className={cn(
          "p-4 border-b border-border/30",
          "flex items-center justify-between flex-shrink-0"
        )}>
          <h3 className={cn("text-xl font-semibold text-foreground")}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={cn(
              "w-8 h-8 flex items-center justify-center",
              "bg-transparent border-none text-muted-foreground",
              "rounded-lg transition-all duration-200",
              "hover:bg-muted/50 hover:text-foreground",
              "active:scale-95"
            )}
          >
            <i className="bx bx-x text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className={cn("p-6 flex-1 overflow-y-auto")}>
          <div className={cn("space-y-6")}>
            {fields.map(field => (
              <React.Fragment key={field.key}>
                {renderField(field)}
                {renderFieldEditor(field)}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          "p-4 border-t border-border/30",
          "flex items-center justify-end gap-3 flex-shrink-0"
        )}>
          <button
            onClick={onClose}
            disabled={isSaveDisabled}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold text-sm",
              "bg-transparent border-none text-muted-foreground",
              "hover:text-foreground hover:bg-muted/50",
              "transition-all duration-200",
              "active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {t('profile.close')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold text-sm",
              "bg-primary text-primary-foreground border-none",
              "hover:bg-primary/90 transition-all duration-200",
              "active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {saving ? t('profile.saving') : t('profile.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

