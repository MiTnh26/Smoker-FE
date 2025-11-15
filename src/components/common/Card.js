import React from "react";
import { cn } from "../../utils/cn";

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg",
        "border-[0.5px] border-border/20",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        "p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
