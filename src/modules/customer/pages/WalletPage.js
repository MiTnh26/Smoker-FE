import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WalletCard } from '../../../components/wallet/WalletCard';
import WithdrawModal from '../../../components/wallet/WithdrawModal';
import { walletApi } from '../../../api/walletApi';
import { cn } from '../../../utils/cn';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function WalletPage() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  useEffect(() => {
    loadWallet();
    loadTransactions();
    loadWithdrawRequests();
  }, []);
  
  const loadWallet = async () => {
    try {
      const res = await walletApi.getWallet();
      if (res && res.status === 'success') {
        setWallet(res.data);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadTransactions = async () => {
    try {
      const res = await walletApi.getTransactions({ limit: 50 });
      if (res && res.status === 'success') {
        setTransactions(res.data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };
  
  const loadWithdrawRequests = async () => {
    try {
      const res = await walletApi.getWithdrawRequests();
      if (res && res.status === 'success') {
        setWithdrawRequests(res.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to load withdraw requests:', error);
    }
  };
  
  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false);
    loadWallet();
    loadTransactions();
    loadWithdrawRequests();
  };

  const getTransactionTypeLabel = (type) => {
    const typeMap = {
      'booking_income': t('wallet.transactionTypes.booking_income') || 'Tiền nhận từ booking',
      'refund': t('wallet.transactionTypes.refund') || 'Hoàn tiền',
      'withdraw': t('wallet.transactionTypes.withdraw') || 'Rút tiền',
      'withdraw_reject': t('wallet.transactionTypes.withdraw_reject') || 'Yêu cầu rút bị từ chối',
      'system_adjust': t('wallet.transactionTypes.system_adjust') || 'Điều chỉnh hệ thống'
    };
    return typeMap[type] || type;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': t('wallet.status.pending') || 'Đang chờ',
      'approved': t('wallet.status.approved') || 'Đã duyệt',
      'rejected': t('wallet.status.rejected') || 'Đã từ chối',
      'paid': t('wallet.status.paid') || 'Đã chuyển tiền',
      'completed': t('wallet.status.completed') || 'Hoàn thành'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // SQL Server trả về datetime string dạng 'YYYY-MM-DD HH:mm:ss.mmm'
    // Database đã lưu đúng giờ Việt Nam (GMT+7), cần parse thủ công để không bị convert timezone
    if (typeof dateString === 'string') {
      // Kiểm tra format datetime từ SQL Server
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        // Tạo date object với timezone local (không dùng timeZone option để tránh double conversion)
        const localDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second || 0)
        );
        // Format không dùng timeZone để giữ nguyên giờ đã parse
        return localDate.toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    // Fallback: parse như bình thường
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-background")}>
        <div className={cn("text-muted-foreground")}>
          {t('common.loading') || 'Đang tải...'}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("min-h-screen bg-background py-6")}>
      <div className={cn("max-w-4xl mx-auto px-4")}>
        <h1 className={cn("text-2xl font-bold mb-6")}>
          {t('wallet.title') || 'Ví của tôi'}
        </h1>
        
        <WalletCard
          wallet={wallet}
          onWithdraw={() => setShowWithdrawModal(true)}
        />
        
        {/* PIN Status */}
        {wallet && (
          <div className={cn("mt-6 bg-card rounded-xl p-6 border border-border/20")}>
            <h3 className={cn("text-lg font-semibold mb-4")}>
              Bảo mật ví
            </h3>
            <div className={cn("space-y-3")}>
              <div className={cn("flex items-center justify-between")}>
                <span className={cn("text-sm")}>
                  Trạng thái PIN:
                </span>
                <span className={cn("font-medium", wallet.hasPin ? "text-green-500" : "text-yellow-500")}>
                  {wallet.hasPin ? "Đã thiết lập" : "Chưa thiết lập"}
                </span>
              </div>
              {wallet.isLocked && wallet.lockedUntil && (
                <div className={cn("p-3 rounded-lg bg-destructive/10 text-destructive text-sm")}>
                  ⚠️ Ví đã bị khóa. Vui lòng thử lại sau {Math.ceil((new Date(wallet.lockedUntil) - new Date()) / (1000 * 60))} phút
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Withdraw Requests */}
        {withdrawRequests.length > 0 && (
          <div className={cn("mt-6 bg-card rounded-xl p-6 border border-border/20")}>
            <h3 className={cn("text-lg font-semibold mb-4")}>
              {t('wallet.withdrawRequests') || 'Yêu cầu rút tiền'}
            </h3>
            <div className={cn("space-y-3")}>
              {withdrawRequests.map((request) => (
                <div
                  key={request.id}
                  className={cn(
                    "p-4 rounded-lg border border-border/20",
                    "flex items-center justify-between"
                  )}
                >
                  <div className={cn("flex-1")}>
                    <div className={cn("flex items-center gap-2 mb-1")}>
                      <span className={cn("font-medium")}>
                        {Number(request.amount).toLocaleString('vi-VN')} đ
                      </span>
                      {getStatusIcon(request.status)}
                    </div>
                    <div className={cn("text-sm text-muted-foreground")}>
                      {request.bankName} - {request.accountNumber}
                      {request.accountHolderName && ` (${request.accountHolderName})`}
                    </div>
                    <div className={cn("text-xs text-muted-foreground mt-1")}>
                      {formatDate(request.requestedAt)}
                    </div>
                  </div>
                  <div className={cn("text-sm font-medium")}>
                    {getStatusLabel(request.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Transaction History */}
        <div className={cn("mt-6 bg-card rounded-xl p-6 border border-border/20")}>
          <h3 className={cn("text-lg font-semibold mb-4")}>
            {t('wallet.transactionHistory') || 'Lịch sử giao dịch'}
          </h3>
          {transactions.length === 0 ? (
            <div className={cn("text-center py-8 text-muted-foreground")}>
              {t('wallet.noTransactions') || 'Chưa có giao dịch nào'}
            </div>
          ) : (
            <div className={cn("space-y-3")}>
              {transactions.map((transaction) => {
                const isIncome = transaction.type === 'booking_income' || transaction.type === 'refund' || transaction.type === 'withdraw_reject';
                // Kiểm tra xem có phải "Rút tiền thành công" không
                const isWithdrawSuccess = transaction.type === 'withdraw' && 
                  (transaction.status === 'completed' || 
                   transaction.description?.toLowerCase().includes('thành công') ||
                   transaction.description?.toLowerCase().includes('success'));
                
                return (
                  <div
                    key={transaction.id}
                    className={cn(
                      "p-4 rounded-lg border border-border/20",
                      "flex items-center justify-between",
                      // Thêm nền xanh pastel cho rút tiền thành công
                      isWithdrawSuccess && "bg-green-50 dark:bg-green-950/20"
                    )}
                  >
                    <div className={cn("flex items-center gap-3 flex-1")}>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        // Rút tiền thành công: nền xanh, icon dấu tích xanh
                        isWithdrawSuccess 
                          ? "bg-green-500/10" 
                          : isIncome 
                          ? "bg-green-500/10" 
                          : "bg-red-500/10"
                      )}>
                        {isWithdrawSuccess ? (
                          // Rút tiền thành công: dấu tích màu xanh
                          <CheckCircle className={cn("w-5 h-5 text-green-500")} />
                        ) : isIncome ? (
                          <ArrowDownRight className={cn("w-5 h-5 text-green-500")} />
                        ) : (
                          <ArrowUpRight className={cn("w-5 h-5 text-red-500")} />
                        )}
                      </div>
                      <div className={cn("flex-1")}>
                        <div className={cn("font-medium mb-1")}>
                          {getTransactionTypeLabel(transaction.type)}
                        </div>
                        {transaction.description && (
                          <div className={cn("text-sm text-muted-foreground")}>
                            {transaction.description}
                          </div>
                        )}
                        <div className={cn("text-xs text-muted-foreground mt-1")}>
                          {formatDate(transaction.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className={cn("text-right")}>
                      <div className={cn(
                        "font-semibold",
                        isIncome ? "text-green-500" : "text-red-500"
                      )}>
                        {isIncome ? '+' : '-'}{Number(transaction.amount).toLocaleString('vi-VN')} đ
                      </div>
                      <div className={cn("text-xs text-muted-foreground mt-1")}>
                        Số dư: {Number(transaction.balanceAfter).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {showWithdrawModal && (
        <WithdrawModal
          open={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={handleWithdrawSuccess}
          availableBalance={Math.max(0, (wallet?.balance || 0) - (wallet?.lockedBalance || 0))}
          wallet={wallet}
        />
      )}
    </div>
  );
}

