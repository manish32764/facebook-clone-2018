import { useState, type KeyboardEvent } from 'react';
import { Avatar, Link } from '@atoms/index';
import { ReactionPicker } from '../ReactionPicker';
import { timeAgo, fullTimestamp } from '@/utils/time';
import { classNames } from '@/utils/format';
import { reactionMeta } from '@/utils/reactions';
import type { Comment, ReactionName, User } from '@/types';
import styles from './CommentItem.module.css';

export interface CommentItemProps {
  comment: Comment;
  viewer: User;
  /** Nesting level, 0 for a top-level comment. Drives indent and avatar size. */
  depth?: number;
  /** The post author may remove any comment on their post. */
  canModerate?: boolean;
  onReact: (commentId: number, reaction: ReactionName) => void;
  onReply: (comment: Comment) => void;
  onEdit: (commentId: number, content: string) => Promise<unknown> | void;
  onDelete: (commentId: number) => void;
  onReport?: (comment: Comment) => void;
}

export function CommentItem({
  comment,
  viewer,
  depth = 0,
  canModerate = false,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onReport,
}: CommentItemProps) {
  const { author, content, imageUrl, createdAt, editedAt } = comment;
  const isMine = author.id === viewer.id;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  const reactions = comment.reactions;
  const total = reactions?.total ?? comment.likeCount;
  const top = reactions?.top ?? (total > 0 ? ['LIKE'] : []);
  const myReaction = (reactions?.myReaction ?? (comment.likedByMe ? 'LIKE' : null)) as ReactionName | null;

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === content) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onEdit(comment.id, trimmed);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void save();
    }
    if (event.key === 'Escape') {
      setDraft(content);
      setIsEditing(false);
    }
  }

  return (
    <div className={classNames(styles.comment, depth > 0 && styles.reply)}>
      <Avatar src={author.avatarUrl} name={author.fullName} size={depth > 0 ? 'xs' : 'sm'} />

      <div className={styles.body}>
        {isEditing ? (
          <div className={styles.editBox}>
            <textarea
              className={styles.editInput}
              value={draft}
              autoFocus
              rows={2}
              disabled={isSaving}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Edit comment"
            />
            <span className={styles.editHint}>
              Press Enter to save &middot;{' '}
              <button
                type="button"
                className={styles.footerAction}
                onClick={() => {
                  setDraft(content);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </span>
          </div>
        ) : (
          <div className={styles.bubbleRow}>
            <div className={styles.bubble}>
              <Link to={`/profile/${author.id}`} className={styles.author}>
                {author.fullName}
              </Link>{' '}
              <span className={styles.content}>{content}</span>
            </div>

            {/* The reaction faces hang off the bubble as a small pill, as in the app. */}
            {total > 0 && (
              <span className={styles.likePill} title={`${total} reacted`}>
                {top.slice(0, 3).map((name) => (
                  <span key={name} className={styles.pillEmoji}>
                    {reactionMeta(name as ReactionName).emoji}
                  </span>
                ))}
                {total}
              </span>
            )}
          </div>
        )}

        {imageUrl && <img className={styles.image} src={imageUrl} alt="" loading="lazy" />}

        {!isEditing && (
          <div className={styles.footer}>
            <ReactionPicker
              variant="comment"
              myReaction={myReaction}
              onReact={(reaction) => onReact(comment.id, reaction)}
            />
            <span className={styles.dot}>&middot;</span>
            <button type="button" className={styles.footerAction} onClick={() => onReply(comment)}>
              Reply
            </button>
            {isMine && (
              <>
                <span className={styles.dot}>&middot;</span>
                <button type="button" className={styles.footerAction} onClick={() => setIsEditing(true)}>
                  Edit
                </button>
              </>
            )}
            {(isMine || canModerate) && (
              <>
                <span className={styles.dot}>&middot;</span>
                <button type="button" className={styles.footerAction} onClick={() => onDelete(comment.id)}>
                  Delete
                </button>
              </>
            )}
            {!isMine && onReport && (
              <>
                <span className={styles.dot}>&middot;</span>
                <button type="button" className={styles.footerAction} onClick={() => onReport(comment)}>
                  Report
                </button>
              </>
            )}
            <span className={styles.dot}>&middot;</span>
            <span title={fullTimestamp(createdAt)}>{timeAgo(createdAt)}</span>
            {editedAt && (
              <>
                <span className={styles.dot}>&middot;</span>
                <span title={fullTimestamp(editedAt)}>Edited</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
