import { Link, useNavigate } from 'react-router-dom';
import { Button, Icon } from '@atoms/index';
import { pluralize } from '@/utils/format';
import type { Group } from '@/types';
import styles from './GroupCard.module.css';

export interface GroupCardProps {
  group: Group;
  onJoin?: (groupId: number) => void;
  onLeave?: (groupId: number) => void;
  isBusy?: boolean;
}

export function GroupCard({ group, onJoin, onLeave, isBusy = false }: GroupCardProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.card}>
      <Link to={`/groups/${group.id}`} className={styles.cover}>
        {group.coverUrl ? (
          <img className={styles.coverImage} src={group.coverUrl} alt="" loading="lazy" />
        ) : (
          <span className={styles.coverFallback}>
            <Icon name="users" size={30} />
          </span>
        )}
      </Link>

      <div className={styles.body}>
        <Link to={`/groups/${group.id}`} className={styles.name}>
          {group.name}
        </Link>

        <span className={styles.meta}>
          <Icon name={group.privacy === 'PRIVATE' ? 'lock' : 'globe'} size={11} />
          {group.privacy === 'PRIVATE' ? 'Private group' : 'Public group'}
          <span className={styles.dot}>&middot;</span>
          {pluralize(group.memberCount, 'member')}
        </span>

        {group.description && <p className={styles.description}>{group.description}</p>}

        <div className={styles.actions}>
          {group.joined ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/groups/${group.id}`)}>
                Visit
              </Button>
              {onLeave && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => onLeave(group.id)}
                >
                  Leave
                </Button>
              )}
            </>
          ) : (
            onJoin &&
            (group.requestPending ? (
              <Button size="sm" variant="secondary" disabled>
                Requested
              </Button>
            ) : (
              <Button size="sm" disabled={isBusy} onClick={() => onJoin(group.id)}>
                {isBusy
                  ? 'Sending…'
                  : group.privacy === 'PRIVATE' && !group.invitedBy
                    ? 'Request to Join'
                    : 'Join Group'}
              </Button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
