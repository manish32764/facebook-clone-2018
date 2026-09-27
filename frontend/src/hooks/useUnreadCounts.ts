import { useCallback, useState } from 'react';
import { notificationApi } from '@/api/endpoints';
import { usePolling } from './usePolling';
import type { UnreadCounts } from '@/types';

const EMPTY: UnreadCounts = { messages: 0, notifications: 0, friendRequests: 0 };

/**
 * The three chrome badges. One request covers all of them, and the same call
 * refreshes the presence stamp server-side, so nothing needs a second timer.
 */
export function useUnreadCounts(active = true, intervalMs = 15_000) {
  const [counts, setCounts] = useState<UnreadCounts>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      setCounts(await notificationApi.counts());
    } catch {
      /* a failed poll is not worth surfacing - the next tick will try again */
    }
  }, []);

  usePolling(() => void refresh(), intervalMs, active);

  return { counts, refresh, setCounts };
}
