import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Textarea } from "../../../components/common/Textarea";
import barEventApi from "../../../api/barEventApi";
import { cn } from "../../../utils/cn";

export default function AddEventModal({ barPageId, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    EventName: "",
    Description: "",
    StartTime: "",
    EndTime: "",
  });
  const [picture, setPicture] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("BarPageId", barPageId);
    formData.append("EventName", form.EventName);
    formData.append("Description", form.Description);
    formData.append("StartTime", form.StartTime);
    formData.append("EndTime", form.EndTime);
    if (picture) formData.append("Picture", picture);

    const res = await barEventApi.createEvent(formData);
    if (res.status === "success") onSuccess();
    else alert(res.message || t("bar.cannotAddEvent"));

    setLoading(false);
  };

  return (
    <div className={cn("fixed inset-0 bg-overlay flex justify-center items-center z-50")}>
      <div className={cn(
        "bg-card rounded-xl p-6 w-[90%] max-w-[500px]",
        "border-[0.5px] border-border/20",
        "shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
      )}>
        <h3 className={cn("text-lg font-semibold mb-4 text-foreground")}>
          {t("bar.addEventTitle")}
        </h3>
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-3")}>
          <Input name="EventName" placeholder={t("bar.eventNamePlaceholder")} onChange={handleChange} required />
          <Textarea name="Description" placeholder={t("bar.descriptionPlaceholder")} onChange={handleChange} />
          <Input type="file" onChange={(e) => setPicture(e.target.files[0])} accept="image/*" />
          <Input type="datetime-local" name="StartTime" onChange={handleChange} required />
          <Input type="datetime-local" name="EndTime" onChange={handleChange} required />

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
              {loading ? t("bar.saving") : t("bar.add")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
