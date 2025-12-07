import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import bankInfoApi from "../../../api/bankInfoApi";
import "../../../styles/modules/addBankInfo.css";

export default function AddBankInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  // Parse once to prevent changing object references on each render (avoids effect loops)
  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  }, []);
  const storedSession = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("session")) || {}; } catch { return {}; }
  }, []);

  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    accountId: null,
    barPageId: null,
  });

  const [entityType, setEntityType] = useState("account"); // "account" or "bar"
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [existingBankInfo, setExistingBankInfo] = useState(null);
  const [customBankInput, setCustomBankInput] = useState(false);

  // Danh sách ngân hàng phổ biến ở Việt Nam
  const popularBanks = [
    "Vietcombank (VCB)",
    "VietinBank (CTG)",
    "BIDV (BID)",
    "Techcombank (TCB)",
    "VPBank (VPB)",
    "ACB",
    "Sacombank (STB)",
    "MBBank (MBB)",
    "TPBank (TPB)",
    "SHB",
    "VIB",
    "MSB",
    "HD Bank",
    "SeABank",
    "Eximbank",
    "Agribank",
    "PVcomBank",
    "OceanBank",
    "DongABank",
    "Khác",
  ];

  useEffect(() => {
    // Kiểm tra xem đã có bank info chưa
    const checkExistingBankInfo = async () => {
      try {
        if (entityType === "account" && storedUser?.id) {
          const res = await bankInfoApi.getByAccountId(storedUser.id);
          // Parse response: API có thể trả về { status: "success", data: {...} } hoặc { data: {...} }
          let bankInfo = null;
          if (res?.data) {
            if (res.data.status === "success" && res.data.data) {
              bankInfo = res.data.data;
            } else if (res.data.BankInfoId || res.data.BankName) {
              // res.data chính là bankInfo object
              bankInfo = res.data;
            }
          }
          
          if (bankInfo && (bankInfo.BankInfoId || bankInfo.BankName)) {
            console.log("✅ Found existing bank info for account:", bankInfo);
            setExistingBankInfo(bankInfo);
            setFormData({
              bankName: bankInfo.BankName || "",
              accountNumber: bankInfo.AccountNumber || "",
              accountId: bankInfo.AccountId,
              barPageId: null,
            });
          } else {
            // Không có bank info, reset
            console.log("❌ No bank info found for account");
            setExistingBankInfo(null);
          }
        } else if (entityType === "bar") {
          // Tìm bar page entity trong session
          const barEntity = storedSession.entities?.find(
            (e) => e.type === "BarPage" || e.role?.toLowerCase() === "bar"
          );
          const barId = barEntity?.entityId || barEntity?.id;
          if (barId) {
            const res = await bankInfoApi.getByBarPageId(barId);
            // Parse response tương tự như account
            let bankInfo = null;
            if (res?.data) {
              if (res.data.status === "success" && res.data.data) {
                bankInfo = res.data.data;
              } else if (res.data.BankInfoId || res.data.BankName) {
                bankInfo = res.data;
              }
            }
            
            if (bankInfo && (bankInfo.BankInfoId || bankInfo.BankName)) {
              console.log("✅ Found existing bank info for bar:", bankInfo);
              setExistingBankInfo(bankInfo);
              setFormData({
                bankName: bankInfo.BankName || "",
                accountNumber: bankInfo.AccountNumber || "",
                accountId: null,
                barPageId: bankInfo.BarPageId,
              });
            } else {
              setExistingBankInfo(null);
            }
          }
        }
      } catch (error) {
        // Không tìm thấy bank info là bình thường (404)
        if (error.response?.status === 404) {
          setExistingBankInfo(null);
          console.log("No existing bank info found (404) - this is normal for new users");
        } else {
          console.error("Error checking existing bank info:", error);
          setExistingBankInfo(null);
        }
      }
    };

    checkExistingBankInfo();
  }, [entityType, storedUser, storedSession]);

  // Update formData khi entityType thay đổi
  useEffect(() => {
    if (entityType === "account") {
      setFormData((prev) => ({
        ...prev,
        accountId: storedUser?.id || null,
        barPageId: null,
      }));
    } else if (entityType === "bar") {
      const barEntity = storedSession.entities?.find(
        (e) => e.type === "BarPage" || e.role?.toLowerCase() === "bar"
      );
      setFormData((prev) => ({
        ...prev,
        accountId: null,
        barPageId: barEntity?.entityId || barEntity?.id || null,
      }));
    }
  }, [entityType, storedUser, storedSession]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage(""); // Clear message on input change
  };

  const handleBankNameSelect = (e) => {
    const value = e.target.value;
    setCustomBankInput(value === "Khác");
    setFormData((prev) => ({
      ...prev,
      bankName: value === "Khác" ? "" : value,
    }));
    setMessage("");
  };

  const validateForm = () => {
    if (!formData.bankName || formData.bankName.trim() === "") {
      setMessage("Vui lòng nhập tên ngân hàng");
      return false;
    }

    if (!formData.accountNumber || formData.accountNumber.trim() === "") {
      setMessage("Vui lòng nhập số tài khoản");
      return false;
    }

    // Validate số tài khoản chỉ chứa số
    if (!/^\d+$/.test(formData.accountNumber.trim())) {
      setMessage("Số tài khoản chỉ được chứa số");
      return false;
    }

    if (entityType === "account" && !formData.accountId) {
      setMessage("Không tìm thấy thông tin tài khoản");
      return false;
    }

    if (entityType === "bar" && !formData.barPageId) {
      setMessage("Không tìm thấy thông tin bar page. Vui lòng đăng ký bar trước.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        accountId: entityType === "account" ? formData.accountId : null,
        barPageId: entityType === "bar" ? formData.barPageId : null,
      };

      let res;
      if (existingBankInfo && existingBankInfo.BankInfoId) {
        // Update existing bank info
        res = await bankInfoApi.update(existingBankInfo.BankInfoId, {
          bankName: payload.bankName,
          accountNumber: payload.accountNumber,
        });
      } else {
        // Create new bank info
        try {
          res = await bankInfoApi.create(payload);
        } catch (createError) {
          // Nếu lỗi "đã có thông tin ngân hàng", thử lấy lại và update
          if (createError.response?.status === 400) {
            const errorData = createError.response?.data;
            const errorMessage = errorData?.message || errorData?.error || "";
            const hasExistingInfo = errorMessage.includes("đã có thông tin ngân hàng");
            
            // Kiểm tra xem backend có trả về existingBankInfo không
            const existingFromError = errorData?.existingBankInfo;
            
            if (hasExistingInfo) {
              console.log("Bank info already exists, attempting to update...");
              
              let existing = existingFromError;
              
              // Nếu backend không trả về existingBankInfo, thử fetch lại
              if (!existing || !existing.BankInfoId) {
                try {
                  let existingRes;
                  if (entityType === "account" && formData.accountId) {
                    existingRes = await bankInfoApi.getByAccountId(formData.accountId);
                  } else if (entityType === "bar" && formData.barPageId) {
                    existingRes = await bankInfoApi.getByBarPageId(formData.barPageId);
                  }
                  
                  // Parse response đúng format
                  if (existingRes?.data) {
                    if (existingRes.data.status === "success" && existingRes.data.data) {
                      existing = existingRes.data.data;
                    } else if (existingRes.data.BankInfoId || existingRes.data.BankName) {
                      existing = existingRes.data;
                    }
                  }
                } catch (fetchError) {
                  console.error("Error fetching existing bank info:", fetchError);
                  // Nếu không fetch được, vẫn thử update với existingFromError nếu có
                }
              }
              
              if (existing && existing.BankInfoId) {
                // Update thay vì create
                console.log("Updating existing bank info:", existing.BankInfoId);
                // Cập nhật existingBankInfo state để form hiển thị đúng mode
                setExistingBankInfo(existing);
                res = await bankInfoApi.update(existing.BankInfoId, {
                  bankName: payload.bankName,
                  accountNumber: payload.accountNumber,
                });
                // Sau khi update, reload lại để đảm bảo state sync
                if (res?.status === "success" || res?.data) {
                  const updatedBankInfo = res?.data?.data || res?.data || existing;
                  setExistingBankInfo(updatedBankInfo);
                }
              } else {
                // Nếu không tìm thấy existing, có thể là lỗi thật
                console.error("Cannot find existing bank info to update");
                throw createError;
              }
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }

      if (res?.status === "success" || res?.data) {
        setMessage(
          existingBankInfo
            ? "✅ Cập nhật thông tin ngân hàng thành công!"
            : "✅ Thêm thông tin ngân hàng thành công!"
        );
        
        // Check if there's a returnTo in location state (from review modal redirect)
        const locationState = window.history.state?.usr || {};
        const returnTo = locationState.returnTo;
        
        // Redirect after 1.5 seconds
        setTimeout(() => {
          if (returnTo) {
            navigate(returnTo);
          } else {
            navigate("/own/profile");
          }
        }, 1500);
      } else {
        throw new Error(res?.message || res?.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Bank info error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Có lỗi xảy ra khi thêm thông tin ngân hàng";
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-bank-info-container">
      <div className="add-bank-info-card">
        <h2 className="add-bank-info-title">
          {existingBankInfo ? "Cập nhật thông tin ngân hàng" : "Thêm thông tin ngân hàng"}
        </h2>

        <form onSubmit={handleSubmit} className="add-bank-info-form">
          {/* Entity Type Selector */}
          <div className="form-group">
            <label className="form-label">Loại tài khoản</label>
            <div className="entity-type-selector">
              <button
                type="button"
                className={`entity-type-btn ${entityType === "account" ? "active" : ""}`}
                onClick={() => setEntityType("account")}
              >
                Tài khoản cá nhân
              </button>
              <button
                type="button"
                className={`entity-type-btn ${entityType === "bar" ? "active" : ""}`}
                onClick={() => setEntityType("bar")}
              >
                Tài khoản Bar
              </button>
            </div>
          </div>

          {/* Bank Name */}
          <div className="form-group">
            <label className="form-label">
              Tên ngân hàng <span className="required">*</span>
            </label>
            <select
              name="bankName"
              value={formData.bankName}
              onChange={handleBankNameSelect}
              className="form-select"
              required
            >
              <option value="">-- Chọn ngân hàng --</option>
              {popularBanks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
            {customBankInput && (
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="Nhập tên ngân hàng"
                className="form-input"
                style={{ marginTop: "8px" }}
                required
              />
            )}
          </div>

          {/* Account Number */}
          <div className="form-group">
            <label className="form-label">
              Số tài khoản <span className="required">*</span>
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              placeholder="Nhập số tài khoản (chỉ số)"
              className="form-input"
              required
              maxLength={20}
            />
            <small className="form-hint">Chỉ nhập số, không có khoảng trắng hoặc ký tự đặc biệt</small>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/own/profile")}
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading
                ? "Đang xử lý..."
                : existingBankInfo
                ? "Cập nhật"
                : "Thêm mới"}
            </button>
          </div>

          {message && (
            <div
              className={`message ${message.includes("✅") ? "success" : "error"}`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

