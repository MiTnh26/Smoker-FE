/**
 * sessionManager.js
 * Centralized session management utility for consistent session handling
 */

const SESSION_KEY = "session";
const TOKEN_KEY = "token"; // Keep for backward compatibility
const SESSION_VERSION = "1.0"; // Version for future migrations

/**
 * Get session from localStorage
 * @returns {Object|null} Session object or null if not found
 */
export function getSession() {
  try {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    if (!sessionRaw) return null;
    
    const session = JSON.parse(sessionRaw);
    
    // Validate session structure
    if (!session || typeof session !== 'object') {
      console.warn("[sessionManager] Invalid session structure");
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("[sessionManager] Error reading session:", error);
    return null;
  }
}

/**
 * Save session to localStorage
 * @param {Object} session - Session object to save
 * @returns {boolean} Success status
 */
export function saveSession(session) {
  try {
    if (!session || typeof session !== 'object') {
      console.error("[sessionManager] Invalid session object");
      return false;
    }
    
    // Ensure required fields
    const sessionToSave = {
      ...session,
      _version: SESSION_VERSION,
      _updatedAt: new Date().toISOString(),
    };
    
    // Also save token separately for backward compatibility
    if (sessionToSave.token) {
      localStorage.setItem(TOKEN_KEY, sessionToSave.token);
    }
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
    return true;
  } catch (error) {
    console.error("[sessionManager] Error saving session:", error);
    return false;
  }
}

/**
 * Update session (merge with existing)
 * @param {Object} updates - Partial session object to merge
 * @returns {boolean} Success status
 */
export function updateSession(updates) {
  try {
    const currentSession = getSession() || {};
    
    // Preserve EntityAccountId when updating - don't overwrite with null
    const preservedUpdates = { ...updates };
    
    // If updating account and new EntityAccountId is null but current has one, preserve it
    if (updates.account && updates.account.EntityAccountId === null && currentSession.account?.EntityAccountId) {
      preservedUpdates.account = {
        ...updates.account,
        EntityAccountId: currentSession.account.EntityAccountId
      };
    }
    
    // If updating activeEntity and new EntityAccountId is null but current has one, preserve it
    if (updates.activeEntity && updates.activeEntity.EntityAccountId === null && currentSession.activeEntity?.EntityAccountId) {
      preservedUpdates.activeEntity = {
        ...updates.activeEntity,
        EntityAccountId: currentSession.activeEntity.EntityAccountId
      };
    }
    
    // If updating entities array, preserve EntityAccountId for Account entity
    if (updates.entities && Array.isArray(updates.entities)) {
      const currentAccountEntity = currentSession.entities?.find(e => e.type === "Account");
      const updatedAccountEntity = updates.entities.find(e => e.type === "Account");
      
      if (currentAccountEntity?.EntityAccountId && updatedAccountEntity && !updatedAccountEntity.EntityAccountId) {
        updatedAccountEntity.EntityAccountId = currentAccountEntity.EntityAccountId;
      }
    }
    
    const updatedSession = {
      ...currentSession,
      ...preservedUpdates,
      _version: SESSION_VERSION,
      _updatedAt: new Date().toISOString(),
    };
    
    return saveSession(updatedSession);
  } catch (error) {
    console.error("[sessionManager] Error updating session:", error);
    return false;
  }
}

/**
 * Update specific field in session
 * @param {string} field - Field path (e.g., 'account.avatar', 'activeEntity.name')
 * @param {any} value - Value to set
 * @returns {boolean} Success status
 */
export function updateSessionField(field, value) {
  try {
    const session = getSession();
    if (!session) {
      console.warn("[sessionManager] No session to update");
      return false;
    }
    
    const keys = field.split('.');
    const lastKey = keys.pop();
    let target = session;
    
    // Navigate to nested object
    for (const key of keys) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Set value
    target[lastKey] = value;
    
    return saveSession(session);
  } catch (error) {
    console.error("[sessionManager] Error updating session field:", error);
    return false;
  }
}

/**
 * Get token from session or separate storage
 * @returns {string|null} Token or null
 */
export function getToken() {
  // First try separate token storage (for backward compatibility)
  let token = localStorage.getItem(TOKEN_KEY);
  
  // If not found, try session
  if (!token) {
    const session = getSession();
    token = session?.token || session?.accessToken || null;
  }
  
  return token;
}

/**
 * Clear session and token
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("access_token"); // Legacy key
  } catch (error) {
    console.error("[sessionManager] Error clearing session:", error);
  }
}

/**
 * Check if session exists and is valid
 * @returns {boolean} True if session exists and has required fields
 */
export function hasValidSession() {
  const session = getSession();
  if (!session) return false;
  
  // Check for required fields
  const hasAccount = session.account && typeof session.account === 'object';
  const hasToken = !!(session.token || getToken());
  
  return hasAccount && hasToken;
}

/**
 * Get account from session
 * @returns {Object|null} Account object or null
 */
export function getAccount() {
  const session = getSession();
  return session?.account || null;
}

/**
 * Get active entity from session
 * @returns {Object|null} Active entity object or null
 */
export function getActiveEntity() {
  const session = getSession();
  return session?.activeEntity || null;
}

/**
 * Get entities from session
 * @returns {Array} Entities array (empty if not found)
 */
export function getEntities() {
  const session = getSession();
  return Array.isArray(session?.entities) ? session.entities : [];
}

/**
 * Set active entity in session
 * @param {Object} entity - Entity object to set as active
 * @returns {boolean} Success status
 */
export function setActiveEntity(entity) {
  if (!entity || typeof entity !== 'object') {
    console.error("[sessionManager] Invalid entity object");
    return false;
  }
  
  return updateSession({ activeEntity: entity });
}

/**
 * Refresh entities from API and update session
 * @param {Function} fetchEntities - Function that returns Promise with entities
 * @returns {Promise<Array>} Refreshed entities array
 */
export async function refreshEntities(fetchEntities) {
  try {
    if (typeof fetchEntities !== 'function') {
      throw new TypeError("fetchEntities must be a function");
    }
    
    const entities = await fetchEntities();
    const session = getSession();
    
    if (session) {
      updateSession({ entities: Array.isArray(entities) ? entities : [] });
    }
    
    return Array.isArray(entities) ? entities : [];
  } catch (error) {
    console.error("[sessionManager] Error refreshing entities:", error);
    return [];
  }
}

/**
 * Initialize session from login response
 * @param {Object} loginData - Login response data
 * @param {string} loginData.token - Auth token
 * @param {Object} loginData.user - User account data
 * @param {Array} loginData.entities - Entities array
 * @param {string} loginData.entityAccountId - Account EntityAccountId
 * @returns {boolean} Success status
 */
export function initializeSession(loginData) {
  const { token, user, entities = [], entityAccountId } = loginData;
  
  if (!token || !user) {
    console.error("[sessionManager] Invalid login data");
    return false;
  }
  
  // Find Account entity and update with EntityAccountId
  const accountEntity = entities.find(e => e.type === "Account");
  if (accountEntity && entityAccountId) {
    accountEntity.EntityAccountId = entityAccountId;
  } else if (accountEntity && !accountEntity.EntityAccountId) {
    // Try to preserve EntityAccountId from user object if entityAccountId param is null
    accountEntity.EntityAccountId = user.EntityAccountId || user.entityAccountId || null;
  }
  
  // Add EntityAccountId to account object - prioritize provided entityAccountId
  const accountWithEntityId = {
    ...user,
    EntityAccountId: entityAccountId || user.EntityAccountId || user.entityAccountId || null,
  };
  
  // Use entityAccountId from parameter, or from accountEntity, or from user object
  const finalEntityAccountId = entityAccountId || accountEntity?.EntityAccountId || user.EntityAccountId || user.entityAccountId || null;
  
  if (!finalEntityAccountId) {
    console.warn("[sessionManager] EntityAccountId is null when initializing session. This may cause issues.");
  }
  
  const session = {
    token,
    account: accountWithEntityId, // Account now includes EntityAccountId
    entities: Array.isArray(entities) ? entities : [],
    activeEntity: {
      type: "Account",
      id: user.id,
      name: user.userName,
      avatar: user.avatar,
      role: user.role || "Customer",
      EntityAccountId: finalEntityAccountId,
    },
    _createdAt: new Date().toISOString(),
  };
  
  return saveSession(session);
}

// Export default object for convenience
export default {
  getSession,
  saveSession,
  updateSession,
  updateSessionField,
  getToken,
  clearSession,
  hasValidSession,
  getAccount,
  getActiveEntity,
  getEntities,
  setActiveEntity,
  refreshEntities,
  initializeSession,
};

