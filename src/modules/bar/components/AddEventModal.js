import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Textarea } from "../../../components/common/Textarea";
import barEventApi from "../../../api/barEventApi";
import { cn } from "../../../utils/cn";
import { Loader2, Image, X, Calendar, Clock, CheckCircle } from "lucide-react";

export default function AddEventModal({ barPageId, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    EventName: "",
    Description: "",
    StartTime: "",
    EndTime: "",
  });
  const [picture, setPicture] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Vui lòng chọn file ảnh (JPEG, PNG, GIF, WebP)");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh không được vượt quá 5MB");
        return;
      }
      
      setPicture(file);
      setError("");
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePicture = () => {
    setPicture(null);
    setPicturePreview(null);
    setError("");
  };

  const validateForm = () => {
    if (!form.EventName.trim()) {
      setError("Tên sự kiện không được để trống");
      return false;
    }

    if (!form.StartTime) {
      setError("Thời gian bắt đầu không được để trống");
      return false;
    }

    if (!form.EndTime) {
      setError("Thời gian kết thúc không được để trống");
      return false;
    }

    const startTime = new Date(form.StartTime);
    const endTime = new Date(form.EndTime);
    const now = new Date();

    if (startTime >= endTime) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu");
      return false;
    }

    if (endTime <= now) {
      setError("Thời gian kết thúc phải trong tương lai");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // AddEventModal.jsx → handleSubmit

const formData = new FormData();
formData.append("BarPageId", barPageId);
formData.append("EventName", form.EventName.trim());
formData.append("Description", form.Description.trim());
formData.append("StartTime", new Date(form.StartTime).toISOString());
formData.append("EndTime", new Date(form.EndTime).toISOString());

// CHỈ append file, KHÔNG append("Picture", "")
if (picture) {
  formData.append("Picture", picture); // ← picture là File object
}

      const res = await barEventApi.createEvent(formData);
      
      if (res.status === "success" || res.ok) {
        // Hiển thị thông báo thành công
        setSuccess(true);
        
        // Đợi 2 giây rồi đóng modal và refresh
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          onClose();
        }, 2000);
      } else {
        setError(res.message || t("bar.cannotAddEvent") || "Không thể thêm sự kiện");
      }
    } catch (err) {
      console.error("Error adding event:", err);
      setError(err.response?.data?.message || "Có lỗi xảy ra khi thêm sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDateTimeForInput = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  // Nếu thành công, hiển thị thông báo
  if (success) {
    return (
      <div className={cn("fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4")}>
        <div className={cn(
          "bg-white rounded-xl p-8 w-full max-w-md text-center",
          "border border-gray-200",
          "shadow-xl"
        )}>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className={cn("text-2xl font-bold text-gray-900 mb-2")}>
            Thành công!
          </h3>
          <p className={cn("text-gray-600 mb-6")}>
            Đã thêm sự kiện thành công
          </p>
          <div className="flex justify-center">
            <div className={cn(
              "w-8 h-8 border-4 border-blue-600 border-t-transparent",
              "rounded-full animate-spin"
            )} />
          </div>
          <p className={cn("text-sm text-gray-500 mt-4")}>
            Đang chuyển hướng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4")}>
      <div className={cn(
        "bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto",
        "border border-gray-200",
        "shadow-xl"
      )}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className={cn("text-2xl font-bold text-gray-900")}>
            Thêm sự kiện mới
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className={cn(
              "p-2 hover:bg-gray-100 rounded-lg transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={cn(
            "mb-6 p-4 rounded-lg bg-red-50 border border-red-200",
            "text-red-700 text-sm flex items-center gap-2"
          )}>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6")}>
          {/* Event Name */}
          <div>
            <label className={cn("block text-sm font-semibold text-gray-900 mb-2")}>
              Tên sự kiện *
            </label>
            <Input
              name="EventName"
              placeholder="Nhập tên sự kiện"
              value={form.EventName}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className={cn("block text-sm font-semibold text-gray-900 mb-2")}>
              Mô tả sự kiện
            </label>
            <Textarea
              name="Description"
              placeholder="Nhập mô tả chi tiết về sự kiện..."
              value={form.Description}
              onChange={handleChange}
              rows={4}
              disabled={loading}
              className="w-full resize-vertical"
            />
          </div>
          
          {/* Picture Upload */}
          <div>
            <label className={cn("block text-sm font-semibold text-gray-900 mb-3")}>
              Hình ảnh sự kiện
            </label>
            
            {/* Image Preview */}
            {picturePreview ? (
              <div className="relative mb-3">
                <img
                  src={picturePreview}
                  alt="Preview"
                  className={cn("w-full h-48 object-cover rounded-lg border-2 border-gray-200")}
                />
                <button
                  type="button"
                  onClick={removePicture}
                  disabled={loading}
                  className={cn(
                    "absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full",
                    "hover:bg-red-600 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className={cn(
                "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-3",
                "hover:border-gray-400 transition-colors cursor-pointer",
                loading && "opacity-50 cursor-not-allowed"
              )}>
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-2">
                  Nhấn để chọn hình ảnh
                </p>
                <p className="text-gray-400 text-xs">
                  Kéo thả file vào đây hoặc click để chọn
                </p>
              </div>
            )}
            
            {/* File Input */}
            <div className="flex gap-3">
              <label className={cn(
                "flex-1 cursor-pointer",
                "px-4 py-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200",
                "hover:bg-blue-100 transition-colors text-center font-medium",
                loading && "opacity-50 cursor-not-allowed"
              )}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  disabled={loading}
                  className="hidden"
                />
                {picturePreview ? "Thay đổi ảnh" : "Chọn ảnh"}
              </label>
              
              {picturePreview && (
                <button
                  type="button"
                  onClick={removePicture}
                  disabled={loading}
                  className={cn(
                    "px-4 py-3 bg-red-50 text-red-700 rounded-lg border border-red-200",
                    "hover:bg-red-100 transition-colors font-medium",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Xóa ảnh
                </button>
              )}
            </div>
            
            <p className={cn("text-xs text-gray-500 mt-2")}>
              Hỗ trợ: JPEG, PNG, GIF, WebP • Tối đa: 5MB
            </p>
          </div>

          {/* Date & Time */}
          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6")}>
            <div>
              <label className={cn("block text-sm font-semibold text-gray-900 mb-2")}>
                <Calendar size={16} className="inline mr-2" />
                Thời gian bắt đầu *
              </label>
              <Input
                type="datetime-local"
                name="StartTime"
                value={form.StartTime}
                onChange={handleChange}
                required
                disabled={loading}
                min={getCurrentDateTimeForInput()}
                className="w-full"
              />
            </div>

            <div>
              <label className={cn("block text-sm font-semibold text-gray-900 mb-2")}>
                <Clock size={16} className="inline mr-2" />
                Thời gian kết thúc *
              </label>
              <Input
                type="datetime-local"
                name="EndTime"
                value={form.EndTime}
                onChange={handleChange}
                required
                disabled={loading}
                min={form.StartTime || getCurrentDateTimeForInput()}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className={cn("flex justify-end gap-3 pt-4 border-t border-gray-200")}>
            <Button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={cn(
                "px-6 py-3 bg-gray-100 text-gray-700",
                "hover:bg-gray-200 border border-gray-300",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "font-medium"
              )}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "px-6 py-3 bg-blue-600 text-white",
                "hover:bg-blue-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "font-medium min-w-24 flex items-center gap-2"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Thêm sự kiện
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}