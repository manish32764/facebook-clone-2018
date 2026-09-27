import { useMemo, useState } from 'react';
import { Avatar, Button, Icon, Spinner } from '@atoms/index';
import { EmptyState, Modal } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { friendApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import type { User } from '@/types';
import styles from './SocialDialogs.module.css';

export interface FriendPickerProps {
  title: string;
  onClose: () => void;
  onConfirm: (userIds: number[]) => Promise<unknown> | void;
  confirmLabel?: string;
  initialSelected?: number[];
  /** Shown but not selectable, e.g. people already invited. */
  disabledIds?: number[];
  disabledNote?: string;
  /** Pick from these people instead of your friends. */
  people?: User[];
  hint?: string;
}

/** A searchable checklist of your friends, used for audiences and invites. */
export function FriendPicker({
  title,
  onClose,
  onConfirm,
  confirmLabel = 'Done',
  initialSelected = [],
  disabledIds = [],
  disabledNote = 'Already invited',
  people,
  hint,
}: FriendPickerProps) {
  const friendsQuery = useAsync(
    () => (people ? Promise.resolve(people) : friendApi.mine().then((list) => list.map((f) => f.user))),
    [people],
  );
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [filter, setFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const disabled = useMemo(() => new Set(disabledIds), [disabledIds]);
  const shown = (friendsQuery.data ?? []).filter((user) =>
    user.fullName.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  function toggle(id: number) {
    if (disabled.has(id)) return;
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function confirm() {
    setIsSaving(true);
    try {
      await onConfirm(selected);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <span className={styles.footerNote}>{selected.length} selected</span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void confirm()} disabled={isSaving}>
            {isSaving ? 'Saving…' : confirmLabel}
          </Button>
        </>
      }
    >
      {hint && <p className={styles.hint}>{hint}</p>}
      <input
        className={styles.search}
        placeholder="Search friends"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        aria-label="Search friends"
      />
      {friendsQuery.isLoading ? (
        <Spinner size="sm" />
      ) : shown.length === 0 ? (
        <EmptyState icon="friends" title="Nobody to show" />
      ) : (
        <div className={styles.pickList}>
          {shown.map((user) => {
            const isOn = selected.includes(user.id);
            const isDisabled = disabled.has(user.id);
            return (
              <button
                key={user.id}
                type="button"
                className={classNames(styles.pickRow, isOn && styles.pickRowOn, isDisabled && styles.pickRowDisabled)}
                onClick={() => toggle(user.id)}
                aria-pressed={isOn}
                disabled={isDisabled}
              >
                <Avatar src={user.avatarUrl} name={user.fullName} size="sm" circle />
                <span className={styles.pickName}>{user.fullName}</span>
                {isDisabled ? (
                  <span className={styles.pickNote}>{disabledNote}</span>
                ) : (
                  <span className={classNames(styles.check, isOn && styles.checkOn)}>
                    {isOn && <Icon name="check" size={12} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
