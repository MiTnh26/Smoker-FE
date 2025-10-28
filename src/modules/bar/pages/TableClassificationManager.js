import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import "../../../styles/modules/barTables.css";

export default function TableClassificationManager() {
  const { barPageId } = useParams();
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // 🔹 Load danh sách loại bàn khi vào trang
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await barPageApi.getTableTypes(barPageId);
        console.log("📦 Dữ liệu loại bàn:", res.data);
        setClassifications(res.data || []);
        setMessage("");
      } catch (err) {
        console.error("❌ Lỗi tải loại bàn:", err);
        setMessage("Không thể tải danh sách loại bàn.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [barPageId]);

  // ➕ Thêm loại bàn mới (client-side)
  const addClassification = () => {
    setClassifications((prev) => [
      ...prev,
      {
        TableClassificationId: null,
        TableTypeName: "",
        Color: "#eeeeee",
        dirty: true,
      },
    ]);
  };

  // 📝 Cập nhật khi thay đổi input
  const updateClassification = (index, field, value) => {
    setClassifications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value, dirty: true };
      return updated;
    });
  };

  // 💾 Lưu toàn bộ thay đổi
  const saveAll = async () => {
    const dirtyItems = classifications.filter((c) => c.dirty);
    if (!dirtyItems.length) {
      setMessage("Không có thay đổi cần lưu.");
      return;
    }

    try {
      // 1️⃣ Gửi update cho các loại bàn đã có ID
      for (const c of dirtyItems.filter((x) => x.TableClassificationId)) {
        const payload = {
          barPageId,
          tableTypeName: c.TableTypeName,
          color: c.Color,
        };
        await barPageApi.updateTableTypes(c.TableClassificationId, payload);
      }

      // 2️⃣ Gửi create 1 lần cho tất cả loại bàn mới
      const newOnes = dirtyItems.filter((x) => !x.TableClassificationId);
      if (newOnes.length > 0) {
        await barPageApi.createTableTypes({
          barPageId,
          tableTypes: newOnes.map((x) => ({
            name: x.TableTypeName,
            color: x.Color,
          })),
        });
      }

      setMessage(" Đã lưu!");
      const res = await barPageApi.getTableTypes(barPageId);
      setClassifications(res.data || []);
    } catch (err) {
      console.error("❌ Lỗi khi lưu loại bàn:", err);
      setMessage("Lỗi khi lưu loại bàn.");
    }
  };


  // ❌ Xóa loại bàn
  const deleteClassification = async (id, index) => {
    if (!window.confirm("Bạn có chắc muốn xóa loại bàn này?")) return;

    try {
      await barPageApi.removeTableTypes(id);
      setClassifications((prev) => prev.filter((_, i) => i !== index));
      setMessage("🗑️ Đã xóa loại bàn.");
    } catch (err) {
      console.error("❌ Lỗi khi xóa loại bàn:", err);
      setMessage("Không thể xóa loại bàn này.");
    }
  };

  if (loading) return <div>Đang tải loại bàn...</div>;

  return (
    <div className="bar-tables-container">
      <h3>Quản lý loại bàn (Table Classification)</h3>
      {message && <p className="bar-tables-message">{message}</p>}

      <div className="tables-grid">
        {classifications.map((c, i) => (
          <div
            key={i}
            className="table-box"
            style={{
              backgroundColor: c.Color || "#eee",
              border: "1px solid #ccc",
            }}
          >
            <input
              type="text"
              value={c.TableTypeName || ""}
              placeholder="Tên loại bàn"
              onChange={(e) =>
                updateClassification(i, "TableTypeName", e.target.value)
              }
              className="table-name"
            />

            <div className="table-color-row">
              <label>Màu:</label>
              <input
                type="color"
                value={c.Color || "#eeeeee"}
                onChange={(e) => updateClassification(i, "Color", e.target.value)}
              />
            </div>

            {c.TableClassificationId && (
              <button
                onClick={() =>
                  deleteClassification(c.TableClassificationId, i)
                }
              >
                Xóa
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="add-table-btn" onClick={addClassification}>
        ➕ Thêm loại bàn
      </button>
      <button className="save-all-btn" onClick={saveAll}>
        💾 Lưu tất cả
      </button>
    </div>
  );
}
