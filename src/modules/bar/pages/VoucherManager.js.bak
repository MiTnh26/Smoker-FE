import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Trash2, Check, AlertCircle, TicketPercent } from "lucide-react";
import voucherApi from "../../../api/voucherApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/barTables.css";
import { useParams } from "react-router-dom";

export default function VoucherManager() {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [exitingCards, setExitingCards] = useState(new Set());
  const inputRefs = useRef({});
  const { barPageId } = useParams();

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const totalVouchers = vouchers.length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await voucherApi.getVouchers(barPageId);
        const vouchersData = (res.data || []).map((v) => ({
          ...v,
          DiscountPercentage: v.DiscountPercentage || v.Discount || 0,
          dirty: false,
        }));
        setVouchers(vouchersData);
      } catch (err) {
        console.error(err);
        addToast(t("bar.errorLoadingVouchers"), "error");
      } finally {
        setLoading(false);
      }
    };
    if (barPageId) {
      fetchData();
    }
  }, [barPageId, t, addToast]);

  const addVoucher = () => {
    const newId = `new-${Date.now()}-${Math.random()}`;
    setVouchers((prev) => [
      ...prev,
      {
        VoucherId: null,
        VoucherName: "",
        DiscountPercentage: 0,
        dirty: true,
        _tempId: newId,
      },
    ]);

    setTimeout(() => {
      const input = inputRefs.current[newId];
      if (input) input.focus();
    }, 100);
  };

  const updateVoucher = (index, field, value) => {
    setVouchers((prev) => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value, dirty: true };
      return newList;
    });
  };

  const saveAll = async () => {
    const dirty = vouchers.filter((v) => v.dirty);
    if (!dirty.length) {
      addToast(t("bar.noChangesToSave"), "warning");
      return;
    }

    try {
      setSaving(true);
      const newVouchers = [...vouchers];
      for (let v of dirty) {
        const payload = {
          barId: barPageId,
          voucherName: v.VoucherName,
          discountPercentage: Number(v.DiscountPercentage),
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        };

        if (v.VoucherId) {
          await voucherApi.updateVoucher(v.VoucherId, payload);
        } else {
          const created = await voucherApi.createVoucher(payload);
          v.VoucherId = created.data?.VoucherId;
        }
        v.dirty = false;
      }
      setVouchers(newVouchers);
      addToast(t("bar.savedSuccessfully"), "success");
    } catch (err) {
      console.error(err);
      addToast(t("bar.errorSavingVoucher"), "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteVoucher = async (id, index) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t("bar.confirmDeleteVoucher"))) return;

    const cardId = id || vouchers[index]?._tempId || `temp-${index}`;
    setExitingCards((prev) => new Set(prev).add(cardId));

    const removeCard = () => {
      setVouchers((prev) => prev.filter((_, i) => i !== index));
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
        await voucherApi.deleteVoucher(id);
      }
      setTimeout(removeCard, 300);
      addToast(t("bar.voucherDeleted"), "success");
    } catch (err) {
      console.error(err);
      clearExitingState();
      addToast(t("bar.errorDeletingVoucher"), "error");
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
            {t("bar.voucherManagerTitle")}
          </h1>
          <p className="bar-tables-description">
            {t("bar.totalVouchers")}: {totalVouchers}
          </p>
        </div>
        <div className="bar-tables-actions">
          <button onClick={addVoucher} className="btn-add-table">
            <Plus size={18} /> {t("bar.addVoucher")}
          </button>
          <button
            onClick={saveAll}
            disabled={saving || !vouchers.some((v) => v.dirty)}
            className={`btn-save-all-tables ${saving ? "loading" : ""}`}
          >
            {saving ? t("bar.saving") : <><Save size={18} /> {t("bar.saveAll")}</>}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {vouchers.length === 0 && !loading && (
        <div className="bar-tables-empty">
          <div className="bar-tables-empty-icon">
            <TicketPercent size={60} style={{ color: "rgb(var(--primary))", opacity: 0.5 }} />
          </div>
          <p className="bar-tables-empty-text">
            {t("bar.noVouchersYet")}
          </p>
        </div>
      )}

      {/* Vouchers Grid */}
      <div className="bar-tables-grid">
        <AnimatePresence>
          {vouchers.map((v, i) => {
            const cardId = v.VoucherId || v._tempId || `temp-${i}`;
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
                {v.dirty && <div className="bar-table-dirty-indicator"></div>}

                {/* Voucher Icon */}
                <div className="bar-table-icon-wrapper">
                  <div className="bar-table-icon">
                    <TicketPercent size={60} style={{ color: "rgb(var(--primary))" }} />
                  </div>
                </div>

                {/* Voucher Name Input */}
                <input
                  ref={(el) => {
                    if (el) inputRefs.current[cardId] = el;
                  }}
                  type="text"
                  value={v.VoucherName || ""}
                  placeholder={t("bar.voucherNamePlaceholder")}
                  onChange={(e) => updateVoucher(i, "VoucherName", e.target.value)}
                  className="bar-table-name-input"
                />

                {/* Discount Percentage Input */}
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    value={v.DiscountPercentage || 0}
                    placeholder={t("bar.discountPlaceholder")}
                    onChange={(e) =>
                      updateVoucher(i, "DiscountPercentage", e.target.value)
                    }
                    className="bar-table-name-input"
                    min="0"
                    max="100"
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgb(var(--muted-foreground))",
                      fontSize: "0.875rem",
                    }}
                  >
                    %
                  </span>
                </div>

                {/* Status and Actions */}
                <div className="bar-table-card-actions">
                  <div
                    className={`bar-table-status ${
                      v.dirty ? "dirty" : "saved"
                    }`}
                  >
                    {v.dirty ? (
                      <><AlertCircle size={16} /> {t("bar.statusEditing")}</>
                    ) : (
                      <><Check size={16} /> {t("bar.statusSaved")}</>
                    )}
                  </div>
                  {v.VoucherId && (
                    <button
                      onClick={() => deleteVoucher(v.VoucherId, i)}
                      className="bar-table-delete-btn"
                    >
                      <Trash2 size={16} /> {t("bar.delete")}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Add Voucher Button - Below last voucher */}
        <div className="bar-table-add-card">
          <button
            onClick={addVoucher}
            className="bar-table-add-card-btn"
          >
            <Plus size={18} /> {t("bar.addVoucher")}
          </button>
        </div>
      </div>

      {/* Back to Top Button - At bottom of page */}
      {vouchers.length > 0 && (
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
