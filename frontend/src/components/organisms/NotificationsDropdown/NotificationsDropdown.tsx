import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@atoms/index';
import { EmptyState, NotificationItem } from '@molecules/index';
import { notificationApi } from '@/api/endpoints';
import type { AppNotification } from '@/types';
import styles from './NotificationsDropdown.module.css';

export interface NotificationsDropdownProps {
  onClose: () => void;
  /** Lets the chrome badge drop as soon as the list is read. */
  onCountsChanged: () => void;
}

/** The bell panel: the ten most recent notifications, newest first. */
export function NotificationsDropdown({ onClose, onCountsChanged }: NotificationsDropdownProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const page = await notificationApi.list(0, 10);
      setItems(page.items);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(notification: AppNotification) {
    onClose();
    if (!notification.read) {
      await notificationApi.markRead(notification.id).catch(() => undefined);
      onCountsChanged();
    }
    if (notification.link) navigate(notification.link);
  }

  async function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    await notificationApi.markAllRead().catch(() => undefined);
    onCountsChanged();
  }

  return (
    <div className={styles.panel} role="menu" aria-label="Notifications">
      <div className={styles.header}>
        <span className={styles.title}>Notifications</span>
        <button type="button" className={styles.action} onClick={() => void markAllRead()}>
          Mark all as read
        </button>
      </div>

      <div className={styles.body}>
        {isLoading ? (
          <Spinner size="sm" />
        ) : items.length === 0 ? (
          <EmptyState icon="bell" title="Nothing new" description="You are all caught up." />
        ) : (
          items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={(item) => void open(item)}
              onDismiss={(id) => {
                setItems((current) => current.filter((item) => item.id !== id));
                void notificationApi.remove(id).then(onCountsChanged).catch(() => undefined);
              }}
            />
          ))
        )}
      </div>

      <button
        type="button"
        className={styles.footer}
        onClick={() => {
          onClose();
          navigate('/notifications');
        }}
      >
        See All Notifications
      </button>
    </div>
  );
}
