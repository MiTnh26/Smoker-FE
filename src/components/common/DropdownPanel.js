import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { cn } from "../../utils/cn";

/**
 * DropdownPanel - Component chung cho tất cả dropdown panels
 */
export default function DropdownPanel({ 
  isOpen, 
  onClose, 
  children, 
  title = "", 
  headerAction = null 
}) {
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  console.log("[DropdownPanel] Rendering with isOpen:", isOpen);

  if (!isOpen) {
    console.log("[DropdownPanel] Not rendering because isOpen is false");
    return null;
  }

  console.log("[DropdownPanel] Rendering panel");

  return (
    <div 
      className={cn(
        "fixed top-20 right-4 md:right-8",
        "w-[360px] max-w-[calc(100vw-2rem)] max-h-[500px]",
        "bg-card text-card-foreground rounded-lg",
        "border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
        "flex flex-col overflow-hidden z-[100]",
        "animate-[slideDown_0.2s_ease-out]"
      )}
      ref={panelRef}
    >
      {title && (
        <div className={cn(
          "p-4 border-b border-border/30",
          "flex items-center justify-between flex-shrink-0",
          "bg-card/80 backdrop-blur-sm"
        )}>
          <h3 className={cn("m-0 text-base font-semibold text-foreground")}>
            {title}
          </h3>
          <div className={cn("flex items-center gap-2")}>
            {headerAction}
            <button 
              onClick={onClose} 
              className={cn(
                "w-8 h-8 flex items-center justify-center",
                "bg-transparent border-none text-muted-foreground",
                "cursor-pointer rounded-lg transition-all duration-200",
                "hover:bg-muted/50 hover:text-foreground",
                "active:scale-95"
              )}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden",
        "min-h-0"
      )}>
        {children}
      </div>
    </div>
  );
}

DropdownPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  headerAction: PropTypes.node,
};
