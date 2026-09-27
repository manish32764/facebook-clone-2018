import { Avatar, Icon, type IconName } from '@atoms/index';
import { classNames } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import type { AppNotification, NotificationType } from '@/types';
import styles from './NotificationItem.module.css';

export interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onDismiss?: (id: number) => void;
}

/** The small coloured glyph in the corner of the avatar, one per kind. */
const BADGE: Record<NotificationType, { icon: IconName; tone: string }> = {
  POST_REACTION: { icon: 'like', tone: 'blue' },
  COMMENT: { icon: 'comment', tone: 'blue' },
  COMMENT_REPLY: { icon: 'reply', tone: 'blue' },
  COMMENT_REACTION: { icon: 'like', tone: 'blue' },
  POST_SHARE: { icon: 'share', tone: 'blue' },
  MENTION: { icon: 'comment', tone: 'blue' },
  TAG: { icon: 'tag', tone: 'blue' },
  FRIEND_REQUEST: { icon: 'friends', tone: 'blue' },
  FRIEND_ACCEPTED: { icon: 'friends', tone: 'green' },
  GROUP_INVITE: { icon: 'users', tone: 'blue' },
  GROUP_POST: { icon: 'users', tone: 'blue' },
  EVENT_INVITE: { icon: 'calendar', tone: 'red' },
  EVENT_REMINDER: { icon: 'calendar', tone: 'red' },
  MESSAGE: { icon: 'messenger', tone: 'blue' },
  BIRTHDAY: { icon: 'smiley', tone: 'red' },
  MEMORY: { icon: 'clock', tone: 'blue' },
  LISTING_INTEREST: { icon: 'store', tone: 'green' },
  WALL_POST: { icon: 'pencil', tone: 'blue' },
  FOLLOW: { icon: 'plus', tone: 'blue' },
  POKE: { icon: 'poke', tone: 'blue' },
  GROUP_JOIN_REQUEST: { icon: 'users', tone: 'blue' },
  GROUP_JOIN_APPROVED: { icon: 'users', tone: 'green' },
  GROUP_POST_PENDING: { icon: 'clock', tone: 'blue' },
  GROUP_POST_APPROVED: { icon: 'check', tone: 'green' },
  GROUP_ROLE: { icon: 'star', tone: 'blue' },
  EVENT_UPDATED: { icon: 'calendar', tone: 'red' },
  PAGE_LIKE: { icon: 'like', tone: 'blue' },
  PAGE_REVIEW: { icon: 'star', tone: 'red' },
  STORY_REACTION: { icon: 'heart', tone: 'red' },
  STORY_REPLY: { icon: 'messenger', tone: 'blue' },
  FUNDRAISER_DONATION: { icon: 'money', tone: 'green' },
  JOB_APPLICATION: { icon: 'briefcase', tone: 'blue' },
  JOB_APPLICATION_UPDATE: { icon: 'briefcase', tone: 'green' },
  DATING_MATCH: { icon: 'heart', tone: 'red' },
};

export function NotificationItem({ notification, onOpen, onDismiss }: NotificationItemProps) {
  const badge = BADGE[notification.type] ?? BADGE.COMMENT;
  const actorName = notification.actor?.fullName ?? 'Facebook';

  return (
    <div className={classNames(styles.item, !notification.read && styles.unread)}>
      <button type="button" className={styles.main} onClick={() => onOpen(notification)}>
        <span className={styles.avatarWrap}>
          <Avatar src={notification.actor?.avatarUrl} name={actorName} size="md" circle />
          <span className={classNames(styles.badge, styles[badge.tone])}>
            <Icon name={badge.icon} size={9} />
          </span>
        </span>

        <span className={styles.body}>
          <span className={styles.text}>{notification.text}</span>
          <span className={styles.time}>{timeAgo(notification.createdAt)}</span>
        </span>

        {notification.imageUrl && (
          <img className={styles.thumb} src={notification.imageUrl} alt="" loading="lazy" />
        )}
      </button>

      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          aria-label="Remove notification"
          onClick={() => onDismiss(notification.id)}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}
