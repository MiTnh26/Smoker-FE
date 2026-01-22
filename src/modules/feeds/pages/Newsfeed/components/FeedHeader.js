import { useTranslation } from "react-i18next";
import { Flame, Users, UserCheck } from "lucide-react"; // Import icon

export default function FeedHeader({ activeTab, onTabChange }) {
  const { t } = useTranslation();

  // Hàm helper để render class cho nút Tab
  const getTabClass = (tabName) => {
    const isActive = activeTab === tabName;
    return `
      flex-1 relative py-3 font-medium text-sm sm:text-base 
      flex items-center justify-center gap-2 transition-all duration-300
      ${isActive 
        ? 'text-[rgb(var(--primary))]' 
        : 'text-[rgb(var(--foreground))] opacity-60 hover:opacity-100 hover:bg-[rgba(var(--foreground),0.05)]'
      }
    `;
  };

  return (
    // Thêm sticky và backdrop-blur để header luôn nổi và đẹp khi cuộn
    <header className="sticky top-0 z-20 w-full border-b border-[rgb(var(--border))] bg-[rgba(var(--card),0.85)] backdrop-blur-md transition-all">
      
      <div className="flex w-full px-2">
        {/* Tab Trending */}
        <button
          onClick={() => onTabChange('trending')}
          className={getTabClass('trending')}
        >
          <Flame size={18} className={activeTab === 'trending' ? "fill-current" : ""} />
          <span>{t('feed.trending')}</span>
          
          {/* Active Indicator (Thanh gạch chân riêng biệt để làm hiệu ứng) */}
          {activeTab === 'trending' && (
            <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[rgb(var(--primary))] rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.5)] animate-in fade-in zoom-in duration-300" />
          )}
        </button>

        {/* Tab Following */}
        <button
          onClick={() => onTabChange('following')}
          className={getTabClass('following')}
        >
          <UserCheck size={18} />
          <span>{t('feed.following')}</span>
          {activeTab === 'following' && (
            <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[rgb(var(--primary))] rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.5)] animate-in fade-in zoom-in duration-300" />
          )}
        </button>

        {/* Tab Friends */}
        <button
          onClick={() => onTabChange('friends')}
          className={getTabClass('friends')}
        >
          <Users size={18} />
          <span>{t('feed.friends')}</span>
          {activeTab === 'friends' && (
            <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[rgb(var(--primary))] rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.5)] animate-in fade-in zoom-in duration-300" />
          )}
        </button>
      </div>
    </header>
  );
}