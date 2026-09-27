import { useMemo, useState } from 'react';
import { Avatar, Button, Input, Spinner } from '@atoms/index';
import { ErrorNotice, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { friendApi, messageApi } from '@/api/endpoints';
import { useAsync } from '@/hooks/useAsync';
import { classNames } from '@/utils/format';
import styles from './NewChatDialog.module.css';

export interface NewChatDialogProps {
  onClose: () => void;
  onCreated: (conversationId: number) => void;
}

/**
 * Starts a conversation. Picking one person opens the direct thread you already
 * had with them; picking several creates a named group thread.
 */
export function NewChatDialog({ onClose, onCreated }: NewChatDialogProps) {
  const { data: friends, isLoading } = useAsync(() => friendApi.mine(), []);
  const [selected, setSelected] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [filter, setFilter] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const all = friends ?? [];
    return needle
      ? all.filter((friend) => friend.user.fullName.toLowerCase().includes(needle))
      : all;
  }, [friends, filter]);

  function toggle(userId: number) {
    setSelected((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  async function submit() {
    if (selected.length === 0) return;
    setIsCreating(true);
    setError(null);
    try {
      const conversation =
        selected.length === 1 && !name.trim()
          ? await messageApi.openWith(selected[0])
          : await messageApi.createGroup(selected, name.trim() || undefined);
      onCreated(conversation.id);
    } catch (err) {
      setError(toErrorMessage(err, 'That conversation could not be started'));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Modal
      title="New message"
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={selected.length === 0 || isCreating}>
            {isCreating ? 'Starting…' : 'Start Chat'}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Input
          compact
          value={filter}
          placeholder="Search your friends"
          aria-label="Search your friends"
          onChange={(event) => setFilter(event.target.value)}
        />

        {/* A name only matters once the thread has more than two people in it. */}
        {selected.length > 1 && (
          <Input
            compact
            label="Group name"
            placeholder="Weekend Hike Crew"
            value={name}
            onChange={(event) => setName(event.target.value)}
            hint="Leave this blank and the thread is named after the people in it."
          />
        )}

        <div className={styles.people}>
          {isLoading ? (
            <Spinner size="sm" />
          ) : list.length === 0 ? (
            <p className={styles.empty}>No friends match that.</p>
          ) : (
            list.map(({ user }) => (
              <button
                key={user.id}
                type="button"
                className={classNames(styles.person, selected.includes(user.id) && styles.picked)}
                onClick={() => toggle(user.id)}
                aria-pressed={selected.includes(user.id)}
              >
                <Avatar src={user.avatarUrl} name={user.fullName} size="sm" circle />
                <span className={styles.personName}>{user.fullName}</span>
                <span className={styles.check}>{selected.includes(user.id) ? '✓' : ''}</span>
              </button>
            ))
          )}
        </div>

        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
