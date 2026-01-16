import { useCallback, useEffect, useMemo, useState } from "react";
import { getStories, createStory } from "../../../../../api/storyApi";
import { isViewed } from "../utils/storyUtils";

const getEntityAccountId = () => {
  try {
    const raw = localStorage.getItem("session");
    const session = raw ? JSON.parse(raw) : null;
    if (!session) return null;
    const activeEntity = session?.activeEntity || session?.account;
    return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || null;
  } catch {
    return null;
  }
};

export const useStoryManager = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  const entityAccountId = useMemo(() => getEntityAccountId(), []);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      // Luôn gửi excludeViewed=false để backend không loại bỏ story đã xem.
      // FE sẽ tự xử lý sort + màu viền avatar dựa trên flag viewed.
      const params = entityAccountId
        ? { entityAccountId, excludeViewed: false }
        : { excludeViewed: false };
      const res = await getStories(params);
      const storiesData = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (entityAccountId && storiesData.length > 0) {
        storiesData.sort((a, b) => {
          const getEntity = (story) =>
            story.entityAccountId || story.authorEntityAccountId || story.EntityAccountId;
          const match = (story) =>
            getEntity(story) &&
            String(getEntity(story)).trim().toLowerCase() ===
              String(entityAccountId).trim().toLowerCase();
          if (match(a) && !match(b)) return -1;
          if (!match(a) && match(b)) return 1;
          return 0;
        });
      }

      setStories(storiesData);
    } catch (error) {
      console.error("[useStoryManager] Error fetching stories:", error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [entityAccountId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const addStoryOptimistic = useCallback(
    (payload) => {
      setStories((prev) => [payload, ...prev]);
    },
    [setStories]
  );

  const removeStoryById = useCallback((storyId) => {
    setStories((prev) => prev.filter((story) => (story._id || story.id) !== storyId));
  }, []);

  const handleCreateStory = useCallback(
    async ({ file, caption, music }) => {
      if (!file) return null;
      try {
        let session;
        try {
          const raw = localStorage.getItem("session");
          session = raw ? JSON.parse(raw) : null;
        } catch {
          session = null;
        }
        const activeEntity = session?.activeEntity || session?.account || {};
        const authorEntityId = activeEntity?.id || session?.account?.id || null;
        const rawRole = (activeEntity?.role || session?.account?.role || "").toLowerCase();
        let authorEntityType = "Account";
        if (rawRole === "bar" || rawRole === "barpage") authorEntityType = "BarPage";
        else if (rawRole === "dj" || rawRole === "dancer" || rawRole === "business")
          authorEntityType = "BusinessAccount";

        const formData = new FormData();
        formData.append("title", "Story");
        formData.append("content", caption || "");
        formData.append("caption", caption || "");
        formData.append(
          "expiredAt",
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
        );
        formData.append("images", file);
        formData.append("type", "story");
        if (entityAccountId) formData.append("entityAccountId", entityAccountId);
        if (authorEntityId) formData.append("authorEntityId", authorEntityId);
        if (authorEntityType) formData.append("authorEntityType", authorEntityType);
        if (music?.musicId) formData.append("songId", music.musicId);

        const response = await createStory(formData);
        const storyData = response?.data?.data || response?.data || response?.story || response;

        if (storyData) {
          setStories((prev) => [storyData, ...prev]);
        } else {
          await fetchStories();
        }
        return storyData;
      } catch (error) {
        console.error("[useStoryManager] Error creating story:", error);
        throw error;
      }
    },
    [entityAccountId, fetchStories]
  );

  const groupedStories = useMemo(() => {
    if (!stories || stories.length === 0) return [];

    const getUserIdentifier = (story) =>
      story.authorEntityAccountId ||
      story.authorAccountId ||
      story.entityAccountId ||
      story.accountId ||
      null;

    const userGroups = new Map();
    stories.forEach((story) => {
      const userId = getUserIdentifier(story);
      if (!userId) return;
      if (!userGroups.has(userId)) {
        userGroups.set(userId, []);
      }
      userGroups.get(userId).push(story);
    });

    return Array.from(userGroups.entries()).map(([userId, userStories]) => {
      const sorted = [...userStories].sort((a, b) => {
        const aViewed = isViewed(a);
        const bViewed = isViewed(b);
        if (aViewed !== bViewed) {
          return aViewed ? 1 : -1;
        }
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB;
      });

      const displayStory = sorted.find((s) => !isViewed(s)) || sorted[0];
      return {
        userId,
        displayStory,
        allStories: sorted,
      };
    });
  }, [stories]);

  return {
    stories,
    groupedStories,
    loadingStories: loading,
    fetchStories,
    addStoryOptimistic,
    removeStoryById,
    handleCreateStory,
    entityAccountId,
    setStories,
  };
};

