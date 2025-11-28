import { useMemo } from 'react';
import { getSession } from '../utils/sessionManager';

/**
 * Hook to check if a given entityId belongs to the current user's ACTIVE role
 * Only checks if entityId matches the activeEntity's EntityAccountId
 * Different roles (even from same AccountId) are considered different profiles
 * 
 * @param {string} entityId - EntityAccountId to check ownership for
 * @returns {boolean} True if entityId matches current activeEntity's EntityAccountId
 */
export function useIsOwnProfile(entityId) {
  return useMemo(() => {
    if (!entityId) return false;

    try {
      const session = getSession();
      if (!session) return false;

      // Normalize entityId for comparison
      const normalizedEntityId = String(entityId).toLowerCase().trim();

      // Only check activeEntity's EntityAccountId (not all roles)
      // This ensures that dancer/dj/bar viewing root account is NOT considered own profile
      const activeEntityAccountId = 
        session.activeEntity?.EntityAccountId ||
        session.activeEntity?.entityAccountId ||
        null;

      if (!activeEntityAccountId) return false;

      // Check if normalizedEntityId matches activeEntity's EntityAccountId
      return String(activeEntityAccountId).toLowerCase().trim() === normalizedEntityId;
    } catch (error) {
      console.error('[useIsOwnProfile] Error checking ownership:', error);
      return false;
    }
  }, [entityId]);
}

