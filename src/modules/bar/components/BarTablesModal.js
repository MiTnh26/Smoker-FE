// src/modules/customer/pages/BarTablesPage.js
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import barTableApi from "../../../api/barTableApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/customer.css";

// Table Icon Component - chỉ hiển thị theo màu loại bàn
const TableIcon = ({ color, className = "" }) => {
  const iconColor = color || "#6B7280";

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

const BarTablesPage = () => {
  const { barId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState(
    searchParams.get('time') || '19:00'
  );
  const [tableTypeFilter, setTableTypeFilter] = useState('all');

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Fetch tables data
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await barTableApi.getTablesByBar(barId);
      const tablesData = res.data?.data || [];
      
      console.log("Tables data:", tablesData);

      setTables(tablesData);
    } catch (err) {
      console.error("Error fetching tables:", err);
      setError("Không tải được danh sách bàn. Vui lòng thử lại sau.");
      addToast("Lỗi tải danh sách bàn", "error");
    } finally {
      setLoading(false);
    }
  }, [barId, addToast]);

  // Apply filters
  useEffect(() => {
    let filtered = tables;

    // Filter by table type
    if (tableTypeFilter !== 'all') {
      filtered = filtered.filter(table => 
        table.TableClassificationId === tableTypeFilter
      );
    }

    setFilteredTables(filtered);
  }, [tables, tableTypeFilter]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDate) params.set('date', selectedDate);
    if (selectedTime) params.set('time', selectedTime);
    setSearchParams(params);
  }, [selectedDate, selectedTime, setSearchParams]);

  // Refetch when component mounts
  useEffect(() => {
    if (barId) {
      fetchTables();
    }
  }, [barId, fetchTables]);

  // Get unique table types for filter
  const tableTypes = [...new Set(tables
    .filter(table => table.TableClassificationId && table.TableTypeName)
    .map(table => ({
      id: table.TableClassificationId,
      name: table.TableTypeName,
      color: table.Color
    }))
  )];

  // Generate time options (10:00 to 22:00)
  const timeOptions = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 10;
    return hour <= 22 ? `${hour.toString().padStart(2, '0')}:00` : null;
  }).filter(Boolean);

  if (loading) {
    return (
      <div className="customer-tables-page">
        <div className="tables-loading">
          <div className="tables-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-tables-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="tables-header">
        <h1 className="page-title">Danh sách bàn</h1>
        <p className="page-subtitle">Chọn bàn và thời gian phù hợp với bạn</p>
      </div>

      {/* Filters Section */}
      <div className="tables-filters">
        <div className="filter-group">
          <label className="filter-label">Ngày</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Giờ</label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="filter-input"
          >
            {timeOptions.map(time => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Loại bàn</label>
          <select
            value={tableTypeFilter}
            onChange={(e) => setTableTypeFilter(e.target.value)}
            className="filter-input"
          >
            <option value="all">Tất cả loại</option>
            {tableTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">&nbsp;</label>
          <Link 
            to={`/customer/bars/${barId}/booking?date=${selectedDate}&time=${selectedTime}`}
            className="booking-link"
          >
            Đặt bàn ngay
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="tables-error">
          <p className="error-text">{error}</p>
          <button onClick={fetchTables} className="retry-btn">
            Thử lại
          </button>
        </div>
      )}

      {/* Tables Grid */}
      <div className="tables-grid">
        <AnimatePresence>
          {filteredTables.map((table) => (
            <motion.div
              key={table.BarTableId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="table-card"
              style={{
                borderLeft: `4px solid ${table.Color || "#ccc"}`,
              }}
            >
              {/* Table Icon */}
              <div className="table-icon-wrapper">
                <TableIcon color={table.Color} />
              </div>

              {/* Table Info */}
              <div className="table-info">
                <h3 className="table-name">{table.TableName}</h3>
                {table.TableTypeName && (
                  <p 
                    className="table-type"
                    style={{ color: table.Color }}
                  >
                    {table.TableTypeName}
                  </p>
                )}
                <p className="table-price">
                  {table.DepositPrice 
                    ? table.DepositPrice.toLocaleString('vi-VN') + ' đ'
                    : 'Miễn phí đặt cọc'
                  }
                </p>
                
                {/* Table Status based on Color */}
                <div className="table-status">
                  <span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: table.Color + '20',
                      color: table.Color,
                      borderColor: table.Color
                    }}
                  >
                    {table.TableTypeName || 'Bàn thường'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="table-actions">
                <Link 
                  to={`/customer/bars/${barId}/booking?date=${selectedDate}&time=${selectedTime}&table=${table.BarTableId}`}
                  className="book-btn"
                  style={{ 
                    backgroundColor: table.Color,
                    borderColor: table.Color
                  }}
                >
                  Đặt bàn
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && filteredTables.length === 0 && (
          <div className="tables-empty-state">
            <div className="empty-icon">🍽️</div>
            <h3>Không tìm thấy bàn phù hợp</h3>
            <p>Hãy thử điều chỉnh bộ lọc hoặc chọn ngày/giờ khác</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && filteredTables.length > 0 && (
        <div className="tables-summary">
          <p>
            Hiển thị <strong>{filteredTables.length}</strong> bàn trong tổng số <strong>{tables.length}</strong> bàn
            {selectedDate && ` vào ngày ${selectedDate}`}
            {selectedTime && ` lúc ${selectedTime}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default BarTablesPage;