import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Textarea } from "../../../components/common/Textarea";
import barEventApi from "../../../api/barEventApi";
import { cn } from "../../../utils/cn";
import { Loader2, Calendar, Clock, Image, X, CheckCircle } from "lucide-react";

export default function EditEventModal({ event, barPageId, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    EventName: "",
    Description: "",
    StartTime: "",
    EndTime: "",
  });
  const [picture, setPicture] = useState(null);           // File mới (object)
  const [picturePreview, setPicturePreview] = useState(null); // URL hiện tại hoặc preview
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Format datetime-local để hiển thị đúng giờ local
  const formatDateTimeForInput = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (event) {
      setForm({
        EventName: event.EventName || "",
        Description: event.Description || "",
        StartTime: formatDateTimeForInput(event.StartTime),
        EndTime: formatDateTimeForInput(event.EndTime),
      });
      // Reset picture state khi load event mới
      setPicture(null); // Reset file mới
      setPicturePreview(event.Picture || null); // Set preview từ URL cũ
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("⚠️ No file selected");
      return;
    }

    console.log("📁 File selected:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      isFile: file instanceof File
    });

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh (JPEG, PNG, GIF, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    setPicture(file);
    console.log("✅ Picture state set to file:", file.name);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPicturePreview(reader.result);
      console.log("✅ Picture preview set from file");
    };
    reader.readAsDataURL(file);
    setError("");
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

    if (startTime >= endTime) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu");
      return false;
    }

    return true;
  };

  const getCurrentDateTimeForInput = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("EventName", form.EventName.trim());
      formData.append("Description", form.Description.trim() || "");
      formData.append("StartTime", new Date(form.StartTime).toISOString());
      formData.append("EndTime", new Date(form.EndTime).toISOString());

      // Xử lý ảnh - CHỈ append file nếu có file mới
      console.log("📸 EditEventModal - picture state:", picture);
      console.log("📸 EditEventModal - picture instanceof File:", picture instanceof File);
      console.log("📸 EditEventModal - picturePreview:", picturePreview);
      console.log("📸 EditEventModal - event.Picture (original):", event?.Picture);
      
      if (picture && picture instanceof File) {
        // Có file mới được chọn → append vào FormData
        formData.append("Picture", picture);
        console.log("✅ Appending new picture file:", {
          name: picture.name,
          size: picture.size,
          type: picture.type,
          lastModified: picture.lastModified
        });
      } else if (!picture && (picturePreview === null || picturePreview === "")) {
        // User đã xóa ảnh → gửi empty string để xóa ảnh trong DB
        formData.append("Picture", "");
        console.log("🗑️ User removed picture - sending empty string to delete image");
      } else {
        // Không có file mới và vẫn còn preview → giữ nguyên ảnh cũ → không append gì
        console.log("ℹ️ No new picture selected - keeping existing picture (not appending Picture field)");
      }

      // Debug: Log FormData contents
      console.log("📋 FormData contents before sending:");
      const formDataEntries = [];
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          formDataEntries.push(`${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          formDataEntries.push(`${key}: ${value}`);
          console.log(`  ${key}: ${value}`);
        }
      }
      console.log("📋 Total FormData entries:", formDataEntries.length);

      const res = await barEventApi.updateEvent(event.EventId, formData);

      if (res.ok || res.status === "success") {
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
        const errorMsg = res.message || res.data?.message || "Cập nhật thất bại";
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Lỗi cập nhật:", err);
      console.error("Error response:", err.response);
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error || 
                      err.message || 
                      "Lỗi máy chủ khi cập nhật sự kiện";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  // Nếu thành công, hiển thị thông báo (giống AddEventModal)
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
            Đã cập nhật sự kiện thành công
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
            Chỉnh sửa sự kiện
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
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Cập nhật
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}