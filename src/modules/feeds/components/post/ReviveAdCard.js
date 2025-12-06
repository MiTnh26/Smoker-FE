import React, { useEffect, useRef, useState } from 'react';
import { adService } from '../../../../services/adService';
import '../../../../styles/modules/feeds/components/post/ReviveAdCard.css';

function ReviveAdCard({ zoneId = "1", barPageId }) {
  const containerRef = useRef(null);
  const [adHtml, setAdHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load ad via backend API
  useEffect(() => {
    loadAdViaBackend();
  }, [zoneId, barPageId]);

  const loadAdViaBackend = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adService.getReviveAd(zoneId, barPageId);
      
      if (response && response.success === true) {
        const html = response.adHtml || response.data?.html || response.html || "";
        setAdHtml(html);
      } else {
        const errorMsg = response?.message || response?.error || 'No ad available';
        setError(errorMsg);
        setAdHtml(null);
      }
    } catch (error) {
      console.error('[ReviveAdCard] Error loading ad:', error);
      setError(error.message || 'Failed to load ad');
      setAdHtml(null);
    } finally {
      setLoading(false);
    }
  };

  // Render HTML từ Revive vào container
  useEffect(() => {
    if (adHtml && containerRef.current) {
      // Production URL để thay thế localhost
      const productionUrl = 'https://smoker-fe-henna.vercel.app';
      
      // Clean HTML: bỏ \n và whitespace không cần thiết
      let cleanHtml = adHtml
        .replace(/\\n/g, '') // Bỏ \n
        .replace(/\n/g, '') // Bỏ newline thực sự
        .replace(/\s+/g, ' ') // Thay nhiều whitespace bằng 1 space
        .trim();
      
      // Thay thế localhost URLs bằng production URL trong HTML
      // Match các pattern: http://localhost:PORT/path hoặc https://localhost:PORT/path
      cleanHtml = cleanHtml.replace(
        /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s"'<>]*)?/gi,
        (match) => {
          // Lấy path từ URL gốc (sau domain và port)
          const urlMatch = match.match(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)?$/i);
          const path = urlMatch && urlMatch[1] ? urlMatch[1] : '';
          // Thay thế với production URL + path
          return productionUrl + path;
        }
      );
      
      // Xóa nội dung cũ
      containerRef.current.innerHTML = '';
      
      // Tạo wrapper để render HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHtml;
      
      // Di chuyển nội dung vào container
      while (tempDiv.firstChild) {
        containerRef.current.appendChild(tempDiv.firstChild);
      }
      
      // Re-execute scripts if any (for tracking pixels, etc.)
      const scripts = containerRef.current.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        }
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      // Apply CSS cho ảnh từ Revive - fill full container với crop
      const images = containerRef.current.querySelectorAll('img');
      images.forEach(img => {
        // Set style để fill full container với object-fit: cover
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover'; // Fill full, crop nếu cần
        img.style.display = 'block';
        img.style.borderRadius = '0.5rem';
        img.style.margin = '0';
        img.style.padding = '0';
      });

      // Style links để fill full container
      const links = containerRef.current.querySelectorAll('a');
      links.forEach(link => {
        // Style links - fill full container
        link.style.display = 'block';
        link.style.width = '100%';
        link.style.height = '100%';
        link.style.textDecoration = 'none';
        link.style.borderRadius = '0.5rem';
        link.style.overflow = 'hidden';
        link.style.margin = '0';
        link.style.padding = '0';
      });
      
      // Ẩn tracking div (beacon) nếu có
      const beacons = containerRef.current.querySelectorAll('[id*="beacon"]');
      beacons.forEach(beacon => {
        beacon.style.display = 'none';
        beacon.style.visibility = 'hidden';
        beacon.style.position = 'absolute';
        beacon.style.width = '0';
        beacon.style.height = '0';
      });
      
      // Sử dụng event delegation để intercept clicks trên toàn bộ container
      // Điều này đảm bảo bắt được cả links được tạo động
      const handleClick = (e) => {
        // Chỉ xử lý clicks trên links
        let target = e.target;
        while (target && target !== containerRef.current) {
          if (target.tagName === 'A') {
            e.preventDefault();
            e.stopPropagation();
            
            let href = target.getAttribute('href') || target.href;
            if (!href) return;
            
            console.log(`[ReviveAdCard] Click intercepted via delegation, href: ${href}`);
            
            try {
              // Kiểm tra nếu đây là Revive click tracking URL
              const isReviveTrackingUrl = href.includes('/delivery/cl.php') || 
                                          href.includes('/delivery/ck.php') || 
                                          href.includes('cl.php') || 
                                          href.includes('ck.php') ||
                                          (href.includes('revive') && href.includes('delivery'));
              
              if (isReviveTrackingUrl) {
                // Extract dest parameter từ URL
                let url;
                try {
                  url = new URL(href);
                } catch (e) {
                  try {
                    url = new URL(href, window.location.origin);
                  } catch (e2) {
                    console.error(`[ReviveAdCard] Cannot parse URL: ${href}`, e2);
                    window.location.href = href;
                    return;
                  }
                }
                
                const destParam = url.searchParams.get('dest');
                
                if (destParam) {
                  // Decode dest URL và redirect trực tiếp
                  const destUrl = decodeURIComponent(destParam);
                  console.log(`[ReviveAdCard] ✅ Extracted dest URL: ${destUrl}`);
                  console.log(`[ReviveAdCard] Redirecting directly (bypassing Revive tracking)`);
                  
                  // Redirect trực tiếp - localStorage tự động được giữ (cùng domain)
                  window.location.href = destUrl;
                  return;
                }
              }
              
              // Nếu không phải Revive tracking, redirect bình thường
              if (href.includes('localhost') || href.includes('127.0.0.1')) {
                const url = new URL(href);
                const pathAndQuery = url.pathname + (url.search || '') + (url.hash || '');
                window.location.href = productionUrl + pathAndQuery;
                return;
              }
              
              // Fallback
              window.location.href = href;
            } catch (error) {
              console.error(`[ReviveAdCard] Error:`, error);
              window.location.href = href;
            }
            return;
          }
          target = target.parentElement;
        }
      };
      
      // Attach event listener với capture phase để intercept sớm
      containerRef.current.addEventListener('click', handleClick, true);
      
      // Cleanup function
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('click', handleClick, true);
        }
      };
    }
  }, [adHtml]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 mb-4 flex items-center justify-center" style={{ minHeight: '100px' }}>
        <p className="text-sm text-gray-500">Loading ad...</p>
      </div>
    );
  }

  // Error state - không hiển thị lỗi, chỉ không show ad
  if (error || !adHtml) {
    return null;
  }

  // Render HTML từ Revive
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 revive-ad-wrapper">
      <div 
        ref={containerRef}
        className="w-full overflow-hidden rounded-lg"
        style={{ 
          width: '100%',
          aspectRatio: '16 / 9', // Tỷ lệ 16:9 - có thể thay đổi thành 4/3, 1/1, etc
          position: 'relative',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}

export default ReviveAdCard;
