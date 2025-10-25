import React, { useEffect, useState } from "react";
import comboApi from "../../../api/comboApi";
import "../../../styles/modules/barTables.css";
import { useParams } from "react-router-dom";

export default function ComboManager() {
  const { barPageId } = useParams();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // 🔹 Load combo khi mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await comboApi.getCombosByBar(barPageId);
        setCombos(res.data || []);
      } catch (err) {
        console.error(err);
        setMessage("Lỗi tải combo");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [barPageId]);

  // 🔹 Thêm combo mới
  const addCombo = () => {
    setCombos(prev => [
      ...prev,
      { ComboId: null, ComboName: "", Price: 0, dirty: true }
    ]);
  };

  // 🔹 Cập nhật giá trị combo
  const updateCombo = (index, field, value) => {
    setCombos(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value, dirty: true };
      return newList;
    });
  };

  // 🔹 Lưu tất cả combo dirty
  const saveAll = async () => {
    const dirtyCombos = combos.filter(c => c.dirty);
    if (!dirtyCombos.length) return setMessage("Không có thay đổi cần lưu");

    try {
      for (let c of dirtyCombos) {
        const payload = {
          barPageId,
          comboName: c.ComboName,
          price: Number(c.Price),
        };

        if (c.ComboId) {
          await comboApi.updateCombo(c.ComboId, payload);
        } else {
          const created = await comboApi.createCombo(payload);
          c.ComboId = created.data.ComboId; // cập nhật ID mới trả về từ BE
        }

        c.dirty = false;
      }
      setCombos([...combos]);
      setMessage("Đã lưu tất cả combo!");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi lưu combo");
    }
  };

  // 🔹 Xóa combo
  const deleteComboHandler = async (id, index) => {
    if (!window.confirm("Xóa combo này?")) return;
    try {
      if (id) await comboApi.deleteCombo(id);
      setCombos(prev => prev.filter((_, i) => i !== index));
      setMessage("Đã xóa combo");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi xóa combo");
    }
  };

  if (loading) return <div>Đang tải combo...</div>;

  return (
    <div className="bar-tables-container">
      <h3>Quản lý Combo</h3>
      {message && <p className="bar-tables-message">{message}</p>}

      <div className="tables-grid">
        {combos.map((c, i) => (
          <div key={i} className="table-box">
            Tên combo
            <input
              type="text"
              value={c.ComboName}
              placeholder="Tên combo"
              onChange={e => updateCombo(i, "ComboName", e.target.value)}
            />
            Giá combo
            <input
              type="number"
              value={c.Price || 0}  // chỉ số
              placeholder="Giá combo"
              onChange={e => updateCombo(i, "Price", Number(e.target.value))}
            />
            <span>{c.Price ? c.Price + ".000 đ" : ""}</span>
            {c.ComboId && (
              <button onClick={() => deleteComboHandler(c.ComboId, i)}>Xóa</button>
            )}

          </div>
        ))}
      </div>

      <button className="add-table-btn" onClick={addCombo}>Thêm Combo</button>
      <button className="save-all-btn" onClick={saveAll}>Lưu tất cả</button>
    </div>
  );
}
