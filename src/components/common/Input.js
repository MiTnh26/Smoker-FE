import React from "react";
import "../../styles/components/input.css";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      {...props}
    />
  );
}
