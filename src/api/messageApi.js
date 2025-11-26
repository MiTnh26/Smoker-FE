import axiosClient from "./axiosClient";

const messageApi = {
  getConversations: (entityAccountId) => {
    const params = entityAccountId ? { entityAccountId } : {};
    return axiosClient.get("/messages/conversations", { params });
  },
  // Allow optional query params (before, limit, etc.)
  getMessages: (conversationId, params = undefined) =>
    axiosClient.get(`/messages/messages/${conversationId}`, params ? { params } : undefined),
  // Allow extra fields (e.g., clientId) via extra object
  sendMessage: (
    conversationId,
    content,
    messageType = "text",
    senderEntityAccountId = null,
    entityType = null,
    entityId = null,
    extra = {}
  ) =>
    axiosClient.post("/messages/message", {
      conversationId,
      content,
      messageType,
      senderEntityAccountId,
      entityType,
      entityId,
      ...extra,
    }),
  markMessagesRead: (conversationId) =>
    axiosClient.post("/messages/messages/read", { conversationId }),
  createOrGetConversation: (participant1Id, participant2Id) =>
    axiosClient.post("/messages/conversation", { participant1Id, participant2Id }),
};

export default messageApi;