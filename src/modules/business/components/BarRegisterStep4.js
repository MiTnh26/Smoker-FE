import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import { useAuth } from "../../../hooks/useAuth";
import "../../../styles/modules/barRegisterStep4.css";
export default function BarRegisterStep4({ barPageId, setMessage, setIsLoading }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tableTypes, setTableTypes] = useState([]);
  const [tables, setTables] = useState(new Array(10).fill({ classificationId: "" }));

  useEffect(() => {
    const fetchTypes = async () => {
      const res = await barPageApi.getTableTypes(barPageId);
      setTableTypes(res?.data || []);
    };
    fetchTypes();
  }, [barPageId]);

  const updateTable = (index, classificationId) => {
    const newTables = [...tables];
    newTables[index] = { classificationId };
    setTables(newTables);
  };

  const submitStep4 = async () => {
    setMessage(""); setIsLoading(true);
    try {
      const payload = tables
        .map((t, i) => ({ 
          barPageId, 
          tableName: `Bàn ${i+1}`, 
          tableClassificationId: t.classificationId 
        }))
        .filter(t => t.tableClassificationId); // Only include tables with selected classification
      
      if (payload.length === 0) {
        setMessage("Vui lòng chọn loại bàn cho ít nhất một bàn");
        return;
      }
      
      const res = await barPageApi.createTables(payload);
      if (res?.status === "success") {
        setMessage("Tạo tất cả bàn thành công!");
        
        // Update user role to bar in AuthContext and session
        const currentUser = JSON.parse(localStorage.getItem("user"));
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            role: "bar",
            businessId: barPageId
          };
          // Update AuthContext and localStorage
          login({ user: updatedUser });
          
          // Also update session if it exists
          const currentSession = JSON.parse(localStorage.getItem("session"));
          if (currentSession) {
            const updatedSession = {
              ...currentSession,
              account: {
                ...currentSession.account,
                Role: "bar"
              },
              activeEntity: {
                type: "BarPage",
                id: barPageId
              }
            };
            localStorage.setItem("session", JSON.stringify(updatedSession));
          }
        }
        
        // Navigate to bar profile after successful completion
        // Use a small delay to ensure state updates are processed
        setTimeout(() => {
          window.location.href = `/bar/${barPageId}`;
        }, 1000);
      } else throw new Error(res?.message || "Tạo bàn thất bại");
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || "Lỗi không xác định");
    } finally { setIsLoading(false); }
  };

  return (
    <div>
      <h3>Chọn loại bàn cho 10 ô</h3>
      <div className="tables-grid">
        {tables.map((t, i) => (
          <div key={`table-${i}`} className="table-box">
            <label>Bàn {i + 1}</label>
            <select value={t.classificationId} onChange={e => updateTable(i, e.target.value)}>
              <option value="">Chọn loại bàn</option>
              {tableTypes.map(type => (
                <option key={type.TableClassificationId} value={type.TableClassificationId}>{type.TableTypeName}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button onClick={submitStep4}>Tạo tất cả bàn</button>
    </div>
  );
}
