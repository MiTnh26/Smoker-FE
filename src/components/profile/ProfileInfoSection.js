import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { displayGender } from '../../utils/profileDataMapper';

const formatAddress = (address) => {
  if (!address) return null;

  if (typeof address === 'string') {
    const trimmed = address.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return formatAddress(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
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

    if (fullAddress) return fullAddress;

    const parts = [
      detail || addressDetail,
      wardName || ward,
      districtName || district,
      provinceName || province
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(', ');
  }

  return null;
};

/**
 * A shared component to display common profile information.
 * Renders bio, address, phone, email, and gender.
 */
export const ProfileInfoSection = ({ profile }) => {
  const { t } = useTranslation();

  const primaryAddress = formatAddress(
    profile?.addressText ||
    profile?.addressObject ||
    profile?.address ||
    profile?.addressRaw
  );
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
          {primaryAddress && (
            <div className="flex items-center gap-3">
              <i className="bx bx-map text-lg w-5 text-center"></i>
              <span>{primaryAddress}</span>
            </div>
          )}
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
