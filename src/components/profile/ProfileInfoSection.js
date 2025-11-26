import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { displayGender } from '../../utils/profileDataMapper';

/**
 * A shared component to display common profile information.
 * Renders bio, address, phone, email, and gender.
 */
export const ProfileInfoSection = ({ profile }) => {
  const { t } = useTranslation();

  // Check if there is any info to display to avoid rendering an empty card
  const hasInfo = profile?.bio || profile?.address || profile?.phone || profile?.email || profile?.gender;

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
          {profile.address && (
            <div className="flex items-center gap-3">
              <i className="bx bx-map text-lg w-5 text-center"></i>
              <span>{profile.address}</span>
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
      </div>
    </div>
  );
};
