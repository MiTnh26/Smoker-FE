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
  }
};