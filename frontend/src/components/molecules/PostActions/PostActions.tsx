import { Icon } from '@atoms/index';
import { classNames } from '@/utils/format';
import { ReactionPicker } from '../ReactionPicker';
import type { ReactionName } from '@/types';
import styles from './PostActions.module.css';

export interface PostActionsProps {
  myReaction?: ReactionName | null;
  savedByMe: boolean;
  onReact: (reaction: ReactionName) => void;
  onFocusComment: () => void;
  onShare: () => void;
  onToggleSave: () => void;
}

/** The Like / Comment / Share / Save row at the foot of a post. */
export function PostActions({
  myReaction,
  savedByMe,
  onReact,
  onFocusComment,
  onShare,
  onToggleSave,
}: PostActionsProps) {
  return (
    <div className={styles.bar}>
      <ReactionPicker myReaction={myReaction} onReact={onReact} />

      <button type="button" className={styles.action} onClick={onFocusComment}>
        <Icon name="comment" size={14} />
        <span className={styles.actionLabel}>Comment</span>
      </button>

      <button type="button" className={styles.action} onClick={onShare}>
        <Icon name="share" size={14} />
        <span className={styles.actionLabel}>Share</span>
      </button>

      <button
        type="button"
        className={classNames(styles.action, savedByMe && styles.saved)}
        onClick={onToggleSave}
        aria-pressed={savedByMe}
        title={savedByMe ? 'Remove from saved' : 'Save post'}
      >
        <Icon name="bookmark" size={14} />
        <span className={styles.actionLabel}>{savedByMe ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  );
}
