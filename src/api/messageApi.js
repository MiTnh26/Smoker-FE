import axiosClient from "./axiosClient";

const messageApi = {
  getConversations: (entityAccountId) => {
    const params = entityAccountId ? { entityAccountId } : {};
    return axiosClient.get("/messages/conversations", { params });
  },
  // Allow optional query params (before, limit, offset, etc.)
  getMessages: (conversationId, params = {}) => {
    const queryParams = Object.keys(params).length > 0 ? params : undefined;
    return axiosClient.get(`/messages/messages/${conversationId}`, queryParams ? { params: queryParams } : undefined);
  },
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
  markMessagesRead: (conversationId, entityAccountId, lastMessageId = null) =>
    axiosClient.post("/messages/messages/read", { conversationId, entityAccountId, lastMessageId }),
  createOrGetConversation: (participant1Id, participant2Id) =>
    axiosClient.post("/messages/conversation", { participant1Id, participant2Id }),
  getUnreadCount: (entityAccountId) => {
    const params = entityAccountId ? { entityAccountId } : {};
    return axiosClient.get("/messages/messages/unread-count", { params });
  },
};

export default messageApi;