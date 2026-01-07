import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, DollarSign, FileText, Tag, X, Eye } from "lucide-react";
import comboApi from "../../../api/comboApi";

export default function BarMenuCombo({ barPageId }) {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!barPageId) {
      setLoading(false);
      return;
    }
    
    const fetchCombos = async () => {
      try {
        setLoading(true);
        setMessage("");
        const res = await comboApi.getCombosByBar(barPageId);
        if (res.status === "success") {
          setCombos(res.data || []);
        } else if (Array.isArray(res.data)) {
          setCombos(res.data);
        } else if (Array.isArray(res)) {
          setCombos(res);
        } else {
          setCombos([]);
        }
      } catch (err) {
        console.error("Error loading combos:", err);
        setMessage("Lỗi khi tải danh sách combo");
        setCombos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCombos();
  }, [barPageId]);

  const handleComboClick = (combo) => {
    setSelectedCombo(combo);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCombo(null);
  };

  // Mapping tên trường DB sang tên hiển thị thân thiện
  const fieldLabels = {
    comboName: "Tên Combo",
    price: "Giá bán",
    description: "Mô tả Combo"
  };

  if (loading) {
    return (
      <div className="profile-card mt-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-500 mt-2">Đang tải combo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-card mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg">
          <Package size={24} className="text-white" />
        </div>
        <h3 className="section-title text-2xl font-bold">Combo Menu</h3>
      </div>

      {message && <p className="text-red-500 mb-4">{message}</p>}

      {combos.length === 0 ? (
        <div className="text-center py-12">
          <Package size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-lg">Chưa có combo nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {combos.map((combo) => (
            <motion.div
              key={combo.ComboId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              onClick={() => handleComboClick(combo)}
              className="relative bg-gradient-to-br from-white to-purple-50 border-2 border-purple-100 hover:border-purple-300 rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
            >
              {/* Icon */}
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Package size={32} className="text-white" />
                </div>
              </div>

              {/* Combo Name */}
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1">
                  <Tag size={14} className="text-purple-500" />
                  <span className="text-xs text-gray-500 font-medium">{fieldLabels.comboName}</span>
                </div>
                <h4 className="text-base font-bold text-gray-800 line-clamp-2">{combo.ComboName || "Chưa có tên"}</h4>
              </div>

              {/* Price */}
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign size={14} className="text-green-500" />
                  <span className="text-xs text-gray-500 font-medium">{fieldLabels.price}</span>
                </div>
                <p className="text-xl font-bold text-green-600">{combo.Price.toLocaleString("vi-VN")} đ</p>
              </div>

              {/* Description Preview */}
              {combo.Description && (
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <FileText size={14} className="text-blue-500" />
                    <span className="text-xs text-gray-500 font-medium">{fieldLabels.description}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{combo.Description}</p>
                </div>
              )}

              {/* Click hint */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-2 text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye size={14} />
                <span>Click để xem chi tiết</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedCombo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeDetailModal}
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
                  <h3 className="text-2xl font-bold text-gray-800">Chi tiết Combo</h3>
                </div>
                <button
                  onClick={closeDetailModal}
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
                  <p className="text-gray-900 font-bold text-lg">{selectedCombo.ComboName}</p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign size={16} className="text-green-500" />
                    <span>{fieldLabels.price}</span>
                  </label>
                  <p className="text-green-600 font-bold text-2xl">{selectedCombo.Price.toLocaleString("vi-VN")} đ</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={16} className="text-blue-500" />
                    <span>{fieldLabels.description}</span>
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {selectedCombo.Description || "Chưa có mô tả"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={closeDetailModal}
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
