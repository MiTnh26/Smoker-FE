import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import barPageApi from "../../../api/barPageApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/tableClassification.css";

export default function TableClassificationManager({ onTableTypesChange }) {
  const { t } = useTranslation();
  const { barPageId } = useParams();
  const location = useLocation();
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [exitingCards, setExitingCards] = useState(new Set());

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Show message from navigation state if available
  useEffect(() => {
    if (location.state?.message) {
      addToast(location.state.message, "info");
      window.history.replaceState({}, document.title);
    }
  }, [location.state, addToast]);

  // Load danh sách loại bàn khi vào trang
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await barPageApi.getTableTypes(barPageId);
        console.log("📦 Dữ liệu loại bàn:", res.data);
        setClassifications(res.data || []);
      } catch (err) {
        console.error("❌ Lỗi tải loại bàn:", err);
        addToast(t("bar.cannotLoadTableTypes"), "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [barPageId, t, addToast]);

  // Thêm loại bàn mới (client-side)
  const addClassification = () => {
    const newId = `new-${Date.now()}-${Math.random()}`;
    setClassifications((prev) => [
      ...prev,
      {
        TableClassificationId: null,
        TableTypeName: "",
        Color: "#eeeeee",
        dirty: true,
        _tempId: newId,
      },
    ]);
  };

  // Cập nhật khi thay đổi input
  const updateClassification = (index, field, value) => {
    setClassifications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value, dirty: true };
      return updated;
    });
  };

  // Lưu toàn bộ thay đổi
  const saveAll = async () => {
    const dirtyItems = classifications.filter((c) => c.dirty);
    if (!dirtyItems.length) {
      addToast(t("bar.noChangesToSave"), "warning");
      return;
    }

    try {
      setSaving(true);
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

      // Reload data
      const res = await barPageApi.getTableTypes(barPageId);
      setClassifications(res.data || []);
      
      addToast(t("bar.saved"), "success");
      
      // Notify parent component to refresh table types
      if (onTableTypesChange) {
        onTableTypesChange();
      }
      // Trigger event for sidebar to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tableTypesUpdated"));
      }
    } catch (err) {
      console.error("❌ Lỗi khi lưu loại bàn:", err);
      addToast(t("bar.errorSaving"), "error");
    } finally {
      setSaving(false);
    }
  };

  // Xóa loại bàn
  const deleteClassification = async (id, index) => {
    if (!window.confirm(t("bar.confirmDelete"))) return;

    const cardId = id || classifications[index]?._tempId || `temp-${index}`;
    // Mark card as exiting for animation
    setExitingCards((prev) => new Set(prev).add(cardId));

    try {
      if (id) {
        await barPageApi.removeTableTypes(id);
      }
      
      // Wait for animation to complete
      setTimeout(() => {
        setClassifications((prev) => prev.filter((_, i) => i !== index));
        setExitingCards((prev) => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
      }, 300);

      addToast(t("bar.deleted"), "success");
      
      // Notify parent component to refresh table types
      if (onTableTypesChange) {
        onTableTypesChange();
      }
      // Trigger event for sidebar to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tableTypesUpdated"));
      }
    } catch (err) {
      console.error("❌ Lỗi khi xóa loại bàn:", err);
      setExitingCards((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      addToast(t("bar.cannotDelete"), "error");
    }
  };

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="table-classification-container">
        <div className="classification-loading">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", width: "100%" }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-classification-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header Section */}
      <div className="table-classification-header">
        <div className="table-classification-header-content">
          <h1 className="table-classification-title">
            {t("bar.tableClassificationTitle")}
          </h1>
          <p className="table-classification-description">
            {t("bar.tableClassificationDescription")}
          </p>
        </div>
        <div className="table-classification-actions">
          <button
            className="btn-add-classification"
            onClick={addClassification}
          >
            ➕ {t("bar.addTableType")}
          </button>
          <button
            className={`btn-save-all ${saving ? "loading" : ""}`}
            onClick={saveAll}
            disabled={saving || !classifications.some((c) => c.dirty)}
          >
            {saving ? t("bar.saving") : `💾 ${t("bar.saveAll")}`}
          </button>
        </div>
      </div>

      {/* Classifications Grid */}
      <div className="classifications-grid">
        {classifications.map((c, i) => {
          const cardId = c.TableClassificationId || c._tempId || `temp-${i}`;
          const isExiting = exitingCards.has(cardId);
          
          return (
            <div
              key={cardId}
              className={`classification-card ${isExiting ? "exiting" : ""}`}
            >
              {/* Color Preview */}
              <div className="classification-color-preview">
                <input
                  type="color"
                  value={c.Color || "#eeeeee"}
                  onChange={(e) => updateClassification(i, "Color", e.target.value)}
                  className="classification-color-input"
                />
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: c.Color || "#eeeeee",
                    borderRadius: "inherit",
                  }}
                />
              </div>

              {/* Name Input */}
              <input
                type="text"
                value={c.TableTypeName || ""}
                placeholder={t("bar.tableTypeNamePlaceholder")}
                onChange={(e) =>
                  updateClassification(i, "TableTypeName", e.target.value)
                }
                className="classification-name-input"
              />

              {/* Color Row */}
              <div className="classification-color-row">
                <label className="classification-color-label">
                  {t("bar.color")}
                </label>
                <div className="classification-color-input-wrapper">
                  <input
                    type="color"
                    value={c.Color || "#eeeeee"}
                    onChange={(e) => updateClassification(i, "Color", e.target.value)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: c.Color || "#eeeeee",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              {/* Card Actions */}
              <div className="classification-card-actions">
                <div
                  className={`classification-status ${
                    c.dirty ? "dirty" : "saved"
                  }`}
                >
                  {c.dirty ? (
                    <>
                      🟡 {t("bar.statusEditing")}
                    </>
                  ) : (
                    <>
                      ✅ {t("bar.statusSaved")}
                    </>
                  )}
                </div>
                {c.TableClassificationId && (
                  <button
                    className="classification-delete-btn"
                    onClick={() =>
                      deleteClassification(c.TableClassificationId, i)
                    }
                  >
                    {t("bar.delete")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Add Classification Button - Below last classification */}
        <div className="bar-table-add-card">
          <button
            onClick={addClassification}
            className="bar-table-add-card-btn"
          >
            {t("bar.addTableType")}
          </button>
        </div>
      </div>

      {/* Back to Top Button - At bottom of page */}
      {classifications.length > 0 && (
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
