import { useState, useCallback } from "react";
import followApi from "../api/followApi";

// Hook: Follow an entity
export function useFollow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const follow = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await followApi.follow(data);
      setLoading(false);
      return res.data;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);
  return { follow, loading, error };
}

// Hook: Unfollow an entity
export function useUnfollow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const unfollow = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await followApi.unfollow(data);
      setLoading(false);
      return res.data;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);
  return { unfollow, loading, error };
}

// Hook: Get followers list
export function useFollowers(entityId) {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchFollowers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await followApi.getFollowers(entityId);
      setFollowers(res.data);
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [entityId]);
  return { followers, fetchFollowers, loading, error };
}

// Hook: Get following list
export function useFollowing(entityId) {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchFollowing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await followApi.getFollowing(entityId);
      setFollowing(res.data);
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [entityId]);
  return { following, fetchFollowing, loading, error };
}

// Hook: Check if following
export function useCheckFollowing() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const checkFollowing = useCallback(async (followerId, followingId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await followApi.checkFollowing(followerId, followingId);
      setIsFollowing(res.data?.isFollowing || false);
      setLoading(false);
      return res.data;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);
  return { isFollowing, checkFollowing, loading, error };
}
