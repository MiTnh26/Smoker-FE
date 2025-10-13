import axiosClient from "./axiosClient";

export const authApi = {
  login: (email, password) => axiosClient.post("/auth/login", { email, password }),
  googleLogin: (data) => axiosClient.post("/auth/google-oauth", data),
  register: (email, password, confirmPassword) =>
    axiosClient.post("/auth/register", { email, password, confirmPassword }),
  googleRegister: (payload = {}) => axiosClient.post("/auth/google-register", payload),
};

export const userApi = {
  me: () => axiosClient.get("/user/me"),
  updateProfile: (payload) => axiosClient.put("/user/profile", payload),
};


