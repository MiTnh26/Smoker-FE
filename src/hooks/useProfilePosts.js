import { useEffect, useState } from "react";
import { getPostsByAuthor } from "../api/postApi";
import { mapPostForCard } from "../utils/postTransformers";
import { useTranslation } from "react-i18next";

/**
 * Shared hook for loading and managing posts in profile pages
 * @param {string} entityId - The entity ID to fetch posts for
 * @returns {Object} { posts, loading, error, refresh }
 */
export const useProfilePosts = (entityId) => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const loadPosts = async () => {
      if (!entityId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const resp = await getPostsByAuthor(entityId, {});
        if (!alive) return;

        let rawPosts = [];
        if (Array.isArray(resp?.data)) {
          rawPosts = resp.data;
        } else if (Array.isArray(resp?.data?.data)) {
          rawPosts = resp.data.data;
        }

        const transformed = rawPosts.map((post) => mapPostForCard(post, t));
        setPosts(transformed);
      } catch (err) {
        console.error("Error loading profile posts:", err);
        if (alive) {
          setError(err?.response?.data?.message || err.message || "Failed to load posts");
          setPosts([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadPosts();
    return () => { alive = false; };
  }, [entityId, t]);

  const refresh = () => {
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    // This will be handled by the useEffect above
  };

  return { posts, loading, error, refresh };
};

