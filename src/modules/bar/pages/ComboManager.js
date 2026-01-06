import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Trash2, Check, AlertCircle, Package, Eye, X } from "lucide-react";
import comboApi from "../../../api/comboApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/barTables.css";
import { useParams } from "react-router-dom";

export default function ComboManager() {
  const { t } = useTranslation();
  const { barPageId } = useParams();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [exitingCards, setExitingCards] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [showDetailCombo, setShowDetailCombo] = useState(null);
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
        const combosData = (res.data || []);
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

  // 🔹 Thêm combo mới - mở modal
  const addCombo = () => {
    setEditingCombo({
      ComboId: null,
      ComboName: "",
      Price: 0,
      Description: ""
    });
    setIsModalOpen(true);
  };

  // 🔹 Chỉnh sửa combo - mở modal
  const editCombo = (combo) => {
    setEditingCombo({
      ...combo,
      Description: combo.Description || ""
    });
    setIsModalOpen(true);
  };

  // 🔹 Lưu combo từ modal
  const saveComboFromModal = async () => {
    if (!editingCombo.ComboName.trim() || editingCombo.Price <= 0) {
      addToast(t("bar.pleaseFillAllFields"), "warning");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        barPageId,
        comboName: editingCombo.ComboName,
        price: Number(editingCombo.Price),
        description: editingCombo.Description || ""
      };

      let result;
      if (editingCombo.ComboId) {
        // Update existing combo
        // Sử dụng comboId để update
        result = await comboApi.updateCombo(editingCombo.ComboId, payload);
        // Update combo in list with returned data or local data
        setCombos(prev => prev.map(c =>
          c.ComboId === editingCombo.ComboId 
            ? { ...c, ...editingCombo, ...result.data } // Merge result.data nếu BE trả về combo mới
            : c
        ));
        addToast(t("bar.comboUpdated"), "success");
      } else {
        // Create new combo
        result = await comboApi.createCombo(payload);
        // Add new combo to list
        setCombos(prev => [...prev, {
          ...editingCombo,
          ComboId: result.data?.ComboId,
          dirty: false
        }]);
        addToast(t("bar.comboCreated"), "success");
      }

      setIsModalOpen(false);
      setEditingCombo(null);
    } catch (err) {
      console.error(err);
      addToast(t("bar.errorSavingCombo"), "error");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Xem chi tiết combo
  const viewComboDetail = (combo) => {
    setShowDetailCombo(combo);
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
            <Plus size={18} /> {t("bar.addCombo")}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {combos.length === 0 && !loading && (
        <div className="bar-tables-empty">
          <div className="bar-tables-empty-icon">
            <Package size={60} style={{ color: "rgb(var(--primary))", opacity: 0.5 }} />
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

                {/* Combo Icon */}
                <div className="bar-table-icon-wrapper">
                  <div className="bar-table-icon">
                    <Package size={60} style={{ color: "rgb(var(--primary))" }} />
                  </div>
                </div>

                {/* Combo Name Display */}
                <h3 className="bar-table-name text-lg font-semibold text-gray-800 mb-1">
                  {c.ComboName || t("bar.comboNamePlaceholder")}
                </h3>

                {/* Price Display */}
                <p className="bar-table-price text-xl font-bold text-green-600 mb-2">
                  {c.Price.toLocaleString("vi-VN")} đ
                </p>

                {/* Description Display */}
                {c.Description && (
                  <p className="bar-table-description text-sm text-gray-600 mb-3 line-clamp-2">
                    {c.Description}
                  </p>
                )}

                {/* Actions */}
                <div className="bar-table-card-actions flex gap-2 mt-3">
                  <button
                    onClick={() => viewComboDetail(c)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    <Eye size={14} className="inline mr-1" />
                    {t("bar.viewDetail")}
                  </button>
                  <button
                    onClick={() => editCombo(c)}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    <Check size={14} className="inline mr-1" />
                    {t("bar.edit")}
                  </button>
                  <button
                    onClick={() => deleteComboHandler(c.ComboId, i)}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    <Trash2 size={14} />
                  </button>
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
            <Plus size={18} /> {t("bar.addCombo")}
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

      {/* Combo Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingCombo?.ComboId ? t("bar.editCombo") : t("bar.addCombo")}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Combo Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("bar.comboName")} *
                  </label>
                  <input
                    type="text"
                    value={editingCombo?.ComboName || ""}
                    onChange={(e) => setEditingCombo(prev => ({ ...prev, ComboName: e.target.value }))}
                    placeholder={t("bar.comboNamePlaceholder")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("bar.comboPrice")} (VNĐ) *
                  </label>
                  <input
                    type="number"
                    value={editingCombo?.Price || 0}
                    onChange={(e) => setEditingCombo(prev => ({ ...prev, Price: Number(e.target.value) }))}
                    placeholder={t("bar.comboPricePlaceholder")}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("bar.comboDescription")}
                  </label>
                  <textarea
                    value={editingCombo?.Description || ""}
                    onChange={(e) => setEditingCombo(prev => ({ ...prev, Description: e.target.value }))}
                    placeholder={t("bar.comboDescriptionPlaceholder")}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={saveComboFromModal}
                  disabled={saving || !editingCombo?.ComboName.trim() || editingCombo?.Price <= 0}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? t("bar.saving") : (editingCombo?.ComboId ? t("bar.update") : t("bar.create"))}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailCombo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailCombo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {t("bar.comboDetail")}
                </h3>
                <button
                  onClick={() => setShowDetailCombo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("bar.comboName")}
                  </label>
                  <p className="text-gray-900 font-medium">{showDetailCombo.ComboName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("bar.comboPrice")}
                  </label>
                  <p className="text-gray-900 font-medium">{showDetailCombo.Price.toLocaleString("vi-VN")} đ</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("bar.comboDescription")}
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {showDetailCombo.Description || t("bar.noDescription")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    editCombo(showDetailCombo);
                    setShowDetailCombo(null);
                  }}
                  className="flex-1 px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {t("bar.edit")}
                </button>
                <button
                  onClick={() => setShowDetailCombo(null)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t("common.close")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
