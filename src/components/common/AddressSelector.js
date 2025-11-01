import React, { useState, useEffect, useCallback } from "react";
import { locationApi } from "../../api/locationApi";

export default function AddressSelector({
  selectedProvinceId,
  selectedDistrictId,
  selectedWardId,
  addressDetail,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  onAddressDetailChange,
  onAddressChange, // Callback when full address changes
  className = "",
  disabled = false
}) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  // Load provinces on mount
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        setLocationLoading(true);
        const data = await locationApi.getProvinces();
        setProvinces(data);
      } catch (error) {
        console.error('Failed to load provinces:', error);
      } finally {
        setLocationLoading(false);
      }
    };
    loadProvinces();
  }, []);

  // Load districts when province is selected
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedProvinceId) {
        setDistricts([]);
        return;
      }
      try {
        setLocationLoading(true);
        const data = await locationApi.getDistricts(selectedProvinceId);
        setDistricts(data);
      } catch (error) {
        console.error('Failed to load districts:', error);
      } finally {
        setLocationLoading(false);
      }
    };
    loadDistricts();
  }, [selectedProvinceId]);

  // Load wards when district is selected
  useEffect(() => {
    const loadWards = async () => {
      if (!selectedDistrictId) {
        setWards([]);
        return;
      }
      try {
        setLocationLoading(true);
        const data = await locationApi.getWards(selectedDistrictId);
        setWards(data);
      } catch (error) {
        console.error('Failed to load wards:', error);
      } finally {
        setLocationLoading(false);
      }
    };
    loadWards();
  }, [selectedDistrictId]);

  // Build full address string
  const buildAddress = useCallback(() => {
    const parts = [];
    if (addressDetail) parts.push(addressDetail);
    
    const selectedWard = wards.find(w => w.id === selectedWardId);
    const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
    const selectedProvince = provinces.find(p => p.id === selectedProvinceId);

    if (selectedWard) parts.push(selectedWard.name);
    if (selectedDistrict) parts.push(selectedDistrict.name);
    if (selectedProvince) parts.push(selectedProvince.name);

    return parts.join(', ');
  }, [selectedProvinceId, selectedDistrictId, selectedWardId, addressDetail, wards, districts, provinces]);

  // Trigger buildAddress when selections change
  useEffect(() => {
    if (onAddressChange && (selectedProvinceId || selectedDistrictId || selectedWardId || addressDetail)) {
      const fullAddr = buildAddress();
      onAddressChange(fullAddr);
    }
  }, [selectedProvinceId, selectedDistrictId, selectedWardId, addressDetail, buildAddress, onAddressChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Province */}
      <div>
        <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
          Tỉnh/Thành phố
        </label>
        <select
          id="province"
          name="province"
          value={selectedProvinceId || ""}
          onChange={(e) => onProvinceChange(e.target.value)}
          disabled={locationLoading || disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Chọn Tỉnh/Thành phố --</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name} ({province.typeText})
            </option>
          ))}
        </select>
      </div>

      {/* District */}
      {selectedProvinceId && (
        <div>
          <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
            Quận/Huyện
          </label>
          <select
            id="district"
            name="district"
            value={selectedDistrictId || ""}
            onChange={(e) => onDistrictChange(e.target.value)}
            disabled={locationLoading || disabled || !selectedProvinceId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Chọn Quận/Huyện --</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name} ({district.typeText})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ward */}
      {selectedDistrictId && (
        <div>
          <label htmlFor="ward" className="block text-sm font-medium text-gray-700 mb-2">
            Phường/Xã
          </label>
          <select
            id="ward"
            name="ward"
            value={selectedWardId || ""}
            onChange={(e) => onWardChange(e.target.value)}
            disabled={locationLoading || disabled || !selectedDistrictId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Chọn Phường/Xã --</option>
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name} ({ward.typeText})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Address Detail */}
      {(selectedProvinceId || selectedDistrictId || selectedWardId) && (
        <div>
          <label htmlFor="addressDetail" className="block text-sm font-medium text-gray-700 mb-2">
            Địa chỉ chi tiết (số nhà, tên đường...)
          </label>
          <input
            type="text"
            id="addressDetail"
            name="addressDetail"
            value={addressDetail || ""}
            onChange={(e) => onAddressDetailChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            placeholder="Số nhà, tên đường, tổ, khu phố..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Địa chỉ đầy đủ: {buildAddress() || 'Chưa chọn'}
          </p>
        </div>
      )}
    </div>
  );
}

