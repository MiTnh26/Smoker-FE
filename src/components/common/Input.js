import React from "react";
import { cn } from "../../utils/cn";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={cn(
        "w-full px-4 py-2.5 rounded-lg",
        "border-[0.5px] border-border/20",
        "bg-background text-foreground",
        "outline-none transition-all duration-200",
        "placeholder:text-muted-foreground/60",
        "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
        className
      )}
      {...props}
    />
  );
}
