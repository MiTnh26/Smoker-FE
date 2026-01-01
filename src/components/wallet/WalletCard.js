import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';

export const WalletCard = ({ wallet, onWithdraw }) => {
  const { t } = useTranslation();
  const availableBalance = Math.max(0, (wallet?.balance || 0) - (wallet?.lockedBalance || 0));
  
  return (
    <div className={cn(
      "bg-card rounded-xl p-6 border border-border/20",
      "shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
    )}>
      <div className={cn("flex items-center gap-3 mb-4")}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          "bg-primary/10"
        )}>
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div className={cn("flex-1")}>
          <h3 className={cn("text-sm text-muted-foreground mb-1")}>
            {t('wallet.title') || 'Ví của tôi'}
          </h3>
          <p className={cn("text-2xl font-bold text-foreground")}>
            {Number(wallet?.balance || 0).toLocaleString('vi-VN')} đ
          </p>
        </div>
      </div>
      
      <div className={cn("space-y-2 text-sm")}>
        <div className={cn("flex items-center justify-between")}>
          <span className={cn("text-muted-foreground flex items-center gap-2")}>
            <Lock className="w-4 h-4" />
            {t('wallet.lockedBalance') || 'Đang khóa'}
          </span>
          <span className={cn("text-foreground font-medium")}>
            {Number(wallet?.lockedBalance || 0).toLocaleString('vi-VN')} đ
          </span>
        </div>
        <div className={cn("flex items-center justify-between pt-2 border-t border-border/20")}>
          <span className={cn("text-muted-foreground")}>
            {t('wallet.availableBalance') || 'Khả dụng'}
          </span>
          <span className={cn("text-foreground font-semibold")}>
            {Number(availableBalance).toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>
      
      <button
        onClick={onWithdraw}
        disabled={availableBalance <= 0}
        className={cn(
          "w-full mt-4 px-4 py-2 rounded-lg font-medium",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {t('wallet.withdraw') || 'Rút tiền'}
      </button>
    </div>
  );
};

