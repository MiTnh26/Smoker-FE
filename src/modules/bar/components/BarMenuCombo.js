import React from "react";

export default function BarMenuCombo() {
  return (
    <div className="profile-card mt-4">
      <h3 className="section-title">Menu</h3>
      <div className="menu-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="menu-item" />
        ))}
      </div>
      <div className="flex justify-end mt-2">
        <i className="bx bx-edit-alt text-[#a78bfa] cursor-pointer hover:text-white transition"></i>
      </div>
    </div>
  );
}
