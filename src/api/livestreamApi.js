import axiosClient from "./axiosClient";

// Start a new livestream
export const startLivestream = async (title, description = "") => {
  return await axiosClient.post("/livestream/start", {
    title,
    description,
  });
};

// End a livestream
export const endLivestream = async (livestreamId) => {
  return await axiosClient.post(`/livestream/${livestreamId}/end`);
};

// Get a specific livestream by ID
export const getLivestream = async (livestreamId) => {
  return await axiosClient.get(`/livestream/${livestreamId}`);
};

// Get stream by channel name and viewer token
export const getStreamByChannel = async (channelName) => {
  return await axiosClient.get(`/livestream/channel/${channelName}`);
};

// Get all active livestreams
export const getActiveLivestreams = async () => {
  return await axiosClient.get("/livestream/active");
};

// Increment view count
export const incrementViewCount = async (livestreamId) => {
  return await axiosClient.post(`/livestream/${livestreamId}/view`);
};

// Get livestreams by host
export const getLivestreamsByHost = async (hostId, limit = 20) => {
  return await axiosClient.get(`/livestream/host/${hostId}`, {
    params: { limit },
  });
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

