import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "../../../utils/cn";

export default function MessageList({
  className,
  containerRef,
  messages,
  renderItem,
  onLoadMore,
  hasMore,
}) {
  const scrollingRef = containerRef;
  const isLoadingMoreRef = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollingRef?.current;
    if (!el || !hasMore || isLoadingMoreRef.current) return;
    if (el.scrollTop <= 16) {
      // near top -> load more and keep anchor
      const prev = el.scrollHeight;
      isLoadingMoreRef.current = true;
      Promise.resolve(onLoadMore?.())
        .then(() => {
          // keep anchor position
          requestAnimationFrame(() => {
            const next = el.scrollHeight;
            el.scrollTop = next - prev + el.scrollTop;
          });
        })
        .finally(() => {
          isLoadingMoreRef.current = false;
        });
    }
  }, [scrollingRef, hasMore, onLoadMore]);

  useEffect(() => {
    const el = scrollingRef?.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollingRef, handleScroll]);

  return (
    <div className={cn("mx-auto flex w-full max-w-[960px] flex-col gap-1 px-4 py-4", className)}>
      {messages.map((m, idx) => renderItem(m, idx))}
    </div>
  );
}


