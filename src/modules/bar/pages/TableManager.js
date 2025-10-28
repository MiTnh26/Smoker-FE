import React, { useEffect, useState } from "react";
import barPageApi from "../../../api/barPageApi";
import "../../../styles/modules/barTables.css";


export default function TableManager() {
  const [tableApplies, setTableApplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await barPageApi.getTableApplies(barPageId);
        setTableApplies(res.data || []);
        setMessage("");
      } catch (err) {
        console.error(err);
        setMessage("Lỗi tải TableApply");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [barPageId]);

  const addApply = () => {
    setTableApplies(prev => [
      ...prev,
      { TableApplyId: null, name: "", dirty: true }
    ]);
  };

  const updateApply = (index, field, value) => {
    setTableApplies(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value, dirty: true };
      return newList;
    });
  };

  const saveAll = async () => {
    const dirty = tableApplies.filter(t => t.dirty);
    if (!dirty.length) return setMessage("Không có thay đổi cần lưu");

    try {
      for (let apply of dirty) {
        if (apply.TableApplyId) {
          await barPageApi.updateTableApply(apply.TableApplyId, { name: apply.name });
        } else {
          await barPageApi.createTableApply({ name: apply.name });
        }
        apply.dirty = false;
      }
      setMessage("Đã lưu thành công!");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi lưu TableApply");
    }
  };

  const deleteApply = async (id, index) => {
    if (!window.confirm("Xóa TableApply này?")) return;
    try {
      await barPageApi.deleteTableApply(id);
      setTableApplies(prev => prev.filter((_, i) => i !== index));
      setMessage("Đã xóa TableApply");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi xóa");
    }
  };

  if (loading) return <div>Đang tải TableApply...</div>;

  return (
    <div className="bar-tables-container">
      <h3>Quản lý TableApply</h3>
      {message && <p className="bar-tables-message">{message}</p>}

      <div className="tables-grid">
        {tableApplies.map((t, i) => (
          <div key={i} className="table-box" style={{ backgroundColor: "#f2f2f2" }}>
            <input
              type="text"
              value={t.name}
              onChange={(e) => updateApply(i, "name", e.target.value)}
              placeholder="Tên TableApply"
            />
            {t.TableApplyId && (
              <button onClick={() => deleteApply(t.TableApplyId, i)}>Xóa</button>
            )}
          </div>
        ))}
      </div>

      <button className="add-table-btn" onClick={addApply}>Thêm TableApply</button>
      <button className="save-all-btn" onClick={saveAll}>Lưu tất cả</button>
    </div>
  );
}
