import React from "react";
import "../../styles/components/modal.css";

export function Modal({ isOpen, onClose, children, className = "" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`bg-background rounded-lg p-6 ${className}`}>
        <button
          className="absolute top-2 right-2 text-muted-foreground"
          onClick={onClose}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
