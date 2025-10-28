import React from "react";
import "../../styles/components/card.css";

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-card text-card-foreground rounded-lg shadow-md p-4 border border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
