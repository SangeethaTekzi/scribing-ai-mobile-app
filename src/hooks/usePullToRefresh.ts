import { useCallback, useState } from "react";

/**
 * RefreshControl should reflect user pull-to-refresh only — not background
 * React Query refetches (e.g. pipeline polling).
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsUserRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsUserRefreshing(false);
    }
  }, [onRefresh]);

  return { isUserRefreshing, handleRefresh };
}
