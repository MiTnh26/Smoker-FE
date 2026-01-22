import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Trash2, Check, AlertCircle, Package, Eye, X, DollarSign, FileText, Tag, Sparkles } from "lucide-react";
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

  // Mapping tên trường DB sang tên hiển thị thân thiện
  const fieldLabels = {
    comboName: "Tên Combo",
    price: "Giá bán",
    description: "Mô tả Combo"
  };

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
        addToast("Lỗi khi tải danh sách combo", "error");
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
      addToast("Vui lòng điền đầy đủ các trường bắt buộc", "warning");
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
        addToast("Cập nhật combo thành công", "success");
      } else {
        // Create new combo
        result = await comboApi.createCombo(payload);
        // Add new combo to list
        setCombos(prev => [...prev, {
          ...editingCombo,
          ComboId: result.data?.ComboId,
          dirty: false
        }]);
        addToast("Tạo combo thành công", "success");
      }

      setIsModalOpen(false);
      setEditingCombo(null);
    } catch (err) {
      console.error(err);
      addToast("Lỗi khi lưu combo", "error");
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
    if (!window.confirm("Bạn có chắc chắn muốn xóa combo này?")) return;

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
      addToast("Xóa combo thành công", "success");
    } catch (err) {
      console.error(err);
      clearExitingState();
      addToast("Lỗi khi xóa combo", "error");
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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg">
              <Package size={28} className="text-white" />
            </div>
          <h1 className="bar-tables-title">
              Quản lý Combo
          </h1>
          </div>
          <p className="bar-tables-description text-gray-600">
            Tổng số combo: <span className="font-semibold text-purple-600">{totalCombos}</span>
          </p>
        </div>
        <div className="bar-tables-actions">
          <button 
            onClick={addCombo} 
            className="btn-add-table bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 text-white"
          >
            <Plus size={18} /> Thêm Combo
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
            Chưa có combo nào
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
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isExiting
                    ? { opacity: 0, scale: 0.8 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={`bar-table-card ${isExiting ? "exiting" : ""} bg-gradient-to-br from-white to-purple-50 border-2 border-purple-100 hover:border-purple-300 shadow-md hover:shadow-xl transition-all duration-300`}
              >
                {/* Combo Icon with gradient background */}
                <div className="bar-table-icon-wrapper mb-3">
                  <div className="bar-table-icon bg-gradient-to-br from-purple-500 to-indigo-500 p-4 rounded-xl shadow-lg">
                    <Package size={40} className="text-white" />
                  </div>
                </div>

                {/* Combo Name Display */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag size={16} className="text-purple-500" />
                    <span className="text-xs text-gray-500 font-medium">{fieldLabels.comboName}</span>
                  </div>
                  <h3 className="bar-table-name text-lg font-bold text-gray-800">
                    {c.ComboName || "Chưa có tên"}
                </h3>
                </div>

                {/* Price Display */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={16} className="text-green-500" />
                    <span className="text-xs text-gray-500 font-medium">{fieldLabels.price}</span>
                  </div>
                  <p className="bar-table-price text-2xl font-bold text-green-600">
                  {c.Price.toLocaleString("vi-VN")} đ
                </p>
                </div>

                {/* Description Display */}
                {c.Description && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={16} className="text-blue-500" />
                      <span className="text-xs text-gray-500 font-medium">{fieldLabels.description}</span>
                    </div>
                    <p className="bar-table-description text-sm text-gray-600 line-clamp-2">
                    {c.Description}
                  </p>
                  </div>
                )}

                {/* Actions */}
                <div className="bar-table-card-actions flex gap-2 mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => viewComboDetail(c)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-1"
                  >
                    <Eye size={14} className="text-white" />
                    <span className="text-white">Chi tiết</span>
                  </button>
                  <button
                    onClick={() => editCombo(c)}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-1"
                  >
                    <Check size={14} className="text-white" />
                    <span className="text-white">Sửa</span>
                  </button>
                  <button
                    onClick={() => deleteComboHandler(c.ComboId, i)}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <Trash2 size={14} className="text-white" />
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
            <Plus size={18} /> Thêm Combo
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
            Trở về đầu trang
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
              className="bg-white rounded-2xl p-6 w-full max-w-lg mx-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {editingCombo?.ComboId ? "Chỉnh sửa Combo" : "Thêm Combo mới"}
                </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Combo Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Tag size={16} className="text-purple-500" />
                    <span>{fieldLabels.comboName}</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCombo?.ComboName || ""}
                    onChange={(e) => setEditingCombo(prev => ({ ...prev, ComboName: e.target.value }))}
                    placeholder="Ví dụ: Combo Bia + Đồ nhậu"
                    className="w-full px-4 py-3 bg-white border-2 border-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-800 placeholder-gray-400 shadow-sm"
                    disabled={saving}
                  />
                  <p className="mt-1 text-xs text-gray-500">Nhập tên combo để khách hàng dễ nhận biết</p>
                </div>

                {/* Price */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign size={16} className="text-green-500" />
                    <span>{fieldLabels.price}</span>
                    <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal">(VNĐ)</span>
                  </label>
                  <div className="relative">
                  <input
                    type="number"
                      value={editingCombo?.Price || ""}
                      onChange={(e) => setEditingCombo(prev => ({ ...prev, Price: Number(e.target.value) || 0 }))}
                      placeholder="Ví dụ: 500000"
                    min="0"
                      step="1000"
                      className="w-full px-4 py-3 pl-10 bg-white border-2 border-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-800 placeholder-gray-400 shadow-sm"
                    disabled={saving}
                  />
                    <DollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Nhập giá bán của combo (đơn vị: VNĐ)</p>
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={16} className="text-blue-500" />
                    <span>{fieldLabels.description}</span>
                    <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <textarea
                    value={editingCombo?.Description || ""}
                    onChange={(e) => setEditingCombo(prev => ({ ...prev, Description: e.target.value }))}
                    placeholder="Mô tả chi tiết về combo, ví dụ: Bao gồm 2 chai bia, 1 đĩa đậu phộng, 1 đĩa khô gà..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white border-2 border-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none text-gray-800 placeholder-gray-400 shadow-sm"
                    disabled={saving}
                  />
                  <p className="mt-1 text-xs text-gray-500">Mô tả chi tiết giúp khách hàng hiểu rõ hơn về combo</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  onClick={saveComboFromModal}
                  disabled={saving || !editingCombo?.ComboName.trim() || editingCombo?.Price <= 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span className="text-white">Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} className="text-white" />
                      <span className="text-white">{editingCombo?.ComboId ? "Cập nhật" : "Tạo mới"}</span>
                    </>
                  )}
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
              className="bg-white rounded-2xl p-6 w-full max-w-lg mx-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                    <Eye size={20} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Chi tiết Combo
                </h3>
                </div>
                <button
                  onClick={() => setShowDetailCombo(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Tag size={16} className="text-purple-500" />
                    <span>{fieldLabels.comboName}</span>
                  </label>
                  <p className="text-gray-900 font-bold text-lg">{showDetailCombo.ComboName}</p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign size={16} className="text-green-500" />
                    <span>{fieldLabels.price}</span>
                  </label>
                  <p className="text-green-600 font-bold text-2xl">{showDetailCombo.Price.toLocaleString("vi-VN")} đ</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={16} className="text-blue-500" />
                    <span>{fieldLabels.description}</span>
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {showDetailCombo.Description || "Chưa có mô tả"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    editCombo(showDetailCombo);
                    setShowDetailCombo(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-blue-500 text-blue-500 rounded-xl hover:bg-blue-50 hover:border-blue-600 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>Chỉnh sửa</span>
                </button>
                <button
                  onClick={() => setShowDetailCombo(null)}
                  className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  <span className="text-white">Đóng</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
