import axiosClient from "./axiosClient";

const messageApi = {
  getConversations: (entityAccountId) => {
    const params = entityAccountId ? { entityAccountId } : {};
    return axiosClient.get("/messages/conversations", { params });
  },
  getMessages: (conversationId) => axiosClient.get(`/messages/messages/${conversationId}`),
  sendMessage: (conversationId, content, messageType = "text", senderEntityAccountId = null, entityType = null, entityId = null) =>
    axiosClient.post("/messages/message", { conversationId, content, messageType, senderEntityAccountId, entityType, entityId }),
  markMessagesRead: (conversationId) =>
    axiosClient.post("/messages/messages/read", { conversationId }),
  createOrGetConversation: (participant1Id, participant2Id) =>
    axiosClient.post("/messages/conversation", { participant1Id, participant2Id })
};

export default messageApi;