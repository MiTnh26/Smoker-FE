import axiosClient from "./axiosClient";

const unwrap = (response) => response?.data ?? response;

// Start a new livestream
export const startLivestream = async (title, description = "") => {
  const response = await axiosClient.post("/livestream/start", {
    title,
    description,
  });
  return unwrap(response);
};

// End a livestream
export const endLivestream = async (livestreamId) => {
  const response = await axiosClient.post(`/livestream/${livestreamId}/end`);
  return unwrap(response);
};

// Get a specific livestream by ID
export const getLivestream = async (livestreamId) => {
  const response = await axiosClient.get(`/livestream/${livestreamId}`);
  return unwrap(response);
};

// Get stream by channel name and viewer token
export const getStreamByChannel = async (channelName) => {
  const response = await axiosClient.get(`/livestream/channel/${channelName}`);
  return unwrap(response);
};

// Get all active livestreams
export const getActiveLivestreams = async () => {
  const response = await axiosClient.get("/livestream/active");
  return unwrap(response);
};

// Increment view count
export const incrementViewCount = async (livestreamId) => {
  const response = await axiosClient.post(`/livestream/${livestreamId}/view`);
  return unwrap(response);
};

// Get livestreams by host
export const getLivestreamsByHost = async (hostId, limit = 20) => {
  const response = await axiosClient.get(`/livestream/host/${hostId}`, {
    params: { limit },
  });
  return unwrap(response);
};

const livestreamApi = {
  startLivestream,
  endLivestream,
  getLivestream,
  getStreamByChannel,
  getActiveLivestreams,
  incrementViewCount,
  getLivestreamsByHost,
};

export default livestreamApi;

