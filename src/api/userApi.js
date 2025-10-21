import axiosClient from "./axiosClient";

export const authApi = {
  login: (email, password) => axiosClient.post("/auth/login", { email, password }),
  googleLogin: (data) => axiosClient.post("/auth/google-oauth", data),
  register: (email, password, confirmPassword) =>
    axiosClient.post("/auth/register", { email, password, confirmPassword }),
  googleRegister: (payload = {}) => axiosClient.post("/auth/google-register", payload),
  // Thêm API quên mật khẩu
  forgotPassword: (email) => axiosClient.post("/auth/forgot-password", { email }),
  // Thêm API đổi mật khẩu
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    axiosClient.post("/auth/change-password", { currentPassword, newPassword, confirmPassword }),
  // Thêm API đăng nhập Facebook
  facebookLogin: (accessToken) => axiosClient.post("/auth/facebook-oauth", { accessToken }),
  // Thêm API đăng ký Facebook
  facebookRegister: (email) => axiosClient.post("/auth/facebook-register", { email }),
};

export const userApi = {
  me: () => axiosClient.get("/user/me"),
  updateProfile: (payload, config = {}) => axiosClient.put("/user/profile", payload, config),
};


