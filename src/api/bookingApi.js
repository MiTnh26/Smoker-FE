import axiosClient from "./axiosClient";

const bookingApi = {
  createRequest: (payload) => axiosClient.post("/booking/request", payload),
  getMyBookings: (params) => axiosClient.get("/booking/my", { params }),
  updateStatus: (id, action) => axiosClient.post(`/booking/${id}/${action}`),
};

export default bookingApi;


