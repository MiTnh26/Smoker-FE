import axiosClient from "./axiosClient";

const barEventApi = {
  getEventsByBarId: (barPageId) =>
    axiosClient.get(`/events/bar/${barPageId}`),

  createEvent: (data) =>
    axiosClient.post("/events", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default barEventApi;
