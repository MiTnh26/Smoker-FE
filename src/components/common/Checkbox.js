import React from "react";
import "../../styles/components/checkbox.css";

export function Checkbox({ checked = false, onChange, className = "", label = "", ...props }) {
    return (
        <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="checkbox"
                {...props}
            />
            {label && <span>{label}</span>}
        </label>
    );
}