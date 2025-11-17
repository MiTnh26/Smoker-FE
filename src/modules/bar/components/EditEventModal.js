import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Textarea } from "../../../components/common/Textarea";
import barEventApi from "../../../api/barEventApi";
import { cn } from "../../../utils/cn";

export default function EditEventModal({ event, barPageId, onClose, onSuccess }) {
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

  useEffect(() => {
    if (event) {
      // Format datetime for input (YYYY-MM-DDTHH:mm)
      const formatDateTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setForm({
        EventName: event.EventName || "",
        Description: event.Description || "",
        StartTime: formatDateTime(event.StartTime),
        EndTime: formatDateTime(event.EndTime),
      });
      setPicturePreview(event.Picture || null);
    }
  }, [event]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("BarPageId", barPageId);
      formData.append("EventName", form.EventName);
      formData.append("Description", form.Description);
      formData.append("StartTime", form.StartTime);
      formData.append("EndTime", form.EndTime);
      if (picture) formData.append("Picture", picture);

      const res = await barEventApi.updateEvent(event.EventId, formData);
      if (res.status === "success") {
        onSuccess();
      } else {
        alert(res.message || t("bar.eventsPage.errorUpdate"));
      }
    } catch (err) {
      console.error("Error updating event:", err);
      alert(t("bar.eventsPage.errorUpdate"));
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  return (
    <div className={cn("fixed inset-0 bg-overlay flex justify-center items-center z-50")}>
      <div className={cn(
        "bg-card rounded-xl p-6 w-[90%] max-w-[500px]",
        "border-[0.5px] border-border/20",
        "shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
      )}>
        <h3 className={cn("text-lg font-semibold mb-4 text-foreground")}>
          {t("bar.eventsPage.editEventTitle")}
        </h3>
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-3")}>
          <Input
            name="EventName"
            placeholder={t("bar.eventNamePlaceholder")}
            value={form.EventName}
            onChange={handleChange}
            required
          />
          <Textarea
            name="Description"
            placeholder={t("bar.descriptionPlaceholder")}
            value={form.Description}
            onChange={handleChange}
          />
          
          <div className={cn("flex flex-col gap-2")}>
            <label className={cn("text-sm text-foreground")}>
              {t("bar.eventsPage.picture")}
            </label>
            {picturePreview && (
              <img
                src={picturePreview}
                alt="Preview"
                className={cn("w-full h-32 object-cover rounded-lg border border-border/20")}
              />
            )}
            <Input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>

          <Input
            type="datetime-local"
            name="StartTime"
            value={form.StartTime}
            onChange={handleChange}
            required
          />
          <Input
            type="datetime-local"
            name="EndTime"
            value={form.EndTime}
            onChange={handleChange}
            required
          />

          <div className={cn("flex justify-end gap-2 mt-4")}>
            <Button
              type="button"
              onClick={onClose}
              className={cn(
                "bg-transparent text-muted-foreground",
                "hover:bg-muted hover:text-foreground",
                "border border-border/20"
              )}
            >
              {t("bar.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading ? t("bar.saving") : t("bar.eventsPage.update")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

