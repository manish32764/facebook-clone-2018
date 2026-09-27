import { Link } from 'react-router-dom';
import { Avatar, Spinner } from '@atoms/index';
import { EmptyState, Modal, Tabs } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { postApi } from '@/api/endpoints';
import { REACTIONS, reactionMeta } from '@/utils/reactions';
import { useState } from 'react';
import type { ReactionName } from '@/types';
import styles from './PostDialogs.module.css';

export interface ReactorsDialogProps {
  postId: number;
  onClose: () => void;
}

type TabKey = 'ALL' | ReactionName;

/** Who reacted, filterable by reaction - the dialog behind the face stack. */
export function ReactorsDialog({ postId, onClose }: ReactorsDialogProps) {
  const [tab, setTab] = useState<TabKey>('ALL');
  const { data, isLoading } = useAsync(() => postApi.reactors(postId), [postId]);

  const reactors = data ?? [];
  const shown = tab === 'ALL' ? reactors : reactors.filter((r) => r.reaction === tab);

  const tabs = [
    { key: 'ALL' as TabKey, label: 'All', count: reactors.length },
    ...REACTIONS.filter((reaction) => reactors.some((r) => r.reaction === reaction.name)).map(
      (reaction) => ({
        key: reaction.name as TabKey,
        label: `${reaction.emoji} ${reaction.label}`,
        count: reactors.filter((r) => r.reaction === reaction.name).length,
      }),
    ),
  ];

  return (
    <Modal title="Reactions" onClose={onClose} width="sm">
      {isLoading ? (
        <Spinner size="sm" />
      ) : reactors.length === 0 ? (
        <EmptyState icon="like" title="Nobody has reacted yet" />
      ) : (
        <>
          <Tabs items={tabs} active={tab} onChange={setTab} variant="plain" />

          <ul className={styles.reactorList}>
            {shown.map(({ user, reaction }) => (
              <li key={`${user.id}-${reaction}`} className={styles.reactorRow}>
                <Link to={`/profile/${user.id}`} className={styles.reactorLink} onClick={onClose}>
                  <Avatar src={user.avatarUrl} name={user.fullName} size="sm" circle />
                  <span className={styles.reactorName}>{user.fullName}</span>
                </Link>
                <span className={styles.reactorEmoji} title={reactionMeta(reaction).label}>
                  {reactionMeta(reaction).emoji}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
