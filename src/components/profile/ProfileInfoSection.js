import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { displayGender } from '../../utils/profileDataMapper';
import { locationApi } from '../../api/locationApi';

const formatAddress = (address) => {
  if (!address) return null;

  if (typeof address === 'string') {
    const trimmed = address.trim();
    // If it's a non-empty string, return it directly (already formatted)
    if (trimmed && !trimmed.startsWith('{')) {
      return trimmed;
    }
    // If it's a JSON string, try to parse it
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return formatAddress(JSON.parse(trimmed));
      } catch {
        return null; // Return null if parsing fails, don't show raw JSON
      }
    }
    return trimmed || null;
  }

  if (typeof address === 'object') {
    const {
      fullAddress,
      detail,
      addressDetail,
      wardName,
      ward,
      districtName,
      district,
      provinceName,
      province
    } = address;

    // If fullAddress exists, use it
    if (fullAddress) return fullAddress;

    // Build address from parts
    const parts = [
      detail || addressDetail,
      wardName || ward,
      districtName || district,
      provinceName || province
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(', ');
    
    // If object only has IDs but no names, return null (we can't display IDs)
    // The addressText should be used instead
    return null;
  }

  return null;
};

/**
 * A shared component to display common profile information.
 * Renders bio, address, phone, email, and gender.
 */
export const ProfileInfoSection = ({ profile }) => {
  const { t } = useTranslation();
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Function to resolve address names from IDs
  const resolveAddressFromIds = async (addressObj) => {
    if (!addressObj || typeof addressObj !== 'object') return null;
    
    // If it already has names, use them
    if (addressObj.provinceName || addressObj.districtName || addressObj.wardName) {
      return formatAddress(addressObj);
    }

    // If it only has IDs, fetch names from location API
    const { provinceId, districtId, wardId, detail, addressDetail } = addressObj;
    if (!provinceId && !districtId && !wardId) return null;

    try {
      setLoadingAddress(true);
      const parts = [];
      
      if (detail || addressDetail) {
        parts.push(detail || addressDetail);
      }

      // Fetch ward name
      if (wardId && districtId) {
        try {
          const wards = await locationApi.getWards(districtId);
          const ward = wards.find(w => w.id === wardId);
          if (ward) parts.push(ward.name);
        } catch (e) {
          console.error('Failed to fetch ward:', e);
        }
      }

      // Fetch district name
      if (districtId && provinceId) {
        try {
          const districts = await locationApi.getDistricts(provinceId);
          const district = districts.find(d => d.id === districtId);
          if (district) parts.push(district.name);
        } catch (e) {
          console.error('Failed to fetch district:', e);
        }
      }

      // Fetch province name
      if (provinceId) {
        try {
          const provinces = await locationApi.getProvinces();
          const province = provinces.find(p => p.id === provinceId);
          if (province) parts.push(province.name);
        } catch (e) {
          console.error('Failed to fetch province:', e);
        }
      }

      return parts.length > 0 ? parts.join(', ') : null;
    } catch (error) {
      console.error('Failed to resolve address:', error);
      return null;
    } finally {
      setLoadingAddress(false);
    }
  };

  // Backend returns addressText (already formatted with full address)
  useEffect(() => {
  
    if (profile?.addressText && typeof profile.addressText === 'string' && profile.addressText.trim()) {
      setResolvedAddress(profile.addressText.trim());
      return;
    }

    // Fallback: use address field (should be same as addressText)
    if (profile?.address && typeof profile.address === 'string') {
      const addressStr = profile.address.trim();
      // Only use if it's not a JSON string and has more than just a number
      if (addressStr && !addressStr.startsWith('{') && (addressStr.includes(',') || addressStr.length > 10)) {
        setResolvedAddress(addressStr);
        return;
      }
    }

    // Last resort: if we have addressObject with IDs, fetch from location API
    if (profile?.addressObject && typeof profile.addressObject === 'object') {
      const addressObj = profile.addressObject;
      if (addressObj.provinceId || addressObj.districtId || addressObj.wardId) {
        resolveAddressFromIds(addressObj).then(resolved => {
          setResolvedAddress(resolved);
        });
        return;
      }
    }

    setResolvedAddress(null);
  }, [profile?.addressText, profile?.address, profile?.addressObject]);

  const primaryAddress = resolvedAddress;
  const contactAddress = formatAddress(profile?.contact?.address);

  // Check if there is any info to display to avoid rendering an empty card
  const hasInfo = profile?.bio || primaryAddress || profile?.phone || profile?.email || profile?.gender;

  if (!hasInfo) {
    return null; // Don't render anything if there's no information
  }

  return (
    <div
      className={cn(
        'bg-card rounded-lg p-6 border-[0.5px] border-border/20',
        'shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
      )}
    >
      <h3 className={cn('text-lg font-semibold text-foreground mb-4')}>
        {t('profile.about')}
      </h3>
      <div className={cn('space-y-3 text-sm')}>
        {profile.bio && (
          <p className={cn('text-foreground whitespace-pre-wrap leading-relaxed border-b border-border/50 pb-4')}>
            {profile.bio}
          </p>
        )}
        <div className={cn('space-y-2 text-muted-foreground pt-2')}>
          {loadingAddress ? (
            <div className="flex items-center gap-3">
              <i className="bx bx-map text-lg w-5 text-center"></i>
              <span className="text-muted-foreground/60">Đang tải địa chỉ...</span>
            </div>
          ) : primaryAddress ? (
            <div className="flex items-center gap-3">
              <i className="bx bx-map text-lg w-5 text-center"></i>
              <span>{primaryAddress}</span>
            </div>
          ) : null}
          {profile.phone && (
            <div className="flex items-center gap-3">
              <i className="bx bx-phone text-lg w-5 text-center"></i>
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-3">
              <i className="bx bx-envelope text-lg w-5 text-center"></i>
              <span>{profile.email}</span>
            </div>
          )}
          {profile.gender && (
            <div className="flex items-center gap-3">
              <i className="bx bx-user text-lg w-5 text-center"></i>
              <span>{displayGender(profile.gender)}</span>
            </div>
          )}
        </div>
        {profile.contact && (profile.contact.email || profile.contact.phone || contactAddress) && (
          <div className={cn('mt-4 pt-4 border-t border-border/30 space-y-2 text-muted-foreground text-sm')}>
            <h4 className={cn('text-base font-semibold text-foreground mb-2')}>
              {t('publicProfile.contact')}
            </h4>
            {profile.contact.email && (
              <div className="flex items-center gap-2">
                <i className="bx bx-envelope text-base"></i>
                <span>{profile.contact.email}</span>
              </div>
            )}
            {profile.contact.phone && (
              <div className="flex items-center gap-2">
                <i className="bx bx-phone text-base"></i>
                <span>{profile.contact.phone}</span>
              </div>
            )}
            {contactAddress && (
              <div className="flex items-center gap-2">
                <i className="bx bx-map text-base"></i>
                <span>{contactAddress}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

ProfileInfoSection.propTypes = {
  profile: PropTypes.shape({
    bio: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    addressText: PropTypes.string,
    addressObject: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    address: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    addressRaw: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    phone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    email: PropTypes.string,
    gender: PropTypes.string,
    contact: PropTypes.shape({
      email: PropTypes.string,
      phone: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      address: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    })
  })
};
