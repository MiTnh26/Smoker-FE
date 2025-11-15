import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import comboApi from "../../../api/comboApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/barTables.css";
import { useParams } from "react-router-dom";

// Combo Icon SVG Component
const ComboIcon = ({ className = "", color = null }) => {
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
      {/* Combo box shape */}
      <rect
        x="12"
        y="18"
        width="36"
        height="24"
        rx="2"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Plus symbol */}
      <line
        x1="30"
        y1="24"
        x2="30"
        y2="36"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="30"
        x2="36"
        y2="30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Decorative lines */}
      <line
        x1="15"
        y1="15"
        x2="15"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="45"
        y1="15"
        x2="45"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default function ComboManager() {
  const { t } = useTranslation();
  const { barPageId } = useParams();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [exitingCards, setExitingCards] = useState(new Set());
  const inputRefs = useRef({});

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const totalCombos = combos.length;

  // 🔹 Load combo khi mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await comboApi.getCombosByBar(barPageId);
        const combosData = (res.data || []).map((c) => ({
          ...c,
          dirty: false,
        }));
        setCombos(combosData);
      } catch (err) {
        console.error(err);
        addToast(t("bar.errorLoadingCombos"), "error");
      } finally {
        setLoading(false);
      }
    };
    if (barPageId) {
      fetchData();
    }
  }, [barPageId, t, addToast]);

  // 🔹 Thêm combo mới
  const addCombo = () => {
    const newId = `new-${Date.now()}-${Math.random()}`;
    setCombos((prev) => [
      ...prev,
      { ComboId: null, ComboName: "", Price: 0, dirty: true, _tempId: newId },
    ]);

    setTimeout(() => {
      const input = inputRefs.current[newId];
      if (input) input.focus();
    }, 100);
  };

  // 🔹 Cập nhật giá trị combo
  const updateCombo = (index, field, value) => {
    setCombos((prev) => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value, dirty: true };
      return newList;
    });
  };

  // 🔹 Lưu tất cả combo dirty
  const saveAll = async () => {
    const dirtyCombos = combos.filter((c) => c.dirty);
    if (!dirtyCombos.length) {
      addToast(t("bar.noChangesToSave"), "warning");
      return;
    }

    try {
      setSaving(true);
      const newCombos = [...combos];
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
          c.ComboId = created.data?.ComboId; // cập nhật ID mới trả về từ BE
        }

        c.dirty = false;
      }
      setCombos(newCombos);
      addToast(t("bar.allCombosSaved"), "success");
    } catch (err) {
      console.error(err);
      addToast(t("bar.errorSavingCombo"), "error");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Xóa combo
  const deleteComboHandler = async (id, index) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t("bar.confirmDeleteCombo"))) return;

    const cardId = id || combos[index]?._tempId || `temp-${index}`;
    setExitingCards((prev) => new Set(prev).add(cardId));

    const removeCard = () => {
      setCombos((prev) => prev.filter((_, i) => i !== index));
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
      if (id) {
        await comboApi.deleteCombo(id);
      }
      setTimeout(removeCard, 300);
      addToast(t("bar.comboDeleted"), "success");
    } catch (err) {
      console.error(err);
      clearExitingState();
      addToast(t("bar.errorDeletingCombo"), "error");
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
            {t("bar.comboManagerTitle")}
          </h1>
          <p className="bar-tables-description">
            {t("bar.totalCombos")}: {totalCombos}
          </p>
        </div>
        <div className="bar-tables-actions">
          <button onClick={addCombo} className="btn-add-table">
            ➕ {t("bar.addCombo")}
          </button>
          <button
            onClick={saveAll}
            disabled={saving || !combos.some((c) => c.dirty)}
            className={`btn-save-all-tables ${saving ? "loading" : ""}`}
          >
            {saving ? t("bar.saving") : `💾 ${t("bar.saveAll")}`}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {combos.length === 0 && !loading && (
        <div className="bar-tables-empty">
          <div className="bar-tables-empty-icon">
            <ComboIcon />
          </div>
          <p className="bar-tables-empty-text">
            {t("bar.noCombos")}
          </p>
        </div>
      )}

      {/* Combos Grid */}
      <div className="bar-tables-grid">
        <AnimatePresence>
          {combos.map((c, i) => {
            const cardId = c.ComboId || c._tempId || `temp-${i}`;
            const isExiting = exitingCards.has(cardId);

            return (
              <motion.div
                key={cardId}
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
                  borderLeftColor: "rgb(var(--primary))",
                }}
              >
                {/* Unsaved indicator */}
                {c.dirty && <div className="bar-table-dirty-indicator"></div>}

                {/* Combo Icon */}
                <div className="bar-table-icon-wrapper">
                  <div className="bar-table-icon">
                    <ComboIcon color="rgb(var(--primary))" />
                  </div>
                </div>

                {/* Combo Name Input */}
                <input
                  ref={(el) => {
                    if (el) inputRefs.current[cardId] = el;
                  }}
                  type="text"
                  value={c.ComboName || ""}
                  placeholder={t("bar.comboNamePlaceholder")}
                  onChange={(e) => updateCombo(i, "ComboName", e.target.value)}
                  className="bar-table-name-input"
                />

                {/* Price Input */}
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    value={c.Price || 0}
                    placeholder={t("bar.comboPricePlaceholder")}
                    onChange={(e) =>
                      updateCombo(i, "Price", Number(e.target.value))
                    }
                    className="bar-table-name-input"
                    min="0"
                  />
                  {c.Price > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        right: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgb(var(--muted-foreground))",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      {c.Price.toLocaleString("vi-VN")} đ
                    </span>
                  )}
                </div>

                {/* Status and Actions */}
                <div className="bar-table-card-actions">
                  <div
                    className={`bar-table-status ${
                      c.dirty ? "dirty" : "saved"
                    }`}
                  >
                    {c.dirty ? (
                      <>🟡 {t("bar.statusEditing")}</>
                    ) : (
                      <>✅ {t("bar.statusSaved")}</>
                    )}
                  </div>
                  {c.ComboId && (
                    <button
                      onClick={() => deleteComboHandler(c.ComboId, i)}
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
        
        {/* Add Combo Button - Below last combo */}
        <div className="bar-table-add-card">
          <button
            onClick={addCombo}
            className="bar-table-add-card-btn"
          >
            {t("bar.addCombo")}
          </button>
        </div>
      </div>

      {/* Back to Top Button - At bottom of page */}
      {combos.length > 0 && (
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
