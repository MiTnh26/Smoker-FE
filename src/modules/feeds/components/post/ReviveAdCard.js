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

      // Apply CSS cho ảnh từ Revive - resize để hiển thị toàn bộ ảnh
      const images = containerRef.current.querySelectorAll('img');
      images.forEach(img => {
        // Đặt kích thước tối đa (có thể tùy chỉnh)
        const maxWidth = 500; // Chiều dài tối đa (px)
        const maxHeight = 600; // Chiều rộng tối đa (px)
        
        // Set các style cơ bản
        img.style.maxWidth = `${maxWidth}px`;
        img.style.maxHeight = `${maxHeight}px`;
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain'; // Hiển thị toàn bộ ảnh, không crop
        img.style.display = 'block';
        img.style.borderRadius = '0.5rem';
        img.style.margin = '0 auto'; // Center image
        img.style.padding = '0';
        
        // Resize động khi ảnh load xong
        const resizeImage = () => {
          if (img.naturalWidth && img.naturalHeight) {
            const naturalAspectRatio = img.naturalWidth / img.naturalHeight;
            const maxAspectRatio = maxWidth / maxHeight;
            
            // Tính toán kích thước mới để vừa với max nhưng giữ nguyên tỷ lệ
            let newWidth, newHeight;
            
            if (naturalAspectRatio > maxAspectRatio) {
              // Ảnh ngang hơn -> giới hạn theo width
              newWidth = Math.min(img.naturalWidth, maxWidth);
              newHeight = newWidth / naturalAspectRatio;
            } else {
              // Ảnh dọc hơn -> giới hạn theo height
              newHeight = Math.min(img.naturalHeight, maxHeight);
              newWidth = newHeight * naturalAspectRatio;
            }
            
            // Áp dụng kích thước (chỉ khi nhỏ hơn ảnh gốc)
            if (newWidth < img.naturalWidth || newHeight < img.naturalHeight) {
              img.style.width = `${newWidth}px`;
              img.style.height = `${newHeight}px`;
            }
          }
        };
        
        // Gọi resize khi ảnh load xong
        if (img.complete && img.naturalWidth) {
          resizeImage();
        } else {
          img.addEventListener('load', resizeImage, { once: true });
        }
      });

      // Style links và fix redirect URLs - thay thế localhost bằng production URL
      const links = containerRef.current.querySelectorAll('a');
      
      links.forEach(link => {
        // Style links - đảm bảo khớp với card
        link.style.display = 'block';
        link.style.width = '100%';
        link.style.textDecoration = 'none';
        link.style.borderRadius = '0.5rem';
        link.style.overflow = 'hidden';
        link.style.margin = '0';
        link.style.padding = '0';
        
        // Fix redirect URL: thay thế localhost bằng production URL
        const originalHref = link.getAttribute('href') || link.href;
        if (originalHref && (originalHref.includes('localhost') || originalHref.includes('127.0.0.1'))) {
          try {
            // Parse URL để lấy path, query, hash
            const url = new URL(originalHref);
            const pathAndQuery = url.pathname + (url.search || '') + (url.hash || '');
            
            // Tạo URL mới với production domain
            const newHref = productionUrl + pathAndQuery;
            link.href = newHref;
            link.setAttribute('href', newHref);
            
            console.log(`[ReviveAdCard] Updated redirect URL: ${originalHref} -> ${newHref}`);
          } catch (e) {
            // Nếu không parse được URL, thử replace trực tiếp
            const newHref = originalHref.replace(
              /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi,
              productionUrl
            );
            link.href = newHref;
            link.setAttribute('href', newHref);
            console.log(`[ReviveAdCard] Updated redirect URL (fallback): ${originalHref} -> ${newHref}`);
          }
        }
        
        // Intercept click để đảm bảo redirect đúng (backup method)
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href') || link.href;
          if (href && (href.includes('localhost') || href.includes('127.0.0.1'))) {
            e.preventDefault();
            try {
              const url = new URL(href);
              const pathAndQuery = url.pathname + (url.search || '') + (url.hash || '');
              const newUrl = productionUrl + pathAndQuery;
              console.log(`[ReviveAdCard] Intercepting click: ${href} -> ${newUrl}`);
              window.location.href = newUrl;
            } catch (err) {
              console.error(`[ReviveAdCard] Error processing redirect:`, err);
              // Fallback: use production URL with same path
              const newUrl = productionUrl + (href.startsWith('/') ? href : '/' + href);
              window.location.href = newUrl;
            }
          }
        });
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
          minHeight: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
    </div>
  );
}

export default ReviveAdCard;
