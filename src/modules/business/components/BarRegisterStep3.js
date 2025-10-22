import { useState } from "react";
import barPageApi from "../../../api/barPageApi";

export default function BarRegisterStep3({ barPageId, setStep, isLoading, setMessage, setIsLoading }) {
  const [tableTypes, setTableTypes] = useState([{ name: "", color: "#000000" }]);

  const updateTableType = (index, field, value) => {
    const newTypes = [...tableTypes];
    newTypes[index][field] = value;
    setTableTypes(newTypes);
  };

  const addTableType = () => setTableTypes([...tableTypes, { name: "", color: "#000000" }]);
  
  const removeTableType = (index) => {
    if (tableTypes.length > 1) {
      setTableTypes(tableTypes.filter((_, i) => i !== index));
    }
  };

  const submitStep3 = async (e) => {
    e.preventDefault();
    setMessage(""); setIsLoading(true);
    try {
      if (!barPageId) throw new Error("Thiếu BarPageId");
      
      // Validate table types
      const validTableTypes = tableTypes.filter(t => t.name.trim() && t.color);
      if (validTableTypes.length === 0) {
        setMessage("Vui lòng nhập ít nhất một loại bàn hợp lệ");
        return;
      }
      
      const res = await barPageApi.createTableTypes({ barPageId, tableTypes: validTableTypes });
      if (res?.status === "success") {
        setMessage("Tạo loại bàn thành công!");
        setStep(4);
      } else throw new Error(res?.message || "Tạo loại bàn thất bại");
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || "Lỗi không xác định");
    } finally { setIsLoading(false); }
  };

  return (
    <form onSubmit={submitStep3} className="business-register-form">
      {tableTypes.map((t, i) => (
        <div key={i} className="form-group">
          <input type="text" placeholder="Tên loại bàn" value={t.name} onChange={e => updateTableType(i, "name", e.target.value)} required/>
          <input type="color" value={t.color} onChange={e => updateTableType(i, "color", e.target.value)} required/>
          {tableTypes.length > 1 && (
            <button type="button" onClick={() => removeTableType(i)} className="remove-btn">Xóa</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addTableType}>+ Thêm loại bàn</button>
      <button type="submit" disabled={isLoading}>{isLoading ? "Đang lưu..." : "Lưu loại bàn"}</button>
    </form>
  );
}
