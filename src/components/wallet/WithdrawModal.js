import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { walletApi } from '../../api/walletApi';
import bankInfoApi from '../../api/bankInfoApi';
import { cn } from '../../utils/cn';

export default function WithdrawModal({ open, onClose, onSuccess, availableBalance, wallet }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [bankInfoId, setBankInfoId] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [error, setError] = useState('');
  
  // PIN states
  const [pin, setPin] = useState('');
  const [showPinForm, setShowPinForm] = useState(false); // Hiển thị form PIN sau khi đã nhập amount và bank
  const [pinError, setPinError] = useState('');
  const [needsSetPin, setNeedsSetPin] = useState(false); // Cần set PIN trước khi rút tiền

  useEffect(() => {
    if (open) {
      loadBankAccounts();
      // Kiểm tra wallet có PIN chưa
      if (wallet && !wallet.hasPin) {
        setNeedsSetPin(true);
      } else {
        setNeedsSetPin(false);
      }
    } else {
      // Reset form when modal closes
      setAmount('');
      setBankInfoId('');
      setPin('');
      setError('');
      setPinError('');
      setShowPinForm(false);
      setNeedsSetPin(false);
    }
  }, [open, wallet]);

  const loadBankAccounts = async () => {
    try {
      setLoadingBanks(true);
      // Get current user's account ID from session or context
      // For now, we'll try to get from userApi
      const { userApi } = await import('../../api/userApi');
      const userRes = await userApi.me();
      
      if (userRes && userRes.status === 'success' && userRes.data) {
        const accountId = userRes.data.id;
        const bankRes = await bankInfoApi.getByAccountId(accountId);
        
        if (bankRes && bankRes.status === 'success' && bankRes.data) {
          // Handle both single object and array
          const banks = Array.isArray(bankRes.data) ? bankRes.data : [bankRes.data];
          setBankAccounts(banks.filter(b => b && b.BankInfoId));
        }
      }
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
      setError('Không thể tải danh sách tài khoản ngân hàng');
    } finally {
      setLoadingBanks(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Chỉ cho phép số
    if (value.length <= 6) {
      setPin(value);
      setPinError('');
    }
  };

  const handleSetPin = async () => {
    if (!pin || pin.length !== 6) {
      setPinError('PIN phải là 6 chữ số');
      return;
    }

    try {
      setLoading(true);
      setPinError('');
      const res = await walletApi.setPin(pin);
      
      if (res && res.status === 'success') {
        setNeedsSetPin(false);
        setPin('');
        // Sau khi set PIN xong, hiển thị form verify PIN
        setShowPinForm(true);
      } else {
        setPinError(res?.message || 'Set PIN thất bại');
      }
    } catch (err) {
      console.error('Set PIN error:', err);
      setPinError(err.response?.data?.message || err.message || 'Set PIN thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!pin || pin.length !== 6) {
      setPinError('PIN phải là 6 chữ số');
      return;
    }

    try {
      setLoading(true);
      setPinError('');
      const res = await walletApi.verifyPin(pin);
      
      if (res && res.status === 'success') {
        // PIN đúng, tiếp tục với withdraw
        await handleWithdraw();
      } else {
        setPinError(res?.message || 'PIN không đúng');
      }
    } catch (err) {
      console.error('Verify PIN error:', err);
      setPinError(err.response?.data?.message || err.message || 'PIN không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPin = () => {
    // Validation amount và bank trước
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return false;
    }

    if (amountNum > availableBalance) {
      setError(`Số tiền không được vượt quá số dư khả dụng (${Number(availableBalance).toLocaleString('vi-VN')} đ)`);
      return false;
    }

    if (!bankInfoId) {
      setError('Vui lòng chọn tài khoản ngân hàng');
      return false;
    }

    // Validation pass, hiển thị form PIN
    setError('');
    setShowPinForm(true);
    return true;
  };

  const handleWithdraw = async () => {
    // Validation
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return;
    }

    if (amountNum > availableBalance) {
      setError(`Số tiền không được vượt quá số dư khả dụng (${Number(availableBalance).toLocaleString('vi-VN')} đ)`);
      return;
    }

    if (!bankInfoId) {
      setError('Vui lòng chọn tài khoản ngân hàng');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await walletApi.createWithdrawRequest(amountNum, bankInfoId, pin);
      
      if (res && res.status === 'success') {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        setError(res?.message || 'Gửi yêu cầu rút tiền thất bại');
      }
    } catch (err) {
      console.error('Withdraw error:', err);
      setError(err.response?.data?.message || err.message || 'Gửi yêu cầu rút tiền thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPinError('');

    // Nếu đang ở form PIN
    if (showPinForm) {
      if (needsSetPin) {
        await handleSetPin();
      } else {
        await handleVerifyPin();
      }
      return;
    }

    // Nếu chưa nhập amount và bank, validate và chuyển sang form PIN
    handleContinueToPin();
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="md">
      <div className={cn("p-6")}>
        <div className={cn("flex items-center justify-between mb-4")}>
          <h2 className={cn("text-xl font-semibold")}>
            {t('wallet.withdraw') || 'Rút tiền'}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              "hover:bg-muted transition-colors"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={cn("space-y-4")}>
          {/* Withdraw Form - Nhập amount và chọn bank trước */}
          {!showPinForm && (
            <>
              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  {t('wallet.amount') || 'Số tiền'} (đ)
                </label>
                <Input
                  type="number"
                  min="1"
                  max={availableBalance}
                  step="1"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Chỉ cho phép số dương
                    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                      setAmount(value);
                      setError('');
                    }
                  }}
                  placeholder="Nhập số tiền muốn rút"
                  disabled={loading}
                />
                <p className={cn("text-xs text-muted-foreground mt-1")}>
                  Số dư khả dụng: {Number(availableBalance).toLocaleString('vi-VN')} đ
                </p>
                
                {/* Mức giá cố định */}
                <div className={cn("mt-3")}>
                  <p className={cn("text-xs text-muted-foreground mb-2")}>
                    Chọn mức giá nhanh:
                  </p>
                  <div className={cn("grid grid-cols-3 gap-2")}>
                    {[10000, 20000, 50000, 100000, 200000, 500000].map((fixedAmount) => {
                      const isDisabled = fixedAmount > availableBalance;
                      const isSelected = amount === String(fixedAmount);
                      return (
                        <button
                          key={fixedAmount}
                          type="button"
                          onClick={() => {
                            if (!isDisabled) {
                              setAmount(String(fixedAmount));
                              setError('');
                            }
                          }}
                          disabled={isDisabled || loading}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            "border border-border/20",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : isDisabled
                              ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                              : "bg-background text-foreground hover:bg-muted hover:border-primary/40"
                          )}
                        >
                          {Number(fixedAmount).toLocaleString('vi-VN')} đ
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2")}>
                  {t('wallet.selectBank') || 'Tài khoản ngân hàng'}
                </label>
                {loadingBanks ? (
                  <div className={cn("text-sm text-muted-foreground py-2")}>
                    Đang tải...
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className={cn("text-sm text-muted-foreground py-2")}>
                    Bạn chưa có tài khoản ngân hàng. Vui lòng thêm tài khoản trước.
                  </div>
                ) : (
                  <select
                    value={bankInfoId}
                    onChange={(e) => {
                      setBankInfoId(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg",
                      "border-[0.5px] border-border/20",
                      "bg-background text-foreground",
                      "outline-none transition-all duration-200",
                      "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                    )}
                  >
                    <option value="">-- Chọn tài khoản --</option>
                    {bankAccounts.map((bank) => (
                      <option key={bank.BankInfoId} value={bank.BankInfoId}>
                        {bank.BankName} - {bank.AccountNumber} ({bank.AccountHolderName || 'N/A'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          {/* PIN Form - Set PIN (nếu chưa có PIN) */}
          {showPinForm && needsSetPin && (
            <div>
              <label className={cn("block text-sm font-medium mb-2")}>
                Thiết lập PIN bảo mật (6 chữ số)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={handlePinChange}
                placeholder="Nhập 6 chữ số"
                disabled={loading}
                className={cn("text-center text-2xl tracking-widest")}
                autoFocus
              />
              <p className={cn("text-xs text-muted-foreground mt-1")}>
                PIN này sẽ được dùng để xác thực khi rút tiền
              </p>
              {pinError && (
                <p className={cn("text-xs text-destructive mt-1")}>
                  {pinError}
                </p>
              )}
            </div>
          )}

          {/* PIN Form - Verify PIN (nếu đã có PIN) */}
          {showPinForm && !needsSetPin && (
            <div>
              <label className={cn("block text-sm font-medium mb-2")}>
                Nhập PIN để xác thực (6 chữ số)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={handlePinChange}
                placeholder="Nhập PIN"
                disabled={loading}
                className={cn("text-center text-2xl tracking-widest")}
                autoFocus
              />
              {wallet?.isLocked && wallet?.lockedUntil && (
                <p className={cn("text-xs text-destructive mt-1")}>
                  Ví đã bị khóa. Vui lòng thử lại sau {Math.ceil((new Date(wallet.lockedUntil) - new Date()) / (1000 * 60))} phút
                </p>
              )}
              {pinError && (
                <p className={cn("text-xs text-destructive mt-1")}>
                  {pinError}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className={cn(
              "p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
            )}>
              {error}
            </div>
          )}

          <div className={cn("flex gap-3 pt-2")}>
            {showPinForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowPinForm(false);
                  setPin('');
                  setPinError('');
                }}
                disabled={loading}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium",
                  "bg-muted text-muted-foreground",
                  "hover:bg-muted/80 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Quay lại
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium",
                  "bg-muted text-muted-foreground",
                  "hover:bg-muted/80 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={
                loading || 
                (showPinForm && needsSetPin && (!pin || pin.length !== 6)) ||
                (showPinForm && !needsSetPin && (!pin || pin.length !== 6)) ||
                (!showPinForm && (!amount || !bankInfoId || bankAccounts.length === 0))
              }
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading 
                ? 'Đang xử lý...' 
                : showPinForm && needsSetPin
                  ? 'Thiết lập PIN'
                  : showPinForm && !needsSetPin
                    ? 'Xác thực PIN'
                    : (t('wallet.confirmWithdraw') || 'Tiếp tục')
              }
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

