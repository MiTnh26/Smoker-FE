import React from "react";

// Textarea component có thể dùng trong form, modal, popup,...
export const Textarea = React.forwardRef(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label className="mb-1 text-sm font-medium text-gray-300">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          className={`w-full min-h-[100px] px-3 py-2 rounded-xl border border-gray-600 bg-[#111] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${className}`}
          {...props}
        />

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
