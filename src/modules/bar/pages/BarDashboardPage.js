import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import BarAdDashboard from '../components/BarAdDashboard';
import publicProfileApi from '../../../api/publicProfileApi';
import { normalizeProfileData } from '../../../utils/profileDataMapper';

/**
 * Dashboard page cho bar owner
 * Route: /bar/dashboard
 * Tự động resolve barPageId từ session (giống như EventsPage)
 */
export default function BarDashboardPage() {
  const navigate = useNavigate();
  const [barPageId, setBarPageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolveBarPageId = async () => {
      try {
        // Lấy barPageId từ session (giống EventsPage)
        const session = JSON.parse(localStorage.getItem("session") || "{}");
        const activeEntity = session.activeEntity || {};
        const entities = session.entities || [];
        
        console.log('[BarDashboardPage] Session data:', {
          activeEntity,
          entities: entities.length,
          activeEntityId: activeEntity.id,
          activeEntityType: activeEntity.type
        });

        // Tìm entity BarPage từ entities list hoặc activeEntity
        const current = entities.find(e => 
          String(e.id) === String(activeEntity.id) && e.type === "BarPage"
        ) || activeEntity;

        let resolvedBarPageId = null;

        // Nếu activeEntity là BarPage và có id, dùng luôn (id là BarPageId)
        if (current?.type === "BarPage" && current?.id) {
          resolvedBarPageId = current.id;
        }
        // Nếu có EntityAccountId, resolve từ đó
        else if (current?.EntityAccountId || current?.entityAccountId || activeEntity?.EntityAccountId || activeEntity?.entityAccountId) {
          const entityAccountId = current?.EntityAccountId || current?.entityAccountId || activeEntity?.EntityAccountId || activeEntity?.entityAccountId;
          
          console.log('[BarDashboardPage] Resolving from EntityAccountId:', entityAccountId);
          
          try {
            const publicProfileRes = await publicProfileApi.getByEntityId(entityAccountId);
            const publicProfileData = normalizeProfileData(publicProfileRes?.data);
            const rawData = publicProfileRes?.data || {};
            
            // getByEntityId returns targetId which is the BarPageId for BarPage
            resolvedBarPageId = rawData.targetId || 
                               publicProfileData?.BarPageId || 
                               publicProfileData?.barPageId ||
                               publicProfileData?.targetId ||
                               publicProfileData?.id;
            
            console.log('[BarDashboardPage] Resolved from API:', {
              resolvedBarPageId,
              rawDataTargetId: rawData.targetId,
              targetType: rawData.targetType
            });
          } catch (apiErr) {
            console.error('[BarDashboardPage] Error calling getByEntityId:', apiErr);
          }
        }
        // Fallback: thử dùng activeEntity.id nếu nó là GUID
        else if (activeEntity?.id) {
          const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (guidRegex.test(activeEntity.id)) {
            // Kiểm tra xem có phải BarPageId không bằng cách thử resolve
            try {
              const publicProfileRes = await publicProfileApi.getByEntityId(activeEntity.id);
              const rawData = publicProfileRes?.data || {};
              if (rawData.targetType === "BarPage") {
                resolvedBarPageId = rawData.targetId || activeEntity.id;
              }
            } catch (err) {
              console.warn('[BarDashboardPage] Could not verify if id is BarPageId:', err);
            }
          }
        }

        console.log('[BarDashboardPage] Final resolved barPageId:', resolvedBarPageId);

        if (!resolvedBarPageId) {
          setError('Không tìm thấy BarPageId. Vui lòng đảm bảo bạn đã đăng ký BarPage và đang đăng nhập với tài khoản Bar.');
          setLoading(false);
          return;
        }

        // Validate GUID format
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guidRegex.test(resolvedBarPageId)) {
          setError(`BarPageId không hợp lệ: ${resolvedBarPageId}`);
          setLoading(false);
          return;
        }

        setBarPageId(resolvedBarPageId);
        setLoading(false);
      } catch (err) {
        console.error('[BarDashboardPage] Error resolving barPageId:', err);
        setError('Lỗi khi tải thông tin quán bar: ' + (err.message || 'Unknown error'));
        setLoading(false);
      }
    };

    resolveBarPageId();
  }, []);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center min-h-screen')}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center min-h-screen p-6')}>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/bar/newsfeed')}
          className={cn('px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700')}
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  if (!barPageId) {
    return (
      <div className={cn('flex flex-col items-center justify-center min-h-screen p-6')}>
        <p className="text-muted-foreground mb-4">Không tìm thấy thông tin quán bar</p>
        <button
          onClick={() => navigate('/bar/newsfeed')}
          className={cn('px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700')}
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className={cn('bar-dashboard-full w-full px-4 md:px-6 lg:px-8 xl:px-12 py-8')}>
      <BarAdDashboard barPageId={barPageId} />
    </div>
  );
}

