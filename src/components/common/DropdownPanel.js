import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "../../styles/components/dropdownPanel.css";

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
    <div className="dropdown-panel" ref={panelRef}>
      {title && (
        <div className="dropdown-panel-header">
          <h3>{title}</h3>
          <div className="dropdown-panel-header-actions">
            {headerAction}
            <button onClick={onClose} className="dropdown-panel-close-btn">✕</button>
          </div>
        </div>
      )}
      <div className="dropdown-panel-content">{children}</div>
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
