/**
 * menuDataNormalizer.js
 * Utilities to normalize data from different sources for the unified menu
 */

/**
 * Normalize account data from session
 * @param {Object} account - Raw account data
 * @returns {Object} Normalized account object
 */
export function normalizeAccount(account) {
  if (!account) return null;

  return {
    id: account.id || account.AccountId || account.ID,
    userName: account.userName || account.UserName,
    email: account.email || account.Email,
    avatar: account.avatar || account.Avatar,
    role: (account.role || account.Role || "customer").toLowerCase(),
    phone: account.phone || account.Phone,
    address: account.address || account.Address,
  };
}

/**
 * Normalize entity data
 * @param {Object} entity - Raw entity data
 * @returns {Object} Normalized entity object
 */
export function normalizeEntity(entity) {
  if (!entity) return null;

  // Extract ID from various possible field names
  const id =
    entity.id ||
    entity.BarPageId ||
    entity.AccountId ||
    entity.BussinessAccountId ||
    entity.BusinessAccountId ||
    entity.BusinessId ||
    null;

  // Extract name from various possible field names
  const name =
    entity.name ||
    entity.BarName ||
    entity.UserName ||
    entity.userName ||
    entity.Name ||
    "";

  // Extract avatar
  const avatar = entity.avatar || entity.Avatar || "";

  // Extract role - prioritize role field
  const role = (entity.role || entity.Role || "").toLowerCase();

  // Determine type
  let type = entity.type || entity.Type;
  if (!type) {
    if (entity.BarPageId) type = "BarPage";
    else if (entity.BussinessAccountId || entity.BusinessAccountId) type = "Business";
    else if (entity.AccountId || entity.id) type = "Account";
  }
  
  // Map BusinessAccount to Business for filtering compatibility, but preserve role
  if (type === "BusinessAccount") {
    type = "Business";
  }

  // Extract EntityAccountId if present
  const entityAccountId = entity.EntityAccountId || entity.entityAccountId || null;

  return {
    id,
    name: name || "(Không tên)",
    avatar,
    role: role || "customer",
    type: type || "Account",
    EntityAccountId: entityAccountId,  // Preserve EntityAccountId
  };
}

/**
 * Normalize entities array
 * @param {Array} entities - Raw entities array
 * @returns {Array} Normalized entities array
 */
export function normalizeEntities(entities) {
  if (!Array.isArray(entities)) return [];

  return entities.map((entity) => normalizeEntity(entity));
}

/**
 * Get account ID from various field names
 * @param {Object} account - Account object
 * @returns {string|null} Account ID
 */
export function getAccountId(account) {
  if (!account) return null;
  return account.id || account.AccountId || account.ID || null;
}

/**
 * Normalize session data
 * @param {Object} session - Raw session data
 * @returns {Object} Normalized session object
 */
export function normalizeSession(session) {
  if (!session) return null;

  const account = normalizeAccount(session.account);
  const entities = normalizeEntities(session.entities);

  // Normalize activeEntity
  let activeEntity = null;
  if (session.activeEntity) {
    activeEntity = normalizeEntity(session.activeEntity);

    // Try to find the full entity in the entities list to preserve EntityAccountId
    if (activeEntity && entities.length > 0) {
      const found = entities.find(
        (e) => String(e.id) === String(activeEntity.id) && e.type === activeEntity.type
      );
      if (found) {
        // Preserve EntityAccountId from found entity, or keep existing one
        activeEntity = { 
          ...found, 
          ...activeEntity,
          EntityAccountId: found.EntityAccountId || activeEntity.EntityAccountId || null
        };
      }
    }
  }

  // If no activeEntity, default to first entity or account
  if (!activeEntity && entities.length > 0) {
    activeEntity = entities[0];
  } else if (!activeEntity && account) {
    // Try to find Account entity in entities list to get EntityAccountId
    const accountEntity = entities.find(e => e.type === "Account");
    activeEntity = {
      id: account.id,
      name: account.userName,
      avatar: account.avatar,
      role: account.role,
      type: "Account",
      EntityAccountId: accountEntity?.EntityAccountId || account?.EntityAccountId || account?.entityAccountId || null,
    };
  }

  return {
    account,
    entities,
    activeEntity,
    access_token: session.access_token,
  };
}

/**
 * Create default entity from account
 * @param {Object} account - Account object
 * @returns {Object} Default entity
 */
export function createAccountEntity(account, entityAccountId = null) {
  const normalizedAccount = normalizeAccount(account);
  if (!normalizedAccount) return null;

  return {
    id: normalizedAccount.id,
    name: normalizedAccount.userName,
    avatar: normalizedAccount.avatar,
    role: normalizedAccount.role,
    type: "Account",
    EntityAccountId: entityAccountId || account?.EntityAccountId || account?.entityAccountId || null,  // Preserve EntityAccountId if provided
  };
}

