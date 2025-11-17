import axiosClient from "./axiosClient";

const barEventApi = {
  getEventsByBarId: (barPageId) =>
    axiosClient.get(`/events/bar/${barPageId}`),

  getAllEvents: () =>
    axiosClient.get("/events"),

  getEventsExcludingBar: (barPageId) =>
    axiosClient.get(`/events/excluding/${barPageId}`),

  createEvent: (data) =>
    axiosClient.post("/events", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  updateEvent: (eventId, data) =>
    axiosClient.put(`/events/${eventId}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deleteEvent: (eventId) =>
    axiosClient.delete(`/events/${eventId}`),
};

export default barEventApi;
