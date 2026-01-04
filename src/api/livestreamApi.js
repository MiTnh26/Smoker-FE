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
  const unwrapped = unwrap(response);
  // Response structure: { status: "success", message: "...", data: [...] }
  // Return the data array directly
  return unwrapped?.data || unwrapped || [];
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

// Create scheduled livestream
export const createScheduledLivestream = async (title, description, scheduledStartTime, settings) => {
  const response = await axiosClient.post("/livestream/schedule", {
    title,
    description,
    scheduledStartTime,
    settings,
  });
  return unwrap(response);
};

// Get scheduled livestreams
export const getScheduledLivestreams = async () => {
  const response = await axiosClient.get("/livestream/scheduled");
  const unwrapped = unwrap(response);
  return unwrapped?.data || unwrapped || [];
};

// Cancel scheduled livestream
export const cancelScheduledLivestream = async (livestreamId) => {
  const response = await axiosClient.delete(`/livestream/scheduled/${livestreamId}`);
  return unwrap(response);
};

// Activate scheduled livestream (start it now)
export const activateScheduledLivestream = async (livestreamId) => {
  const response = await axiosClient.post(`/livestream/scheduled/${livestreamId}/activate`);
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
  createScheduledLivestream,
  getScheduledLivestreams,
  cancelScheduledLivestream,
  activateScheduledLivestream,
};

export default livestreamApi;

