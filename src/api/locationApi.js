// API service for Vietnam location data from open.oapi.vn
const BASE_URL = "https://open.oapi.vn/location";

export const locationApi = {
  // Get all provinces
  getProvinces: (query = "", page = 0, size = 100) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (query) {
      params.append("query", query);
    }
    return fetch(`${BASE_URL}/provinces?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === "success") {
          return data.data || [];
        }
        throw new Error(data.message || "Failed to fetch provinces");
      });
  },

  // Get districts by province ID
  getDistricts: (provinceId, query = "", page = 0, size = 100) => {
    if (!provinceId) {
      return Promise.reject(new Error("provinceId is required"));
    }
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (query) {
      params.append("query", query);
    }
    return fetch(`${BASE_URL}/districts/${provinceId}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === "success") {
          return data.data || [];
        }
        throw new Error(data.message || "Failed to fetch districts");
      });
  },

  // Get wards by district ID
  getWards: (districtId, query = "", page = 0, size = 100) => {
    if (!districtId) {
      return Promise.reject(new Error("districtId is required"));
    }
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (query) {
      params.append("query", query);
    }
    return fetch(`${BASE_URL}/wards/${districtId}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === "success") {
          return data.data || [];
        }
        throw new Error(data.message || "Failed to fetch wards");
      });
  },
};

