import { useEffect, useState } from "react";
import { userApi } from "../api/userApi";

/**
 * Shared hook for resolving current user's entity ID from session
 * Used across all profile pages for determining ownership and permissions
 * @returns {string|null} The current user's EntityAccountId
 */
export const useCurrentUserEntity = () => {
  const [currentUserEntityId, setCurrentUserEntityId] = useState(null);

  useEffect(() => {
    const resolveCurrentUserEntityId = async () => {
      try {
        const sessionRaw = localStorage.getItem("session");
        if (!sessionRaw) return;
        const session = JSON.parse(sessionRaw);
        const active = session?.activeEntity || {};
        const entities = session?.entities || [];

        // Priority: EntityAccountId from activeEntity > EntityAccountId from matching entity in entities list > fetch from API
        let resolvedId =
          active.EntityAccountId ||
          active.entityAccountId ||
          null;

        // If not found in activeEntity, try to find in entities list
        if (!resolvedId && active.id && active.type) {
          const foundEntity = entities.find(
            e => String(e.id) === String(active.id) &&
              (e.type === active.type ||
                (e.type === "BusinessAccount" && active.type === "Business"))
          );
          resolvedId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
        }

        // If still not found and we have active.id, try to fetch EntityAccountId from API
        if (!resolvedId && active.id && active.type && session?.account?.id) {
          try {
            // For BarPage or Business, try to get EntityAccountId from entities API
            if (active.type === "BarPage" || active.type === "Business") {
              const entitiesRes = await userApi.getEntities(session.account.id);
              const refreshedEntities = entitiesRes?.data?.data || entitiesRes?.data || [];
              const foundEntity = refreshedEntities.find(
                e => String(e.id) === String(active.id) &&
                  (e.type === active.type ||
                    (e.type === "BusinessAccount" && active.type === "Business"))
              );
              resolvedId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;

              // Update session with refreshed entities if found
              if (resolvedId && refreshedEntities.length > 0) {
                session.entities = refreshedEntities;
                localStorage.setItem("session", JSON.stringify(session));
              }
            }
          } catch (err) {
            console.warn("[useCurrentUserEntity] Failed to fetch EntityAccountId:", err);
          }
        }

        // Final fallback: use active.id only if it looks like a UUID (EntityAccountId format)
        // Don't use BarPageId as EntityAccountId
        if (!resolvedId && active.id && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(active.id)) {
          resolvedId = active.id;
        }

        // Simple fallback for other cases
        if (!resolvedId) {
          resolvedId = active.id ||
            entities[0]?.EntityAccountId ||
            entities[0]?.entityAccountId ||
            null;
        }

        setCurrentUserEntityId(resolvedId || null);
      } catch (err) {
        console.error("[useCurrentUserEntity] Error resolving currentUserEntityId:", err);
        setCurrentUserEntityId(null);
      }
    };

    // Initial resolve
    resolveCurrentUserEntityId();

    // Listen for session updates (when user switches role)
    const handleSessionUpdate = () => {
      resolveCurrentUserEntityId();
    };

    window.addEventListener('sessionUpdated', handleSessionUpdate);
    window.addEventListener('profileUpdated', handleSessionUpdate);

    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
      window.removeEventListener('profileUpdated', handleSessionUpdate);
    };
  }, []);

  return currentUserEntityId;
};

