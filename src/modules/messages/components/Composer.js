import React, { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizonal, SmilePlus, Image, Paperclip } from "lucide-react";

export default function Composer({ convId, placeholder, onSend, onTyping }) {
  const [value, setValue] = useState("");
  const typingTimer = useRef(null);
  const textRef = useRef(null);

  const draftKey = useMemo(() => `msg_draft_${convId || "none"}`, [convId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setValue(saved);
    } catch {}
  }, [draftKey]);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, value || "");
    } catch {}
  }, [draftKey, value]);

  const emitTyping = () => {
    clearTimeout(typingTimer.current);
    onTyping?.("start");
    typingTimer.current = setTimeout(() => onTyping?.("stop"), 1200);
  };

  const sendMessage = (text) => {
    const content = text.trim();
    if (!content) return;
    onSend?.(content);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(value);
      return;
    }
  };

  useEffect(() => {
    // auto grow
    const el = textRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(160, el.scrollHeight) + "px";
  }, [value]);

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-2 px-4 py-2.5">
      <div className="flex items-end gap-2">
        <div
          className="flex items-center gap-1 rounded-full border px-3 py-1.5"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          <button type="button" aria-label="Emoji" className="p-1 text-muted-foreground hover:text-foreground">
            <SmilePlus size={18} />
          </button>
          <button type="button" aria-label="Attach file" className="p-1 text-muted-foreground hover:text-foreground">
            <Paperclip size={18} />
          </button>
          <button type="button" aria-label="Add image" className="p-1 text-muted-foreground hover:text-foreground">
            <Image size={18} />
          </button>
        </div>
        <textarea
          ref={textRef}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-[18px] border-none bg-muted px-4 py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            emitTyping();
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border-none bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-95"
          aria-label="Send message"
          onClick={() => sendMessage(value)}
        >
          <SendHorizonal size={18} />
        </button>
      </div>
    </div>
  );
}


