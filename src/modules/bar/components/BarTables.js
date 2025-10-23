import React, { useEffect, useState } from "react";
import barPageApi from "../../../api/barPageApi";
import "../../../styles/modules/barTables.css";

export default function BarTables({ barPageId }) {
  const [tables, setTables] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const totalTables = tables.length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Lấy bàn và loại bàn
        const [resTables, resTypes] = await Promise.all([
          barPageApi.getTablesByBar(barPageId),
          barPageApi.getTableTypes(barPageId)
        ]);

        console.log("API trả về tables:", resTables.data);
        console.log("API trả về table types:", resTypes.data);

        const types = resTypes.data || [];
        setTableTypes(types);

        const tablesData = (resTables.data || []).map((t) => {
          console.log("Processing table:", t);

          // Lấy tableName, nếu DB trống thì dùng mặc định
          const tableName = t.TableName != null ? t.TableName : `Bàn mặc định`;

          // TableTypeName và Color đã có từ API nên không cần map thêm
          return {
            ...t,
            tableName,

            dirty: false
          };
        });

        console.log("Tables sau khi map:", tablesData);

        setTables(tablesData);
        setMessage(tablesData.length ? "" : "Chưa có bàn nào. Nhập số bàn để tạo mới.");
      } catch (err) {
        console.error(err);
        setMessage("Lỗi tải dữ liệu bàn");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [barPageId]);


// Thêm bàn mới
const addTable = () => {
  
  setTables(prev => [
    ...prev,
    {
      BarTableId: null,
      TableName: "",
      tableName: "",
      TableClassificationId: "",
      Color:  "#eee",
      TableTypeName:  "",
      
      dirty: true
    }
  ]);


};

// Lưu tất cả bàn
const saveAllTables = async () => {
  const dirtyTables = tables.filter(t => t.dirty);
  if (!dirtyTables.length) return setMessage("Không có bàn nào cần lưu");

  try {
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
      const type = tableTypes.find(tt => String(tt.TableClassificationId) === String(t.TableClassificationId));
      t.Color = type?.Color || "#eee";
      t.TableTypeName = type?.TableTypeName || "";
      t.tableTypeName = t.TableName; // alias giữ cho input
      t.dirty = false;

      // Cập nhật luôn mảng mới để render lại
      newTables[newTables.findIndex(x => x === t)] = t;
    }

    setTables(newTables);
    setMessage("Đã lưu tất cả bàn thay đổi!");
  } catch (err) {
    console.error(err);
    setMessage("Lỗi khi lưu tất cả bàn!");
  }
};


const updateTable = (index, field, value) => {
  setTables(prev => {
    const newTables = [...prev];
    const table = newTables[index];

    if (field === "tableClassificationId") {
      const type = tableTypes.find(tt => String(tt.TableClassificationId) === String(value));
      newTables[index] = {
        ...table,
        TableClassificationId: value,
        Color: type?.Color || "#eee",
        TableTypeName: type?.TableTypeName || "",
        dirty: true
      };
    } else  if (field === "tableName") {
      newTables[index] = {
        ...table,
        tableName: value,
        TableName: value, // đồng bộ luôn với DB
        dirty: true
      };
    }

    return newTables;
  });
};



  const deleteTable = async (tableId, index) => {
    if (!window.confirm("Bạn có chắc muốn xóa bàn này?")) return;
    try {
      await barPageApi.deleteBarTable(tableId);
      setTables((prev) => prev.filter((_, i) => i !== index));

      setMessage("Xóa bàn thành công!");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi xóa bàn");
    }
  };

  if (loading) return <div>Đang tải bàn...</div>;

  return (
    <div className="bar-tables-container">
      <h3>Quản lý bàn</h3>

      <div className="table-count-selector">
        <label>Số bàn tổng:{totalTables} </label>

      </div>

      {message && <p className="bar-tables-message">{message}</p>}
 

      <div className="tables-grid">
        {tables.map((t, i) => (
          <div
            key={i}
            className="table-box"
            style={{ backgroundColor: t.Color }}
            title={t.TableTypeName}
          >
            <label className="table-number">{t.TableName}</label>

            <input
              className="table-name"
              type="text"
              value={t.tableName} // dùng alias để edit
              onChange={(e) => updateTable(i, "tableName", e.target.value)}
              placeholder="Tên bàn"
            />

            <select
              className="table-select"
              value={t.TableClassificationId || ""}
              onChange={(e) => updateTable(i, "tableClassificationId", e.target.value)}
            >
              <option value="">Chọn loại bàn</option>
              {tableTypes.map((tt) => (
                <option key={tt.TableClassificationId} value={tt.TableClassificationId}>
                  {tt.TableTypeName}
                </option>
              ))}
            </select>

            <div className="table-actions">
              {t.BarTableId && (
                <button onClick={() => deleteTable(t.BarTableId, i)}>Xóa</button>
              )}
            </div>
          </div>
        ))}
      </div>

   <button className="add-table-btn" onClick={addTable}>Thêm bàn</button>
<button className="save-all-btn" onClick={saveAllTables}>Lưu tất cả</button>

    </div>
  );
}
