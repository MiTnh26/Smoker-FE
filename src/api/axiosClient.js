// src/api/axiosClient.js
import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:9999/api",
});

axiosClient.interceptors.request.use((config) => {
  console.log(`[REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
  
  let token = localStorage.getItem("token");
  if (!token) {
    try {
      const sessionRaw = localStorage.getItem("session");
      const session = sessionRaw ? JSON.parse(sessionRaw) : null;
      token = session?.token || session?.accessToken || null;
    } catch (e) {
      // ignore JSON parse errors; treat as no token
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[REQUEST] Token present: ${token.substring(0, 20)}...`);
  } else {
    console.warn(`[REQUEST] No token found for ${config.url}`);
  }
  
  console.log(`[REQUEST] Request data:`, config.data);
  
  // If sending FormData, let browser set proper multipart boundary
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    // Ensure we don't override Content-Type for FormData
    if (config.headers && config.headers["Content-Type"]) delete config.headers["Content-Type"];
  } else {
    // Default JSON for non-FormData requests
    if (config.headers && !config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  }
  
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    console.log(`[SUCCESS] ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response.data;
  },
  (error) => {
    console.error(`[ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error("Error response:", error.response);
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    // Log full error data for debugging
    if (error.response?.data) {
      console.error("Full error response data:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
);

export default axiosClient;
