// src/modules/bar/components/BarTablesEditModal.js
import React from "react";
import { Modal } from "../../../components/common/Modal";
import { Button } from "../../../components/common/Button";
import { cn } from "../../../utils/cn";
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

  if (!show) return null;

  return (
    <Modal isOpen={show} onClose={onClose} size="xl" className={cn("relative p-6")}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <h2 className="text-xl font-semibold">Chỉnh sửa bàn</h2>
          <button
            onClick={onClose}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              "text-2xl leading-none",
              "transition-colors"
            )}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="table-count-selector mb-4">
            <label className="block mb-2">Số bàn tổng: </label>
            <input
              type="number"
              min="0"
              value={totalTables}
              onChange={handleTotalChange}
              className={cn(
                "px-3 py-2 border border-border rounded-lg",
                "bg-background text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            />
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border">
          <Button
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded-lg",
              "bg-muted text-muted-foreground",
              "hover:bg-muted/80",
              "transition-colors"
            )}
          >
            Hủy
          </Button>
          <Button
            onClick={saveAllTables}
            className={cn(
              "px-4 py-2 rounded-lg",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "transition-colors"
            )}
          >
            💾 Lưu tất cả
          </Button>
        </div>
      </div>
    </Modal>
  );
}
