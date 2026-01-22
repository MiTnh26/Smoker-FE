import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { displayGender } from '../../utils/profileDataMapper';
import { locationApi } from '../../api/locationApi';
import PostCard from '../../modules/feeds/components/post/PostCard';

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
  const [copiedAddress, setCopiedAddress] = useState(false);

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

  const openAddressInMaps = (address) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPrimaryAddress = async () => {
    if (!primaryAddress) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(primaryAddress);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = primaryAddress;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  return (
    <div
      className={cn(
        'bg-card rounded-lg border-[0.5px] border-border/20',
        'shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
      )}
    >
      {/* About Section with padding */}
      <div className="p-6">
        <h3 className={cn('text-lg font-semibold text-foreground mb-4 text-center')}>
        {t('profile.about')}
      </h3>
      <div className={cn('space-y-3 text-sm')}>
        {profile.bio && (
          <p className={cn('text-foreground whitespace-pre-wrap leading-relaxed border-b border-border/50 pb-4 text-center')}>
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
            <div className="flex items-start gap-3">
              <i className="bx bx-map text-lg w-5 text-center mt-0.5"></i>
              <div className="flex-1 space-y-1">
                <button
                  type="button"
                  onClick={() => openAddressInMaps(primaryAddress)}
                  className="text-left group"
                >
                  <span className="mr-1 font-semibold">
                  {t('profile.address') || 'Địa chỉ'}:
                  </span>
                   <span className="group-hover:text-primary transition-colors">
                {primaryAddress}
              </span>
                </button>

                {/** Copy pill - modern subtle chip */}
                <button
                  type="button"
                  onClick={handleCopyPrimaryAddress}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary bg-muted/40 px-2 py-1 rounded-full mt-0.5 transition-all border border-border/40 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto translate-y-0.5 group-hover:translate-y-0"
                >
                  <i className="bx bx-copy-alt text-sm" />
                  <span>
                    {copiedAddress
                       ? (t('common.copied') !== 'common.copied' ? t('common.copied') : 'Đã sao chép')
                       : (t('common.copy') !== 'common.copy' ? t('common.copy') : 'Sao chép')}
                  </span>
                </button>
              </div>
            </div>
          ) : null}
          {profile.phone && (
            <div className="flex items-center gap-3">
              <i className="bx bx-phone text-lg w-5 text-center"></i>
              <span>
                <strong className="mr-1">
                  {t('profile.phone') || 'Liên hệ'}:
                </strong>
                {profile.phone}
              </span>
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-3">
              <i className="bx bx-envelope text-lg w-5 text-center"></i>
              <span>
                <strong className="mr-1">
                  {t('profile.email') || 'Gmail'}:
                </strong>
                {profile.email}
              </span>
            </div>
          )}
          {profile.gender && (
            <div className="flex items-center gap-3">
              <i className="bx bx-user text-lg w-5 text-center"></i>
              <span>
                <strong className="mr-1">
                  {t('profile.gender') || 'Giới tính'}:
                </strong>
                {displayGender(profile.gender)}
              </span>
            </div>
          )}
        </div>
        {profile.contact && (profile.contact.email || profile.contact.phone || contactAddress) && (
          <div className={cn('mt-4 pt-4 border-t border-border/30 space-y-2 text-muted-foreground text-sm')}>
            <h4 className={cn('text-base font-semibold text-foreground mb-2 text-center')}>
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
     </div>
   );
 };
 
/**
 * Posts List Component - Separate from ProfileInfoSection
 * Renders posts list similar to Posts Tab
 */
export const ProfilePostsSection = ({ 
  posts = [], 
  postsLoading = false, 
  onImageClick, 
  onReport,
  onEdit,
  onDelete,
  isOwnProfile = false,
  playingPost,
  setPlayingPost,
  sharedAudioRef,
  sharedCurrentTime,
  sharedDuration,
  sharedIsPlaying,
  onSeek,
  setActivePlayer
}) => {
  const { t } = useTranslation();

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-6')}>
      {postsLoading ? (
        <div className={cn("text-center py-12 text-muted-foreground")}>
          {t('common.loading')}
        </div>
      ) : (
        <div className={cn("flex flex-col gap-1.5 -mx-4 md:-mx-6")}>
          {posts.slice(0, 5).map(post => {
            const postId = post._id || post.id;
            return (
              <PostCard
                key={postId}
                post={post}
                isOwnProfile={isOwnProfile}
                onEdit={onEdit}
                onDelete={onDelete}
                onImageClick={onImageClick}
                onReport={onReport}
                playingPost={playingPost}
                setPlayingPost={(id) => {
                  setPlayingPost?.(id);
                  if (id === postId && setActivePlayer) {
                    setActivePlayer?.(post);
                  } else if (!id && setActivePlayer) {
                    setActivePlayer?.(null);
                  }
                }}
                sharedAudioRef={sharedAudioRef}
                sharedCurrentTime={sharedCurrentTime}
                sharedDuration={sharedDuration}
                sharedIsPlaying={sharedIsPlaying && playingPost === postId}
                onSeek={onSeek}
              />
            );
          })}
        </div>
      )}
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

ProfilePostsSection.propTypes = {
  posts: PropTypes.array,
  postsLoading: PropTypes.bool,
  onImageClick: PropTypes.func,
  onReport: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isOwnProfile: PropTypes.bool,
  playingPost: PropTypes.any,
  setPlayingPost: PropTypes.func,
  sharedAudioRef: PropTypes.any,
  sharedCurrentTime: PropTypes.number,
  sharedDuration: PropTypes.number,
  sharedIsPlaying: PropTypes.bool,
  onSeek: PropTypes.func,
  setActivePlayer: PropTypes.func
};
