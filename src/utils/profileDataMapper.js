/**
 * Profile Data Mapper
 * Normalizes profile data from various sources (PascalCase, camelCase, etc.)
 * Single source of truth for profile data normalization
 */

/**
 * Normalize profile data from API response
 * Handles both PascalCase and camelCase formats
 * 
 * @param {Object} data - Raw profile data from API
 * @returns {Object} Normalized profile data (camelCase)
 */
export function normalizeProfileData(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return {
    // Basic info
    id: data.id || data.Id || data.ID || null,
    name: data.name || data.Name || data.userName || data.UserName || data.BarName || data.barName || null,
    userName: data.userName || data.UserName || data.name || data.Name || data.BarName || data.barName || null,
    BarName: data.BarName || data.barName || data.userName || data.UserName || data.name || data.Name || null,
    barName: data.barName || data.BarName || data.userName || data.UserName || data.name || data.Name || null,
    
    // Entity info
    entityAccountId: data.entityAccountId || data.EntityAccountId || data.entityAccountID || data.id || null,
    EntityAccountId: data.EntityAccountId || data.entityAccountId || data.entityAccountID || data.id || null,
    entityId: data.entityId || data.EntityId || data.id || null,
    EntityId: data.EntityId || data.entityId || data.id || null,
    
    // Type and role
    type: data.type || data.Type || null,
    Type: data.Type || data.type || null,
    role: data.role || data.Role || null,
    Role: data.Role || data.role || null,
    
    // Media
    avatar: data.avatar || data.Avatar || null,
    Avatar: data.Avatar || data.avatar || null,
    background: data.background || data.Background || null,
    Background: data.Background || data.background || null,
    
    // Contact info
    email: data.email || data.Email || null,
    Email: data.Email || data.email || null,
    phone: data.phone || data.Phone || data.phoneNumber || data.PhoneNumber || null,
    Phone: data.Phone || data.phone || data.phoneNumber || data.PhoneNumber || null,
    phoneNumber: data.phoneNumber || data.PhoneNumber || data.phone || data.Phone || null,
    
    // Location
    address: data.address || data.Address || data.AddressDetail || null,
    Address: data.Address || data.address || data.AddressDetail || null,
    addressData: data.addressData || data.AddressData || null,
    addressText: data.addressText || data.AddressText || null,
    AddressText: data.AddressText || data.addressText || null,
    addressObject: data.addressObject || data.AddressObject || null,
    AddressObject: data.AddressObject || data.addressObject || null,
    addressRaw: data.addressRaw || data.AddressRaw || null,
    AddressRaw: data.AddressRaw || data.addressRaw || null,
    // Address components (for edit form)
    provinceId: data.provinceId || data.ProvinceId || null,
    ProvinceId: data.ProvinceId || data.provinceId || null,
    districtId: data.districtId || data.DistrictId || null,
    DistrictId: data.DistrictId || data.districtId || null,
    wardId: data.wardId || data.WardId || null,
    WardId: data.WardId || data.wardId || null,
    addressDetail: data.addressDetail || data.AddressDetail || data.detail || data.Detail || null,
    AddressDetail: data.AddressDetail || data.addressDetail || data.detail || data.Detail || null,
    
    // Bio
    bio: data.bio || data.Bio || data.description || data.Description || data.about || data.About || null,
    Bio: data.Bio || data.bio || data.description || data.Description || data.about || data.About || null,
    description: data.description || data.Description || data.bio || data.Bio || null,
    about: data.about || data.About || data.bio || data.Bio || null,
    
    // Gender
    gender: data.gender || data.Gender || null,
    Gender: data.Gender || data.gender || null,
    
    // Business specific (DJ/Dancer)
    // Check nested BusinessAccount/businessAccount object first, then top level
    pricePerHours: data.pricePerHours || 
                   data.PricePerHours || 
                   data.pricePerHour || 
                   data.PricePerHour ||
                   data.businessAccount?.pricePerHours ||
                   data.businessAccount?.PricePerHours ||
                   data.BusinessAccount?.pricePerHours ||
                   data.BusinessAccount?.PricePerHours ||
                   data.BusinessAccount?.PricePerHours ||
                   null,
    PricePerHours: data.PricePerHours || 
                   data.pricePerHours || 
                   data.pricePerHour || 
                   data.PricePerHour ||
                   data.businessAccount?.PricePerHours ||
                   data.businessAccount?.pricePerHours ||
                   data.BusinessAccount?.PricePerHours ||
                   data.BusinessAccount?.pricePerHours ||
                   null,
    pricePerSession: data.pricePerSession || 
                     data.PricePerSession ||
                     data.businessAccount?.pricePerSession ||
                     data.businessAccount?.PricePerSession ||
                     data.BusinessAccount?.pricePerSession ||
                     data.BusinessAccount?.PricePerSession ||
                     data.bussinessAccount?.pricePerSession ||
                     data.bussinessAccount?.PricePerSession ||
                     data.BussinessAccount?.pricePerSession ||
                     data.BussinessAccount?.PricePerSession ||
                     null,
    PricePerSession: data.PricePerSession || 
                     data.pricePerSession ||
                     data.businessAccount?.PricePerSession ||
                     data.businessAccount?.pricePerSession ||
                     data.BusinessAccount?.PricePerSession ||
                     data.BusinessAccount?.pricePerSession ||
                     data.bussinessAccount?.PricePerSession ||
                     data.bussinessAccount?.pricePerSession ||
                     data.BussinessAccount?.PricePerSession ||
                     data.BussinessAccount?.pricePerSession ||
                     null,
    
    // Bar specific
    barPageId: data.barPageId || data.BarPageId || data.barPageID || data.targetId || data.targetID || data.id || null,
    BarPageId: data.BarPageId || data.barPageId || data.barPageID || data.targetId || data.targetID || data.id || null,
    
    // Business account specific
    businessAccountId: data.businessAccountId || data.BusinessAccountId || data.BussinessAccountId || 
                       data.businessId || data.BusinessId || data.targetId || data.targetID || null,
    BusinessAccountId: data.BusinessAccountId || data.BussinessAccountId || data.businessAccountId || 
                       data.BusinessId || data.businessId || data.targetId || data.targetID || null,
    BussinessAccountId: data.BussinessAccountId || data.BusinessAccountId || data.businessAccountId || null,
    
    // Status
    status: data.status || data.Status || null,
    Status: data.Status || data.status || null,
    
    // Contact object (for some API responses)
    contact: data.contact || data.Contact || null,
    
    // Follow stats
    followersCount: data.followersCount || data.FollowersCount || 0,
    followingCount: data.followingCount || data.FollowingCount || 0,
    isFollowing: data.isFollowing || data.IsFollowing || false,
    
    // Keep nested objects for reference (BusinessAccount, businessAccount, etc.)
    businessAccount: data.businessAccount || data.BusinessAccount || data.bussinessAccount || data.BussinessAccount || null,
    BusinessAccount: data.BusinessAccount || data.businessAccount || data.BussinessAccount || data.bussinessAccount || null,
    bussinessAccount: data.bussinessAccount || data.BussinessAccount || data.businessAccount || data.BusinessAccount || null,
    BussinessAccount: data.BussinessAccount || data.bussinessAccount || data.BusinessAccount || data.businessAccount || null,
    
    // Keep original data for reference
    _original: data
  };
}

/**
 * Map gender from various formats to standard format
 * @param {string} gender - Gender value (can be Vietnamese or English)
 * @returns {string} Normalized gender (male/female/other or Vietnamese)
 */
export function normalizeGender(gender) {
  if (!gender) return null;
  
  const genderLower = String(gender).toLowerCase().trim();
  
  // Map Vietnamese to English
  if (genderLower === 'nam' || genderLower === 'male') return 'male';
  if (genderLower === 'nữ' || genderLower === 'female') return 'female';
  if (genderLower === 'khác' || genderLower === 'other') return 'other';
  
  // Return as-is if already in standard format
  return gender;
}

/**
 * Display gender in Vietnamese
 * @param {string} gender - Gender value
 * @returns {string} Vietnamese gender text
 */
export function displayGender(gender) {
  if (!gender) return "Chưa cập nhật";
  
  const genderLower = String(gender).toLowerCase();
  if (genderLower === 'male' || genderLower === 'nam') return 'Nam';
  if (genderLower === 'female' || genderLower === 'nữ') return 'Nữ';
  if (genderLower === 'other' || genderLower === 'khác') return 'Khác';
  
  // If already in Vietnamese, return as-is
  return gender;
}

