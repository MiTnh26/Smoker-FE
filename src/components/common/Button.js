import React from "react";
import "../../styles/components/button.css"; // import CSS để áp dụng style

export function Button({ children, className = "", ...props }) {
  return (
    <button className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
}
