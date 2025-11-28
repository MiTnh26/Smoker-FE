import axios from './axiosClient';

/**
 * Lấy dữ liệu profile tổng hợp cho một entity.
 * @param {string} entityId - ID của entity (user, bar, business) cần lấy dữ liệu.
 * @returns {Promise<object>} - Dữ liệu profile trả về từ API.
 */
export const getProfile = async (entityId) => {
  try {
    const response = await axios.get(`/profile/${entityId}`);
    // Backend trả về { success: true, data: profileData }
    // Axios interceptor trả về response.data, vậy response = { success: true, data: profileData }
    // Extract profileData từ response.data.data hoặc response.data (nếu không có wrapper)
    const profileData = response?.data || response;
    
    // Nếu response có structure { success, data }, lấy data
    if (profileData && typeof profileData === 'object' && 'data' in profileData && 'success' in profileData) {
      return profileData.data;
    }
    
    // Nếu response là profileData trực tiếp
    return profileData;
  } catch (error) {
    console.error(`[API Error] Failed to fetch profile for entity ${entityId}:`, error.response?.data || error.message);
    
    // Extract error message từ response
    const errorData = error.response?.data;
    if (errorData) {
      // Nếu error có message, throw với message đó
      if (errorData.message) {
        throw new Error(errorData.message);
      }
      // Nếu error là object, stringify nó
      if (typeof errorData === 'object') {
        throw new Error(errorData.message || JSON.stringify(errorData));
      }
      throw new Error(errorData);
    }
    
    throw new Error(error.message || 'Failed to fetch profile data');
  }
};

