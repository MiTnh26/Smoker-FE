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
    console.error("[fetchAllEntities] Error fetching bars:", error);
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
    console.error("[fetchAllEntities] Error fetching businesses:", error);
  }

  console.log("[fetchAllEntities] Fetched entities:", entities);
  return entities;
}

