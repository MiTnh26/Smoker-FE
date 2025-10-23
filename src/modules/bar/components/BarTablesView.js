// src/modules/bar/components/BarTablesView.js
import React from "react";
import "../../../styles/modules/barTables.css";

export default function BarTablesView({ tables }) {
  if (!tables.length) return <p>Chưa có bàn nào.</p>;

  return (
    <div className="tables-grid">
      {tables.map((t, i) => (
        <div
          key={i}
          className="table-box"
          style={{ backgroundColor: t.color }}
        >
          <span className="table-number">{t.tableName}</span>
          <span className="table-type">{t.tableTypeName}</span>
        </div>
      ))}
    </div>
  );
}
