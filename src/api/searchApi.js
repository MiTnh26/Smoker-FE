import axiosClient from "./axiosClient";

const normalize = (arr, type) =>
  (arr || []).map(item => ({
    id: item.id || item.AccountId || item.EntityAccountId,
    name: item.name || item.BarName || item.userName || item.email || "Unknown",
    avatar: item.avatar || item.Avatar || null,
    type, // 'BAR' | 'USER' | 'DJ' | 'DANCER'
    raw: item
  }));

const searchApi = {
  async searchAll(q) {
    if (!q || !String(q).trim()) return { users: [], bars: [], djs: [], dancers: [] };
    try {
      const body = await axiosClient.get(`/search/all`, { params: { q } });
      return body?.data || { users: [], bars: [], djs: [], dancers: [] };
    } catch {
      return { users: [], bars: [], djs: [], dancers: [] };
    }
  }
};

export default searchApi;


