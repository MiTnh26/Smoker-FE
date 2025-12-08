import axiosClient from "./axiosClient";

const followApi = {
  follow: (data) => {
    // data: { followerId, followingId, followingType }
    return axiosClient.post("/follow/follow", data);
  },
  unfollow: (data) => {
    // data: { followerId, followingId }
    return axiosClient.post("/follow/unfollow", data);
  },
  getFollowers: (entityId) => {
    return axiosClient.get(`/follow/followers/${entityId}`);
  },
  getFollowing: (entityId) => {
    return axiosClient.get(`/follow/following/${entityId}`);
  },
  checkFollowing: (followerId, followingId) => {
    return axiosClient.get(`/follow/check`, {
      params: { followerId, followingId }
    });
  }
};

export default followApi;