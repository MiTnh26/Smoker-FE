import React from "react";
import "../../styles/components/table.css";

export function Table({ columns, data, className = "" }) {
  return (
    <table className={`min-w-full border-collapse ${className}`}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.accessor}
              className="border-b px-4 py-2 text-left text-muted-foreground"
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-card/20">
            {columns.map((col) => (
              <td key={col.accessor} className="border-b px-4 py-2">
                {row[col.accessor]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
