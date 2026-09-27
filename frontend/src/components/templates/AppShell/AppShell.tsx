import type { ReactNode } from 'react';
import { ChatDock, LeftSidebar, RightSidebar, TopChrome } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePolling } from '@/hooks/usePolling';
import { adApi, eventApi, friendApi, userApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import styles from './AppShell.module.css';

export type ShellLayout = 'feed' | 'wide' | 'profile' | 'full';

export interface AppShellProps {
  children: ReactNode;
  /**
   * `feed`    three columns, a fixed-width middle (News Feed)
   * `wide`    three columns, middle column takes all remaining width (Friends)
   * `profile` single 851px well with no rails (Profile) - the 2018 layout
   * `full`    one full-width column, no rails (Messenger, Watch, Marketplace)
   */
  layout?: ShellLayout;
  /** Shown in the tab title, prefixed with the unread count. */
  title?: string;
}

/** Online dots go stale quickly, so they refresh faster than the badges do. */
const PRESENCE_POLL_MS = 20_000;

/**
 * The signed-in chrome. It owns the lookups the top bar and both rails need -
 * friends, requests, unread counts, presence, reminders - so pages only fetch
 * what is unique to them, and it hosts the Messenger dock so an open chat
 * survives navigation.
 */
export function AppShell({ children, layout = 'feed', title = 'Facebook' }: AppShellProps) {
  const { data: friends } = useAsync(() => friendApi.mine(), []);
  const { data: requests } = useAsync(() => friendApi.requests(), []);
  const { data: birthdays } = useAsync(() => userApi.birthdays(), []);
  const { data: events } = useAsync(() => eventApi.upcoming(), []);
  const { data: ads } = useAsync(() => adApi.serve(2), []);
  const onlineQuery = useAsync(() => friendApi.online(), []);
  const { counts, refresh } = useUnreadCounts();

  usePolling(() => onlineQuery.reload(), PRESENCE_POLL_MS);

  useDocumentTitle(title, counts.messages + counts.notifications + counts.friendRequests);

  const friendList = friends ?? [];
  // The counts poll is authoritative once it lands; the list read covers first paint.
  const requestCount = counts.friendRequests || requests?.length || 0;

  const chrome = (
    <TopChrome
      pendingRequestCount={requestCount}
      messageCount={counts.messages}
      notificationCount={counts.notifications}
      onCountsChanged={() => void refresh()}
    />
  );

  if (layout === 'profile' || layout === 'full') {
    return (
      <div className={styles.shell}>
        {chrome}
        <div className={layout === 'profile' ? styles.profileLayout : styles.fullLayout}>
          <main className={styles.profileMain}>{children}</main>
        </div>
        <ChatDock />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {chrome}

      <div className={styles.layout}>
        <LeftSidebar friends={friendList} friendRequestCount={requestCount} />

        <main className={classNames(styles.main, layout === 'wide' && styles.wide)}>{children}</main>

        <RightSidebar
          contacts={friendList}
          onlineIds={onlineQuery.data ?? []}
          birthdays={birthdays ?? []}
          upcomingEvents={events ?? []}
          ads={ads ?? []}
        />
      </div>

      <ChatDock />
    </div>
  );
}
