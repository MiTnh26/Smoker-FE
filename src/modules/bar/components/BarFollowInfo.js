import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";

// entityId: id của bar hoặc entity cần lấy thông tin follow
export default function BarFollowInfo({ entityId, friends = 2, bio = "", contact = [] }) {
  const { t } = useTranslation();
  // Lấy danh sách followers và following
  const { followers, fetchFollowers, loading: loadingFollowers } = useFollowers(entityId);
  const { following, fetchFollowing, loading: loadingFollowing } = useFollowing(entityId);

  useEffect(() => {
    if (entityId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [entityId, fetchFollowers, fetchFollowing]);

  return (
    <>
      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">{t('publicProfile.followers')}</h3>
        </div>
        <div className="profile-stats">
          <div className="profile-stat-card">
            <div className="profile-stat-label">{t('publicProfile.followers')}</div>
            <div className="profile-stat-value">{loadingFollowers ? "..." : followers.length}</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-label">{t('publicProfile.following')}</div>
            <div className="profile-stat-value">{loadingFollowing ? "..." : following.length}</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-label">{t('publicProfile.friends')}</div>
            <div className="profile-stat-value">{friends}</div>
          </div>
        </div>
      </div>

      {(bio || contact.length > 0) && (
        <div className="profile-section">
          {bio && (
            <div>
              <div className="profile-section-title text-base mb-2">{t('profile.bio')}</div>
              <p className="profile-section-subtitle">{bio}</p>
            </div>
          )}

          {contact.length > 0 && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="profile-section-title text-base">{t('publicProfile.contact')}</div>
              {contact.map((c, idx) => (
                <p key={idx}>{c}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
