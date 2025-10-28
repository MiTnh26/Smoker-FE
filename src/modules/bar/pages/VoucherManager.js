import React, { useEffect, useState } from "react";
import voucherApi from "../../../api/voucherApi";
import "../../../styles/modules/barTables.css";
import { useParams } from "react-router-dom";

export default function VoucherManager() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { barPageId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await voucherApi.getVouchers(barPageId);
        console.log("dddddata", res.data);
        setVouchers(res.data || []);
      } catch (err) {
        console.error(err);
        setMessage("Lỗi tải voucher");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [barPageId]);

  const addVoucher = () => {
    setVouchers(prev => [
      ...prev,
      { VoucherId: null, VoucherName: "", Discount: 0, dirty: true }
    ]);
  };

  const updateVoucher = (index, field, value) => {
    setVouchers(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value, dirty: true };
      return newList;
    });
  };

  const saveAll = async () => {
    const dirty = vouchers.filter(v => v.dirty);
    if (!dirty.length) return setMessage("Không có thay đổi cần lưu");

    try {
      for (let v of dirty) {
        const payload = {
          barId: barPageId,
          voucherName: v.VoucherName,
          discountPercentage: Number(v.DiscountPercentage),
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        };


        if (v.VoucherId) {
          await voucherApi.updateVoucher(v.VoucherId, payload);
        } else {
          await voucherApi.createVoucher(payload);
        }
        v.dirty = false;
      }
      setMessage("Đã lưu thành công!");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi lưu voucher");
    }
  };


  const deleteVoucher = async (id, index) => {
    if (!window.confirm("Xóa voucher này?")) return;
    try {
      await voucherApi.deleteVoucher(id);
      setVouchers(prev => prev.filter((_, i) => i !== index));
      setMessage("Đã xóa voucher");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi xóa voucher");
    }
  };

  if (loading) return <div>Đang tải voucher...</div>;

  return (
    <div className="bar-tables-container">
      <h3>Quản lý Voucher</h3>
      {message && <p className="bar-tables-message">{message}</p>}

      <div className="tables-grid">
        {vouchers.map((v, i) => (
          <div key={i} className="table-box">
            <input
              type="text"
              value={v.VoucherName}
              placeholder="Tên voucher"
              onChange={(e) => updateVoucher(i, "VoucherName", e.target.value)}
            />
            <input
              type="number"
              value={v.DiscountPercentage || 0}
              placeholder="% giảm giá"
              onChange={(e) => updateVoucher(i, "DiscountPercentage", e.target.value)}
            />

            {v.VoucherId && (
              <button onClick={() => deleteVoucher(v.VoucherId, i)}>Xóa</button>
            )}
          </div>
        ))}
      </div>

      <button className="add-table-btn" onClick={addVoucher}>Thêm Voucher</button>
      <button className="save-all-btn" onClick={saveAll}>Lưu tất cả</button>
    </div>
  );
}
