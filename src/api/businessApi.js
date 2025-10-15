import axiosClient from "./axiosClient";

const businessApi = {
  // Step 1: Create business account (no files)
  create(payload) {
    return axiosClient.post("/business/register", payload);
  },

  // Step 2: Upload files for existing business account
  upload(formData) {
    return axiosClient.post("/business/upload", formData);
  },
};

export default businessApi;


