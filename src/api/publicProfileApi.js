import axiosClient from "./axiosClient";

const publicProfileApi = {
  getByEntityId(entityAccountId) {
    return axiosClient.get(`/user/by-entity/${entityAccountId}`);
  }
};

export default publicProfileApi;


