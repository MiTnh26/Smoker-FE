// src/api/axiosClient.js
import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:9999/api",
});

axiosClient.interceptors.request.use((config) => {
  console.log(`[REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
  
  // Use sessionManager for consistent token retrieval (synchronous fallback)
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
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    
    // Don't log 404 errors as errors - they're expected in some cases (e.g., entity not found)
    // Only log 404 for /user/by-entity endpoints as INFO, skip others
    if (status === 404) {
      if (url?.includes('/user/by-entity/')) {
        // Silently handle 404 for entity lookups - this is expected when entity doesn't exist
        // Don't log to reduce console noise
      } else {
        console.log(`[INFO] ${method} ${url} - 404 Not Found (this may be expected)`);
      }
    } else {
      console.error(`[ERROR] ${method} ${url}`);
      console.error("Error response:", error.response);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      // Log full error data for debugging (only for non-404 errors)
      if (error.response?.data) {
        console.error("Full error response data:", JSON.stringify(error.response.data, null, 2));
      }
    }
    throw error;
  }
);

export default axiosClient;
