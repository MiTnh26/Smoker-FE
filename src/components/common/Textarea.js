import React from "react";
import { cn } from "../../utils/cn";

// Textarea component có thể dùng trong form, modal, popup,...
export const Textarea = React.forwardRef(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label className={cn(
            "mb-1 text-sm font-medium text-foreground"
          )}>
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          className={cn(
            "w-full min-h-[100px] px-4 py-2.5 rounded-lg",
            "border-[0.5px] border-border/20",
            "bg-background text-foreground",
            "outline-none transition-all duration-200",
            "placeholder:text-muted-foreground/60",
            "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
            "resize-y",
            className
          )}
          {...props}
        />

        {error && (
          <p className={cn("mt-1 text-xs text-danger")}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
