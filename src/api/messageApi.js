import axiosClient from "./axiosClient";

const messageApi = {
  getConversations: () => axiosClient.get("/messages/conversations"),
  getMessages: (conversationId) => axiosClient.get(`/messages/messages/${conversationId}`),
  sendMessage: (conversationId, content, messageType = "text") =>
    axiosClient.post("/messages/message", { conversationId, content, messageType }),
  markMessagesRead: (conversationId) =>
    axiosClient.post("/messages/messages/read", { conversationId }),
  createOrGetConversation: (participant1Id, participant2Id) =>
    axiosClient.post("/messages/conversation", { participant1Id, participant2Id })
};

export default messageApi;