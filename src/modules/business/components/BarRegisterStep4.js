import React, { useState } from "react";
import "../../../styles/modules/barRegisterStep4.css";

export default function BarRegisterStep4({
  tables,
  setTables,
  tableTypes,
  prevStep,
  isLoading,
  setMessage,
  handleSubmitAll
}) {
  const [tableCount, setTableCount] = useState(tables.length || 0);

  const handleTableCountChange = (e) => {
    const count = Number(e.target.value);
    setTableCount(count);
    setTables(prev => {
      const newTables = [...prev];
      while (newTables.length < count) newTables.push({ classificationId: "" });
      return newTables.slice(0, count);
    });
  };

  const updateTable = (index, classificationId) => {
    setTables(prev => {
      const newTables = [...prev];
      newTables[index] = { ...newTables[index], classificationId };
      return newTables;
    });
  };

  const submit = (e) => {
    e.preventDefault();
    if (tables.some(t => t.classificationId === "")) {
      setMessage("Vui lòng chọn loại bàn cho tất cả bàn");
      return;
    }
    handleSubmitAll();
  };

  return (
    <form onSubmit={submit} className="step4-container">
      <div className="table-count-selector">
        <label>Số lượng bàn:</label>
        <input
          type="number"
          min="1"
          max="50"
          value={tableCount}
          onChange={handleTableCountChange}
        />
      </div>

      <div className="tables-grid">
        {tables.map((t, i) => {
          const type = tableTypes.find(tt => tt.id === t.classificationId);
          const bgColor = type?.color || "#eee";
          const name = type?.name || "Chưa chọn";

          return (
            <div key={i} className="table-box" style={{ backgroundColor: bgColor }}>
              <div className="table-number">Bàn {i + 1}</div>

              <select
                className="table-select"
                value={t.classificationId}
                onChange={(e) => updateTable(i, e.target.value)}
              >
                <option value="">Chọn loại bàn</option>
                {tableTypes.map(tt => (
                  <option key={tt.id} value={tt.id}>{tt.name || "Loại bàn"}</option>
                ))}
              </select>

              <div className="table-name">{name}</div>
            </div>
          );
        })}
      </div>

      <div className="form-navigation">
        <button type="button" onClick={prevStep} className="back-btn">⬅ Quay lại</button>
        <button type="submit" disabled={tables.length === 0 || isLoading} className="next-btn">
          {isLoading ? "Đang tạo..." : "Hoàn tất ✅"}
        </button>
      </div>
    </form>
  );
}
