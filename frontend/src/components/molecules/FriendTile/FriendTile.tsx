import { Avatar, Button, Icon, Link, PresenceDot } from '@atoms/index';
import { classNames, pluralize } from '@/utils/format';
import type { Friend, Relationship } from '@/types';
import styles from './FriendTile.module.css';

export interface FriendTileProps {
  friend: Friend;
  variant?: 'row' | 'card';
  onAdd?: (userId: number) => void;
  onRemove?: (userId: number) => void;
  /** Opens a chat with this person; omitted where a chat makes no sense. */
  onMessage?: (userId: number) => void;
  online?: boolean;
  isBusy?: boolean;
}

const ACTION_LABEL: Record<Relationship, string | null> = {
  NONE: 'Add Friend',
  REQUEST_SENT: 'Request Sent',
  REQUEST_RECEIVED: 'Respond',
  FRIENDS: 'Friends',
  SELF: null,
};

export function FriendTile({
  friend,
  variant = 'row',
  onAdd,
  onRemove,
  onMessage,
  online = false,
  isBusy,
}: FriendTileProps) {
  const { user, relationship, mutualFriends } = friend;
  const label = ACTION_LABEL[relationship];

  function handleAction() {
    if (relationship === 'NONE') onAdd?.(user.id);
    else if (relationship === 'FRIENDS') onRemove?.(user.id);
  }

  return (
    <div className={classNames(styles.tile, variant === 'card' && styles.card)}>
      <span className={styles.avatarWrap}>
        <Avatar
          src={user.avatarUrl}
          name={user.fullName}
          size={variant === 'card' ? 'lg' : 'md'}
        />
        <PresenceDot online={online} corner />
      </span>

      <div className={styles.body}>
        <Link to={`/profile/${user.id}`} className={styles.name}>
          {user.fullName}
        </Link>
        {mutualFriends > 0 && (
          <span className={styles.mutual}>{pluralize(mutualFriends, 'mutual friend')}</span>
        )}
      </div>

      {(label || onMessage) && (
        <div className={styles.action}>
          {label && (
            <Button
              size="sm"
              variant={relationship === 'FRIENDS' ? 'secondary' : 'primary'}
              disabled={isBusy || relationship === 'REQUEST_SENT'}
              onClick={handleAction}
            >
              {label}
            </Button>
          )}

          {onMessage && relationship !== 'SELF' && (
            <Button
              size="sm"
              variant="secondary"
              title={`Message ${user.firstName}`}
              onClick={() => onMessage(user.id)}
            >
              <Icon name="messenger" size={12} /> Message
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
