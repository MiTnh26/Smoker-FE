import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
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

export default function BarTables({ barPageId }) {
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [exitingCards, setExitingCards] = useState(new Set());
  const inputRefs = useRef({});
  const tableCardRefs = useRef({});

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
    const newId = `new-${Date.now()}-${Math.random()}`;
    setTables((prev) => [
      ...prev,
      {
        BarTableId: null,
        TableName: "",
        tableName: "",
        TableClassificationId: "",
        Color: "#eee",
        TableTypeName: "",
        dirty: true,
        _tempId: newId,
      },
    ]);

    // Auto-focus the new input after a short delay
    setTimeout(() => {
      const input = inputRefs.current[newId];
      if (input) input.focus();
    }, 100);
  };

  // Lưu tất cả bàn
  const saveAllTables = async () => {
    const dirtyTables = tables.filter((t) => t.dirty);
    if (!dirtyTables.length) {
      addToast(t("bar.noTablesToSave"), "warning");
      return;
    }

    try {
      setSaving(true);
      const newTables = [...tables];
      for (let i = 0; i < dirtyTables.length; i++) {
        const t = dirtyTables[i];
        const payload = {
          barPageId,
          tableName: t.tableName,
          tableClassificationId: t.TableClassificationId,
        };

        if (t.BarTableId) {
          await barPageApi.updateBarTable(t.BarTableId, payload);
        } else {
          const res = await barPageApi.createTables([payload]);
          t.BarTableId = res.data[0]?.BarTableId;
        }

        // Cập nhật màu và tên loại bàn ngay sau khi chọn
        const type = tableTypes.find(
          (tt) => String(tt.TableClassificationId) === String(t.TableClassificationId)
        );
        t.Color = type?.Color || "#eee";
        t.TableTypeName = type?.TableTypeName || "";
        t.dirty = false;

        // Cập nhật luôn mảng mới để render lại
        newTables[newTables.findIndex((x) => x === t)] = t;
      }

      setTables(newTables);
      addToast(t("bar.allTablesSaved"), "success");
    } catch (err) {
      console.error("❌ Lỗi khi lưu bàn:", err);
      addToast(t("bar.errorSavingTables"), "error");
    } finally {
      setSaving(false);
    }
  };

  const updateTable = (index, field, value) => {
    setTables((prev) => {
      const newTables = [...prev];
      const table = newTables[index];

      if (field === "tableClassificationId") {
        const type = tableTypes.find(
          (tt) => String(tt.TableClassificationId) === String(value)
        );
        newTables[index] = {
          ...table,
          TableClassificationId: value,
          Color: type?.Color || "#eee",
          TableTypeName: type?.TableTypeName || "",
          dirty: true,
        };
      } else if (field === "tableName") {
        newTables[index] = {
          ...table,
          tableName: value,
          TableName: value, // đồng bộ luôn với DB
          dirty: true,
        };
      }

      return newTables;
    });
  };

  const deleteTable = async (tableId, index) => {
    if (!window.confirm(t("bar.confirmDeleteTable"))) return;

    const cardId = tableId || tables[index]?._tempId || `temp-${index}`;
    // Mark card as exiting for animation
    setExitingCards((prev) => new Set(prev).add(cardId));

    const removeCard = () => {
      setTables((prev) => prev.filter((_, i) => i !== index));
      setExitingCards((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    };

    const clearExitingState = () => {
      setExitingCards((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    };

    try {
      if (tableId) {
        await barPageApi.deleteBarTable(tableId);
      }

      // Wait for animation to complete
      setTimeout(removeCard, 300);

      addToast(t("bar.tableDeleted"), "success");
    } catch (err) {
      console.error("❌ Lỗi khi xóa bàn:", err);
      clearExitingState();
      addToast(t("bar.errorDeletingTable"), "error");
    }
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

      {/* Header Section */}
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
             {t("bar.addTable")}
          </button>
          <button
            onClick={saveAllTables}
            disabled={saving || !tables.some((t) => t.dirty)}
            className={`btn-save-all-tables ${saving ? "loading" : ""}`}
          >
            {saving ? t("bar.saving") : ` ${t("bar.saveAll")}`}
          </button>
        </div>
      </div>

      {/* Table Layout Preview Section */}
      {tables.length > 0 && (
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
                const cardRef = tableCardRefs.current[cardId];
                if (cardRef) {
                  cardRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Highlight the card briefly
                  cardRef.classList.add('highlighted');
                  setTimeout(() => {
                    cardRef.classList.remove('highlighted');
                  }, 2000);
                }
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

      {/* Tables Grid */}
      <div className="bar-tables-grid">
        <AnimatePresence>
          {tables.map((table, i) => {
            const cardId = table.BarTableId || table._tempId || `temp-${i}`;
            const isExiting = exitingCards.has(cardId);
            const tableColor = table.Color || "#eee";

            return (
              <motion.div
                key={cardId}
                ref={(el) => {
                  if (el) tableCardRefs.current[cardId] = el;
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={
                  isExiting
                    ? { opacity: 0, scale: 0.8 }
                    : { opacity: 1, x: 0, scale: 1 }
                }
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className={`bar-table-card ${isExiting ? "exiting" : ""}`}
                style={{
                  borderLeftColor: tableColor,
                }}
              >
                {/* Unsaved indicator */}
                {table.dirty && (
                  <div className="bar-table-dirty-indicator"></div>
                )}

                {/* Table Icon */}
                <div className="bar-table-icon-wrapper">
                  <div className="bar-table-icon">
                    <TableIcon
                      color={tableColor}
                    />
                  </div>
                </div>

                {/* Table Name Input */}
                <input
                  ref={(el) => {
                    if (el) inputRefs.current[cardId] = el;
                  }}
                  type="text"
                  value={table.tableName || ""}
                  placeholder={t("bar.tableNamePlaceholder")}
                  onChange={(e) => updateTable(i, "tableName", e.target.value)}
                  className="bar-table-name-input"
                />

                {/* Table Type Select */}
                <select
                  value={table.TableClassificationId || ""}
                  onChange={(e) =>
                    updateTable(i, "tableClassificationId", e.target.value)
                  }
                  className="bar-table-type-select"
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

                {/* Color Preview */}
                {table.TableClassificationId && (
                  <div className="bar-table-color-preview">
                    <span className="bar-table-color-label">
                      {t("bar.color")}:
                    </span>
                    <div
                      className="bar-table-color-box"
                      style={{ backgroundColor: tableColor }}
                      title={table.TableTypeName}
                    />
                  </div>
                )}

                {/* Status and Actions */}
                <div className="bar-table-card-actions">
                  <div
                    className={`bar-table-status ${table.dirty ? "dirty" : "saved"
                      }`}
                  >
                    {table.dirty ? (
                      <>🟡 {t("bar.statusEditing")}</>
                    ) : (
                      <>✅ {t("bar.statusSaved")}</>
                    )}
                  </div>
                  {table.BarTableId && (
                    <button
                      onClick={() => deleteTable(table.BarTableId, i)}
                      className="bar-table-delete-btn"
                    >
                      {t("bar.delete")}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Add Table Button - Below last table */}
        <div className="bar-table-add-card">
          <button
            onClick={addTable}
            className="bar-table-add-card-btn"
          >
             {t("bar.addTable")}
          </button>
        </div>
      </div>

      {/* Back to Top Button - At bottom of page */}
      {tables.length > 0 && (
        <div className="bar-tables-layout-footer">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bar-tables-layout-back-btn"
          >
            {t("bar.backToTop") || "Trở về đầu trang"}
          </button>
        </div>
      )}
    </div>
  );
}
