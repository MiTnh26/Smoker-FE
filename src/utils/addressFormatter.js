/**
 * Utility functions for formatting and validating address data
 * Standard format: {"detail":"13","provinceId":"1","districtId":"21","wardId":"617"}
 */

/**
 * Validates that all 4 required address fields are present
 * @param {string} detail - Address detail (street number, building, etc.)
 * @param {string} provinceId - Province ID
 * @param {string} districtId - District ID
 * @param {string} wardId - Ward ID
 * @returns {boolean} - True if all fields are valid
 */
export const validateAddressFields = (detail, provinceId, districtId, wardId) => {
  return (
    detail &&
    detail.trim() !== '' &&
    provinceId &&
    provinceId.trim() !== '' &&
    districtId &&
    districtId.trim() !== '' &&
    wardId &&
    wardId.trim() !== ''
  );
};

/**
 * Formats address data into standard JSON string format
 * @param {string} detail - Address detail
 * @param {string} provinceId - Province ID
 * @param {string} districtId - District ID
 * @param {string} wardId - Ward ID
 * @returns {string|null} - JSON string or null if validation fails
 */
export const formatAddressForSave = (detail, provinceId, districtId, wardId) => {
  // Validate all fields are present
  if (!validateAddressFields(detail, provinceId, districtId, wardId)) {
    return null;
  }

  // Create address object with all 4 required fields
  const addressObj = {
    detail: detail.trim(),
    provinceId: provinceId.trim(),
    districtId: districtId.trim(),
    wardId: wardId.trim()
  };

  // Return as JSON string
  return JSON.stringify(addressObj);
};

/**
 * Parses address from string (JSON or plain string)
 * @param {string} addressString - Address string from database
 * @returns {object|null} - Parsed address object or null
 */
export const parseAddressFromString = (addressString) => {
  if (!addressString || typeof addressString !== 'string') {
    return null;
  }

  const trimmed = addressString.trim();
  if (!trimmed) {
    return null;
  }

  // If it's a JSON string, try to parse it
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      // Validate it has the required structure
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse address JSON:', e);
      return null;
    }
  }

  // If it's not JSON, return null (old format, should be migrated)
  return null;
};

/**
 * Extracts address fields from parsed address object
 * @param {object} addressObj - Parsed address object
 * @returns {object} - Object with detail, provinceId, districtId, wardId
 */
export const extractAddressFields = (addressObj) => {
  if (!addressObj || typeof addressObj !== 'object') {
    return {
      detail: '',
      provinceId: '',
      districtId: '',
      wardId: ''
    };
  }

  return {
    detail: addressObj.detail || addressObj.addressDetail || '',
    provinceId: addressObj.provinceId || '',
    districtId: addressObj.districtId || '',
    wardId: addressObj.wardId || ''
  };
};

