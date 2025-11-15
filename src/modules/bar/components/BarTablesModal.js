// src/modules/bar/components/BarTablesEditModal.js
import React from "react";
import { Modal, Button } from "react-bootstrap";
import "../../../styles/modules/barTables.css";

export default function BarTablesModal({
  show,
  onClose,
  tables,
  tableTypes,
  totalTables,
  setTotalTables,
  updateTable,
  saveAllTables,
  deleteTable
}) {
  const handleTotalChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setTotalTables(value);
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Chỉnh sửa bàn</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="table-count-selector">
          <label>Số bàn tổng: </label>
          <input type="number" min="0" value={totalTables} onChange={handleTotalChange} />
        </div>

        <div className="tables-grid">
          {tables.map((t, i) => (
            <div
              key={i}
              className="table-box"
              style={{
                backgroundColor: tableTypes.find(tt => tt.TableClassificationId === t.tableClassificationId)?.Color || "#eee"
              }}
            >
              <span className="table-number">{`Bàn ${i + 1}`}</span>
              <select
                className="table-select"
                value={t.tableClassificationId || ""}
                onChange={e => updateTable(i, e.target.value)}
              >
                <option value="">Chọn loại bàn</option>
                {tableTypes.map(tt => (
                  <option key={tt.TableClassificationId} value={tt.TableClassificationId}>
                    {tt.TableTypeName}
                  </option>
                ))}
              </select>
              {t.BarTableId && (
                <button className="delete-btn" onClick={() => deleteTable(t.BarTableId, i)}>🗑️ Xóa</button>
              )}
            </div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Hủy</Button>
        <Button variant="success" onClick={saveAllTables}>💾 Lưu tất cả</Button>
      </Modal.Footer>
    </Modal>
  );
}
