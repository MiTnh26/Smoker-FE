import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { Textarea } from "../../../components/common/Textarea";
import barEventApi from "../../../api/barEventApi";

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
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 w-[400px]">
        <h3 className="text-lg font-semibold mb-4">{t("bar.addEventTitle")}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input name="EventName" placeholder={t("bar.eventNamePlaceholder")} onChange={handleChange} required />
          <Textarea name="Description" placeholder={t("bar.descriptionPlaceholder")} onChange={handleChange} />
          <Input type="file" onChange={(e) => setPicture(e.target.files[0])} accept="image/*" />
          <Input type="datetime-local" name="StartTime" onChange={handleChange} required />
          <Input type="datetime-local" name="EndTime" onChange={handleChange} required />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={onClose}>{t("bar.cancel")}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("bar.saving") : t("bar.add")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
