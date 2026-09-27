import { useState } from 'react';
import { Button, Icon, Spinner } from '@atoms/index';
import { Modal } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { socialApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import type { User } from '@/types';
import styles from './SocialDialogs.module.css';

export interface ListMembershipDialogProps {
  person: User;
  onClose: () => void;
  onChanged?: () => void;
}

const KIND_HINT = {
  CLOSE_FRIENDS: 'See more of them in News Feed, and share Close Friends posts and stories with them.',
  ACQUAINTANCES: 'See less of them in News Feed.',
  CUSTOM: 'A list you made.',
} as const;

/** "Add to another list": ticks the person onto or off each of your friend lists. */
export function ListMembershipDialog({ person, onClose, onChanged }: ListMembershipDialogProps) {
  const listsQuery = useAsync(() => socialApi.lists(), []);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggle(listId: number, isMember: boolean) {
    setBusyId(listId);
    try {
      const updated = isMember
        ? await socialApi.removeFromList(listId, person.id)
        : await socialApi.addToList(listId, person.id);
      listsQuery.setData((current) => (current ?? []).map((l) => (l.id === updated.id ? updated : l)));
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal title={`${person.firstName}'s lists`} onClose={onClose} footer={<Button onClick={onClose}>Done</Button>}>
      {listsQuery.isLoading ? (
        <Spinner size="sm" />
      ) : (
        <div className={styles.pickList}>
          {(listsQuery.data ?? []).map((list) => {
            const isMember = list.members.some((m) => m.id === person.id);
            return (
              <button
                key={list.id}
                type="button"
                className={classNames(styles.pickRow, isMember && styles.pickRowOn)}
                disabled={busyId === list.id}
                onClick={() => void toggle(list.id, isMember)}
              >
                <Icon name={list.kind === 'CLOSE_FRIENDS' ? 'star' : 'list'} size={18} />
                <span className={styles.pickName}>
                  {list.name}
                  <span className={styles.listHint}>{KIND_HINT[list.kind]}</span>
                </span>
                <span className={classNames(styles.check, isMember && styles.checkOn)}>
                  {isMember && <Icon name="check" size={12} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
