import axiosClient from "./axiosClient";

const unwrap = (response) => response?.data ?? response;

/**
 * Lấy feed tổng hợp (posts và livestreams) từ backend.
 * @param {{ limit?: number, cursor?: string }}
 * @returns {Promise<{feed: Array, nextCursor: string | null, hasMore: boolean}>}
 */
export const getFeed = async ({ limit = 10, cursor }) => {
  const params = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  const response = await axiosClient.get("/feed", { params });
  return unwrap(response);
};

const feedApi = {
  getFeed,
};

export default feedApi;

