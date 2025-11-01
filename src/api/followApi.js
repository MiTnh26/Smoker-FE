import axiosClient from "./axiosClient";

const followApi = {
  follow: (data) => {
    // data: { followerId, followingId, followingType }
    return axiosClient.post("/api/follow/follow", data);
  },
  unfollow: (data) => {
    // data: { followerId, followingId }
    return axiosClient.post("/api/follow/unfollow", data);
  },
  getFollowers: (entityId) => {
    return axiosClient.get(`/api/follow/followers/${entityId}`);
  },
  getFollowing: (entityId) => {
    return axiosClient.get(`/api/follow/following/${entityId}`);
  },
  checkFollowing: (followerId, followingId) => {
    return axiosClient.get(`/api/follow/check`, {
      params: { followerId, followingId }
    });
  }
};

export default followApi;