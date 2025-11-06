import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/chat';

// Lấy token từ localStorage (hoặc context tuỳ dự án)
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const createOrGetConversation = (participant1Id, participant2Id) => {
  return axios.post(
    `${API_URL}/conversation`,
    { participant1Id, participant2Id },
    { headers: { ...getAuthHeader() } }
  );
};

export const getConversations = () => {
  return axios.get(`${API_URL}/conversations`, {
    headers: { ...getAuthHeader() }
  });
};

export const sendMessage = (conversationId, content, messageType = 'text') => {
  return axios.post(
    `${API_URL}/message`,
    { conversationId, content, messageType },
    { headers: { ...getAuthHeader() } }
  );
};

export const getMessages = (conversationId, limit = 50, offset = 0) => {
  return axios.get(
    `${API_URL}/messages/${conversationId}?limit=${limit}&offset=${offset}`,
    { headers: { ...getAuthHeader() } }
  );
};

export const markMessagesRead = (conversationId) => {
  return axios.post(
    `${API_URL}/messages/read`,
    { conversationId },
    { headers: { ...getAuthHeader() } }
  );
};
