import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { adService } from '../../../services/adService';
import { 
  TrendingUp, TrendingDown, Eye, MousePointerClick, DollarSign, 
  Package, Activity, Loader2, AlertCircle, Calendar, BarChart3, RefreshCw, Pause, X, Play
} from 'lucide-react';

export default function BarAdDashboard({ barPageId }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState('all'); // 'all', '7days', '30days', 'custom'
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseNote, setPauseNote] = useState('');
  const [resumeReason, setResumeReason] = useState('');
  const [resumeNote, setResumeNote] = useState('');
  const [submittingPause, setSubmittingPause] = useState(false);
  const [submittingResume, setSubmittingResume] = useState(false);

  useEffect(() => {
    console.log('[BarAdDashboard] useEffect triggered with barPageId:', barPageId, {
      type: typeof barPageId,
      isNull: barPageId === null,
      isUndefined: barPageId === undefined,
      isEmpty: barPageId === '',
      value: barPageId
    });
    
    if (!barPageId || barPageId === 'undefined' || barPageId === 'null' || barPageId === 'dashboard') {
      console.warn('[BarAdDashboard] barPageId is missing or invalid:', barPageId);
      setLoading(false);
      setError('BarPageId không hợp lệ');
      return;
    }
    
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(barPageId)) {
      console.error('[BarAdDashboard] Invalid GUID format:', barPageId);
      setLoading(false);
      setError(`BarPageId không đúng định dạng GUID: ${barPageId}`);
      return;
    }
    
    loadDashboardStats();
    
    // Auto-refresh mỗi 30 giây để cập nhật data từ sync
    const refreshInterval = setInterval(() => {
      console.log('[BarAdDashboard] Auto-refreshing stats...');
      loadDashboardStats();
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barPageId, selectedDateRange]);

  const loadDashboardStats = async (isManualRefresh = false) => {
    if (!barPageId) {
      setError('BarPageId không hợp lệ');
      setLoading(false);
      return;
    }
    
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('[BarAdDashboard] Loading stats for barPageId:', barPageId);

      // Calculate date range
      let params = {};
      if (selectedDateRange === '7days') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        params.startDate = date.toISOString().split('T')[0];
      } else if (selectedDateRange === '30days') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        params.startDate = date.toISOString().split('T')[0];
      }

      const response = await adService.getBarDashboardStats(barPageId, params);
      
      console.log('[BarAdDashboard] Response:', response);
      console.log('[BarAdDashboard] Stats data:', response.data);
      
      if (response.success && response.data) {
        setStats(response.data);
        setLastUpdated(new Date());
        
        // Log stats để debug
        if (response.data.overview) {
          console.log('[BarAdDashboard] Overview stats:', {
            TotalImpressions: response.data.overview.TotalImpressions,
            TotalClicks: response.data.overview.TotalClicks,
            TotalSpent: response.data.overview.TotalSpent,
            CTR: response.data.overview.CTR
          });
        }
        
        if (response.data.ads && response.data.ads.length > 0) {
          console.log('[BarAdDashboard] Ads stats:', response.data.ads.map(ad => ({
            title: ad.title,
            impressions: ad.impressions,
            clicks: ad.clicks,
            spent: ad.spent
          })));
        }
      } else {
        setError(response.message || 'Không thể tải thống kê');
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardStats(true);
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12')}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Đang tải thống kê...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center py-12 bg-red-50 rounded-lg border border-red-200')}>
        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
        <span className="text-red-800">{error}</span>
      </div>
    );
  }

  if (!stats || !stats.overview) {
    return (
      <div className={cn('text-center py-12 text-muted-foreground')}>
        Chưa có dữ liệu thống kê
      </div>
    );
  }

  const { overview, ads = [] } = stats;

  return (
    <div className={cn('w-full space-y-8')}>
      {/* Header với Date Range Selector */}
      <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2')}>
        <h2 className={cn('text-3xl font-bold text-foreground flex items-center gap-3')}>
          <BarChart3 className="w-7 h-7 text-primary" />
          Thống kê quảng cáo
        </h2>
        <div className={cn('flex items-center gap-3')}>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border',
              'bg-background text-foreground text-sm font-medium',
              'hover:bg-muted transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              refreshing && 'animate-spin'
            )}
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          {lastUpdated && (
            <span className={cn('text-xs text-muted-foreground hidden sm:block')}>
              Cập nhật: {new Date(lastUpdated).toLocaleTimeString('vi-VN')}
            </span>
          )}
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className={cn(
              'px-4 py-2.5 rounded-lg border border-border',
              'bg-background text-foreground text-sm font-medium',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'hover:border-primary/50 transition-colors'
            )}
          >
            <option value="all">Tất cả</option>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
          </select>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6')}>
        {/* Total Impressions */}
        <StatCard
          icon={Eye}
          title="Lượt hiển thị"
          value={formatNumber(overview.TotalImpressions)}
          trend={null}
          color="blue"
        />

        {/* Total Clicks */}
        <StatCard
          icon={MousePointerClick}
          title="Lượt click"
          value={formatNumber(overview.TotalClicks)}
          trend={null}
          color="green"
        />

        {/* CTR */}
        <StatCard
          icon={TrendingUp}
          title="CTR"
          value={`${overview.CTR || 0}%`}
          trend={null}
          color="purple"
        />

        {/* Total Spent */}
        <StatCard
          icon={DollarSign}
          title="Tổng chi tiêu"
          value={formatPrice(overview.TotalSpent)}
          trend={null}
          color="orange"
        />
      </div>

      {/* Additional Stats Row */}
      <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
        <div className={cn('bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow')}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn('p-2.5 rounded-lg bg-indigo-50 border border-indigo-200')}>
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Tổng quảng cáo</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatNumber(overview.TotalAds)}</p>
        </div>

        <div className={cn('bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow')}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn('p-2.5 rounded-lg bg-green-50 border border-green-200')}>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Đang hoạt động</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{formatNumber(overview.ActiveAds)}</p>
        </div>

        <div className={cn('bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow')}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn('p-2.5 rounded-lg bg-blue-50 border border-blue-200')}>
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Còn lại</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{formatNumber(overview.RemainingImpressions)}</p>
        </div>
      </div>

      {/* Ads List Table */}
      {ads && ads.length > 0 && (
        <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden')}>
          <div className={cn('p-6 border-b border-border bg-muted/30')}>
            <h3 className={cn('text-xl font-semibold text-foreground')}>Chi tiết quảng cáo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={cn('bg-muted/50')}>
                <tr>
                  <th className={cn('px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider')}>Quảng cáo</th>
                  <th className={cn('px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider')}>Trạng thái</th>
                  <th className={cn('px-6 py-4 text-right text-sm font-semibold text-muted-foreground uppercase tracking-wider')}>Hiển thị</th>
                  <th className={cn('px-6 py-4 text-right text-sm font-semibold text-muted-foreground uppercase tracking-wider')}>Click</th>
                  <th className={cn('px-6 py-4 text-right text-sm font-semibold text-muted-foreground uppercase tracking-wider')}>CTR</th>
                  <th className={cn('px-6 py-4 text-right text-sm font-semibold text-muted-foreground uppercase tracking-wider')}>Chi tiêu</th>
                  <th className={cn('px-6 py-4 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider')}>Thao tác</th>
                </tr>
              </thead>
              <tbody className={cn('divide-y divide-border')}>
                {ads.map((ad) => (
                  <tr key={ad.userAdId} className={cn('hover:bg-muted/40 transition-colors')}>
                    <td className={cn('px-6 py-4')}>
                      <div className="flex items-center gap-4">
                        {ad.imageUrl && (
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-14 h-14 rounded-lg object-cover border border-border"
                          />
                        )}
                        <div>
                          <p className={cn('text-sm font-semibold text-foreground mb-1')}>{ad.title}</p>
                          {ad.packageName && (
                            <p className={cn('text-xs text-muted-foreground')}>{ad.packageName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={cn('px-6 py-4')}>
                      <StatusBadge status={ad.status} />
                    </td>
                    <td className={cn('px-6 py-4 text-right text-sm font-medium text-foreground')}>
                      {formatNumber(ad.impressions)}
                    </td>
                    <td className={cn('px-6 py-4 text-right text-sm font-medium text-foreground')}>
                      {formatNumber(ad.clicks)}
                    </td>
                    <td className={cn('px-6 py-4 text-right text-sm font-medium text-foreground')}>
                      {ad.ctr ? `${ad.ctr.toFixed(2)}%` : '0%'}
                    </td>
                    <td className={cn('px-6 py-4 text-right text-sm font-medium text-foreground')}>
                      {formatPrice(ad.spent)}
                    </td>
                    <td className={cn('px-6 py-4 text-center')}>
                      {ad.status === 'active' && (
                        <button
                          onClick={() => {
                            setSelectedAd(ad);
                            setPauseModalOpen(true);
                          }}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
                            'bg-yellow-50 text-yellow-700 border border-yellow-200',
                            'hover:bg-yellow-100 transition-colors'
                          )}
                          title="Yêu cầu tạm dừng quảng cáo"
                        >
                          <Pause className="w-4 h-4" />
                          <span className="hidden sm:inline">Tạm dừng</span>
                        </button>
                      )}
                      {ad.status === 'paused' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedAd(ad);
                              setResumeModalOpen(true);
                            }}
                            className={cn(
                              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
                              'bg-green-50 text-green-700 border border-green-200',
                              'hover:bg-green-100 transition-colors'
                            )}
                            title="Yêu cầu tiếp tục quảng cáo"
                          >
                            <Play className="w-4 h-4" />
                            <span className="hidden sm:inline">Tiếp tục</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!ads || ads.length === 0) && (
        <div className={cn('text-center py-16 text-muted-foreground bg-card rounded-xl border border-border shadow-sm')}>
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-base">Chưa có quảng cáo nào</p>
        </div>
      )}

      {/* Pause Request Modal */}
      {pauseModalOpen && selectedAd && (
        <div className={cn('fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4')}>
          <div className={cn('bg-background rounded-xl shadow-xl max-w-md w-full p-6')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('text-xl font-semibold text-foreground')}>Yêu cầu tạm dừng quảng cáo</h3>
              <button
                onClick={() => {
                  setPauseModalOpen(false);
                  setSelectedAd(null);
                  setPauseReason('');
                  setPauseNote('');
                }}
                className={cn('p-1 hover:bg-muted rounded transition-colors')}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className={cn('text-sm text-muted-foreground mb-2')}>Quảng cáo:</p>
              <p className={cn('text-base font-medium text-foreground')}>{selectedAd.title}</p>
            </div>

            <div className="mb-4">
              <label className={cn('block text-sm font-medium text-foreground mb-2')}>
                Lý do tạm dừng <span className="text-red-500">*</span>
              </label>
              <select
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border',
                  'bg-background text-foreground text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary'
                )}
              >
                <option value="">Chọn lý do...</option>
                <option value="temporary_pause">Tạm dừng tạm thời</option>
                <option value="content_update">Cập nhật nội dung</option>
                <option value="budget_exhausted">Hết ngân sách</option>
                <option value="campaign_end">Kết thúc chiến dịch</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="mb-6">
              <label className={cn('block text-sm font-medium text-foreground mb-2')}>
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={pauseNote}
                onChange={(e) => setPauseNote(e.target.value)}
                rows={3}
                placeholder="Nhập ghi chú nếu có..."
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border',
                  'bg-background text-foreground text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary',
                  'resize-none'
                )}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setPauseModalOpen(false);
                  setSelectedAd(null);
                  setPauseReason('');
                  setPauseNote('');
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-muted text-foreground hover:bg-muted/80 transition-colors'
                )}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!pauseReason) {
                    alert('Vui lòng chọn lý do tạm dừng');
                    return;
                  }
                  
                  setSubmittingPause(true);
                  try {
                    const response = await adService.createPauseRequest({
                      userAdId: selectedAd.userAdId,
                      reason: pauseReason,
                      requestNote: pauseNote
                    });
                    
                    if (response.success) {
                      alert('Yêu cầu tạm dừng đã được gửi thành công!');
                      setPauseModalOpen(false);
                      setSelectedAd(null);
                      setPauseReason('');
                      setPauseNote('');
                      // Refresh stats
                      loadDashboardStats(true);
                    } else {
                      alert(response.message || 'Gửi yêu cầu thất bại');
                    }
                  } catch (error) {
                    console.error('Error creating pause request:', error);
                    alert('Có lỗi xảy ra khi gửi yêu cầu');
                  } finally {
                    setSubmittingPause(false);
                  }
                }}
                disabled={submittingPause || !pauseReason}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-yellow-600 text-white hover:bg-yellow-700 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {submittingPause ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Gửi yêu cầu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Request Modal */}
      {resumeModalOpen && selectedAd && (
        <div className={cn('fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4')}>
          <div className={cn('bg-background rounded-xl shadow-xl max-w-md w-full p-6')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('text-xl font-semibold text-foreground')}>Yêu cầu tiếp tục quảng cáo</h3>
              <button
                onClick={() => {
                  setResumeModalOpen(false);
                  setSelectedAd(null);
                  setResumeReason('');
                  setResumeNote('');
                }}
                className={cn('p-1 hover:bg-muted rounded transition-colors')}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className={cn('text-sm text-muted-foreground mb-2')}>Quảng cáo:</p>
              <p className={cn('text-base font-medium text-foreground')}>{selectedAd.title}</p>
            </div>

            <div className="mb-4">
              <label className={cn('block text-sm font-medium text-foreground mb-2')}>
                Lý do tiếp tục <span className="text-red-500">*</span>
              </label>
              <select
                value={resumeReason}
                onChange={(e) => setResumeReason(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border',
                  'bg-background text-foreground text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary'
                )}
              >
                <option value="">Chọn lý do...</option>
                <option value="ready_to_resume">Sẵn sàng tiếp tục</option>
                <option value="content_updated">Đã cập nhật nội dung</option>
                <option value="budget_added">Đã bổ sung ngân sách</option>
                <option value="campaign_renewed">Gia hạn chiến dịch</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="mb-6">
              <label className={cn('block text-sm font-medium text-foreground mb-2')}>
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={resumeNote}
                onChange={(e) => setResumeNote(e.target.value)}
                rows={3}
                placeholder="Nhập ghi chú nếu có..."
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border',
                  'bg-background text-foreground text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary',
                  'resize-none'
                )}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setResumeModalOpen(false);
                  setSelectedAd(null);
                  setResumeReason('');
                  setResumeNote('');
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-muted text-foreground hover:bg-muted/80 transition-colors'
                )}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!resumeReason) {
                    alert('Vui lòng chọn lý do tiếp tục');
                    return;
                  }
                  
                  setSubmittingResume(true);
                  try {
                    const response = await adService.createResumeRequest({
                      userAdId: selectedAd.userAdId,
                      reason: resumeReason,
                      requestNote: resumeNote
                    });
                    
                    if (response.success) {
                      alert('Yêu cầu tiếp tục đã được gửi thành công!');
                      setResumeModalOpen(false);
                      setSelectedAd(null);
                      setResumeReason('');
                      setResumeNote('');
                      // Refresh stats
                      loadDashboardStats(true);
                    } else {
                      alert(response.message || 'Gửi yêu cầu thất bại');
                    }
                  } catch (error) {
                    console.error('Error creating resume request:', error);
                    alert('Có lỗi xảy ra khi gửi yêu cầu');
                  } finally {
                    setSubmittingResume(false);
                  }
                }}
                disabled={submittingResume || !resumeReason}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-green-600 text-white hover:bg-green-700 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {submittingResume ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Gửi yêu cầu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, trend, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className={cn('bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-200')}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn('p-3 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== null && (
          <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full', trend > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50')}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className={cn('text-3xl font-bold text-foreground mb-2')}>{value}</p>
      <p className={cn('text-sm font-medium text-muted-foreground')}>{title}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    active: { label: 'Hoạt động', color: 'bg-green-100 text-green-700 border-green-300' },
    pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700 border-red-300' },
    completed: { label: 'Hoàn thành', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;

  return (
    <span className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border', config.color)}>
      {config.label}
    </span>
  );
}

