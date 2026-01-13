import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { locationApi } from "../../api/locationApi";
import { formatAddressForSave, validateAddressFields } from "../../utils/addressFormatter";

export default function AddressSelector({
  selectedProvinceId,
  selectedDistrictId,
  selectedWardId,
  addressDetail,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  onAddressDetailChange,
  onAddressChange, // Callback when full address changes (for display)
  onAddressJsonChange, // Callback when address JSON changes (for saving)
  className = "",
  disabled = false,
  required = true // Whether all 4 fields are required
}) {
  const { t } = useTranslation();
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

  // Validate and format address when selections change
  useEffect(() => {
    // Build full address string for display
    if (onAddressChange && (selectedProvinceId || selectedDistrictId || selectedWardId || addressDetail)) {
      const fullAddr = buildAddress();
      onAddressChange(fullAddr);
    }

    // Format and validate JSON address for saving
    if (onAddressJsonChange) {
      if (required) {
        // If required, validate all 4 fields are present
        if (validateAddressFields(addressDetail, selectedProvinceId, selectedDistrictId, selectedWardId)) {
          const addressJson = formatAddressForSave(addressDetail, selectedProvinceId, selectedDistrictId, selectedWardId);
          onAddressJsonChange(addressJson);
        } else {
          // Not all fields are filled, pass null
          onAddressJsonChange(null);
        }
      } else {
        // If not required, format if any field is present
        if (addressDetail || selectedProvinceId || selectedDistrictId || selectedWardId) {
          const addressJson = formatAddressForSave(addressDetail, selectedProvinceId, selectedDistrictId, selectedWardId);
          onAddressJsonChange(addressJson); // Will be null if validation fails
        } else {
          onAddressJsonChange(null);
        }
      }
    }
  }, [selectedProvinceId, selectedDistrictId, selectedWardId, addressDetail, buildAddress, onAddressChange, onAddressJsonChange, required]);

  // Check if address is valid (all 4 fields filled)
  const isAddressValid = validateAddressFields(addressDetail, selectedProvinceId, selectedDistrictId, selectedWardId);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Province */}
      <div className="relative">
        <select
          id="province"
          name="province"
          value={selectedProvinceId || ""}
          onChange={(e) => onProvinceChange(e.target.value)}
          disabled={locationLoading || disabled}
          className={cn(
            "w-full px-4 py-3 pr-10 rounded-lg appearance-none",
            "border border-border/20",
            "bg-white text-foreground",
            "outline-none transition-all duration-200",
            "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
            "disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
          )}
        >
          <option value="">-- {t('address.selectProvince')} --</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name} ({province.typeText})
            </option>
          ))}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* District */}
      {selectedProvinceId && (
        <div className="relative">
          <select
            id="district"
            name="district"
            value={selectedDistrictId || ""}
            onChange={(e) => onDistrictChange(e.target.value)}
            disabled={locationLoading || disabled || !selectedProvinceId}
            className={cn(
              "w-full px-4 py-3 pr-10 rounded-lg appearance-none",
              "border border-border/20",
              "bg-white text-foreground",
              "outline-none transition-all duration-200",
              "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              "disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
            )}
          >
            <option value="">-- {t('address.selectDistrict')} --</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name} ({district.typeText})
              </option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}

      {/* Ward */}
      {selectedDistrictId && (
        <div className="relative">
          <select
            id="ward"
            name="ward"
            value={selectedWardId || ""}
            onChange={(e) => onWardChange(e.target.value)}
            disabled={locationLoading || disabled || !selectedDistrictId}
            className={cn(
              "w-full px-4 py-3 pr-10 rounded-lg appearance-none",
              "border border-border/20",
              "bg-white text-foreground",
              "outline-none transition-all duration-200",
              "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              "disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
            )}
          >
            <option value="">-- {t('address.selectWard')} --</option>
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name} ({ward.typeText})
              </option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}

      {/* Address Detail */}
      {(selectedProvinceId || selectedDistrictId || selectedWardId) && (
        <div>
          <input
            type="text"
            id="addressDetail"
            name="addressDetail"
            value={addressDetail || ""}
            onChange={(e) => onAddressDetailChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full px-4 py-3 rounded-lg",
              "border border-border/20",
              "bg-white text-foreground",
              "outline-none transition-all duration-200",
              "placeholder:text-muted-foreground/60 placeholder:italic",
              "focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            )}
            placeholder="Số nhà, tên đường, tổ, khu phố..."
          />
        </div>
      )}
    </div>
  );
}

