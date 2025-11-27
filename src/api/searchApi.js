import axiosClient from "./axiosClient";

const normalize = (arr) =>
  (arr || []).map(item => ({
    // Sử dụng EntityAccountId làm id chính để điều hướng và định danh
    id: item.EntityAccountId || item.id || item.AccountId,
    name: item.name || item.BarName || item.userName || item.email || "Unknown",
    avatar: item.avatar || item.Avatar || null,
    // Giữ nguyên `type` từ backend ('Account', 'DJ', 'DANCER', 'BarPage')
    type: item.type,
    raw: item
  }));

const searchApi = {
  async searchAll(q, limit = 5) {
    const emptyResult = { users: [], djs: [], dancers: [], bars: [], posts: [] };
    if (!q || !String(q).trim()) {
      console.log('[Search API] Empty query, returning empty result');
      return emptyResult;
    }
    try {
      const query = String(q).trim();
      console.log('[Search API] Searching with query:', query, 'limit:', limit);
      const response = await axiosClient.get(`/search/all`, { params: { q: query, limit } });
      console.log('[Search API] Response received:', {
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : [],
        hasData: !!response?.data,
        hasDataData: !!response?.data?.data,
        success: response?.data?.success,
        fullResponse: response
      });
      
      // Axios interceptor trả về response.data, vậy response = { success: true, data: {...} }
      // Hoặc response = data trực tiếp nếu không có wrapper
      const data = response?.data || response || {};
      console.log('[Search API] Extracted data:', {
        usersCount: data.users?.length || 0,
        djsCount: data.djs?.length || 0,
        dancersCount: data.dancers?.length || 0,
        barsCount: data.bars?.length || 0,
        postsCount: data.posts?.length || 0
      });

      // Backend đã xử lý đầy đủ: enrich author info, normalize comments/replies thành arrays
      // Frontend chỉ cần đảm bảo posts là array (fallback safety check)
      let postsArray = [];
      if (Array.isArray(data.posts)) {
        postsArray = data.posts;
      } else if (data.posts && typeof data.posts === 'object') {
        // Fallback: nếu backend chưa normalize, convert thành array
        postsArray = Object.values(data.posts);
        console.warn('[Search API] Posts was an object (backend should have normalized), converted to array:', postsArray.length);
      }
      
      const normalized = {
        users: normalize(data.users || []),
        djs: normalize(data.djs || []),
        dancers: normalize(data.dancers || []),
        bars: normalize(data.bars || []),
        posts: postsArray, // Backend đã enrich và normalize đầy đủ
      };
      
      console.log('[Search API] Normalized result:', {
        usersCount: normalized.users.length,
        djsCount: normalized.djs.length,
        dancersCount: normalized.dancers.length,
        barsCount: normalized.bars.length,
        postsCount: normalized.posts.length
      });
      
      return normalized;
    } catch (error) {
      console.error('[Search API] Error searching all:', error);
      console.error('[Search API] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return emptyResult;
    }
  }
};

export default searchApi;


