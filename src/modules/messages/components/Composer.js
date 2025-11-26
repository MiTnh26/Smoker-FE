import React, { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";

export default function Composer({ convId, placeholder, onSend, onTyping }) {
  const [value, setValue] = useState("");

  const typingTimer = useRef(null);
  const textRef = useRef(null);

  const MAX_HEIGHT = 160; // px
  const MIN_HEIGHT = 40;  // px (min-h-10)

  const draftKey = useMemo(() => `msg_draft_${convId || "none"}`, [convId]);

  const lastHeightRef = useRef(MIN_HEIGHT);

  const adjustHeight = () => {
    const el = textRef.current;
    if (!el) return;

    const LINE = 22; // px line-height for 15px font
    const PAD_SINGLE = 9; // px top/bottom for single line
    const PAD_MULTI = 6;  // px top/bottom for multi line

    // Baseline layout for single-line
    el.style.lineHeight = `${LINE}px`;
    el.style.paddingTop = `${PAD_SINGLE}px`;
    el.style.paddingBottom = `${PAD_SINGLE}px`;
    el.style.height = `${MIN_HEIGHT}px`;

    // Detect if content wraps to 2+ lines
    const hasNewline = (value || "").includes("\n");
    const wrapsToSecondLine = el.scrollHeight > MIN_HEIGHT + 2; // tolerance
    const isMultiLine = hasNewline || wrapsToSecondLine;

    if (!isMultiLine) {
      // Keep exact single-line size and no scrollbar
      el.style.height = `${MIN_HEIGHT}px`;
      el.style.overflowY = "hidden";
      el.style.scrollbarWidth = "none";
      lastHeightRef.current = MIN_HEIGHT;
      return;
    }

    // Multi-line: reduce paddings a bit and grow to fit content up to MAX_HEIGHT
    el.style.paddingTop = `${PAD_MULTI}px`;
    el.style.paddingBottom = `${PAD_MULTI}px`;

    // Measure again with multi-line paddings
    el.style.height = "auto";
    const contentHeight = el.scrollHeight;
    const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, contentHeight));
    if (!lastHeightRef.current || Math.abs(lastHeightRef.current - newHeight) > 0.5) {
      el.style.height = `${newHeight}px`;
      lastHeightRef.current = newHeight;
    }

    const needsScroll = contentHeight > MAX_HEIGHT;
    el.style.overflowY = needsScroll ? "auto" : "hidden";
    el.style.scrollbarWidth = needsScroll ? "auto" : "none";
  };

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
    // Reset textarea height về ban đầu sau khi gửi
    if (textRef.current) {
      textRef.current.style.height = "0px";
      textRef.current.style.height = `${MIN_HEIGHT}px`;
      textRef.current.style.overflowY = "hidden";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(value);
      return;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-2 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <textarea
          ref={textRef}
          className="box-border min-h-10 max-h-40 flex-1 resize-none rounded-[18px] border-none bg-muted px-4 py-0 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={value}
          onFocus={() => {
            // Keep form unchanged on focus; do not auto-resize on focus
          }}
          onBlur={() => {
            // Keep size unchanged on blur; only hide scrollbar if not needed
            const el = textRef.current;
            if (el) {
              const needsScroll = el.scrollHeight > MAX_HEIGHT;
              el.style.overflowY = needsScroll ? "auto" : "hidden";
              el.style.scrollbarWidth = needsScroll ? "auto" : "none";
            }
          }}
          onChange={(e) => {
            setValue(e.target.value);
            emitTyping();
            // Height will be adjusted by useEffect/adjustHeight()
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


