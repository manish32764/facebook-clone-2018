import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Button, Card, Spinner } from '@atoms/index';
import { EmptyState, NotificationItem } from '@molecules/index';
import { notificationApi } from '@/api/endpoints';
import type { AppNotification } from '@/types';
import styles from './NotificationsPage.module.css';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async (targetPage: number, replace: boolean) => {
    setIsLoading(true);
    try {
      const result = await notificationApi.list(targetPage, PAGE_SIZE);
      setItems((current) => (replace ? result.items : [...current, ...result.items]));
      setHasMore(result.hasMore);
      setPage(targetPage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0, true);
  }, [load]);

  async function open(notification: AppNotification) {
    if (!notification.read) {
      setItems((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      );
      await notificationApi.markRead(notification.id).catch(() => undefined);
    }
    if (notification.link) navigate(notification.link);
  }

  return (
    <AppShell layout="wide" title="Notifications">
      <Card
        title="Notifications"
        padded={false}
        action={
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              setItems((current) => current.map((item) => ({ ...item, read: true })));
              void notificationApi.markAllRead().catch(() => undefined);
            }}
          >
            Mark all as read
          </button>
        }
      >
        {isLoading && items.length === 0 ? (
          <div className={styles.loading}>
            <Spinner label="Loading notifications" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No notifications yet"
            description="Reactions, comments, friend requests and messages all show up here."
          />
        ) : (
          <div className={styles.list}>
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={(item) => void open(item)}
                onDismiss={(id) => {
                  setItems((current) => current.filter((item) => item.id !== id));
                  void notificationApi.remove(id).catch(() => undefined);
                }}
              />
            ))}
          </div>
        )}
      </Card>

      {hasMore && (
        <div className={styles.more}>
          <Button variant="secondary" disabled={isLoading} onClick={() => void load(page + 1, false)}>
            {isLoading ? 'Loading…' : 'See older notifications'}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
