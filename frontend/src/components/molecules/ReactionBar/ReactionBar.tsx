import { reactionMeta, reactionSummaryText } from '@/utils/reactions';
import { pluralize } from '@/utils/format';
import type { ReactionSummary } from '@/types';
import styles from './ReactionBar.module.css';

export interface ReactionBarProps {
  reactions: ReactionSummary;
  commentCount: number;
  shareCount: number;
  onShowReactors: () => void;
  onFocusComment: () => void;
}

/**
 * The summary strip between a post and its action row: the stack of reaction
 * faces on the left, comment and share counts on the right.
 */
export function ReactionBar({
  reactions,
  commentCount,
  shareCount,
  onShowReactors,
  onFocusComment,
}: ReactionBarProps) {
  const hasAny = reactions.total > 0 || commentCount > 0 || shareCount > 0;
  if (!hasAny) return null;

  return (
    <div className={styles.bar}>
      {reactions.total > 0 && (
        <button type="button" className={styles.summary} onClick={onShowReactors}>
          <span className={styles.faces}>
            {reactions.top.map((name) => (
              <span key={name} className={styles.face} title={reactionMeta(name).label}>
                {reactionMeta(name).emoji}
              </span>
            ))}
          </span>
          <span className={styles.count}>
            {reactionSummaryText(reactions.total, reactions.myReaction)}
          </span>
        </button>
      )}

      <span className={styles.spacer} />

      {commentCount > 0 && (
        <button type="button" className={styles.link} onClick={onFocusComment}>
          {pluralize(commentCount, 'comment')}
        </button>
      )}
      {shareCount > 0 && <span className={styles.meta}>{pluralize(shareCount, 'share')}</span>}
    </div>
  );
}
