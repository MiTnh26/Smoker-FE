import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Modal } from "../../../components/common/Modal";
import barPageApi from "../../../api/barPageApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/barTables.css";

// Table Icon SVG Component
const TableIcon = ({ className = "", color = null }) => {
  const iconColor = color || "rgb(var(--primary))";
  return (
    <svg
      className={className}
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: iconColor }}
    >
      {/* Table top */}
      <rect
        x="10"
        y="15"
        width="40"
        height="30"
        rx="4"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Table legs */}
      <line
        x1="18"
        y1="45"
        x2="18"
        y2="50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="42"
        y1="45"
        x2="42"
        y2="50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="50"
        x2="42"
        y2="50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default function BarTables({ barPageId, readOnly = false }) {
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [editingTable, setEditingTable] = useState(null);

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const totalTables = tables.length;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Lấy bàn và loại bàn
      const [resTables, resTypes] = await Promise.all([
        barPageApi.getTablesByBar(barPageId),
        barPageApi.getTableTypes(barPageId),
      ]);

      console.log("API trả về tables:", resTables.data);
      console.log("API trả về table types:", resTypes.data);

      const types = resTypes.data || [];
      setTableTypes(types);

      const tablesData = (resTables.data || []).map((table) => {
        console.log("Processing table:", table);

        // Lấy tableName, nếu DB trống thì dùng mặc định
        const tableName =
          table.TableName != null ? table.TableName : t("bar.defaultTable");

        // TableTypeName và Color đã có từ API nên không cần map thêm
        return {
          ...table,
          tableName,
          dirty: false,
        };
      });

      console.log("Tables sau khi map:", tablesData);

      setTables(tablesData);
    } catch (err) {
      console.error("❌ Lỗi tải bàn:", err);
      addToast(t("bar.errorLoadingTables"), "error");
    } finally {
      setLoading(false);
    }
  }, [barPageId, t, addToast]);

  useEffect(() => {
    if (barPageId) {
      fetchData();
    }
  }, [barPageId, fetchData]);

  // Listen for table types updates
  useEffect(() => {
    const handleTableTypesUpdate = () => {
      if (barPageId) {
        fetchData();
      }
    };

    window.addEventListener("tableTypesUpdated", handleTableTypesUpdate);
    return () => {
      window.removeEventListener("tableTypesUpdated", handleTableTypesUpdate);
    };
  }, [barPageId, fetchData]);

  // Thêm bàn mới
  const addTable = () => {
    if (readOnly) return; // Prevent adding tables in read-only mode
    const newId = `new-${Date.now()}-${Math.random()}`;
    const newTable = {
      BarTableId: null,
      TableName: "",
      tableName: "",
      TableClassificationId: "",
      Color: "#eee",
      TableTypeName: "",
      dirty: true,
      _tempId: newId,
    };
    setTables((prev) => [...prev, newTable]);
    
    // Mở modal ngay để chỉnh sửa bàn mới
    setSelectedTable(newTable);
    setEditingTable({
      tableName: "",
      tableClassificationId: "",
    });
    setIsEditModalOpen(true);
  };

  const deleteTable = async (tableId) => {
    try {
      if (tableId) {
        await barPageApi.deleteBarTable(tableId);
      }
      addToast(t("bar.tableDeleted"), "success");
    } catch (err) {
      console.error("❌ Lỗi khi xóa bàn:", err);
      addToast(t("bar.errorDeletingTable"), "error");
    }
  };

  // Handle save table from modal
  const handleSaveTableFromModal = async () => {
    if (!selectedTable || !editingTable) return;

    const tableIndex = tables.findIndex(
      (t) => (t.BarTableId && t.BarTableId === selectedTable.BarTableId) ||
             (t._tempId && t._tempId === selectedTable._tempId)
    );

    if (tableIndex === -1) return;

    try {
      setSaving(true);
      const table = tables[tableIndex];
      const payload = {
        barPageId,
        tableName: editingTable.tableName,
        tableClassificationId: editingTable.tableClassificationId,
      };

      // Update color and type name from selected type
      const type = tableTypes.find(
        (tt) => String(tt.TableClassificationId) === String(editingTable.tableClassificationId)
      );

      if (table.BarTableId) {
        await barPageApi.updateBarTable(table.BarTableId, payload);
      } else {
        const res = await barPageApi.createTables([payload]);
        table.BarTableId = res.data[0]?.BarTableId;
      }

      // Update local state
      setTables((prev) => {
        const updated = [...prev];
        updated[tableIndex] = {
          ...updated[tableIndex],
          tableName: editingTable.tableName,
          TableName: editingTable.tableName,
          TableClassificationId: editingTable.tableClassificationId,
          Color: type?.Color || "#eee",
          TableTypeName: type?.TableTypeName || "",
          dirty: false,
        };
        return updated;
      });

      addToast(t("bar.tableUpdated"), "success");
      setIsEditModalOpen(false);
      setSelectedTable(null);
      setEditingTable(null);
    } catch (err) {
      console.error("❌ Lỗi khi lưu bàn:", err);
      addToast(t("bar.errorSavingTables"), "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete table from modal
  const handleDeleteTableFromModal = async () => {
    if (!selectedTable) return;
    if (!window.confirm(t("bar.confirmDeleteTable"))) return;

    const tableIndex = tables.findIndex(
      (t) => (t.BarTableId && t.BarTableId === selectedTable.BarTableId) ||
             (t._tempId && t._tempId === selectedTable._tempId)
    );

    if (tableIndex === -1) return;

    await deleteTable(selectedTable.BarTableId);
    
    // Remove from local state
    setTables((prev) => prev.filter((_, i) => i !== tableIndex));
    
    setIsEditModalOpen(false);
    setSelectedTable(null);
    setEditingTable(null);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedTable(null);
    setEditingTable(null);
  };

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="bar-tables-container">
        <div className="bar-tables-loading">
          <div className="bar-tables-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bar-tables-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header Section - Chỉ hiển thị khi không phải readOnly (bar owner) */}
      {!readOnly && (
        <div className="bar-tables-header">
          <div className="bar-tables-header-content">
            <h1 className="bar-tables-title">
              {t("bar.tableManagementTitle")}
            </h1>
            <p className="bar-tables-description">
              {t("bar.totalTables")} {totalTables}
            </p>
          </div>
          <div className="bar-tables-actions">
            <button
              onClick={addTable}
              className="btn-add-table"
            >
              <Plus size={18} /> {t("bar.addTable")}
            </button>
          </div>
        </div>
      )}

      {/* Table Layout Preview Section - Chỉ hiển thị khi không phải readOnly (bar owner) */}
      {!readOnly && tables.length > 0 && (
        <div className="bar-tables-layout-preview">
          <div className="bar-tables-layout-header">
            <h2 className="bar-tables-layout-title">
              {t("bar.tableLayoutPreview") || "Không gian quán"}
            </h2>
            <p className="bar-tables-layout-description">
              {t("bar.tableLayoutDescription") || "Xem trước bố cục bàn trong quán"}
            </p>
          </div>
          <div className="bar-tables-layout-grid">
            {tables.map((table, i) => {
              const tableColor = table.Color || "#eee";
              const tableName = table.tableName || table.TableName || t("bar.defaultTable");
              const tableType = table.TableTypeName || t("bar.noTableType");
              const tooltipText = `${tableName}\n${tableType}`;
              const cardId = table.BarTableId || table._tempId || `temp-${i}`;

              // Create darker fill color from outline color
              // Convert hex to RGB and darken it
              const getDarkerColor = (color) => {
                if (!color || color === "#eee" || color === "#eeeeee") return "#999";
                try {
                  // Remove # if present
                  const hex = color.replace('#', '');
                  if (hex.length !== 6) return color;
                  // Convert to RGB
                  const r = Number.parseInt(hex.substring(0, 2), 16);
                  const g = Number.parseInt(hex.substring(2, 4), 16);
                  const b = Number.parseInt(hex.substring(4, 6), 16);
                  // Darken by 40% to make it more visible
                  const darkerR = Math.max(0, Math.floor(r * 0.6));
                  const darkerG = Math.max(0, Math.floor(g * 0.6));
                  const darkerB = Math.max(0, Math.floor(b * 0.6));
                  // Convert back to hex
                  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
                } catch {
                  return color;
                }
              };

              const fillColor = getDarkerColor(tableColor);

              const handleTableClick = () => {
                if (readOnly) return;
                // Mở modal để chỉnh sửa
                setSelectedTable(table);
                setEditingTable({
                  tableName: table.tableName || table.TableName || "",
                  tableClassificationId: table.TableClassificationId || "",
                });
                setIsEditModalOpen(true);
              };

              const handleKeyDown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTableClick();
                }
              };

              return (
                <div
                  key={cardId}
                  className="bar-table-layout-item"
                  title={tooltipText}
                  onClick={handleTableClick}
                  onKeyDown={handleKeyDown}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className="bar-table-layout-icon"
                    style={{
                      '--table-outline-color': tableColor || "#eee",
                      '--table-fill-color': fillColor,
                    }}
                  />
                  <span className="bar-table-layout-label">{tableName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Empty State */}
      {tables.length === 0 && !loading && (
        <div className="bar-tables-empty">
          <div className="bar-tables-empty-icon">
            <TableIcon />
          </div>
          <p className="bar-tables-empty-text">
            {t("bar.noTablesYet")}
          </p>
        </div>
      )}

      {/* Edit Table Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        size="md"
      >
        {selectedTable && editingTable && (
          <div className="flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-[rgba(var(--border),0.2)] bg-[rgb(var(--card))]">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-shrink-0 flex items-center justify-center w-[60px] h-[60px] rounded-[calc(var(--radius)*1.5)] bg-[rgba(var(--primary),0.1)]">
                  <TableIcon
                    color={selectedTable.Color || "#eee"}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[rgb(var(--foreground))] m-0 mb-1 leading-tight">
                    {t("bar.editTable") || "Chỉnh sửa bàn"}
                  </h2>
                  <p className="text-sm text-[rgb(var(--muted-foreground))] m-0 leading-snug">
                    {t("bar.editTableDescription") || "Cập nhật thông tin bàn"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="flex items-center justify-center w-8 h-8 rounded-[var(--radius)] bg-transparent border border-[rgba(var(--border),0.3)] text-[rgb(var(--muted-foreground))] cursor-pointer transition-all duration-200 flex-shrink-0 hover:bg-[rgba(var(--muted),0.1)] hover:border-[rgba(var(--border),0.5)] hover:text-[rgb(var(--foreground))]"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {/* Table Name Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[rgb(var(--foreground))]">
                  {t("bar.tableName") || "Tên bàn"}
                </label>
                <input
                  type="text"
                  value={editingTable.tableName}
                  onChange={(e) =>
                    setEditingTable({
                      ...editingTable,
                      tableName: e.target.value,
                    })
                  }
                  placeholder={t("bar.tableNamePlaceholder")}
                  className="w-full px-4 py-3 text-sm bg-[rgb(var(--input))] border-2 border-[rgba(var(--border),0.5)] rounded-[calc(var(--radius)*1.5)] text-[rgb(var(--foreground))] transition-all duration-200 placeholder:text-[rgb(var(--muted-foreground))] placeholder:opacity-70 focus:outline-none focus:border-[rgb(var(--primary))] focus:shadow-[0_0_0_3px_rgba(var(--primary),0.15)]"
                  autoFocus
                />
              </div>

              {/* Table Type Select */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[rgb(var(--foreground))]">
                  {t("bar.tableType") || "Loại bàn"}
                </label>
                <select
                  value={editingTable.tableClassificationId}
                  onChange={(e) => {
                    const selectedType = tableTypes.find(
                      (tt) => String(tt.TableClassificationId) === String(e.target.value)
                    );
                    setEditingTable({
                      ...editingTable,
                      tableClassificationId: e.target.value,
                    });
                    // Update color preview
                    if (selectedType) {
                      setSelectedTable({
                        ...selectedTable,
                        Color: selectedType.Color || "#eee",
                      });
                    }
                  }}
                  className="w-full px-4 py-3 text-sm bg-[rgb(var(--input))] border-2 border-[rgba(var(--border),0.5)] rounded-[calc(var(--radius)*1.5)] text-[rgb(var(--foreground))] transition-all duration-200 cursor-pointer focus:outline-none focus:border-[rgb(var(--primary))] focus:shadow-[0_0_0_3px_rgba(var(--primary),0.15)]"
                >
                  <option value="">{t("bar.selectTableType")}</option>
                  {tableTypes.map((tt) => (
                    <option
                      key={tt.TableClassificationId}
                      value={tt.TableClassificationId}
                    >
                      {tt.TableTypeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Preview */}
              {editingTable.tableClassificationId && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[rgb(var(--foreground))]">
                    {t("bar.color") || "Màu"}
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(var(--muted),0.1)] border border-[rgba(var(--border),0.3)] rounded-[calc(var(--radius)*1.5)]">
                    <div
                      className="w-10 h-10 rounded-[var(--radius)] border-2 border-[rgba(var(--border),0.3)] shadow-[0_2px_4px_rgba(0,0,0,0.1)] flex-shrink-0"
                      style={{
                        backgroundColor:
                          tableTypes.find(
                            (tt) =>
                              String(tt.TableClassificationId) ===
                              String(editingTable.tableClassificationId)
                          )?.Color || selectedTable.Color || "#eee",
                      }}
                    />
                    <span className="text-sm text-[rgb(var(--foreground))] font-medium">
                      {tableTypes.find(
                        (tt) =>
                          String(tt.TableClassificationId) ===
                          String(editingTable.tableClassificationId)
                      )?.TableTypeName || ""}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t border-[rgba(var(--border),0.2)] bg-[rgb(var(--card))] gap-4">
              {selectedTable.BarTableId && (
                <button
                  onClick={handleDeleteTableFromModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[calc(var(--radius)*1.5)] border-2 cursor-pointer transition-all duration-200 whitespace-nowrap bg-transparent text-[rgb(var(--danger))] border-[rgba(var(--danger),0.3)] hover:bg-[rgba(var(--danger),0.1)] hover:border-[rgba(var(--danger),0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  <Trash2 size={18} /> {t("bar.delete")}
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={handleCloseModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[calc(var(--radius)*1.5)] border-2 cursor-pointer transition-all duration-200 whitespace-nowrap bg-[rgb(var(--card))] text-[rgb(var(--foreground))] border-[rgba(var(--border),0.5)] hover:bg-[rgba(var(--muted),0.1)] hover:border-[rgba(var(--border),0.7)] disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {t("bar.cancel") || "Hủy"}
                </button>
                <button
                  onClick={handleSaveTableFromModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[calc(var(--radius)*1.5)] border-2 cursor-pointer transition-all duration-200 whitespace-nowrap bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] border-[rgb(var(--primary))] hover:shadow-[0_4px_12px_rgba(var(--primary),0.4)] hover:-translate-y-[1px] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={saving || !editingTable.tableName.trim()}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[rgba(var(--primary-foreground),0.3)] border-t-[rgb(var(--primary-foreground))] rounded-full animate-spin" />
                      {t("bar.saving")}
                    </>
                  ) : (
                    <>
                      <Save size={18} /> {t("bar.save") || "Lưu"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
