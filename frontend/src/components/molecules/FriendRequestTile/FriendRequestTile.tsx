import { Avatar, Button, Link } from '@atoms/index';
import { timeAgo } from '@/utils/time';
import type { FriendRequest } from '@/types';
import styles from './FriendRequestTile.module.css';

export interface FriendRequestTileProps {
  request: FriendRequest;
  onAccept: (requestId: number) => void;
  onDecline: (requestId: number) => void;
  isBusy?: boolean;
}

export function FriendRequestTile({ request, onAccept, onDecline, isBusy }: FriendRequestTileProps) {
  const { requestId, from, createdAt } = request;

  return (
    <div className={styles.tile}>
      <Avatar src={from.avatarUrl} name={from.fullName} size="md" />

      <div className={styles.body}>
        <Link to={`/profile/${from.id}`} className={styles.name}>
          {from.fullName}
        </Link>
        <span className={styles.time}>{timeAgo(createdAt)}</span>

        <div className={styles.actions}>
          <Button size="sm" disabled={isBusy} onClick={() => onAccept(requestId)}>
            Confirm
          </Button>
          <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => onDecline(requestId)}>
            Delete Request
          </Button>
        </div>
      </div>
    </div>
  );
}
