import axiosClient from "./axiosClient";

const normalize = (arr, type) =>
  (arr || []).map(item => ({
    id: item.id || item.EntityAccountId || item.entityAccountId || item.AccountId || item.accountId || null,
    name: item.name || item.BarName || item.userName || item.UserName || item.email || "Unknown",
    avatar: item.avatar || item.Avatar || null,
    type: item.type || type, // 'BAR' | 'USER' | 'DJ' | 'DANCER'
    raw: item
  })).filter(item => item.id); // Filter out items without id

const searchApi = {
  async searchAll(q) {
    if (!q || !String(q).trim()) return { users: [], bars: [], djs: [], dancers: [] };
    try {
      const body = await axiosClient.get(`/search/all`, { params: { q } });
      const rawData = body?.data || { users: [], bars: [], djs: [], dancers: [] };
      
      // Normalize data: map EntityAccountId to id
      return {
        users: normalize(rawData.users || [], 'USER'),
        bars: normalize(rawData.bars || [], 'BAR'),
        djs: normalize(rawData.djs || [], 'DJ'),
        dancers: normalize(rawData.dancers || [], 'DANCER'),
      };
    } catch {
      return { users: [], bars: [], djs: [], dancers: [] };
    }
  }
};

export default searchApi;


