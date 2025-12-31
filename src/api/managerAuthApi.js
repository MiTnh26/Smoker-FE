import axiosClient from "./axiosClient";

export const managerAuthApi = {
  login: (email, password) => 
    axiosClient.post("/manager-auth/login", { email, password }),
  register: (email, password, role, phone) => 
    axiosClient.post("/manager-auth/register", { email, password, role, phone }),
  getMe: () => 
    axiosClient.get("/manager-auth/me"),
};

