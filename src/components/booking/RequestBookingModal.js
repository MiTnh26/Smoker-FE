import React, { useState } from "react";
import PropTypes from "prop-types";
import bookingApi from "../../api/bookingApi";
import { cn } from "../../utils/cn";

export default function RequestBookingModal({ open, onClose, performerEntityAccountId, performerRole = "DJ" }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;

  const submit = async () => {
    try {
      setSubmitting(true);
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const ae = session?.activeEntity || {};
      const entities = session?.entities || [];
      const requesterEntityAccountId =
        ae.EntityAccountId ||
        ae.entityAccountId ||
        entities[0]?.EntityAccountId ||
        entities[0]?.entityAccountId ||
        null;
      const rawRole = (ae.role || ae.type || "customer").toLowerCase();
      const requesterRole = rawRole === "bar" ? "Bar" : "Customer";
      const payload = {
        requesterEntityAccountId,
        requesterRole,
        performerEntityAccountId,
        performerRole,
        date,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        location,
        note,
        offeredPrice: offeredPrice ? Number(offeredPrice) : 0,
      };
      await bookingApi.createRequest(payload);
      onClose?.("success");
    } catch (e) {
      console.error("[RequestBookingModal] submit error:", e);
      onClose?.("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    )}>
      <div className={cn(
        "w-full max-w-lg bg-card text-card-foreground rounded-lg",
        "border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
        "p-4"
      )}>
        <h3 className={cn("text-lg font-semibold mb-3")}>Request booking</h3>
        <div className={cn("grid grid-cols-1 gap-3")}>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Date</span>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="rounded-md bg-background border border-border/30 px-3 py-2 outline-none"/>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm">Start time</span>
              <input type="datetime-local" value={startTime} onChange={(e)=>setStartTime(e.target.value)} className="rounded-md bg-background border border-border/30 px-3 py-2 outline-none"/>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm">End time</span>
              <input type="datetime-local" value={endTime} onChange={(e)=>setEndTime(e.target.value)} className="rounded-md bg-background border border-border/30 px-3 py-2 outline-none"/>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Location</span>
            <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Bar address / venue" className="rounded-md bg-background border border-border/30 px-3 py-2 outline-none"/>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Offered price</span>
            <input type="number" min="0" value={offeredPrice} onChange={(e)=>setOfferedPrice(e.target.value)} className="rounded-md bg-background border border-border/30 px-3 py-2 outline-none"/>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Note</span>
            <textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} className="rounded-md bg-background border border-border/30 px-3 py-2 outline-none"/>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button disabled={submitting} onClick={()=>onClose?.()} className="px-3 py-2 rounded-md bg-muted border-none">Cancel</button>
          <button disabled={submitting} onClick={submit} className="px-3 py-2 rounded-md bg-primary text-primary-foreground border-none">{submitting ? "Submitting..." : "Send request"}</button>
        </div>
      </div>
    </div>
  );
}

RequestBookingModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  performerEntityAccountId: PropTypes.string,
  performerRole: PropTypes.string,
};


