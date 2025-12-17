import axiosClient from "./axiosClient";

const unwrap = (response) => response?.data ?? response;

const getEntityAccountIdFromSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    const active = session.activeEntity || session.account;
    return active?.EntityAccountId || active?.entityAccountId || null;
  } catch {
    return null;
  }
};

export const getFeed = async ({ limit = 10, cursor }) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  
  const entityAccountId = getEntityAccountIdFromSession();
  if (entityAccountId) params.entityAccountId = entityAccountId;
  
  const response = await axiosClient.get("/feed", { params });
  return unwrap(response);
};

const feedApi = { getFeed };
export default feedApi;
