import React, { useEffect, useRef, useState } from 'react';
import { adService } from '../../../../services/adService';

function ReviveAdCard({ zoneId = "1", barPageId }) {
  const containerRef = useRef(null);
  const [adHtml, setAdHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load ad via backend API (more reliable than async script)
  useEffect(() => {
    loadAdViaBackend();
  }, [zoneId, barPageId]);

  const loadAdViaBackend = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[ReviveAdCard] Loading ad via backend API for zone ${zoneId}, barPageId: ${barPageId || 'none'}`);
      
      const response = await adService.getReviveAd(zoneId, barPageId);
      
      console.log(`[ReviveAdCard] Response received:`, response);
      console.log(`[ReviveAdCard] Response type:`, typeof response);
      console.log(`[ReviveAdCard] Response keys:`, response ? Object.keys(response) : 'null');
      
      // axiosClient interceptor unwraps response.data, so response is already the API response
      // Expected format: { success: true, data: { html: "...", zoneId: "1", type: "revive" } }
      if (response && response.success === true && response.data && response.data.html) {
        const html = response.data.html;
        setAdHtml(html);
        console.log(`[ReviveAdCard] ✅ Ad loaded successfully (${html.length} chars)`);
      } else {
        // Check if response has direct html property (fallback)
        if (response && response.html) {
          console.log(`[ReviveAdCard] ✅ Ad loaded (using direct html property)`);
          setAdHtml(response.html);
        } else {
          const errorMsg = response?.message || response?.error || 'No ad available';
          console.warn('[ReviveAdCard] ❌ No ad available from backend API:', errorMsg);
          console.warn('[ReviveAdCard] Full response structure:', JSON.stringify(response, null, 2));
          setError(errorMsg);
          setAdHtml(null);
        }
      }
    } catch (error) {
      console.error('[ReviveAdCard] ❌ Exception loading ad:', error);
      console.error('[ReviveAdCard] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      setError(error.message || 'Failed to load ad');
      setAdHtml(null);
    } finally {
      setLoading(false);
    }
  };

  // Render HTML from backend API
  useEffect(() => {
    if (adHtml && containerRef.current) {
      console.log(`[ReviveAdCard] Rendering HTML into container (${adHtml.length} chars)`);
      containerRef.current.innerHTML = adHtml;
      
      // Re-execute scripts if any (for tracking pixels, etc.)
      const scripts = containerRef.current.querySelectorAll('script');
      if (scripts.length > 0) {
        console.log(`[ReviveAdCard] Found ${scripts.length} script(s) to re-execute`);
      }
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

  // Error state
  if (error && !adHtml) {
    // Don't show error to user, just don't display ad
    console.warn('[ReviveAdCard] Error loading ad:', error);
    return null;
  }

  // No ad available
  if (!adHtml) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="bg-white rounded-lg shadow-md overflow-hidden mb-4 revive-ad-wrapper"
      style={{ minHeight: '100px' }}
    />
  );
}

export default ReviveAdCard;