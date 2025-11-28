import { useCallback, useState } from "react";

export default function useLivestreamManager() {
  const [activeLivestream, setActiveLivestream] = useState(null);
  const [isBroadcasterOpen, setBroadcasterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openViewer = useCallback((stream) => {
    setActiveLivestream(stream);
  }, []);

  const closeViewer = useCallback(() => {
    setActiveLivestream(null);
  }, []);

  const openBroadcaster = useCallback(() => {
    setBroadcasterOpen(true);
  }, []);

  const closeBroadcaster = useCallback(
    ({ refresh = false } = {}) => {
      setBroadcasterOpen(false);
      if (refresh) {
        setRefreshKey((prev) => prev + 1);
      }
    },
    []
  );

  return {
    activeLivestream,
    openViewer,
    closeViewer,
    isBroadcasterOpen,
    openBroadcaster,
    closeBroadcaster,
    refreshKey,
  };
}

