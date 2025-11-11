import React, { useEffect, useMemo, useRef, useState } from "react";

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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend?.(value.trim());
        setValue("");
      }
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
    <div className="mx-auto flex max-w-[960px] items-end gap-2 px-4 py-2.5">
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
        className="h-10 rounded-[18px] border-none bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-95"
        onClick={() => {
          if (!value.trim()) return;
          onSend?.(value.trim());
          setValue("");
        }}
      >
        Send
      </button>
    </div>
  );
}


