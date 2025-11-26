/**
 * sessionHelper.js
 * Helper functions for managing session data
 */

import barPageApi from "../api/barPageApi";
import businessApi from "../api/businessApi";
import { normalizeEntity, createAccountEntity } from "./menuDataNormalizer";

/**
 * Fetch all entities (bars, businesses, account) for a user
 * @param {string} accountId - The account ID
 * @param {Object} user - The user account object
 * @returns {Array} Array of normalized entities
 */
export async function fetchAllEntities(accountId, user) {
  const entities = [];

  // Add account entity
  const accountEntity = createAccountEntity(user);
  if (accountEntity) {
    entities.push(accountEntity);
  }

  try {
    // Fetch bars
    const barsResponse = await barPageApi.getBarPageByAccountId(accountId);
    if (barsResponse && barsResponse.data && Array.isArray(barsResponse.data)) {
      barsResponse.data.forEach(bar => {
        // Ensure we use BarPageId, not AccountId
        // Preserve EntityAccountId from API response
        const normalized = normalizeEntity({
          ...bar,
          id: bar.BarPageId,  // Force use BarPageId
          type: "BarPage",
          role: "bar",
          EntityAccountId: bar.EntityAccountId || bar.entityAccountId  // Preserve EntityAccountId
        });
        if (normalized) {
          entities.push(normalized);
        }
      });
    } else if (barsResponse && barsResponse.data && !Array.isArray(barsResponse.data)) {
      // Single bar object
      const normalized = normalizeEntity({
        ...barsResponse.data,
        id: barsResponse.data.BarPageId,  // Force use BarPageId
        type: "BarPage",
        role: "bar",
        EntityAccountId: barsResponse.data.EntityAccountId || barsResponse.data.entityAccountId  // Preserve EntityAccountId
      });
      if (normalized) {
        entities.push(normalized);
      }
    }
  } catch (error) {
    // Suppress 404 errors (bar may not exist for this account)
    if (error?.response?.status !== 404) {
      console.error("[fetchAllEntities] Error fetching bars:", error);
    }
  }

  try {
    // Fetch businesses
    const businessesResponse = await businessApi.getBusinessesByAccountId(accountId);
    if (businessesResponse && businessesResponse.data && Array.isArray(businessesResponse.data)) {
      businessesResponse.data.forEach(business => {
        // Ensure we use BusinessAccountId or BusinessId, not AccountId
        const businessId = business.BussinessAccountId || business.BusinessAccountId || business.BusinessId || business.id;
        // Use role from backend (DJ, Dancer, or business), fallback to "business" if not available
        const businessRole = business.Role || business.role || "business";
        const normalized = normalizeEntity({
          ...business,
          id: businessId,  // Force use business ID
          type: "Business",
          role: businessRole,  // Use role from backend, not hardcoded
          EntityAccountId: business.EntityAccountId || business.entityAccountId  // Preserve EntityAccountId
        });
        if (normalized) {
          entities.push(normalized);
        }
      });
    } else if (businessesResponse && businessesResponse.data && !Array.isArray(businessesResponse.data)) {
      // Single business object
      const businessId = businessesResponse.data.BussinessAccountId || businessesResponse.data.BusinessAccountId || businessesResponse.data.BusinessId || businessesResponse.data.id;
      // Use role from backend (DJ, Dancer, or business), fallback to "business" if not available
      const businessRole = businessesResponse.data.Role || businessesResponse.data.role || "business";
      const normalized = normalizeEntity({
        ...businessesResponse.data,
        id: businessId,  // Force use business ID
        type: "Business",
        role: businessRole,  // Use role from backend, not hardcoded
        EntityAccountId: businessesResponse.data.EntityAccountId || businessesResponse.data.entityAccountId  // Preserve EntityAccountId
      });
      if (normalized) {
        entities.push(normalized);
      }
    }
  } catch (error) {
    // Suppress 404 errors (business may not exist for this account)
    if (error?.response?.status !== 404) {
      console.error("[fetchAllEntities] Error fetching businesses:", error);
    }
  }

  console.log("[fetchAllEntities] Fetched entities:", entities);
  return entities;
}

/**
 * Build a map of EntityAccountId -> entity info from session stored in localStorage
 * @returns {Map<string, {name: string, avatar: string, role: string, type: string, raw: object}>}
 */
export function getEntityMapFromSession() {
  try {
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    const entities = session?.entities || [];
    const active = session?.activeEntity;
    const list = [...entities];

    if (active) {
      const activeId = String(active.EntityAccountId || active.entityAccountId || active.id);
      if (
        activeId &&
        !entities.some(
          e => String(e.EntityAccountId || e.entityAccountId || e.id) === activeId
        )
      ) {
        list.push(active);
      }
    }

    const map = new Map();
    for (const entity of list) {
      const key = String(entity.EntityAccountId || entity.entityAccountId || entity.id).toLowerCase();
      if (!key) return;
      map.set(key, {
        name: entity.name || entity.BarName || entity.BusinessName || entity.displayName || entity.UserName || entity.userName,
        avatar: entity.avatar || entity.Avatar || null,
        role: entity.role || entity.Role,
        type: entity.type,
        raw: entity,
      });
    }
    return map;
  } catch (error) {
    console.warn("[sessionHelper] getEntityMapFromSession error:", error);
    return new Map();
  }
}

