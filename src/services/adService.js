import axiosClient from '../api/axiosClient';

export const adService = {
  /**
   * Lấy quảng cáo từ Revive Ad Server
   */
  async getReviveAd(zoneId, barPageId) {
    try {
      // axiosClient đã có baseURL và token interceptor
      const response = await axiosClient.get('/ads/revive', {
        params: { zoneId, barPageId }
      });
      // axiosClient tự động unwrap response.data
      return response;
    } catch (error) {
      // Suppress 404 errors (ad endpoint may not be available)
      if (error?.response?.status !== 404) {
        console.error('Failed to get Revive ad:', error);
      }
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to load ad' 
      };
    }
  },

  /**
   * Lấy invocation code
   */
  async getReviveInvocationCode(zoneId) {
    try {
      // axiosClient đã có baseURL và token interceptor
      const response = await axiosClient.get('/ads/revive/invocation', {
        params: { zoneId }
      });
      // axiosClient tự động unwrap response.data
      return response;
    } catch (error) {
      // Suppress 404 errors (ad endpoint may not be available)
      if (error?.response?.status !== 404) {
        console.error('Failed to get invocation code:', error);
      }
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to get invocation code' 
      };
    }
  },

  /**
   * Lấy danh sách gói quảng cáo active (cho BarPage chọn)
   */
  async getPackages() {
    try {
      const response = await axiosClient.get('/ads/packages');
      return response;
    } catch (error) {
      console.error('Failed to get packages:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to load packages',
        data: []
      };
    }
  },

  /**
   * Mua gói quảng cáo cho Event
   * @param {Object} purchaseData - { eventId, packageId, price, impressions, packageName }
   */
  async purchasePackage(purchaseData) {
    try {
      const response = await axiosClient.post('/ads/purchase', purchaseData);
      return response;
    } catch (error) {
      console.error('Failed to purchase package:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to purchase package' 
      };
    }
  },

  /**
   * Lấy purchases của một Event (xem tiến trình quảng cáo)
   */
  async getEventPurchases(eventId) {
    try {
      const response = await axiosClient.get(`/ads/event-purchases/${eventId}`);
      return response;
    } catch (error) {
      console.error('Failed to get event purchases:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to load purchases' 
      };
    }
  },

  /**
   * Lấy dashboard stats cho BarPage (từ Revive và DB)
   * @param {string} barPageId - ID của BarPage
   * @param {Object} params - { startDate, endDate } (optional)
   */
  async getBarDashboardStats(barPageId, params = {}) {
    try {
      // Validate barPageId before making request
      if (!barPageId) {
        throw new Error('barPageId is required');
      }
      
      // Validate GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(barPageId)) {
        console.error('[adService] Invalid barPageId format:', barPageId);
        throw new Error(`Invalid barPageId format: ${barPageId}`);
      }
      
      console.log('[adService] Calling /ads/bar-dashboard/' + barPageId);
      const response = await axiosClient.get(`/ads/bar-dashboard/${barPageId}`, { params });
      return response;
    } catch (error) {
      console.error('Failed to get bar dashboard stats:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to load dashboard stats',
        data: null
      };
    }
  },

  /**
   * Tạo yêu cầu tạm dừng quảng cáo
   * @param {Object} requestData - { userAdId, reason, requestNote }
   */
  async createPauseRequest(requestData) {
    try {
      const response = await axiosClient.post('/ads/pause-request', requestData);
      return response;
    } catch (error) {
      console.error('Failed to create pause request:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to create pause request' 
      };
    }
  },

  /**
   * Lấy danh sách yêu cầu pause của BarPage
   */
  async getMyPauseRequests() {
    try {
      const response = await axiosClient.get('/ads/pause-requests');
      return response;
    } catch (error) {
      console.error('Failed to get pause requests:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to load pause requests',
        data: []
      };
    }
  },

  /**
   * Tạo yêu cầu tiếp tục quảng cáo
   * @param {Object} requestData - { userAdId, reason, requestNote }
   */
  async createResumeRequest(requestData) {
    try {
      const response = await axiosClient.post('/ads/resume-request', requestData);
      return response;
    } catch (error) {
      console.error('Failed to create resume request:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to create resume request' 
      };
    }
  },

  /**
   * Lấy danh sách yêu cầu resume của BarPage
   */
  async getMyResumeRequests() {
    try {
      const response = await axiosClient.get('/ads/resume-requests');
      return response;
    } catch (error) {
      console.error('Failed to get resume requests:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Failed to load resume requests',
        data: []
      };
    }
  }
};