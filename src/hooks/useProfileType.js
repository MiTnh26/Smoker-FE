import { useMemo } from 'react';

/**
 * Hook to determine profile type from profile data
 * Returns normalized profile type information
 * 
 * @param {Object} profile - Profile data object
 * @returns {Object} Profile type information
 */
export function useProfileType(profile) {
  return useMemo(() => {
    if (!profile) {
      return {
        type: null,
        isBar: false,
        isDJ: false,
        isDancer: false,
        isCustomer: false,
        isPerformer: false
      };
    }

    // Get type and role from profile (handle both PascalCase and camelCase)
    const type = (profile.type || profile.Type || "").toString().toUpperCase();
    const role = (profile.role || profile.Role || "").toString().toUpperCase();

    // Determine profile type
    let profileType = null;
    let isBar = false;
    let isDJ = false;
    let isDancer = false;
    let isCustomer = false;
    let isPerformer = false;

    // Check type first (more reliable)
    if (type === "BAR" || type === "BARPAGE" || type.includes("BARPAGE")) {
      profileType = "BarPage";
      isBar = true;
    } else if (type === "BUSINESS" || type === "BUSINESSACCOUNT") {
      profileType = "BusinessAccount";
      isPerformer = true;
      
      // Determine if DJ or Dancer from role
      if (role === "DJ") {
        isDJ = true;
      } else if (role === "DANCER") {
        isDancer = true;
      }
    } else if (type === "ACCOUNT" || !type) {
      // Fallback to role only if type is not available or is Account
      if (role === "BAR" || role.includes("BARPAGE")) {
        profileType = "BarPage";
        isBar = true;
      } else if (role === "DJ") {
        profileType = "BusinessAccount";
        isDJ = true;
        isPerformer = true;
      } else if (role === "DANCER") {
        profileType = "BusinessAccount";
        isDancer = true;
        isPerformer = true;
      } else {
        profileType = "Account";
        isCustomer = true;
      }
    } else {
      // Default to Account
      profileType = "Account";
      isCustomer = true;
    }

    return {
      type: profileType,
      isBar,
      isDJ,
      isDancer,
      isCustomer,
      isPerformer
    };
  }, [profile]);
}

