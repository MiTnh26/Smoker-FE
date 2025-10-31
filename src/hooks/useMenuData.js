/**
 * useMenuData.js
 * Custom hook to fetch and normalize menu data
 */

import { useState, useEffect } from "react";
import {
  normalizeSession,
  normalizeAccount,
  normalizeEntities,
} from "../utils/menuDataNormalizer";

/**
 * Custom hook to manage menu data
 * @param {boolean} enabled - Whether to fetch data
 * @returns {Object} { session, userData, entities, activeEntity, loading, error }
 */
export function useMenuData(enabled = true) {
  const [session, setSession] = useState(null);
  const [userData, setUserData] = useState(null);
  const [entities, setEntities] = useState([]);
  const [activeEntity, setActiveEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      const storedSession = JSON.parse(localStorage.getItem("session"));

      if (!storedSession) {
        setError("Không tìm thấy session");
        setLoading(false);
        return;
      }

      const normalized = normalizeSession(storedSession);
      
      setSession(normalized);
      setUserData(normalized.account);
      setEntities(normalized.entities);
      setActiveEntity(normalized.activeEntity);
      
      setLoading(false);
    } catch (err) {
      console.error("[useMenuData] Error loading session:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [enabled]);

  // Listen for profile updates
  useEffect(() => {
    if (!enabled) return;

    const handleProfileUpdate = () => {
      console.log("[useMenuData] Profile updated event received");
      try {
        const storedSession = JSON.parse(localStorage.getItem("session"));
        if (storedSession) {
          const normalized = normalizeSession(storedSession);
          setSession(normalized);
          setUserData(normalized.account);
          setEntities(normalized.entities);
          setActiveEntity(normalized.activeEntity);
        }
      } catch (err) {
        console.error("[useMenuData] Error updating session:", err);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("profileUpdated", handleProfileUpdate);
      window.addEventListener("storage", handleProfileUpdate);

      return () => {
        window.removeEventListener("profileUpdated", handleProfileUpdate);
        window.removeEventListener("storage", handleProfileUpdate);
      };
    }
  }, [enabled]);

  return {
    session,
    userData,
    entities,
    activeEntity,
    loading,
    error,
  };
}

export default useMenuData;

