import React from "react";
import { v4 as uuidv4 } from "uuid";

export default function BarRegisterStep3({ tableTypes, setTableTypes, submitStep3, prevStep, isLoading, message }) {

  const updateTableType = (index, field, value) => {
    const newTypes = [...tableTypes];
    newTypes[index] = { ...newTypes[index], [field]: value };
    setTableTypes(newTypes);

  };

  const addTableType = () => {
    setTableTypes([...tableTypes, { id: uuidv4(), name: "", color: "#000000" }]);
  };

  const removeTableType = (index) => {
    if (tableTypes.length > 1) setTableTypes(tableTypes.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={submitStep3} className="business-register-form">
      {tableTypes.map((t, i) => (
        <div key={t.id} className="form-group">
          <input
            type="text"
            placeholder="Tên loại bàn"
            value={t.name}
            onChange={e => updateTableType(i, "name", e.target.value)}
            required
          />
          <input
            type="color"
            value={t.color}
            onChange={e => updateTableType(i, "color", e.target.value)}
            required
          />
          {tableTypes.length > 1 && (
            <button type="button" onClick={() => removeTableType(i)}>Xóa</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addTableType}>+ Thêm loại bàn</button>
      <div className="form-navigation">
        <button type="button" onClick={prevStep}>⬅ Quay lại</button>
        <button type="submit" disabled={isLoading}>{isLoading ? "Đang lưu..." : "Tiếp tục ➜"}</button>
      </div>
      {message && <p className="business-register-message">{message}</p>}
    </form>
  );
}
