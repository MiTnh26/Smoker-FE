import axiosClient from "./axiosClient";

export const authApi = {
  login: (email, password) => axiosClient.post("/auth/login", { email, password }),
  googleLogin: (data) => axiosClient.post("/auth/google-oauth", data),
  register: (email, password, confirmPassword) =>
    axiosClient.post("/auth/register", { email, password, confirmPassword }),
  googleRegister: (payload = {}) => axiosClient.post("/auth/google-register", payload),
  forgotPassword: (email) => axiosClient.post("/auth/forgot-password", { email }),
  verifyOtp: ({ email, otp }) => axiosClient.post("/auth/verify-otp", { email, otp }),
  resetPassword: ({ email, newPassword, confirmPassword }) => axiosClient.post("/auth/reset-password", { email, newPassword, confirmPassword }),
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    axiosClient.post("/auth/change-password", { currentPassword, newPassword, confirmPassword }),
  facebookLogin: (accessToken) => axiosClient.post("/auth/facebook-oauth", { accessToken }),
  facebookRegister: (email) => axiosClient.post("/auth/facebook-register", { email }),
};

export const userApi = {
  me: () => axiosClient.get("/user/me"),
  updateProfile: (payload, config = {}) => axiosClient.put("/user/profile", payload, config),
};


