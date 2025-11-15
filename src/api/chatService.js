import axiosClient from "./axiosClient";
export const getConversations = () => axiosClient.get("/chat/conversations");
export const getMessages = (conversationId) => axiosClient.get(`/chat/messages/${conversationId}`);
export const sendMessage = (conversationId, content, messageType = "text") =>
  axiosClient.post(`/chat/messages/${conversationId}`, { content, messageType });
export const markMessagesRead = (conversationId) =>
  axiosClient.post(`/chat/messages/${conversationId}/read`);
export const createOrGetConversation = (participant1Id, participant2Id) =>
  axiosClient.post("/chat/conversations", { participant1Id, participant2Id });